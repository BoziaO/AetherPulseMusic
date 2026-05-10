<template>
  <div v-if="nowPlaying" class="track-comments">
    <div class="comments-header">
      <h3 class="comments-title">{{ appState.t('timestampComments') }}</h3>
      <button
        class="comments-add-btn"
        type="button"
        :title="appState.t('addContextNote')"
        @click="showCommentForm = !showCommentForm"
      >
        +
      </button>
    </div>

    <!-- Add comment form -->
    <div v-if="showCommentForm" class="comment-form">
      <div class="form-row">
        <label class="form-label">{{ appState.t('addCommentToTrack', { time: formatTime(currentTime) }) }}</label>
        <textarea
          v-model="newCommentText"
          class="comment-input"
          :placeholder="appState.t('addContextNote')"
          rows="3"
        />
      </div>
      <div class="form-actions">
        <button class="btn-primary" type="button" @click="addComment">
          {{ appState.t('save') }}
        </button>
        <button class="btn-secondary" type="button" @click="showCommentForm = false">
          {{ appState.t('cancel') }}
        </button>
      </div>
    </div>

    <!-- Comments list -->
    <div class="comments-list">
      <div v-if="comments.length === 0" class="no-comments">
        {{ appState.t('noCommentsYet') }}
      </div>

      <div v-for="comment in sortedComments" :key="comment.id" class="comment-item">
        <div class="comment-time" @click="seekToComment(comment.timestamp)">
          <span class="time-badge">{{ formatTime(comment.timestamp) }}</span>
        </div>
        <div class="comment-content">
          <p class="comment-text">{{ comment.text }}</p>
          <div class="comment-meta">
            <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
            <button
              class="comment-delete"
              type="button"
              :title="appState.t('deleteComment')"
              @click="deleteComment(comment.id)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref, watch } from 'vue';

const emit = defineEmits(['seek']);

const appState = inject('appState');

const nowPlaying = computed(() => appState.nowPlaying);
const currentTime = computed(() => appState.currentTime);

const showCommentForm = ref(false);
const newCommentText = ref('');
const comments = ref([]);

const STORAGE_KEY = 'ap:track-comments';

function getStorageKey(videoId) {
  return `${STORAGE_KEY}:${videoId}`;
}

function loadComments() {
  if (!nowPlaying.value?.videoId) {
    comments.value = [];
    return;
  }

  try {
    const key = getStorageKey(nowPlaying.value.videoId);
    const raw = localStorage.getItem(key);
    comments.value = raw ? JSON.parse(raw) : [];
  } catch {
    comments.value = [];
  }
}

function saveComments() {
  if (!nowPlaying.value?.videoId) return;

  try {
    const key = getStorageKey(nowPlaying.value.videoId);
    localStorage.setItem(key, JSON.stringify(comments.value));
  } catch {
    appState.showToast('Failed to save comment', 'error');
  }
}

function addComment() {
  if (!newCommentText.value.trim()) {
    appState.showToast('Comment cannot be empty', 'error');
    return;
  }

  const comment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: currentTime.value,
    text: newCommentText.value.trim(),
    createdAt: new Date().toISOString(),
  };

  comments.value.push(comment);
  saveComments();
  newCommentText.value = '';
  showCommentForm.value = false;
  appState.showToast(appState.t('saved'), 'success');
}

function deleteComment(id) {
  if (!confirm(appState.t('confirmDeleteComment'))) return;

  comments.value = comments.value.filter((c) => c.id !== id);
  saveComments();
  appState.showToast(appState.t('removed'), 'success');
}

function seekToComment(timestamp) {
  emit('seek', timestamp);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString(appState.language === 'en' ? 'en-US' : 'pl-PL', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const sortedComments = computed(() => {
  return [...comments.value].sort((a, b) => a.timestamp - b.timestamp);
});

watch(nowPlaying, () => {
  loadComments();
});
</script>

<style scoped>
.track-comments {
  margin: 20px 0;
  padding: 16px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--line);
}

.comments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.comments-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.comments-add-btn {
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.comments-add-btn:hover {
  transform: scale(1.1);
}

.comment-form {
  background: rgba(250, 36, 60, 0.05);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 12px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.comment-input {
  background: var(--bg-base);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 8px;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  resize: vertical;
}

.comment-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(250, 36, 60, 0.1);
}

.form-actions {
  display: flex;
  gap: 8px;
}

.btn-primary,
.btn-secondary {
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent-color);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  background: var(--bg-base);
  color: var(--text-primary);
  border: 1px solid var(--line);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.no-comments {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 13px;
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 10px;
  background: var(--bg-base);
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
}

.comment-time {
  flex-shrink: 0;
  cursor: pointer;
}

.time-badge {
  display: inline-block;
  background: var(--accent-color);
  color: white;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s;
}

.time-badge:hover {
  transform: scale(1.05);
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-text {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.4;
  word-break: break-word;
}

.comment-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
}

.comment-date {
  flex: 1;
}

.comment-delete {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  transition: color 0.2s;
}

.comment-delete:hover {
  color: var(--danger);
}

@media (max-width: 640px) {
  .track-comments {
    padding: 12px;
    margin: 16px 0;
  }

  .comment-item {
    gap: 8px;
    padding: 8px;
  }
}
</style>

