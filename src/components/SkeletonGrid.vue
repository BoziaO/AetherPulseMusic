<template>
  <div class="skeleton-grid" :aria-busy="true" :aria-label="label">
    <div v-for="card in count" :key="card" class="skel-card">
      <Skeleton width="100%" height="0" border-radius="12px" class="skel-cover" />
      <Skeleton width="80%" height="13px" />
      <Skeleton width="55%" height="11px" />
    </div>
  </div>
</template>

<script setup>
import Skeleton from "./Skeleton.vue";

defineProps({
  count: { type: Number, default: 6 },
  label: { type: String, default: "Loading…" },
});
</script>

<style scoped>
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 18px;
}

.skel-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skel-cover {
  aspect-ratio: 1 / 1;
  height: auto !important;
}
</style>
