<template>
  <div v-if="open" class="modal-overlay animate-fade" @click.self="$emit('close')">
    <section class="modal animate-slide-up">
      <header class="modal-header">
        <div>
          <h2 class="modal-title">{{ t('queue') }}</h2>
          <p class="modal-subtitle">{{ tracks.length }} {{ tracks.length === 1 ? t('tracks').toLowerCase() : t('tracks').toLowerCase() }}</p>
        </div>
        <div class="header-actions">
          <button v-if="tracks.length" class="btn-secondary" type="button" @click="$emit('clear')">
            <Trash2 :size="14" />
            {{ t('clear') }}
          </button>
          <button class="icon-btn" type="button" :title="t('close')" @click="$emit('close')">
            <X :size="18" />
          </button>
        </div>
      </header>

      <div v-if="tracks.length" class="modal-body">
        <div
          v-for="(track, index) in tracks"
          :key="`${track.videoId || track.title}-${index}`"
          class="queue-row"
          :class="index === currentIndex ? 'is-current' : ''"
        >
          <span class="queue-cover">
            <img v-if="track.thumbnail || track.art" :src="track.thumbnail || track.art" alt="" loading="lazy" />
          </span>
          <button class="queue-text" type="button" @click="$emit('play-index', index)">
            <span class="q-title">{{ track.title }}</span>
            <span class="q-artist">{{ track.artist || track.subtitle }}</span>
          </button>
          <button class="icon-btn" type="button" :title="t('favorites')" @click="$emit('favorite', track)">
            <Heart
              :size="14"
              :fill="isFavorite(track) ? 'var(--primary)' : 'none'"
              :style="{ color: isFavorite(track) ? 'var(--primary)' : 'var(--text-secondary)' }"
            />
          </button>
          <button class="icon-btn" type="button" :title="t('remove')" @click="$emit('remove', index)">
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
      <div v-else class="modal-empty">{{ t('queueEmpty') }}</div>

      <footer class="modal-footer">
        <input
          v-model="title"
          type="text"
          class="modal-input"
          :placeholder="t('queueName')"
        />
        <button class="btn-secondary" type="button" :disabled="!tracks.length" @click="$emit('shuffle')">
          <Shuffle :size="14" />
          {{ t('shuffle') }}
        </button>
        <button class="btn-primary" type="button" :disabled="!tracks.length || !title.trim()" @click="save">
          <Save :size="14" />
          {{ t('save') }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { inject, ref } from "vue";
import { Heart, Save, Shuffle, Trash2, X } from "lucide-vue-next";

defineProps({
  open: { type: Boolean, default: false },
  tracks: { type: Array, default: () => [] },
  currentIndex: { type: Number, default: -1 },
  isFavorite: { type: Function, default: () => false },
});

const emit = defineEmits(["close", "play-index", "remove", "save", "clear", "shuffle", "favorite"]);

const app = inject("appState");
function t(key) {
  return app?.t?.(key) ?? key;
}

const title = ref("");

function save() {
  emit("save", title.value.trim());
  title.value = "";
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 260;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 12px;
}

@media (min-width: 720px) {
  .modal-overlay {
    align-items: center;
  }
}

.modal {
  width: 100%;
  max-width: 520px;
  max-height: 86vh;
  background: var(--bg-card-strong);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-strong);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.modal-subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.modal-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: var(--text-tertiary);
  font-size: 14px;
}

.queue-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  padding: 6px 8px;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.queue-row:hover {
  background: var(--bg-hover);
}

.queue-row.is-current .q-title {
  color: var(--primary);
}

.queue-cover {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--bg-elevated);
}

.queue-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.queue-text {
  text-align: left;
  min-width: 0;
}

.q-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.q-artist {
  display: block;
  margin-top: 1px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal-footer {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
}

.modal-input {
  background: var(--bg-input);
}
</style>
