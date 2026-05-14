<template>
  <transition name="ofb-slide">
    <div
      v-if="show"
      class="offline-banner"
      :class="{ 'is-recovered': recovered }"
      role="status"
      :aria-live="recovered ? 'polite' : 'assertive'"
    >
      <span class="ofb-icon" aria-hidden="true">
        <WifiOff v-if="!recovered" :size="16" />
        <Wifi v-else :size="16" />
      </span>
      <div class="ofb-text">
        <p class="ofb-title">
          {{ recovered ? t('offlineBackOnline') : t('offlineNoConnection') }}
        </p>
        <p class="ofb-sub">
          {{ recovered ? t('offlineBackOnlineDesc') : t('offlineNoConnectionDesc') }}
        </p>
      </div>
      <button
        v-if="!recovered"
        class="ofb-action"
        type="button"
        @click="$emit('retry')"
      >
        {{ t('offlineRetry') }}
      </button>
    </div>
  </transition>
</template>

<script setup>
import { inject, onBeforeUnmount, onMounted, ref } from "vue";
import { Wifi, WifiOff } from "lucide-vue-next";
import { isOnline, onNetworkChange } from "../lib/api";

const app = inject("appState");
function t(key, vars) {
  return app?.t?.(key, vars) ?? key;
}

const show = ref(!isOnline());
const recovered = ref(false);
let recoverTimeout = null;
let unsubscribe = null;

onMounted(() => {
  unsubscribe = onNetworkChange(({ online }) => {
    if (online) {
      // Pokaż "z powrotem online" przez 3s, potem schowaj banner.
      if (show.value) {
        recovered.value = true;
        clearTimeout(recoverTimeout);
        recoverTimeout = window.setTimeout(() => {
          show.value = false;
          recovered.value = false;
        }, 3000);
      }
    } else {
      recovered.value = false;
      show.value = true;
      clearTimeout(recoverTimeout);
    }
  });
});

onBeforeUnmount(() => {
  unsubscribe?.();
  clearTimeout(recoverTimeout);
});

defineEmits(["retry"]);
</script>

<style scoped>
.offline-banner {
  position: fixed;
  bottom: calc(var(--player-height, 84px) + 12px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 240;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 10px 14px;
  border-radius: 100px;
  background: var(--bg-elevated);
  border: 1px solid var(--line-strong);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  max-width: calc(100vw - 32px);
}

.ofb-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 69, 58, 0.15);
  color: #ff453a;
  flex-shrink: 0;
}

.is-recovered .ofb-icon {
  background: rgba(48, 209, 88, 0.15);
  color: #30d158;
}

.ofb-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ofb-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.ofb-sub {
  margin: 1px 0 0;
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ofb-action {
  background: var(--primary);
  color: var(--bg-base);
  border: none;
  border-radius: 100px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, transform 0.1s;
}

.ofb-action:hover { background: var(--primary-hover); }
.ofb-action:active { transform: scale(0.96); }

.ofb-slide-enter-active,
.ofb-slide-leave-active {
  transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.22s ease;
}

.ofb-slide-enter-from,
.ofb-slide-leave-to {
  transform: translateX(-50%) translateY(20px);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .ofb-slide-enter-active,
  .ofb-slide-leave-active { transition: opacity 0.15s; }
}
</style>
