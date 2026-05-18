<template>
  <section class="flow">
    <div class="flow-hero">
      <div class="flow-hero-text">
        <div class="flow-eyebrow">
          <Sparkles :size="12" />
          AI Flow Generator
        </div>
        <h3 class="flow-title">{{ t('flowComposer') }}</h3>
        <p class="flow-sub">{{ t('flowSubtitle') }}</p>
      </div>
      <div class="flow-glow" :class="`glow-${selectedPreset}`" />
    </div>

    <div class="preset-cards">
      <button
        v-for="preset in presets"
        :key="preset.value"
        class="preset-card"
        :class="selectedPreset === preset.value ? 'preset-active' : ''"
        type="button"
        @click="selectedPreset = preset.value"
      >
        <span class="preset-emoji">{{ preset.emoji }}</span>
        <span class="preset-name">{{ preset.label }}</span>
        <span class="preset-desc">{{ preset.desc }}</span>
      </button>
    </div>

    <div class="flow-controls">
      <div class="control-row">
        <div class="control-block">
          <div class="control-head">
            <Clock :size="13" />
            <span>{{ t('sessionLength') }}</span>
          </div>
          <div class="slider-val">{{ sessionMinutes }} min</div>
          <input
            v-model.number="sessionMinutes"
            type="range"
            min="10"
            max="120"
            step="5"
            class="flow-slider"
          />
          <div class="slider-labels">
            <span>10 min</span>
            <span>2h</span>
          </div>
        </div>

        <div class="control-block">
          <div class="control-head">
            <Compass :size="13" />
            <span>{{ t('discoveryLevel') }}</span>
          </div>
          <div class="slider-val">{{ noveltyLabel }}</div>
          <input
            v-model.number="novelty"
            type="range"
            min="0"
            max="100"
            step="5"
            class="flow-slider"
          />
          <div class="slider-labels">
            <span>Znane</span>
            <span>Odkrywcze</span>
          </div>
        </div>
      </div>
    </div>

    <div class="flow-actions">
      <button
        class="generate-btn"
        :class="loading ? 'is-loading' : ''"
        type="button"
        :disabled="loading"
        @click="generate"
      >
        <span class="generate-inner">
          <Sparkles :size="15" />
          <span>{{ loading ? t('generating') : t('generateFlow') }}</span>
        </span>
        <span v-if="loading" class="generate-spinner" />
      </button>
      <button v-if="result?.tracks?.length" class="play-flow-btn" type="button" @click="playFlow">
        <Play :size="15" fill="currentColor" />
        {{ t('playFlow') }}
      </button>
    </div>

    <Transition name="flow-list-appear">
      <div v-if="result?.tracks?.length" class="flow-results">
        <div class="flow-results-head">
          <span class="flow-results-count">
            <Music2 :size="13" />
            {{ result.tracks.length }} utworów · {{ sessionMinutes }} min
          </span>
          <span v-if="result.preset" class="flow-results-preset">{{ result.preset }}</span>
        </div>
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
    </Transition>

    <p v-if="warning" class="flow-warning">
      <AlertCircle :size="13" /> {{ warning }}
    </p>
  </section>
</template>

<script setup>
import { computed, inject, ref } from "vue";
import { AlertCircle, Clock, Compass, Music2, Play, Sparkles } from "lucide-vue-next";
import TrackList from "./TrackList.vue";
import { fetchJson } from "../lib/api";
import { normalizeTrack } from "../lib/format";

const appState = inject("appState");
function t(key) {
  return appState?.t?.(key) ?? key;
}

const presets = computed(() => [
  { value: "focus", label: t("presetFocus"), emoji: "🎯", desc: "Skupienie i produktywność" },
  { value: "energy", label: t("presetEnergy"), emoji: "⚡", desc: "Moc i intensywność" },
  { value: "chill", label: t("presetChill"), emoji: "🌊", desc: "Relaks i spokój" },
  { value: "discover", label: t("presetDiscover"), emoji: "🪐", desc: "Nowe dźwięki" },
]);

const selectedPreset = ref("focus");
const sessionMinutes = ref(35);
const novelty = ref(55);
const loading = ref(false);
const result = ref(null);
const warning = ref("");

const noveltyLabel = computed(() => {
  if (novelty.value < 25) return "Znane ulubione";
  if (novelty.value < 50) return "Głównie znane";
  if (novelty.value < 75) return "Mieszane";
  return "Nowe odkrycia";
});

async function generate() {
  loading.value = true;
  warning.value = "";
  result.value = null;
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
    const tracks = (data?.tracks || []).map(normalizeTrack).filter((t) => t.videoId);
    if (tracks.length) {
      result.value = { ...data, tracks, preset: selectedPreset.value };
    } else {
      throw new Error("no tracks");
    }
  } catch (error) {
    warning.value = t("fallbackFlow");
    const tracks = (appState?.recentPlays?.value || []).slice(0, 12).map(normalizeTrack);
    if (tracks.length) result.value = { tracks, preset: selectedPreset.value };
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
  position: relative;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  overflow: hidden;
}

.flow-hero {
  position: relative;
}

.flow-glow {
  position: absolute;
  top: -60px;
  right: -60px;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.25;
  pointer-events: none;
  transition: background 0.5s ease;
}
.glow-focus { background: #6366f1; }
.glow-energy { background: #f59e0b; }
.glow-chill { background: #06b6d4; }
.glow-discover { background: #a855f7; }

.flow-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary);
  margin-bottom: 6px;
}

.flow-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.flow-sub {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.preset-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

@media (max-width: 640px) {
  .preset-cards { grid-template-columns: repeat(2, 1fr); }
}

.preset-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 14px;
  border: 1.5px solid var(--line);
  background: var(--bg-base);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  text-align: center;
}

.preset-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.preset-active {
  border-color: var(--primary);
  background: rgba(var(--primary-rgb), 0.08);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
}

.preset-emoji {
  font-size: 22px;
  line-height: 1;
}

.preset-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
}

.preset-desc {
  font-size: 10px;
  color: var(--text-tertiary);
  line-height: 1.3;
}

.flow-controls {
  background: var(--bg-base);
  border-radius: 14px;
  padding: 16px;
}

.control-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 540px) {
  .control-row { grid-template-columns: 1fr; }
}

.control-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-head {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.slider-val {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.flow-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--bg-input);
  outline: none;
  cursor: pointer;
}

.flow-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.2);
  transition: box-shadow 0.15s;
}

.flow-slider::-webkit-slider-thumb:hover {
  box-shadow: 0 0 0 5px rgba(var(--primary-rgb), 0.3);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-tertiary);
}

.flow-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.generate-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 24px;
  background: var(--primary);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  overflow: hidden;
  transition: filter 0.15s, transform 0.15s;
  min-width: 160px;
}

.generate-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
.generate-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.generate-inner {
  display: flex;
  align-items: center;
  gap: 7px;
}

.generate-spinner {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  animation: shimmer 1.2s infinite;
}

@keyframes shimmer {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

.play-flow-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 11px 20px;
  background: var(--bg-base);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s;
}
.play-flow-btn:hover { border-color: var(--primary); color: var(--primary); }

.flow-list-appear-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.flow-list-appear-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.flow-results {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
  border-top: 1px solid var(--line);
}

.flow-results-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.flow-results-count {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.flow-results-preset {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary);
  background: rgba(var(--primary-rgb), 0.1);
  padding: 3px 8px;
  border-radius: 6px;
  text-transform: capitalize;
}

.flow-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--warning);
  margin: 0;
}
</style>
