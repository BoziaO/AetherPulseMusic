/**
 * UserStore — preferencje użytkownika persystowane w localStorage.
 *
 * UWAGA: Główna logika playbacku żyje w AppLayout.vue (provide/inject "appState").
 * Ten store obsługuje wyłącznie dane które NIE wymagają synchronizacji z playerem
 * i mogą być niezależnie odczytane w dowolnym komponencie bez prop-drilling.
 */
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useUserStore = defineStore('user', () => {
  const volume = ref(Math.max(0, Math.min(100, Number(localStorage.getItem('ap-player-volume')) || 80)));
  const language = ref(localStorage.getItem('ap:language') || 'pl');

  function setVolume(next) {
    volume.value = Math.max(0, Math.min(100, Number(next) || 0));
  }

  function setLanguage(next) {
    language.value = next === 'en' ? 'en' : 'pl';
  }

  watch(volume, (v) => {
    try { localStorage.setItem('ap-player-volume', String(v)); } catch { /* quota */ }
  });

  watch(language, (v) => {
    try { localStorage.setItem('ap:language', v); } catch { /* quota */ }
  });

  return { volume, language, setVolume, setLanguage };
});
