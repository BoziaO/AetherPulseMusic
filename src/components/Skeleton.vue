<template>
  <div
    class="skeleton"
    :class="{ 'is-circle': circle, 'no-shimmer': noShimmer }"
    :style="{ width, height, borderRadius }"
    aria-hidden="true"
  />
</template>

<script setup>
defineProps({
  width: { type: String, default: "100%" },
  height: { type: String, default: "16px" },
  borderRadius: { type: String, default: "8px" },
  circle: { type: Boolean, default: false },
  noShimmer: { type: Boolean, default: false },
});
</script>

<style scoped>
.skeleton {
  display: inline-block;
  background: linear-gradient(
    90deg,
    var(--bg-input) 0%,
    var(--bg-hover) 50%,
    var(--bg-input) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
  position: relative;
  overflow: hidden;
}

.skeleton.is-circle {
  border-radius: 50% !important;
}

.skeleton.no-shimmer {
  animation: none;
  background: var(--bg-input);
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
</style>
