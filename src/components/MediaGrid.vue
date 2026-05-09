<template>
  <div v-if="items.length" class="grid">
    <button
      v-for="(item, index) in items"
      :key="itemKey(item, index)"
      class="card"
      type="button"
      @click="$emit('open', item)"
    >
      <span class="card-cover" :class="circle ? 'card-cover-circle' : ''">
        <img
          v-if="item.thumbnail || item.cover || item.art"
          :src="item.thumbnail || item.cover || item.art"
          :alt="item.title || ''"
          loading="lazy"
          decoding="async"
        />
        <span v-else class="cover-placeholder">
          <Music2 :size="34" />
        </span>
        <span class="play-fab" @click.stop="$emit('play', item)">
          <Play :size="16" fill="currentColor" />
        </span>
      </span>
      <span class="card-text">
        <span class="card-title">{{ item.title || item.name }}</span>
        <span class="card-subtitle">
          {{ item.subtitle || item.author || item.artist || item.meta || "" }}
        </span>
      </span>
    </button>
  </div>

  <div v-else class="empty">{{ emptyLabel }}</div>
</template>

<script setup>
import { Music2, Play } from "lucide-vue-next";

defineProps({
  items: { type: Array, default: () => [] },
  emptyLabel: { type: String, default: "—" },
  circle: { type: Boolean, default: false },
});

defineEmits(["open", "play"]);

function itemKey(item, index) {
  return (
    item?.videoId ||
    item?.browseId ||
    item?.playlistId ||
    `${item?.title || "item"}-${index}`
  );
}
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

@media (min-width: 600px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 900px) {
  .grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.card {
  display: flex;
  flex-direction: column;
  text-align: left;
  background: transparent;
  border-radius: var(--radius-md);
  padding: 6px;
  margin: -6px;
  transition: background var(--transition-fast);
}

.card:hover {
  background: var(--bg-hover);
}

.card-cover {
  position: relative;
  display: block;
  margin-bottom: 12px;
}

.cover-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
}

.play-fab {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity var(--transition-fast), transform var(--transition-fast);
  box-shadow: 0 8px 20px rgba(var(--primary-rgb), 0.45);
}

.card:hover .play-fab {
  opacity: 1;
  transform: translateY(0);
}

.card-text {
  display: block;
  min-width: 0;
}

.card-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-subtitle {
  display: block;
  margin-top: 2px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-tertiary);
  padding: 20px;
  text-align: center;
}
</style>
