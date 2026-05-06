<template>
  <PageSkeleton v-if="loading" />
  <div v-else class="animate-in">
    <div v-if="error" class="mb-5 rounded-lg border p-4 text-sm font-bold" style="border-color: color-mix(in srgb, var(--danger) 32%, transparent); background: color-mix(in srgb, var(--danger) 10%, transparent)">
      {{ error }}
    </div>

    <PageHero
      :title="artist?.title || artist?.name || 'Wykonawca'"
      :subtitle="artist?.description || artist?.subtitle || 'Profil wykonawcy z YouTube Music.'"
      :cover="artist?.thumbnail || artist?.cover || artist?.art"
      :stats="stats"
      :playable="tracks.length > 0"
      :disabled="tracks.length === 0"
      :play-label="app.t('playAll')"
      @play="app.play(tracks[0], tracks)"
    />

    <section v-if="tracks.length" class="mb-8">
      <SectionTitle title="Najpopularniejsze utwory" :count="tracks.length" />
      <TrackList
        :tracks="tracks"
        :now-playing="app.nowPlaying.value"
        :favorite-keys="app.favoriteKeys.value"
        @play="app.play"
        @play-next="app.playNext"
        @add-queue="app.addToQueue"
        @toggle-favorite="app.toggleFavoriteTrack"
      />
    </section>

    <section v-if="mediaItems.length">
      <SectionTitle title="Albumy i single" />
      <MediaGrid :items="mediaItems" @open="openItem" />
    </section>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, inject, ref, watch } from "vue";
import MediaGrid from "../components/MediaGrid.vue";
import PageHero from "../components/PageHero.vue";
import PageSkeleton from "../components/PageSkeleton.vue";
import TrackList from "../components/TrackList.vue";
import { fetchJson } from "../lib/api";
import { cleanData, normalizeTrack } from "../lib/format";

const props = defineProps({
  artistId: { type: String, required: true },
});

const app = inject("appState");
const artist = ref(null);
const loading = ref(false);
const error = ref("");

const tracks = computed(() => normalizeList(artist.value?.songs || artist.value?.tracks || artist.value?.videos || []));
const mediaItems = computed(() => normalizeList([...(artist.value?.albums || []), ...(artist.value?.singles || []), ...(artist.value?.playlists || [])]));
const stats = computed(() => [
  { label: "Utwory", value: String(tracks.value.length) },
  { label: "Wydania", value: String(mediaItems.value.length) },
]);

function normalizeList(list) {
  return Array.isArray(list) ? list.map(normalizeTrack).filter(Boolean) : [];
}

function openItem(item) {
  if (item.videoId) app.play(item, tracks.value);
  else app.openMediaItem(item);
}

async function loadArtist() {
  loading.value = true;
  error.value = "";
  try {
    artist.value = cleanData(await fetchJson(`/api/ytmusic/artist/${encodeURIComponent(props.artistId)}`, { timeout: 16000 }));
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

watch(() => props.artistId, loadArtist, { immediate: true });

const SectionTitle = defineComponent({
  props: { title: { type: String, required: true }, count: { type: Number, default: null } },
  setup(sectionProps) {
    return () => h("div", { class: "mb-4 flex items-center justify-between gap-3" }, [
      h("h2", { class: "text-2xl font-black" }, sectionProps.title),
      sectionProps.count !== null ? h("span", { class: "rounded-full px-2.5 py-1 text-xs font-black", style: "background: color-mix(in srgb, var(--primary) 14%, var(--bg-card)); color: var(--primary)" }, String(sectionProps.count)) : null,
    ]);
  },
});
</script>
