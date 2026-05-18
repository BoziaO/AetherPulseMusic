<template>
  <div v-if="items.length" class="grid">
    <button
      v-for="(item, index) in items"
      :key="itemKey(item, index)"
      class="card stagger-item"
      :class="{ 'is-current': item.videoId && item.videoId === currentVideoId }"
      :style="{ '--index': index < 20 ? index : 20 }"
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
          <Pause v-if="item.videoId && item.videoId === currentVideoId && isPlaying" :size="16" fill="currentColor" />
          <Play v-else :size="16" fill="currentColor" />
        </span>
        <span v-if="item.videoId && item.videoId === currentVideoId" class="now-playing-badge" aria-hidden="true">
          <span class="eq-bars">
            <span /><span /><span />
          </span>
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

  <div v-else class="empty">
    <Music2 :size="40" class="empty-icon" aria-hidden="true" />
    <span>{{ emptyLabel }}</span>
  </div>
</template>

<script setup>
import { Music2, Pause, Play } from "lucide-vue-next";

defineProps({
  items: { type: Array, default: () => [] },
  emptyLabel: { type: String, default: "—" },
  circle: { type: Boolean, default: false },
  currentVideoId: { type: String, default: null },
  isPlaying: { type: Boolean, default: false },
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
  gap: 14px;
}

@media (min-width: 480px) {
  .grid { gap: 18px; }
}

@media (min-width: 600px) {
  .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (min-width: 900px) {
  .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (min-width: 1280px) {
  .grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
}

.card {
  display: flex;
  flex-direction: column;
  text-align: left;
  background: transparent;
  border-radius: var(--radius-md);
  padding: 8px;
  margin: -8px;
  transition: background var(--transition-fast), transform var(--transition-base);
  cursor: pointer;
}

.card:hover {
  background: var(--bg-hover);
  transform: translateY(-2px);
}

.card:active {
  transform: scale(0.97) translateY(0);
}

.stagger-item {
  animation: card-enter 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--index) * 45ms);
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.card-cover {
  position: relative;
  display: block;
  margin-bottom: 10px;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  transition: box-shadow var(--transition-base);
}

.card:hover .card-cover {
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.3);
}

.card-cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform var(--transition-base), filter var(--transition-base);
}

.card:hover .card-cover img,
.card.is-current .card-cover img {
  transform: scale(1.06);
  filter: brightness(0.72);
}

.card.is-current .card-title {
  color: var(--primary);
}

.card-cover-circle {
  border-radius: 50%;
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
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-hover) 0%, var(--primary) 100%);
  color: #fff;
  opacity: 0;
  transform: translateY(8px) scale(0.82);
  transition: opacity var(--transition-fast), transform var(--transition-base), box-shadow var(--transition-fast);
  box-shadow: 0 4px 20px rgba(var(--primary-rgb), 0.6), 0 0 0 0 rgba(var(--primary-rgb), 0.3);
}

.play-fab::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 60%);
  pointer-events: none;
}

.card:hover .play-fab,
.card.is-current .play-fab {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.now-playing-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
}

.now-playing-badge .eq-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}

.now-playing-badge .eq-bars span {
  display: block;
  width: 3px;
  border-radius: 2px;
  background: var(--primary);
  animation: eq-bounce 0.9s ease-in-out infinite alternate;
}

.now-playing-badge .eq-bars span:nth-child(1) { height: 5px; animation-delay: 0s; }
.now-playing-badge .eq-bars span:nth-child(2) { height: 10px; animation-delay: 0.2s; }
.now-playing-badge .eq-bars span:nth-child(3) { height: 7px; animation-delay: 0.1s; }

@keyframes eq-bounce {
  from { transform: scaleY(0.35); }
  to   { transform: scaleY(1); }
}

.card-text {
  display: block;
  min-width: 0;
  padding: 0 2px;
}

.card-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.35;
  transition: color var(--transition-fast);
}

.card:hover .card-title {
  color: var(--text-primary);
}

.card-subtitle {
  display: block;
  margin-top: 3px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--transition-fast);
}

.card:hover .card-subtitle {
  color: var(--text-secondary);
}

.empty {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-tertiary);
  padding: 48px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.empty-icon {
  opacity: 0.25;
  color: var(--text-tertiary);
}
</style>
