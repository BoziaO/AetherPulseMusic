<template>
  <section class="flow">
    <header class="flow-head">
      <div>
        <h3 class="flow-title">{{ t('flowComposer') }}</h3>
        <p class="flow-sub">{{ t('flowSubtitle') }}</p>
      </div>
    </header>

    <div class="flow-grid">
      <div class="control">
        <label class="control-label">{{ t('presetFocus') }}</label>
        <div class="preset-row">
          <button
            v-for="preset in presets"
            :key="preset.value"
            class="chip"
            :class="selectedPreset === preset.value ? 'chip-active' : ''"
            type="button"
            @click="selectedPreset = preset.value"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>

      <div class="control">
        <label class="control-label">
          {{ t('sessionLength') }} — {{ sessionMinutes }} min
        </label>
        <input
          v-model.number="sessionMinutes"
          type="range"
          min="10"
          max="120"
          step="5"
          class="am-slider am-slider-pink"
          :style="{ '--progress': `${(sessionMinutes - 10) / 1.1}%` }"
        />
      </div>

      <div class="control">
        <label class="control-label">
          {{ t('discoveryLevel') }} — {{ novelty }}%
        </label>
        <input
          v-model.number="novelty"
          type="range"
          min="0"
          max="100"
          step="5"
          class="am-slider am-slider-pink"
          :style="{ '--progress': `${novelty}%` }"
        />
      </div>
    </div>

    <div class="flow-actions">
      <button class="btn-primary" type="button" :disabled="loading" @click="generate">
        <Sparkles :size="14" />
        {{ loading ? t('generating') : t('generateFlow') }}
      </button>
      <button v-if="result?.tracks?.length" class="btn-secondary" type="button" @click="playFlow">
        <Play :size="14" fill="currentColor" />
        {{ t('playFlow') }}
      </button>
    </div>

    <div v-if="result?.tracks?.length" class="flow-list">
      <TrackList
        :tracks="result.tracks"
        :now-playing="appState.nowPlaying.value"
        :favorite-keys="appState.favoriteKeys.value"
        @play="(track) => appState.play(track, result.tracks)"
        @add-queue="appState.addToQueue"
        @play-next="appState.playNext"
        @toggle-favorite="appState.toggleFavoriteTrack"
      />
    </div>

    <p v-if="warning" class="warning">{{ warning }}</p>
  </section>
</template>

<script setup>
import { computed, inject, ref } from "vue";
import { Play, Sparkles } from "lucide-vue-next";
import TrackList from "./TrackList.vue";
import { fetchJson } from "../lib/api";
import { normalizeTrack } from "../lib/format";

const appState = inject("appState");
function t(key) {
  return appState?.t?.(key) ?? key;
}

const presets = computed(() => [
  { value: "focus", label: t("presetFocus") },
  { value: "energy", label: t("presetEnergy") },
  { value: "chill", label: t("presetChill") },
  { value: "discover", label: t("presetDiscover") },
]);

const selectedPreset = ref("focus");
const sessionMinutes = ref(35);
const novelty = ref(55);
const loading = ref(false);
const result = ref(null);
const warning = ref("");

async function generate() {
  loading.value = true;
  warning.value = "";
  try {
    const pool = (appState?.recentPlays?.value || []).slice(0, 60);
    const data = await fetchJson("/api/flows/revolution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preset: selectedPreset.value,
        sessionMinutes: sessionMinutes.value,
        novelty: novelty.value,
        pool,
      }),
      timeout: 30000,
    });
    result.value = {
      ...data,
      tracks: (data?.tracks || []).map(normalizeTrack),
    };
  } catch (error) {
    warning.value = `${t("fallbackFlow")} ${error.message}`;
    const tracks = (appState?.recentPlays?.value || []).slice(0, 12).map(normalizeTrack);
    result.value = { tracks };
  } finally {
    loading.value = false;
  }
}

function playFlow() {
  const tracks = result.value?.tracks || [];
  if (!tracks.length) return;
  appState?.play(tracks[0], tracks);
}
</script>

<style scoped>
.flow {
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.flow-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.flow-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.flow-sub {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.flow-grid {
  display: grid;
  gap: 16px;
}

@media (min-width: 720px) {
  .flow-grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

.control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.flow-actions {
  display: flex;
  gap: 8px;
}

.flow-list {
  margin-top: 8px;
}

.warning {
  font-size: 12px;
  color: var(--warning);
}
</style>
