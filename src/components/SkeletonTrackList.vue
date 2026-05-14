<template>
  <div class="skeleton-list" :aria-busy="true" :aria-label="label">
    <div v-for="row in count" :key="row" class="skel-row">
      <Skeleton :width="'24px'" height="14px" />
      <Skeleton width="40px" height="40px" border-radius="6px" />
      <div class="skel-text">
        <Skeleton :width="`${50 + (row % 3) * 12}%`" height="14px" />
        <Skeleton :width="`${30 + (row % 4) * 8}%`" height="11px" />
      </div>
      <Skeleton width="34px" height="11px" />
    </div>
  </div>
</template>

<script setup>
import Skeleton from "./Skeleton.vue";

defineProps({
  count: { type: Number, default: 6 },
  label: { type: String, default: "Loading tracks…" },
});
</script>

<style scoped>
.skeleton-list {
  display: flex;
  flex-direction: column;
}

.skel-row {
  display: grid;
  grid-template-columns: 32px 40px minmax(0, 1fr) 60px;
  gap: 16px;
  align-items: center;
  padding: 10px 16px;
  border-radius: 8px;
}

.skel-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
</style>
