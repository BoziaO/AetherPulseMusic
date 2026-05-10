<template>
  <div class="detail-page animate-fade">
    <PageSkeleton v-if="loading" />

    <template v-else-if="artist">
      <PageHero
        :eyebrow="t('navArtists')"
        :title="artist.name"
        :subtitle="artist.description || ''"
        :cover="artist.thumbnail"
        :stats="stats"
        :playable="topSongs.length > 0"
        :shuffleable="topSongs.length > 0"
        :play-label="t('playAll')"
        :shuffle-label="t('shuffle')"
        @play="playAll(false)"
        @shuffle="playAll(true)"
      />

      <ContextNotes
        :item-id="props.artistId"
        :item-type="'artist'"
        :item-title="artist.name"
      />

      <section v-if="topSongs.length" class="section">
        <h2 class="section-title">{{ t('topCharts') }}</h2>
        <TrackList
          :tracks="topSongs"
          :now-playing="appState.nowPlaying.value"
          :favorite-keys="appState.favoriteKeys.value"
          @play="(track) => appState.play(track, topSongs)"
          @add-queue="appState.addToQueue"
          @play-next="appState.playNext"
          @toggle-favorite="appState.toggleFavoriteTrack"
        />
      </section>

      <section v-if="albums.length" class="section">
        <h2 class="section-title">{{ t('navAlbums') }}</h2>
        <MediaGrid
          :items="albums"
          @open="(item) => $router.push(`/album/${item.browseId}`)"
        />
      </section>

      <section v-if="singles.length" class="section">
        <h2 class="section-title">Singles</h2>
        <MediaGrid
          :items="singles"
          @open="(item) => $router.push(`/album/${item.browseId}`)"
        />
      </section>
    </template>

    <p v-else-if="errorMessage" class="error-banner">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { computed, inject, ref, watch } from "vue";
import MediaGrid from "../components/MediaGrid.vue";
import PageHero from "../components/PageHero.vue";
import PageSkeleton from "../components/PageSkeleton.vue";
import TrackList from "../components/TrackList.vue";
import ContextNotes from "../components/ContextNotes.vue";
import { fetchJson } from "../lib/api";
import { cleanData, normalizeTrack } from "../lib/format";

const props = defineProps({
  artistId: { type: String, required: true },
});

const appState = inject("appState");
function t(key) {
  return appState?.t?.(key) ?? key;
}

const loading = ref(false);
const errorMessage = ref("");
const artist = ref(null);

const topSongs = computed(() =>
  ((artist.value?.songs?.results || artist.value?.songs || [])
    .map(normalizeTrack)
    .filter((track) => track.videoId))
    .slice(0, 12),
);

const albums = computed(() =>
  (artist.value?.albums?.results || artist.value?.albums || [])
    .map((album) => ({
      title: album.title,
      thumbnail: album.thumbnail || album.thumbnails?.[album.thumbnails.length - 1]?.url,
      browseId: album.browseId,
      subtitle: album.year || "",
    }))
    .filter((album) => album.browseId),
);

const singles = computed(() =>
  (artist.value?.singles?.results || artist.value?.singles || [])
    .map((single) => ({
      title: single.title,
      thumbnail: single.thumbnail || single.thumbnails?.[single.thumbnails.length - 1]?.url,
      browseId: single.browseId,
      subtitle: single.year || "",
    }))
    .filter((item) => item.browseId),
);

const stats = computed(() => {
  const list = [];
  if (artist.value?.subscribers) list.push({ label: "Subscribers", value: artist.value.subscribers });
  if (artist.value?.views) list.push({ label: "Views", value: artist.value.views });
  if (topSongs.value.length) list.push({ label: "Top songs", value: topSongs.value.length });
  if (albums.value.length) list.push({ label: "Albums", value: albums.value.length });
  return list;
});

function playAll(shuffle) {
  if (!topSongs.value.length) return;
  const list = shuffle ? [...topSongs.value].sort(() => Math.random() - 0.5) : topSongs.value;
  appState?.play(list[0], list);
}

async function load() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const data = await fetchJson(`/api/ytmusic/artist/${encodeURIComponent(props.artistId)}`, { timeout: 15000 });
    artist.value = cleanData(data);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

watch(() => props.artistId, load, { immediate: true });
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 36px;
}
.section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.section-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.error-banner {
  font-size: 12px;
  color: var(--danger);
  background: rgba(255, 69, 58, 0.1);
  border-radius: var(--radius-md);
  padding: 10px 14px;
}
</style>
