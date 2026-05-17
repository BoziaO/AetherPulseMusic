<template>
  <TransitionGroup tag="div" name="toast" class="toast-stack">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast"
      :class="`toast-${toast.type || 'info'}`"
      role="alert"
    >
      <span class="toast-icon">
        <CheckCircle2 v-if="toast.type === 'success'" :size="16" />
        <AlertCircle v-else-if="toast.type === 'error'" :size="16" />
        <AlertTriangle v-else-if="toast.type === 'warning'" :size="16" />
        <Info v-else :size="16" />
      </span>
      <p class="toast-msg">{{ toast.message }}</p>
      <button class="toast-close" type="button" :title="t('close')" @click="$emit('dismiss', toast.id)">
        <X :size="13" />
      </button>
      <div class="toast-progress" />
    </div>
  </TransitionGroup>
</template>

<script setup>
import { inject } from "vue";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-vue-next";

defineProps({ toasts: { type: Array, default: () => [] } });
defineEmits(["dismiss"]);

const app = inject("appState");
function t(key) { return app?.t?.(key) ?? key; }
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 400;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(380px, calc(100vw - 32px));
  pointer-events: none;
}

@media (max-width: 600px) {
  .toast-stack {
    top: auto;
    bottom: 100px; /* above player bar */
    right: 12px;
    left: 12px;
    width: auto;
  }
}

.toast {
  display: grid;
  grid-template-columns: 20px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-card-strong);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
  pointer-events: auto;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.toast-success { border-left: 3px solid var(--success); }
.toast-error   { border-left: 3px solid var(--danger); }
.toast-warning { border-left: 3px solid var(--warning); }
.toast-info    { border-left: 3px solid var(--primary); }

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-success .toast-icon { color: var(--success); }
.toast-error   .toast-icon { color: var(--danger); }
.toast-warning .toast-icon { color: var(--warning); }
.toast-info    .toast-icon { color: var(--primary); }

.toast-msg {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--text-primary);
}

.toast-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.toast-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 100%;
  background: currentColor;
  opacity: 0.25;
  transform-origin: left;
  animation: toast-shrink 4.2s linear forwards;
}

.toast-success .toast-progress { color: var(--success); }
.toast-error   .toast-progress { color: var(--danger); }
.toast-warning .toast-progress { color: var(--warning); }
.toast-info    .toast-progress { color: var(--primary); }

@keyframes toast-shrink {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}

/* Slide in from right */
.toast-enter-active {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
}
.toast-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
  position: absolute;
  right: 0;
  width: 100%;
}
.toast-enter-from {
  transform: translateX(calc(100% + 16px));
  opacity: 0;
}
.toast-leave-to {
  transform: translateX(calc(100% + 16px));
  opacity: 0;
}
.toast-move {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>
