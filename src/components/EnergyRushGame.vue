<template>
  <section class="panel p-4">
    <div class="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 class="text-lg font-black">Energy Rush</h3>
        <p class="mt-1 text-sm font-semibold" style="color: var(--text-muted)">
          Tapuj cele w rytmie — nagroda zależy od dopasowania do energii utworu.
        </p>
      </div>
      <div class="text-right">
        <p class="text-xs font-black uppercase" style="color: var(--text-soft)">Wynik</p>
        <p class="text-2xl font-black" style="color: var(--text-main)">{{ score }}</p>
      </div>
    </div>

    <div class="mb-3 flex flex-wrap items-center gap-2">
      <button
        class="ghost-button px-3"
        type="button"
        :disabled="!enabled || playing"
        @click="start"
      >
        Start
      </button>
      <button
        class="ghost-button px-3"
        type="button"
        :disabled="!enabled || !playing"
        @click="reset"
      >
        Reset
      </button>

      <span class="ml-auto rounded-lg border px-3 py-1.5 text-xs font-black" style="border-color: var(--surface-line); background: var(--bg-card); color: var(--text-muted)">
        Postęp: {{ progressPercent }}%
      </span>
    </div>

    <div
      class="relative overflow-hidden rounded-xl border"
      style="border-color: var(--surface-line); background: var(--bg-card)"
    >
      <div
        class="absolute inset-x-0 top-0 h-2"
        style="background: color-mix(in srgb, var(--primary) 22%, transparent)"
      />
      <div class="relative grid place-items-center px-3 py-6">
        <div class="flex w-full flex-col items-center gap-3">
          <div class="text-center">
            <p class="text-xs font-black uppercase" style="color: var(--text-soft)">Cel</p>
            <p class="text-lg font-black">{{ targetLabel }}</p>
            <p class="mt-1 text-sm font-semibold" style="color: var(--text-muted)">
              Dopasuj tap do aktualnego „energy gate”.
            </p>
          </div>

          <div class="w-full max-w-md">
            <div class="flex items-center justify-between gap-2">
              <div class="flex-1">
                <p class="text-xs font-black uppercase" style="color: var(--text-soft)">Energy</p>
                <p class="text-xl font-black">{{ energyHint }}%</p>
              </div>
              <div class="w-24">
                <p class="text-xs font-black uppercase" style="color: var(--text-soft)">Okno</p>
                <p class="text-xl font-black">±{{ windowSize }}</p>
              </div>
            </div>

            <div class="mt-4 flex items-center gap-3">
              <button
                class="primary-button flex-1 px-4 py-3"
                type="button"
                :disabled="!enabled || !playing || locked"
                @click="tap"
              >
                Tap!
              </button>
              <div class="w-12">
                <div
                  class="h-12 w-12 rounded-2xl border"
                  :style="{
                    borderColor: locked ? 'var(--surface-line)' : 'var(--primary)',
                    background: locked
                      ? 'transparent'
                      : 'color-mix(in srgb, var(--primary) 18%, var(--bg-card))',
                  }"
                  title="Stan celu"
                />
              </div>
            </div>

            <p class="mt-3 text-xs font-semibold" style="color: var(--text-muted)">
              {{ statusText }}
            </p>
          </div>
        </div>
      </div>

      <div class="px-4 pb-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="text-xs font-semibold" style="color: var(--text-muted)">
            {{ lastResultText }}
          </div>
          <div class="text-xs font-black uppercase" style="color: var(--text-soft)">
            Cooldown: {{ cooldownMs }}ms
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { estimateEnergy } from "../lib/energy";

const props = defineProps({
  enabled: { type: Boolean, default: true },
  nowPlaying: { type: Object, default: null },
  currentTime: { type: Number, default: 0 },
  // If we want to reward with queue additions we can do it later; keep optional.
  onReward: { type: Function, default: null },
});

const emits = defineEmits(["reward"]);

const app = inject("appState");

const durationMs = 25000;
const cooldownMsValue = 700;
const windowSizeValue = 10;

const playing = ref(false);
const startAt = ref(0);
const score = ref(0);
const lastResultText = ref("Gotowy.");
const locked = ref(true);
const cooldownMs = ref(0);
const windowSize = computed(() => windowSizeValue);
const energyHint = computed(() => {
  const base = props.nowPlaying ? estimateEnergy(props.nowPlaying) : 50;
  return Math.round(base);
});

const target = computed(() => {
  // Move the target over time to make it game-reactive.
  // Use modulo to keep stable within duration.
  const t = Math.max(0, props.currentTime);
  const phase = Math.floor(t * 0.9) % 6; // changes ~ every 1s
  const base = energyHint.value;
  const delta = (phase - 2) * 6; // -12..+18
  const next = base + delta;
  return Math.max(0, Math.min(100, next));
});

const targetLabel = computed(() => `${Math.round(target.value)}%`);
const progressPercent = computed(() => {
  if (!playing.value) return 0;
  const elapsed = Date.now() - startAt.value;
  return Math.max(0, Math.min(100, Math.round((elapsed / durationMs) * 100)));
});

const statusText = computed(() => {
  if (!enabled.value) return "Wyłączone w ustawieniach.";
  if (!playing.value) return "Naciśnij Start.";

  if (locked.value) return "Cel aktywny wkrótce…";
  return "Tapuj teraz!";
});

const enabled = computed(() => props.enabled);

let cooldownTimer = null;
let intervalTimer = null;

function computeGateOpen() {
  // Open the gate only inside a small band around the target.
  // Since we don't have real beat detection, use currentTime to pseudo-randomly allow taps.
  const t = props.currentTime;
  const beatIndex = Math.floor(t * 2.2) % 8;
  // open on some indices
  return beatIndex === 1 || beatIndex === 4 || beatIndex === 6;
}

function start() {
  if (!enabled.value) return;
  playing.value = true;
  score.value = 0;
  startAt.value = Date.now();
  lastResultText.value = "Zaczynamy!";
  locked.value = false;
  cooldownMs.value = 0;

  locked.value = false;
  intervalTimer = window.setInterval(() => {
    if (!playing.value) return;
    const elapsed = Date.now() - startAt.value;
    if (elapsed >= durationMs) {
      finish();
      return;
    }
    const open = computeGateOpen();
    locked.value = !open;
  }, 120);
}

function reset() {
  playing.value = false;
  startAt.value = 0;
  score.value = 0;
  lastResultText.value = "Wyczyszczono.";
  locked.value = true;
  cooldownMs.value = 0;
  if (intervalTimer) window.clearInterval(intervalTimer);
  if (cooldownTimer) window.clearTimeout(cooldownTimer);
  intervalTimer = null;
  cooldownTimer = null;
}

function finish() {
  playing.value = false;
  locked.value = true;
  if (intervalTimer) window.clearInterval(intervalTimer);
  intervalTimer = null;

  const reward = Math.round(score.value / 3);
  lastResultText.value = `Koniec rundy. Reward: +${reward}`;
  if (reward > 0) {
    emits("reward", reward);
    props.onReward?.(reward);
  }
}

function tap() {
  if (!enabled.value) return;
  if (!playing.value) return;
  if (locked.value) {
    lastResultText.value = "Za wcześnie — cel zamkniety.";
    return;
  }

  // Determine how close player tap is to the target energy.
  // Use track energy as proxy and compare to target.
  const base = energyHint.value;
  const diff = Math.abs(base - target.value);
  const ok = diff <= windowSizeValue;

  const deltaScore = ok ? Math.max(6, 18 - diff) : 2;
  score.value += deltaScore;

  if (ok) {
    lastResultText.value = `Trafione! (+${deltaScore})`;
  } else {
    lastResultText.value = `Prawie… (+${deltaScore})`;
  }

  locked.value = true;
  cooldownMs.value = cooldownMsValue;
  if (cooldownTimer) window.clearTimeout(cooldownTimer);
  cooldownTimer = window.setTimeout(() => {
    cooldownMs.value = 0;
    locked.value = false;
  }, cooldownMsValue);
}

watch(
  () => [props.enabled, props.nowPlaying?.videoId],
  () => {
    // If disabled, stop the game.
    if (!enabled.value) reset();
    // Reset when track changes to keep it responsive.
    reset();
  },
);

onMounted(() => {
  // Start with gate closed.
  locked.value = true;
});

onBeforeUnmount(() => {
  if (intervalTimer) window.clearInterval(intervalTimer);
  if (cooldownTimer) window.clearTimeout(cooldownTimer);
});
</script>

