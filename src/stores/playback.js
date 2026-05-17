/**
 * PlaybackStore — pomocniczy store do odczytu stanu odtwarzania.
 *
 * UWAGA: Rzeczywista logika playbacku (ytPlayer, html5Audio, engineLoad, nextTrack itp.)
 * żyje w AppLayout.vue i jest udostępniana przez provide/inject("appState").
 * Ten store jest read-only mirror dla komponentów które nie mają dostępu do inject.
 *
 * Żeby zaktualizować wartości wywołaj appState.play() / appState.togglePlay() itp.
 * Ten store nie posiada własnych akcji modyfikujących odtwarzacz.
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const usePlaybackStore = defineStore('playback', () => {
  // Stan synchronizowany przez AppLayout (opcjonalne — jeśli zdecydujesz się na migrację)
  const currentTrack = ref(null);
  const currentPosition = ref(0);
  const duration = ref(0);
  const isPlaying = ref(false);
  const shuffle = ref(false);
  const repeatMode = ref('none'); // 'none' | 'one' | 'all'

  const progress = computed(() =>
    duration.value > 0 ? (currentPosition.value / duration.value) * 100 : 0
  );

  // Akcje poniżej to stubs — wołaj appState z inject() zamiast tego store
  // jeśli chcesz faktycznie sterować odtwarzaczem.
  function _syncFrom(state) {
    if (!state) return;
    if (state.nowPlaying?.value !== undefined) currentTrack.value = state.nowPlaying.value;
    if (state.currentTime?.value !== undefined) currentPosition.value = state.currentTime.value;
    if (state.audioDuration?.value !== undefined) duration.value = state.audioDuration.value;
    if (state.isPlaying?.value !== undefined) isPlaying.value = state.isPlaying.value;
  }

  return {
    currentTrack,
    currentPosition,
    duration,
    isPlaying,
    shuffle,
    repeatMode,
    progress,
    _syncFrom,
  };
});
