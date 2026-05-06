<template>
  <PageSkeleton v-if="loading" />
  <div v-else class="animate-in">
    <div v-if="error" class="mb-5 rounded-lg border p-4 text-sm font-bold" style="border-color: color-mix(in srgb, var(--danger) 32%, transparent); background: color-mix(in srgb, var(--danger) 10%, transparent)">
      {{ error }}
    </div>

    <PageHero
      :title="album?.title || album?.name || 'Album'"
      :subtitle="album?.description || album?.author || album?.artist || 'Album z YouTube Music.'"
      :cover="album?.thumbnail || album?.cover || album?.art"
      :stats="stats"
      :playable="tracks.length > 0"
      :disabled="tracks.length === 0"
      :play-label="app.t('playAll')"
      @play="app.play(tracks[0], tracks)"
    />

    <TrackList
      :tracks="tracks"
      :now-playing="app.nowPlaying.value"
      :favorite-keys="app.favoriteKeys.value"
      @play="app.play"
      @play-next="app.playNext"
      @add-queue="app.addToQueue"
      @toggle-favorite="app.toggleFavoriteTrack"
    />
  </div>
</template>

<script setup>
import { computed, inject, ref, watch } from "vue";
import PageHero from "../components/PageHero.vue";
import PageSkeleton from "../components/PageSkeleton.vue";
import TrackList from "../components/TrackList.vue";
import { fetchJson } from "../lib/api";
import { cleanData, normalizeTrack } from "../lib/format";

const props = defineProps({
  albumId: { type: String, required: true },
});

const app = inject("appState");
const album = ref(null);
const loading = ref(false);
const error = ref("");

const tracks = computed(() => {
  const list = album.value?.tracks || album.value?.songs || album.value?.contents || [];
  return Array.isArray(list) ? list.map((track) => normalizeTrack({ ...track, thumbnail: track.thumbnail || album.value?.thumbnail })).filter(Boolean) : [];
});
const stats = computed(() => [
  { label: "Utwory", value: String(tracks.value.length) },
  { label: "Zrodlo", value: "YouTube" },
]);

async function loadAlbum() {
  loading.value = true;
  error.value = "";
  try {
    album.value = cleanData(await fetchJson(`/api/ytmusic/album/${encodeURIComponent(props.albumId)}`, { timeout: 16000 }));
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

watch(() => props.albumId, loadAlbum, { immediate: true });
</script>
