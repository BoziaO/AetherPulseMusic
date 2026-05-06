<template>
  <PageSkeleton v-if="loading" />

  <div v-else class="animate-in">
    <div v-if="error" class="mb-5 rounded-lg border p-4 text-sm font-bold" style="border-color: color-mix(in srgb, var(--danger) 32%, transparent); background: color-mix(in srgb, var(--danger) 10%, transparent); color: var(--text-main)">
      <p>{{ error }}</p>
      <button class="ghost-button mt-3 px-3" type="button" @click="loadPage">{{ app.t('tryAgain') }}</button>
    </div>

    <PageHero
      :title="heroTitle"
      :subtitle="heroSubtitle"
      :eyebrow="displayData?.eyebrow"
      :cover="displayData?.thumbnail || displayData?.cover || displayData?.art"
      :stats="displayStats"
      :playable="tracks.length > 0"
      :disabled="tracks.length === 0"
      :play-label="app.t('playAll')"
      @play="app.play(tracks[0], tracks)"
    >
      <template #actions>
        <button v-if="pageKey === 'playlists' && selectedPlaylistId" class="ghost-button px-4" type="button" @click="router.push('/playlists')">
          <ArrowLeft :size="16" />
          Wszystkie playlisty
        </button>
      </template>
    </PageHero>

    <div v-if="chips.length" class="mb-7 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <span v-for="chip in chips" :key="chip" class="chip px-3 py-1.5 text-xs font-black">{{ chip }}</span>
    </div>

    <section v-if="pageKey === 'playlists' && !selectedPlaylistId" class="panel mb-7 grid gap-3 p-4 lg:grid-cols-2">
      <div class="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input v-model="newPlaylistTitle" class="rounded-lg border px-3 py-2 text-sm font-semibold" style="background: var(--bg-input); border-color: var(--surface-line); color: var(--text-main)" placeholder="Nazwa lokalnej playlisty" />
        <button class="primary-button px-4" type="button" :disabled="!newPlaylistTitle.trim() || actionLoading" @click="createPlaylist">
          <Plus :size="16" />
          Utworz
        </button>
      </div>
      <div class="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input v-model="importPlaylistId" class="rounded-lg border px-3 py-2 text-sm font-semibold" style="background: var(--bg-input); border-color: var(--surface-line); color: var(--text-main)" placeholder="ID playlisty YouTube Music" />
        <button class="ghost-button px-4" type="button" :disabled="!importPlaylistId.trim() || actionLoading" @click="importPlaylist">
          <Download :size="16" />
          Importuj
        </button>
      </div>
    </section>

    <section v-if="pageKey === 'home'" class="panel mb-8 p-4">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">

        <div>
          <h2 class="text-xl font-black">{{ app.t('flowComposer') }}</h2>
          <p class="text-sm font-semibold" style="color: var(--text-muted)">Focus, energia albo spokojniejsze przejscie z aktualnej puli utworow.</p>
        </div>
        <button class="primary-button px-4" type="button" :disabled="flowLoading" @click="generateFlow">
          <Sparkles :size="16" />
          {{ flowLoading ? "Generuje..." : app.t('generateFlow') }}
        </button>
      </div>

      <div class="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            v-for="preset in flowPresets"
            :key="preset.key"
            class="rounded-lg border px-3 py-2 text-left text-sm font-black"
            type="button"
            :style="flowPreset === preset.key ? selectedControlStyle : controlStyle"
            @click="flowPreset = preset.key"
          >
            {{ preset.label }}
          </button>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="tool-card border p-3" style="border-color: var(--surface-line); background: var(--bg-card)">
            <span class="mb-2 flex justify-between text-xs font-black" style="color: var(--text-muted)">
              <span>{{ app.t('sessionLength') }}</span>
              <span>{{ flowMinutes }} min</span>
            </span>
            <input v-model.number="flowMinutes" type="range" min="10" max="120" step="5" />
          </label>
          <label class="tool-card border p-3" style="border-color: var(--surface-line); background: var(--bg-card)">
            <span class="mb-2 flex justify-between text-xs font-black" style="color: var(--text-muted)">
              <span>{{ app.t('discoveryLevel') }}</span>
              <span>{{ flowNovelty }}%</span>
            </span>
            <input v-model.number="flowNovelty" type="range" min="0" max="100" step="5" />
          </label>
        </div>
        <button class="ghost-button px-4" type="button" :disabled="!flowQueue.length" @click="app.play(flowQueue[0], flowQueue)">
          <Play :size="16" fill="currentColor" />
          {{ app.t('playFlow') }}
        </button>
      </div>

      <p v-if="flowError" class="mt-3 text-sm font-bold" style="color: var(--warning)">{{ flowError }}</p>
      <TrackList
        v-if="flowQueue.length"
        class="mt-4"
        :tracks="flowQueue"
        :now-playing="app.nowPlaying.value"
        :favorite-keys="app.favoriteKeys.value"
        @play="app.play"
        @play-next="app.playNext"
        @add-queue="app.addToQueue"
        @toggle-favorite="app.toggleFavoriteTrack"
      />

      <HomeGamesPanel />
    </section>


    <div class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div class="min-w-0 space-y-8">
        <section v-if="tracks.length">
          <SectionTitle :title="selectedPlaylistId ? 'Utwory playlisty' : app.t('tracks')" :count="tracks.length" />
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

        <section v-if="primaryItems.length">
          <SectionTitle :title="displayData?.primarySection?.title || 'Polecane'" />
          <MediaGrid :items="primaryItems" @open="openItem" />
        </section>

        <section v-if="tertiaryItems.length">
          <SectionTitle :title="displayData?.tertiarySection?.title || 'Wiecej muzyki'" />
          <MediaGrid :items="tertiaryItems" @open="openItem" />
        </section>

        <section v-if="!tracks.length && !primaryItems.length && !loading">
          <div class="panel flex min-h-52 flex-col items-center justify-center gap-3 p-6 text-center">
            <Music2 :size="44" style="color: var(--text-soft)" />
            <p class="text-lg font-black">{{ emptyTitle }}</p>
            <p class="max-w-md text-sm font-semibold" style="color: var(--text-muted)">{{ emptySubtitle }}</p>
          </div>
        </section>
      </div>

      <aside class="space-y-8">
        <section v-if="chartItems.length" class="panel p-4">
          <SectionTitle :title="displayData?.chartTitle || 'Top'" small />
          <div class="space-y-1">
            <button
              v-for="(item, index) in chartItems"
              :key="item.videoId || item.browseId || `${item.title}-${index}`"
              class="track-row grid w-full grid-cols-[36px_1fr_auto] items-center gap-3 p-2 text-left"
              type="button"
              @click="openItem(item)"
            >
              <span class="text-xs font-black" style="color: var(--text-soft)">{{ item.label || `#${index + 1}` }}</span>
              <span class="min-w-0">
                <span class="block truncate text-sm font-black">{{ item.title }}</span>
                <span class="block truncate text-xs font-semibold" style="color: var(--text-muted)">{{ item.subtitle }}</span>
              </span>
              <TrendingUp :size="15" style="color: var(--success)" />
            </button>
          </div>
        </section>

        <section v-if="secondaryItems.length">
          <SectionTitle :title="displayData?.secondarySection?.title || 'Rekomendacje'" small />
          <MediaGrid :items="secondaryItems.slice(0, 6)" @open="openItem" />
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, inject, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, Download, Music2, Play, Plus, Sparkles, TrendingUp } from "lucide-vue-next";
import MediaGrid from "../components/MediaGrid.vue";
import PageHero from "../components/PageHero.vue";
import PageSkeleton from "../components/PageSkeleton.vue";
import TrackList from "../components/TrackList.vue";
import HomeGamesPanel from "../components/HomeGamesPanel.vue";

import { fetchJson } from "../lib/api";
import { cleanData, normalizeTrack, trackKey } from "../lib/format";
import { estimateEnergy } from "../lib/energy";

const props = defineProps({
  pageKey: { type: String, required: true },
});

const app = inject("appState");
const route = useRoute();
const router = useRouter();

const loading = ref(false);
const actionLoading = ref(false);
const error = ref("");
const pageData = ref(null);
const localData = ref(null);
const newPlaylistTitle = ref("");
const importPlaylistId = ref("");
const flowPreset = ref("discover");
const flowMinutes = ref(35);
const flowNovelty = ref(55);
const flowQueue = ref([]);
const flowLoading = ref(false);
const flowError = ref("");

const flowPresets = [
  { key: "focus", label: "Focus" },
  { key: "energy", label: "Energy" },
  { key: "chill", label: "Chill" },
  { key: "discover", label: "Discover" },
];
const controlStyle = "border-color: var(--surface-line); background: var(--bg-card); color: var(--text-muted)";
const selectedControlStyle = "border-color: var(--primary); background: color-mix(in srgb, var(--primary) 15%, var(--bg-card)); color: var(--text-main)";

const selectedPlaylistId = computed(() => route.query.playlist || "");
const displayData = computed(() => {
  if (props.pageKey === "favorites") return favoritePageData();
  if (props.pageKey === "recent") return recentPageData();
  return localData.value || pageData.value;
});
const tracks = computed(() => normalizeList(displayData.value?.tracks || displayData.value?.songs || displayData.value?.queue || []));
const primaryItems = computed(() => normalizeList(displayData.value?.primarySection?.items || []));
const secondaryItems = computed(() => normalizeList(displayData.value?.secondarySection?.items || []));
const tertiaryItems = computed(() => normalizeList(displayData.value?.tertiarySection?.items || []));
const chartItems = computed(() => normalizeList(displayData.value?.chartItems || []));
const chips = computed(() => displayData.value?.chips || []);
const displayStats = computed(() => {
  const base = displayData.value?.stats || [];
  if (props.pageKey === "favorites") return [{ label: "Ulubione", value: String(app.favoriteItems.value.length) }];
  if (props.pageKey === "recent") return [{ label: "Historia", value: String(app.recentPlays.value.length) }];
  return base;
});
const heroTitle = computed(() => displayData.value?.title || displayData.value?.name || "AetherPulse Music");
const heroSubtitle = computed(() => displayData.value?.description || displayData.value?.author || "Muzyka, playlisty i odtwarzanie z YouTube Music.");
const emptyTitle = computed(() => (props.pageKey === "favorites" ? app.t("emptyFavorites") : props.pageKey === "recent" ? app.t("emptyRecent") : "Brak danych"));
const emptySubtitle = computed(() => (props.pageKey === "playlists" ? "Utworz lokalna playliste albo polacz konto Google." : "Sprobuj odswiezyc strone lub wyszukac muzyke."));

function normalizeList(list) {
  return Array.isArray(list) ? list.map(normalizeTrack).filter(Boolean) : [];
}

function favoritePageData() {
  return {
    eyebrow: "Biblioteka",
    title: app.t("favorites"),
    description: "Utwory zapisane w tej przegladarce i synchronizowane z backendem, jesli jest dostepny.",
    chips: ["Local", "Quick play"],
    tracks: app.favoriteItems.value,
  };
}

function recentPageData() {
  return {
    eyebrow: "Historia",
    title: app.t("recentlyPlayed"),
    description: "Ostatnio odtwarzane utwory z tej przegladarki.",
    chips: ["Historia", "Local"],
    tracks: app.recentPlays.value,
  };
}

async function loadPage() {
  error.value = "";
  if (props.pageKey === "favorites" || props.pageKey === "recent") {
    loading.value = false;
    return;
  }

  loading.value = true;
  localData.value = null;
  try {
    if (props.pageKey === "playlists" && selectedPlaylistId.value) {
      const rawId = String(selectedPlaylistId.value);
      const isLocal = rawId.startsWith("local-");
      const id = isLocal ? rawId.replace("local-", "") : rawId;
      const data = await fetchJson(isLocal ? `/api/local/playlists/${encodeURIComponent(id)}` : `/api/ytmusic/playlist/${encodeURIComponent(id)}`, { timeout: 15000 });
      localData.value = cleanData(playlistToPage(data, rawId));
    } else {
      const params = new URLSearchParams();
      if (props.pageKey === "home" && app.recentPlays.value.length) {
        params.set("recent", app.recentPlays.value.map((track) => track.videoId).filter(Boolean).slice(0, 5).join(","));
      }
      const suffix = params.toString() ? `?${params.toString()}` : "";
      pageData.value = cleanData(await fetchJson(`/api/page/${props.pageKey}${suffix}`, { timeout: 18000 }));
    }
  } catch (err) {
    error.value = err.message || app.t("backendError");
  } finally {
    loading.value = false;
  }
}

function playlistToPage(data, rawId) {
  const tracksList = data.tracks || data.songs || [];
  return {
    eyebrow: rawId.startsWith("local-") ? "Lokalna playlista" : "YouTube Music",
    title: data.title || data.name || "Playlista",
    description: data.description || data.author || `${tracksList.length} utworow`,
    thumbnail: data.thumbnail || data.cover,
    chips: [rawId.startsWith("local-") ? "Local" : "YouTube", `${tracksList.length} tracks`],
    stats: [
      { label: "Utwory", value: String(tracksList.length) },
      { label: "Zrodlo", value: rawId.startsWith("local-") ? "Local" : "YouTube" },
    ],
    tracks: tracksList,
  };
}

function openItem(item) {
  if (item.videoId) {
    app.play(item, [...tracks.value, ...primaryItems.value, ...secondaryItems.value, ...tertiaryItems.value].filter((entry) => entry.videoId));
    return;
  }
  app.openMediaItem(item);
}

async function createPlaylist() {
  actionLoading.value = true;
  try {
    await fetchJson("/api/local/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newPlaylistTitle.value.trim() }),
      timeout: 6000,
    });
    newPlaylistTitle.value = "";
    app.showToast("Playlista utworzona", "success");
    await loadPage();
  } catch (err) {
    app.showToast(err.message, "error");
  } finally {
    actionLoading.value = false;
  }
}

async function importPlaylist() {
  actionLoading.value = true;
  try {
    const id = importPlaylistId.value.trim();
    const result = await fetchJson(`/api/local/playlists/import-yt/${encodeURIComponent(id)}`, {
      method: "POST",
      timeout: 20000,
    });
    importPlaylistId.value = "";
    app.showToast(result.title ? `Zaimportowano: ${result.title}` : "Playlista zaimportowana", "success");
    await loadPage();
  } catch (err) {
    app.showToast(err.message, "error");
  } finally {
    actionLoading.value = false;
  }
}

async function generateFlow() {
  const pool = [...tracks.value, ...primaryItems.value, ...secondaryItems.value, ...tertiaryItems.value, ...chartItems.value].filter((item) => item.videoId);
  flowLoading.value = true;
  flowError.value = "";
  try {
    const data = await fetchJson("/api/flows/revolution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preset: flowPreset.value,
        sessionMinutes: flowMinutes.value,
        novelty: flowNovelty.value,
        pool,
        recentTracks: app.recentPlays.value,
        favoriteTracks: app.favoriteItems.value,
      }),
      timeout: 16000,
    });
    flowQueue.value = normalizeList(data.queue || []);
  } catch {
    flowQueue.value = buildLocalFlow(pool);
    flowError.value = app.t("fallbackFlow");
  } finally {
    flowLoading.value = false;
  }
}

function buildLocalFlow(pool) {
  const unique = new Map();
  pool.forEach((track) => {
    if (track.videoId && !unique.has(track.videoId)) unique.set(track.videoId, normalizeTrack(track));
  });
  const targets = {
    focus: [35, 58, 42],
    energy: [45, 82, 60],
    chill: [28, 46, 26],
    discover: [52, 72, 44],
  }[flowPreset.value] || [52, 72, 44];
  const count = Math.max(8, Math.round(flowMinutes.value / 3));
  const used = new Set();
  return Array.from({ length: count })
    .map((_, index) => {
      const target = targets[Math.min(2, Math.floor((index / count) * 3))];
      const next = Array.from(unique.values())
        .filter((track) => !used.has(trackKey(track)))
        .map((track) => ({ track, score: Math.abs(estimateEnergy(track) - target) + Math.random() * 6 }))
        .sort((a, b) => a.score - b.score)[0]?.track;
      if (next) used.add(trackKey(next));
      return next;
    })
    .filter(Boolean);
}

watch(() => [props.pageKey, route.query.playlist], loadPage, { immediate: true });

const SectionTitle = defineComponent({
  props: {
    title: { type: String, required: true },
    count: { type: Number, default: null },
    small: { type: Boolean, default: false },
  },
  setup(sectionProps) {
    return () => h("div", { class: "mb-4 flex items-center justify-between gap-3" }, [
      h(sectionProps.small ? "h3" : "h2", { class: sectionProps.small ? "text-lg font-black" : "text-2xl font-black" }, sectionProps.title),
      sectionProps.count !== null
        ? h("span", { class: "rounded-full px-2.5 py-1 text-xs font-black", style: "background: color-mix(in srgb, var(--primary) 14%, var(--bg-card)); color: var(--primary)" }, String(sectionProps.count))
        : null,
    ]);
  },
});
</script>
