import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  const volume = ref(80);

  function setVolume(newVolume) {
    volume.value = Math.max(0, Math.min(100, newVolume));
    localStorage.setItem('ap-player-volume', volume.value.toString());
  }

  return {
    volume,
    setVolume,
  };
});