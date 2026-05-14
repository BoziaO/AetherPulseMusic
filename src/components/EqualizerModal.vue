<template>
  <Transition name="eq-modal">
    <div v-if="open" class="eq-overlay" @click.self="$emit('close')">
      <section class="eq-modal" role="dialog" aria-modal="true">
        <header class="eq-head">
          <div class="eq-head-text">
            <h2 class="eq-title">{{ t('audioMixer') }}</h2>
            <p class="eq-sub">{{ t('audioMixerDesc') }}</p>
          </div>
          <button class="icon-btn" type="button" :title="t('close')" @click="$emit('close')">
            <X :size="18" />
          </button>
        </header>

        <div class="eq-body">
          <div class="eq-toggle-row">
            <div class="eq-toggle-text">
              <p class="row-title">{{ t('eqEnable') }}</p>
              <p class="row-sub">{{ t('eqEnableDesc') }}</p>
            </div>
            <button
              class="toggle"
              :class="state.enabled ? 'toggle-on' : ''"
              type="button"
              :aria-pressed="state.enabled"
              @click="onToggleEnabled"
            >
              <span class="toggle-thumb" />
            </button>
          </div>

          <p v-if="!hasSupport" class="eq-warning">
            <Info :size="14" /> {{ t('eqUnsupported') }}
          </p>
          <p v-else-if="iframeMode" class="eq-warning">
            <Info :size="14" /> {{ t('eqIframeWarning') }}
          </p>
          <p v-else class="eq-info">
            <BadgeCheck :size="14" /> {{ t('eqHtml5Active') }}
          </p>

          <div class="eq-section">
            <header class="eq-section-head">
              <h3 class="eq-section-title">{{ t('eqPresets') }}</h3>
              <button class="link-btn" type="button" @click="resetEq">
                <RefreshCw :size="13" /> {{ t('eqReset') }}
              </button>
            </header>
            <div class="preset-grid">
              <button
                v-for="preset in presets"
                :key="preset.id"
                class="preset-chip"
                :class="state.preset === preset.id ? 'preset-chip-active' : ''"
                type="button"
                :disabled="!state.enabled"
                @click="selectPreset(preset.id)"
              >
                {{ t(preset.label) }}
              </button>
            </div>
          </div>

          <div class="eq-section">
            <h3 class="eq-section-title">{{ t('equalizer') }}</h3>
            <div class="bands">
              <div
                v-for="(band, index) in state.bandFrequencies"
                :key="band"
                class="band"
                :class="{ 'band-disabled': !state.enabled }"
              >
                <span class="band-value">{{ formatGain(state.bands[index]) }}</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  orient="vertical"
                  :value="state.bands[index]"
                  :disabled="!state.enabled"
                  class="band-slider"
                  @input="updateBand(index, Number($event.target.value))"
                />
                <span class="band-label">{{ bandLabel(band) }}</span>
              </div>
            </div>
          </div>

          <div class="eq-section">
            <h3 class="eq-section-title">{{ t('bassBoost') }}</h3>
            <p class="row-sub">{{ t('bassBoostDesc') }}</p>
            <div class="slider-row">
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                :value="state.bassBoost"
                :disabled="!state.enabled"
                class="am-slider am-slider-pink"
                :style="{ '--progress': `${(state.bassBoost / 12) * 100}%` }"
                @input="setBassBoost(Number($event.target.value))"
              />
              <span class="slider-value">+{{ formatGain(state.bassBoost, true) }}</span>
            </div>
          </div>

          <div class="eq-section">
            <h3 class="eq-section-title">{{ t('eqBalance') }}</h3>
            <div class="slider-row">
              <span class="slider-side">L</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                :value="state.balance"
                :disabled="!state.enabled"
                class="am-slider"
                :style="{ '--progress': `${((state.balance + 1) / 2) * 100}%` }"
                @input="setBalance(Number($event.target.value))"
              />
              <span class="slider-side">R</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Transition>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from "vue";
import { BadgeCheck, Info, RefreshCw, X } from "lucide-vue-next";
import {
  EQ_PRESETS,
  getState as getEngineState,
  reset as resetEngine,
  setBalance as engineSetBalance,
  setBand as engineSetBand,
  setBassBoost as engineSetBassBoost,
  setEnabled as engineSetEnabled,
  setPreset as engineSetPreset,
  subscribe as engineSubscribe,
} from "../lib/audioEngine";

const props = defineProps({
  open: { type: Boolean, default: false },
});

defineEmits(["close"]);

const app = inject("appState");
const state = ref(getEngineState());

let unsubscribe = null;
const hasSupport = computed(() => {
  if (typeof window === "undefined") return false;
  return Boolean(window.AudioContext || window.webkitAudioContext);
});

// Pokaż ostrzeżenie tylko gdy aktualnie używamy iframe (cross-origin = brak EQ).
// W trybie HTML5 (proxy stream) EQ działa poprawnie.
const iframeMode = computed(() => app?.activeEngine?.value === "iframe");

const presets = computed(() => [
  ...EQ_PRESETS.map((id) => ({ id, label: presetLabelKey(id) })),
  { id: "custom", label: "eqPresetCustom" },
]);

function presetLabelKey(id) {
  return {
    flat: "eqPresetFlat",
    rock: "eqPresetRock",
    pop: "eqPresetPop",
    jazz: "eqPresetJazz",
    classical: "eqPresetClassical",
    electronic: "eqPresetElectronic",
    vocal: "eqPresetVocal",
    custom: "eqPresetCustom",
  }[id] || "eqPresetCustom";
}

function t(key, vars) {
  return app?.t?.(key, vars) ?? key;
}

function bandLabel(freq) {
  if (freq >= 1000) return `${(freq / 1000).toFixed(freq >= 10000 ? 0 : 1)}k`;
  return `${freq}`;
}

function formatGain(value, signed = false) {
  const num = Number(value) || 0;
  if (signed) return `${num.toFixed(1)} dB`;
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(1)} dB`;
}

function selectPreset(id) {
  if (id === "custom") return; // custom emerges automatically when bands deviate
  engineSetPreset(id);
}

function updateBand(index, value) {
  engineSetBand(index, value);
}

function setBassBoost(value) {
  engineSetBassBoost(value);
}

function setBalance(value) {
  engineSetBalance(value);
}

function onToggleEnabled() {
  engineSetEnabled(!state.value.enabled);
}

function resetEq() {
  resetEngine();
}

onMounted(() => {
  unsubscribe = engineSubscribe((next) => {
    state.value = next;
  });
});

onBeforeUnmount(() => {
  if (unsubscribe) unsubscribe();
});
</script>

<style scoped>
.eq-overlay {
  position: fixed;
  inset: 0;
  z-index: 280;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  padding: 16px;
}

.eq-modal {
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  background: var(--bg-card-strong);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-strong);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.eq-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--line);
}

.eq-head-text {
  min-width: 0;
}

.eq-title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.eq-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.eq-body {
  padding: 16px 20px 22px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.eq-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.row-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.row-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.eq-warning {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--warning);
  background: rgba(255, 214, 10, 0.08);
  padding: 8px 12px;
  border-radius: var(--radius-md);
}

.eq-info {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--success);
  background: rgba(48, 209, 88, 0.08);
  padding: 8px 12px;
  border-radius: var(--radius-md);
}

.eq-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.eq-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.eq-section-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
}

.preset-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-chip {
  padding: 6px 12px;
  border-radius: 100px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  border: 1.5px solid transparent;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.preset-chip:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.preset-chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.preset-chip-active {
  background: var(--primary);
  color: #fff;
}

.bands {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 10px;
  height: 180px;
  padding: 8px 4px;
}

.band {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.band-disabled {
  opacity: 0.4;
}

.band-value {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--text-tertiary);
}

.band-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
}

.band-slider {
  writing-mode: vertical-lr;
  direction: rtl;
  width: 30px;
  height: 130px;
  background: transparent;
  cursor: pointer;
}

.band-slider::-webkit-slider-runnable-track {
  width: 4px;
  background: var(--line-strong);
  border-radius: 2px;
}

.band-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--primary);
  border: 2px solid var(--bg-base);
  margin-left: -5px;
  box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.45);
}

.band-slider::-moz-range-track {
  width: 4px;
  background: var(--line-strong);
  border-radius: 2px;
}

.band-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--primary);
  border: 2px solid var(--bg-base);
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider-row input[type="range"] {
  flex: 1;
}

.slider-value {
  min-width: 64px;
  text-align: right;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}

.slider-side {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
}

.toggle {
  width: 44px;
  height: 26px;
  border-radius: 13px;
  background: var(--bg-input);
  position: relative;
  flex-shrink: 0;
  transition: background var(--transition-fast);
}

.toggle-on {
  background: var(--success);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  transition: transform var(--transition-fast);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-on .toggle-thumb {
  transform: translateX(18px);
}

.eq-modal-enter-active,
.eq-modal-leave-active {
  transition: opacity 0.2s ease;
}

.eq-modal-enter-active .eq-modal,
.eq-modal-leave-active .eq-modal {
  transition: transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.2s ease;
}

.eq-modal-enter-from,
.eq-modal-leave-to {
  opacity: 0;
}

.eq-modal-enter-from .eq-modal,
.eq-modal-leave-to .eq-modal {
  transform: translateY(20px) scale(0.96);
  opacity: 0;
}
</style>
