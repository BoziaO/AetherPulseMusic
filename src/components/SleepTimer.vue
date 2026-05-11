<template>
  <div class="st-root" ref="rootRef">
    <button
      class="st-btn"
      :class="{ 'is-active': isActive }"
      type="button"
      :title="t('sleepTimer')"
      @click.stop="panelOpen = !panelOpen"
    >
      <Moon v-if="!isActive" :size="20" />
      <span v-else class="st-countdown">{{ formattedTime }}</span>
    </button>

    <Transition name="st-panel">
      <div v-if="panelOpen" class="st-panel" @click.stop>
        <p class="st-label">{{ t('sleepTimer') }}</p>
        <div class="st-options">
          <button
            v-for="opt in options"
            :key="opt.minutes"
            class="st-opt"
            :class="{ 'is-selected': isActive && selectedMinutes === opt.minutes }"
            type="button"
            @click="pick(opt.minutes)"
          >
            <span class="st-opt-label">{{ opt.label }}</span>
            <span class="st-opt-sub">{{ opt.sub }}</span>
          </button>
        </div>
        <div v-if="isActive" class="st-active-row">
          <Moon :size="12" />
          {{ t('sleepTimerActive', { time: formattedTime }) }}
        </div>
        <button v-if="isActive" class="st-cancel" type="button" @click="pick(0)">
          {{ t('sleepTimerOff') }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from "vue";
import { Moon } from "lucide-vue-next";

const app = inject("appState");
function t(key, vars) { return app?.t?.(key, vars) ?? key; }

const sleepTimerSeconds = computed(() => app?.sleepTimerSeconds?.value ?? null);
const selectedMinutes = computed(() => app?.sleepTimerMinutes?.value ?? null);
const isActive = computed(() => !!sleepTimerSeconds.value && sleepTimerSeconds.value > 0);

const panelOpen = ref(false);
const rootRef = ref(null);

const options = [
  { minutes: 15, label: "15 min", sub: "" },
  { minutes: 30, label: "30 min", sub: "" },
  { minutes: 45, label: "45 min", sub: "" },
  { minutes: 60, label: "60 min", sub: "" },
];

const formattedTime = computed(() => {
  const s = sleepTimerSeconds.value;
  if (!s || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
});

function pick(minutes) {
  if (minutes === 0) {
    app?.clearSleepTimer?.();
  } else {
    app?.setSleepTimer?.(minutes);
  }
  panelOpen.value = false;
}

function handleOutsideClick(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    panelOpen.value = false;
  }
}

onMounted(() => document.addEventListener("click", handleOutsideClick));
onBeforeUnmount(() => document.removeEventListener("click", handleOutsideClick));
</script>

<style scoped>
.st-root {
  position: relative;
}

.st-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.65);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.st-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.st-btn.is-active {
  color: #c5a3ff;
  background: rgba(197, 163, 255, 0.15);
  animation: sleep-pulse 3s ease-in-out infinite;
}

@keyframes sleep-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(197, 163, 255, 0.3); }
  50% { box-shadow: 0 0 0 5px rgba(197, 163, 255, 0); }
}

.st-countdown {
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  color: #c5a3ff;
}

.st-panel {
  position: absolute;
  bottom: calc(100% + 10px);
  right: 0;
  background: rgba(22, 22, 28, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  padding: 16px;
  min-width: 190px;
  backdrop-filter: blur(24px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.04);
  z-index: 20;
}

.st-label {
  margin: 0 0 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
}

.st-options {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.st-opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.82);
  text-align: left;
  transition: background var(--transition-fast), color var(--transition-fast);
  width: 100%;
}

.st-opt:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.st-opt.is-selected {
  background: rgba(197, 163, 255, 0.18);
  color: #c5a3ff;
}

.st-opt-sub {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.35);
}

.st-active-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(197, 163, 255, 0.1);
  font-size: 12px;
  font-weight: 600;
  color: #c5a3ff;
  font-variant-numeric: tabular-nums;
}

.st-cancel {
  width: 100%;
  margin-top: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.st-cancel:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.65);
}

.st-panel-enter-active,
.st-panel-leave-active {
  transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.st-panel-enter-from,
.st-panel-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}
</style>
