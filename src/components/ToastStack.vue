<template>
  <div class="fixed right-4 top-4 z-[300] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="surface animate-in flex items-start gap-3 rounded-lg p-3"
    >
      <span
        class="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
        :style="{ backgroundColor: colorFor(toast.type) }"
      />
      <p class="min-w-0 flex-1 text-sm font-semibold leading-snug">{{ toast.message }}</p>
      <button class="rounded-md p-1" type="button" title="Zamknij" @click="$emit('dismiss', toast.id)">
        <X :size="15" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { X } from "lucide-vue-next";

defineProps({
  toasts: { type: Array, default: () => [] },
});

defineEmits(["dismiss"]);

function colorFor(type) {
  if (type === "error") return "var(--danger)";
  if (type === "success") return "var(--success)";
  if (type === "warning") return "var(--warning)";
  return "var(--accent)";
}
</script>
