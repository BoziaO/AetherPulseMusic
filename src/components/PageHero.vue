<template>
  <section class="page-hero" :style="bgStyle">
    <div v-if="cover" class="hero-cover">
      <img :src="hiResCover" alt="" loading="lazy" />
    </div>

    <div class="hero-text">
      <p v-if="eyebrow" class="hero-eyebrow">{{ eyebrow }}</p>
      <h1 class="hero-title">{{ title }}</h1>
      <p v-if="subtitle" class="hero-subtitle">{{ subtitle }}</p>

      <div v-if="stats?.length" class="hero-stats">
        <div v-for="stat in stats" :key="`${stat.label}-${stat.value}`" class="stat">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>

      <div class="hero-actions">
        <button
          v-if="playable"
          class="btn-primary"
          type="button"
          :disabled="disabled"
          @click="$emit('play')"
        >
          <Play :size="16" fill="currentColor" />
          {{ playLabel }}
        </button>
        <button
          v-if="playable && shuffleable"
          class="btn-secondary"
          type="button"
          :disabled="disabled"
          @click="$emit('shuffle')"
        >
          <Shuffle :size="16" />
          {{ shuffleLabel }}
        </button>
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { Play, Shuffle } from "lucide-vue-next";
import { upgradeThumbUrl } from "../lib/format";

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  eyebrow: { type: String, default: "" },
  cover: { type: String, default: "" },
  stats: { type: Array, default: () => [] },
  playable: { type: Boolean, default: true },
  shuffleable: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  playLabel: { type: String, default: "Play" },
  shuffleLabel: { type: String, default: "Shuffle" },
});

defineEmits(["play", "shuffle"]);

const hiResCover = computed(() => upgradeThumbUrl(props.cover));

const bgStyle = computed(() => {
  if (!props.cover) return {};
  return { backgroundImage: `url(${props.cover})` };
});
</script>

<style scoped>
.page-hero {
  position: relative;
  display: grid;
  gap: 24px;
  grid-template-columns: 220px minmax(0, 1fr);
  align-items: end;
  padding: 28px;
  margin-bottom: 28px;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background-color: var(--bg-elevated);
  background-position: center;
  background-size: cover;
  isolation: isolate;
}

.page-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.2) 0%,
    rgba(0, 0, 0, 0.55) 60%,
    rgba(0, 0, 0, 0.85) 100%
  );
  z-index: 0;
}

.page-hero > * {
  position: relative;
  z-index: 1;
}

.hero-cover {
  width: 220px;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-strong);
  background: var(--bg-card-strong);
}

.hero-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-text {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.hero-eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.85);
}

.hero-title {
  margin: 0;
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: #fff;
}

.hero-subtitle {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
  max-width: 60ch;
}

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 4px;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

@media (max-width: 720px) {
  .page-hero {
    grid-template-columns: 1fr;
    padding: 22px;
  }
  .hero-cover {
    width: 160px;
  }
}
</style>
