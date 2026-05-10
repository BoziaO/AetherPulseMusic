<template>
  <div class="detail-page animate-fade">
    <PageSkeleton v-if="loading" />

    <template v-else-if="album">
      <PageHero
        :eyebrow="album.type || t('navAlbums')"
        :title="album.title"
        :subtitle="albumSubtitle"
        :cover="album.thumbnail"
        :stats="stats"
        :playable="tracks.length > 0"
        :shuffleable="tracks.length > 0"
        :play-label="t('playAll')"
        :shuffle-label="t('shuffle')"
        @play="playAll(false)"
        @shuffle="playAll(true)"
      />

      <ContextNotes
        :item-id="props.albumId"
        :item-type="'album'"
        :item-title="album.title"
      />

      <section v-if="tracks.length" class="section">
        <TrackList
          :tracks="tracks"
          :now-playing="appState.nowPlaying.value"
          :favorite-keys="appState.favoriteKeys.value"
          @play="(track) => appState.play(track, tracks)"
          @add-queue="appState.addToQueue"
          @play-next="appState.playNext"
          @toggle-favorite="appState.toggleFavoriteTrack"
        />
      </section>
    </template>

    <p v-else-if="errorMessage" class="error-banner">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { computed, inject, ref, watch } from "vue";
import PageHero from "../components/PageHero.vue";
import PageSkeleton from "../components/PageSkeleton.vue";
import TrackList from "../components/TrackList.vue";
import ContextNotes from "../components/ContextNotes.vue";
import { fetchJson } from "../lib/api";
import { cleanData, normalizeTrack } from "../lib/format";

const props = defineProps({
  albumId: { type: String, required: true },
});

const appState = inject("appState");
function t(key) {
  return appState?.t?.(key) ?? key;
}

const loading = ref(false);
const errorMessage = ref("");
const album = ref(null);

const tracks = computed(() =>
  (album.value?.tracks || [])
    .map((track) =>
      normalizeTrack({
        ...track,
        artist: track.artist || album.value?.artist || "",
        thumbnail: track.thumbnail || album.value?.thumbnail,
      }),
    )
    .filter((track) => track.title),
);

const albumSubtitle = computed(() => {
  if (!album.value) return "";
  const parts = [];
  if (album.value.artists?.length) {
    parts.push(album.value.artists.map((artist) => artist.name).filter(Boolean).join(", "));
  }
  if (album.value.year) parts.push(album.value.year);
  return parts.join(" • ");
});

const stats = computed(() => {
  const list = [];
  if (album.value?.tracks?.length) list.push({ label: "Tracks", value: album.value.tracks.length });
  if (album.value?.duration) list.push({ label: "Length", value: album.value.duration });
  if (album.value?.year) list.push({ label: "Year", value: album.value.year });
  return list;
});

function playAll(shuffle) {
  const playable = tracks.value.filter((track) => track.videoId);
  if (!playable.length) return;
  const list = shuffle ? [...playable].sort(() => Math.random() - 0.5) : playable;
  appState?.play(list[0], list);
}

async function load() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const data = await fetchJson(`/api/ytmusic/album/${encodeURIComponent(props.albumId)}`, { timeout: 15000 });
    album.value = cleanData(data);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

watch(() => props.albumId, load, { immediate: true });
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.error-banner {
  font-size: 12px;
  color: var(--danger);
  background: rgba(255, 69, 58, 0.1);
  border-radius: var(--radius-md);
  padding: 10px 14px;
}
</style>
