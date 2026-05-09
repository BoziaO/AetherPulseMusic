<template>
  <div class="toast-stack">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast animate-fade"
    >
      <span class="dot" :style="{ background: colorFor(toast.type) }" />
      <p class="msg">{{ toast.message }}</p>
      <button class="icon-btn" type="button" :title="t('close')" @click="$emit('dismiss', toast.id)">
        <X :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { inject } from "vue";
import { X } from "lucide-vue-next";

defineProps({
  toasts: { type: Array, default: () => [] },
});

defineEmits(["dismiss"]);

const app = inject("appState");
function t(key) {
  return app?.t?.(key) ?? key;
}

function colorFor(type) {
  if (type === "error") return "var(--danger)";
  if (type === "success") return "var(--success)";
  if (type === "warning") return "var(--warning)";
  return "var(--accent)";
}
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 300;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(360px, calc(100vw - 32px));
}

.toast {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-card-strong);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.msg {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--text-primary);
}
</style>
