import { defineStore } from 'pinia';
import { ref, computed, watch, nextTick } from 'vue';
import { buildApiUrl, fetchJson, fetchSong } from '../lib/api';
import { clamp, normalizeTrack, secondsFromDuration, trackKey } from '../lib/format';
import { applyToYouTubePlayer as applyAudioQuality } from '../lib/audioQuality';
import {
  attachMediaElement as attachToAudioEngine,
  detachMediaElement as detachFromAudioEngine,
  getChainForElement,
} from '../lib/audioEngine';
import {
  attachSilenceDetector,
  detachSilenceDetector,
  setSkipCallback as setSilenceSkipCallback,
  silenceSettings,
} from '../lib/silenceSkipper';
import { findSegmentToSkip } from '../lib/sponsorBlock';
import { filterAvailable, markUnavailable } from '../lib/librarySync';

export const usePlaybackStore = defineStore('playback', () => {
  // --- State ---
  const nowPlaying = ref(null);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const audioDuration = ref(0);
  const volume = ref(clamp(Number(localStorage.getItem('ap-player-volume') || 80), 0, 100));
  const queue = ref([]);
  const shuffledQueue = ref([]);
  const currentQueueIndex = ref(-1);
  const isShuffled = ref(false);
  const repeatMode = ref('none'); // 'none' | 'one' | 'all'
  const playerPreference = ref(localStorage.getItem('ap-player-mode') || 'auto');
  const activeEngine = ref('iframe');
  const playerMinimized = ref(false);

  // --- Internal Engine State ---
  let ytPlayer = null;
  let ytReady = false;
  let html5Audio = null;
  let html5Attached = false;
  let loadGen = 0;
  let isSwitching = false;
  let pendingIframeTrack = null;
  let progressTimer = null;
  const html5StreamFormat = 'm4a';

  // --- Computed ---
  const progress = computed(() =>
    audioDuration.value > 0 ? (currentTime.value / audioDuration.value) * 100 : 0
  );

  const visibleQueue = computed(() => (isShuffled.value ? shuffledQueue.value : queue.value));

  // --- Persistence ---
  watch(playerPreference, (val) => {
    localStorage.setItem('ap-player-mode', val);
  });

  watch(volume, (val) => {
    localStorage.setItem('ap-player-volume', String(val));
  });

  // --- Engine Methods ---
  function ensureHtml5Audio() {
    if (html5Audio) return html5Audio;
    html5Audio = document.createElement('audio');
    html5Audio.id = 'ap-html5-player';
    html5Audio.preload = 'auto';
    html5Audio.crossOrigin = 'anonymous';
    html5Audio.style.display = 'none';
    document.body.appendChild(html5Audio);

    html5Audio.addEventListener('play', () => {
      if (activeEngine.value === 'html5') {
        isPlaying.value = true;
        startProgressTimer();
      }
    });
    html5Audio.addEventListener('pause', () => {
      if (activeEngine.value === 'html5' && !isSwitching) {
        isPlaying.value = false;
        stopProgressTimer();
      }
    });
    html5Audio.addEventListener('ended', () => {
      if (activeEngine.value !== 'html5') return;
      isPlaying.value = false;
      stopProgressTimer();
      if (repeatMode.value === 'one') {
        html5Audio.currentTime = 0;
        html5Audio.play().catch(() => {});
      } else {
        nextTrack();
      }
    });
    html5Audio.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(html5Audio.duration) && html5Audio.duration > 0) {
        audioDuration.value = html5Audio.duration;
      }
    });
    html5Audio.addEventListener('error', () => {
      if (isSwitching) return;
      if (activeEngine.value !== 'html5') return;
      console.warn('[player] HTML5 audio error', html5Audio.error);
      const track = nowPlaying.value;
      if (playerPreference.value === 'auto' && track?.videoId) {
        iframeLoad(track);
      }
    });

    return html5Audio;
  }

  function pauseIframeQuietly() {
    try { ytPlayer?.pauseVideo?.(); } catch { /* ignore */ }
  }

  function pauseHtml5Quietly() {
    if (!html5Audio) return;
    isSwitching = true;
    try { html5Audio.pause(); } catch { /* ignore */ }
    Promise.resolve().then(() => { isSwitching = false; });
  }

  async function html5Load(track, gen) {
    if (!track?.videoId) return false;
    const audio = ensureHtml5Audio();
    try {
      pauseIframeQuietly();
      if (gen !== loadGen) return false;

      const proxyUrl = `/api/downloads/playback/${encodeURIComponent(track.videoId)}?format=${encodeURIComponent(html5StreamFormat)}`;

      isSwitching = true;
      audio.src = proxyUrl;
      audio.volume = clamp(volume.value, 0, 100) / 100;
      audio.currentTime = 0;
      audio.muted = false;
      audio.load();
      Promise.resolve().then(() => { isSwitching = false; });

      if (!html5Attached) {
        try {
          attachToAudioEngine(audio);
          html5Attached = true;
          const chainHandle = getChainForElement(audio);
          if (chainHandle?.context && chainHandle?.tap) {
            attachSilenceDetector(audio, chainHandle.context, chainHandle.tap);
            setSilenceSkipCallback(({ db, durationMs }) => {
              console.debug(`[silence] skip ${durationMs.toFixed(0)}ms @ ${db.toFixed(1)}dB`);
              nextTrack();
            });
          }
        } catch (err) {
          console.warn('[player] attachToAudioEngine failed:', err.message);
        }
      }

      await audio.play();
      if (gen !== loadGen) {
        try { audio.pause(); } catch { /* ignore */ }
        return false;
      }

      activeEngine.value = 'html5';
      isPlaying.value = true;
      return true;
    } catch (err) {
      console.warn('[player] html5Load failed:', err?.message || err);
      return false;
    }
  }

  function iframeLoad(track, gen) {
    if (!track?.videoId) return false;
    if (!ytPlayer?.loadVideoById) {
      pendingIframeTrack = track;
      return false;
    }
    if (gen !== undefined && gen !== loadGen) return false;

    pauseHtml5Quietly();
    try {
      ytPlayer.loadVideoById(track.videoId);
      applyAudioQuality(ytPlayer);
      activeEngine.value = 'iframe';
      pendingIframeTrack = null;
      return true;
    } catch (err) {
      console.warn('[player] iframe loadVideoById failed:', err?.message || err);
      return false;
    }
  }

  async function engineLoad(track) {
    if (!track?.videoId) return false;
    const gen = ++loadGen;
    const pref = playerPreference.value;

    if (pref === 'iframe') return iframeLoad(track, gen);
    if (pref === 'html5') return await html5Load(track, gen);

    const ok = await html5Load(track, gen);
    if (ok) return true;
    if (gen !== loadGen) return false;
    return iframeLoad(track, gen);
  }

  // --- Actions ---
  function play(item, newQueue = null) {
    if (!item) return;
    const track = normalizeTrack(item);

    if (newQueue?.length) {
      queue.value = newQueue.map(normalizeTrack).filter(Boolean);
      currentQueueIndex.value = Math.max(
        0,
        queue.value.findIndex((entry) => trackKey(entry) === trackKey(track)),
      );
      if (isShuffled.value) shuffledQueue.value = shuffleArray([...queue.value]);
    } else if (visibleQueue.value.length) {
      const index = visibleQueue.value.findIndex((entry) => trackKey(entry) === trackKey(track));
      if (index >= 0) currentQueueIndex.value = index;
    }

    nowPlaying.value = track;
    currentTime.value = 0;
    audioDuration.value = track.durationSeconds || secondsFromDuration(track.duration) || 0;
    document.title = `${track.title} — AetherPulse`;

    if (track.videoId) {
      engineLoad(track).catch((err) => {
        console.error('[player] engineLoad failed:', err);
        const msg = String(err?.message || '');
        if (/40[049]/.test(msg) || /not_found|removed/i.test(msg)) {
          markUnavailable(track.videoId);
        }
      });
      fetchSong(track.videoId).then(songData => {
        if (songData && nowPlaying.value && trackKey(nowPlaying.value) === trackKey(track)) {
          nowPlaying.value = { ...nowPlaying.value, ...songData };
        }
      }).catch(() => {});
    }
  }

  function togglePlay() {
    if (activeEngine.value === 'html5' && html5Audio) {
      if (html5Audio.paused) html5Audio.play().catch(() => {});
      else html5Audio.pause();
      return;
    }
    if (!ytPlayer) return;
    try {
      const state = ytPlayer.getPlayerState();
      if (state === window.YT?.PlayerState?.PLAYING) ytPlayer.pauseVideo();
      else ytPlayer.playVideo();
    } catch { /* ignore */ }
  }

  function seekTo(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    currentTime.value = value;
    if (activeEngine.value === 'html5' && html5Audio) {
      try { html5Audio.currentTime = value; } catch { /* ignore */ }
    } else {
      try { ytPlayer?.seekTo?.(value, true); } catch { /* ignore */ }
    }
  }

  function setVolume(next) {
    const value = clamp(Number(next), 0, 100);
    volume.value = value;
    if (html5Audio) {
      try { html5Audio.volume = value / 100; } catch { /* ignore */ }
    }
    try { ytPlayer?.setVolume?.(value); } catch { /* ignore */ }
  }

  function nextTrack() {
    const list = visibleQueue.value;
    if (!list.length) return;
    const nextIndex =
      currentQueueIndex.value < list.length - 1
        ? currentQueueIndex.value + 1
        : repeatMode.value === 'all'
        ? 0
        : -1;
    if (nextIndex >= 0) {
      currentQueueIndex.value = nextIndex;
      play(list[nextIndex]);
    }
  }

  function prevTrack() {
    if (currentTime.value > 5) {
      seekTo(0);
      return;
    }
    const list = visibleQueue.value;
    const prevIndex = currentQueueIndex.value > 0 ? currentQueueIndex.value - 1 : -1;
    if (prevIndex >= 0) {
      currentQueueIndex.value = prevIndex;
      play(list[prevIndex]);
    } else {
      seekTo(0);
    }
  }

  function playNext(track) {
    const normalized = normalizeTrack(track);
    const next = [...queue.value];
    const insertAt = Math.max(currentQueueIndex.value + 1, 0);
    next.splice(insertAt, 0, normalized);
    queue.value = next;
  }

  function addToQueue(track) {
    queue.value = [...queue.value, normalizeTrack(track)];
  }

  function toggleShuffle() {
    isShuffled.value = !isShuffled.value;
    if (isShuffled.value) shuffledQueue.value = shuffleArray([...queue.value]);
  }

  function toggleRepeat() {
    repeatMode.value =
      repeatMode.value === 'none' ? 'all' : repeatMode.value === 'all' ? 'one' : 'none';
  }

  function clearQueue() {
    queue.value = [];
    shuffledQueue.value = [];
    currentQueueIndex.value = -1;
  }

  // --- Helpers ---
  function shuffleArray(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const next = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[next]] = [copy[next], copy[index]];
    }
    return copy;
  }

  function startProgressTimer() {
    stopProgressTimer();
    progressTimer = window.setInterval(() => {
      try {
        const cur = engineGetTime();
        if (Number.isFinite(cur) && cur > 0) currentTime.value = cur;
        const duration = engineGetDuration();
        if (duration > 0) audioDuration.value = duration;

        const segments = nowPlaying.value?.sponsorSegments;
        if (Array.isArray(segments) && segments.length) {
          const skip = findSegmentToSkip(segments, cur);
          if (skip && skip.end > cur + 0.2) {
            seekTo(skip.end + 0.05);
          }
        }
      } catch {
        stopProgressTimer();
      }
    }, 500);
  }

  function stopProgressTimer() {
    if (progressTimer) {
      window.clearInterval(progressTimer);
      progressTimer = null;
    }
  }

  function engineGetTime() {
    if (activeEngine.value === 'html5' && html5Audio) {
      return Number.isFinite(html5Audio.currentTime) ? html5Audio.currentTime : 0;
    }
    try { return ytPlayer?.getCurrentTime?.() || 0; } catch { return 0; }
  }

  function engineGetDuration() {
    if (activeEngine.value === 'html5' && html5Audio) {
      return Number.isFinite(html5Audio.duration) ? html5Audio.duration : 0;
    }
    try { return ytPlayer?.getDuration?.() || 0; } catch { return 0; }
  }

  // --- YouTube API Integration ---
  function initYouTubePlayer(elementId) {
    if (ytReady) return;
    ytReady = true;
    ytPlayer = new window.YT.Player(elementId, {
      height: '1',
      width: '1',
      playerVars: { autoplay: 0, controls: 0, fs: 0, rel: 0, modestbranding: 1, playsinline: 1 },
      events: {
        onReady: () => {
          ytPlayer?.setVolume?.(volume.value);
          applyAudioQuality(ytPlayer);
          if (pendingIframeTrack?.videoId) {
            const track = pendingIframeTrack;
            pendingIframeTrack = null;
            pauseHtml5Quietly();
            try {
              ytPlayer.loadVideoById(track.videoId);
              activeEngine.value = 'iframe';
            } catch { /* ignore */ }
          } else if (activeEngine.value === 'iframe' && nowPlaying.value?.videoId) {
            ytPlayer?.loadVideoById?.(nowPlaying.value.videoId);
          }
        },
        onStateChange: (event) => {
          const states = window.YT?.PlayerState;
          if (!states) return;
          if (activeEngine.value !== 'iframe') return;
          if (event.data === states.PLAYING) {
            isPlaying.value = true;
            startProgressTimer();
          } else if (event.data === states.PAUSED) {
            isPlaying.value = false;
            stopProgressTimer();
          } else if (event.data === states.ENDED) {
            isPlaying.value = false;
            stopProgressTimer();
            if (repeatMode.value === 'one') {
              seekTo(0);
              ytPlayer?.playVideo?.();
            } else {
              nextTrack();
            }
          }
        },
        onError: () => {
          if (activeEngine.value === 'iframe') console.error('YouTube Player Error');
        },
      },
    });
  }

  function cleanup() {
    stopProgressTimer();
    detachSilenceDetector();
    setSilenceSkipCallback(null);
    if (html5Audio) {
      try { detachFromAudioEngine(html5Audio); } catch { /* ignore */ }
      try { html5Audio.pause(); } catch { /* ignore */ }
      try { html5Audio.removeAttribute('src'); html5Audio.load(); } catch { /* ignore */ }
      try { html5Audio.remove(); } catch { /* ignore */ }
      html5Audio = null;
      html5Attached = false;
    }
    if (ytPlayer) {
      try { ytPlayer.destroy?.(); } catch { /* ignore */ }
      ytPlayer = null;
      ytReady = false;
    }
  }

  return {
    nowPlaying,
    isPlaying,
    currentTime,
    audioDuration,
    volume,
    queue,
    isShuffled,
    repeatMode,
    progress,
    visibleQueue,
    playerPreference,
    activeEngine,
    playerMinimized,
    play,
    togglePlay,
    seekTo,
    setVolume,
    nextTrack,
    prevTrack,
    playNext,
    addToQueue,
    toggleShuffle,
    toggleRepeat,
    clearQueue,
    initYouTubePlayer,
    cleanup,
    setPlayerPreference: (val) => { playerPreference.value = val; },
  };
});
