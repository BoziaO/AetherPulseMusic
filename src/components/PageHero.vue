<template>
  <section class="mb-7 overflow-hidden rounded-lg border" style="background: var(--bg-panel); border-color: var(--surface-line)">
    <div class="grid gap-0 lg:grid-cols-[1fr_280px]">
      <div class="p-5 sm:p-7">
        <p v-if="eyebrow" class="mb-2 text-xs font-black uppercase" style="color: var(--primary)">
          {{ eyebrow }}
        </p>
        <h1 class="max-w-4xl text-3xl font-black leading-tight sm:text-5xl">{{ title }}</h1>
        <p v-if="subtitle" class="mt-3 max-w-2xl text-sm leading-6 sm:text-base" style="color: var(--text-muted)">
          {{ subtitle }}
        </p>

        <div class="mt-5 flex flex-wrap items-center gap-2">
          <button v-if="playable" class="primary-button px-4" type="button" :disabled="disabled" @click="$emit('play')">
            <Play :size="17" fill="currentColor" />
            {{ playLabel }}
          </button>
          <slot name="actions" />
        </div>

        <div v-if="stats?.length" class="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div v-for="stat in stats" :key="`${stat.label}-${stat.value}`" class="rounded-lg border p-3" style="border-color: var(--surface-line); background: var(--bg-card)">
            <p class="text-[11px] font-bold uppercase" style="color: var(--text-soft)">{{ stat.label }}</p>
            <p class="mt-1 text-lg font-black">{{ stat.value }}</p>
          </div>
        </div>
      </div>

      <div class="hidden min-h-[220px] border-l lg:block" style="border-color: var(--surface-line); background: var(--bg-card)">
        <img v-if="cover" :src="cover" alt="" class="h-full w-full object-cover" loading="lazy" decoding="async" />
        <div v-else class="flex h-full items-center justify-center" style="color: var(--text-soft)">
          <Music2 :size="64" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Music2, Play } from "lucide-vue-next";

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  eyebrow: { type: String, default: "" },
  cover: { type: String, default: "" },
  stats: { type: Array, default: () => [] },
  playable: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  playLabel: { type: String, default: "Play" },
});

defineEmits(["play"]);
</script>
