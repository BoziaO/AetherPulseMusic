import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const usePlaybackStore = defineStore('playback', () => {
  // Current track
  const currentTrack = ref(null);
  const currentPosition = ref(0);
  const duration = ref(0);

  // Playback state
  const isPlaying = ref(false);

  // Modes
  const shuffle = ref(false);
  const repeatMode = ref('none'); // 'none', 'one', 'all'

  // Getters
  const progress = computed(() => {
    return duration.value > 0
      ? (currentPosition.value / duration.value) * 100
      : 0;
  });

  // Actions
  function playTrack(track) {
    currentTrack.value = track;
    isPlaying.value = true;
  }

  function togglePlay() {
    isPlaying.value = !isPlaying.value;
  }

  function toggleShuffle() {
    shuffle.value = !shuffle.value;
  }

  function toggleRepeat() {
    if (repeatMode.value === 'none') repeatMode.value = 'all';
    else if (repeatMode.value === 'all') repeatMode.value = 'one';
    else repeatMode.value = 'none';
  }

  function seekTo(position) {
    currentPosition.value = position;
  }

  return {
    currentTrack,
    currentPosition,
    duration,
    isPlaying,
    shuffle,
    repeatMode,
    progress,
    playTrack,
    togglePlay,
    toggleShuffle,
    toggleRepeat,
    seekTo,
  };
});