<template>
  <div class="context-notes">
    <div class="notes-header">
      <h3 class="notes-title">{{ appState.t('contextNotes') }}</h3>
      <button
        class="notes-edit-btn"
        type="button"
        :title="hasNote ? appState.t('editContextNote') : appState.t('addContextNote')"
        @click="isEditing = !isEditing"
      >
        {{ isEditing ? '✓' : '✏️' }}
      </button>
    </div>

    <!-- Edit mode -->
    <div v-if="isEditing" class="note-form">
      <textarea
        v-model="editText"
        class="note-input"
        :placeholder="appState.t('addContextNote')"
        rows="4"
      />
      <div class="form-actions">
        <button class="btn-primary" type="button" @click="saveNote">
          {{ appState.t('save') }}
        </button>
        <button class="btn-secondary" type="button" @click="cancelEdit">
          {{ appState.t('cancel') }}
        </button>
        <button v-if="hasNote" class="btn-danger" type="button" @click="deleteNote">
          {{ appState.t('remove') }}
        </button>
      </div>
    </div>

    <!-- View mode -->
    <div v-else class="note-view">
      <div v-if="note" class="note-content">
        <p class="note-text">{{ note.text }}</p>
        <p class="note-meta">{{ formatDate(note.updatedAt) }}</p>
      </div>
      <div v-else class="no-note">
        {{ appState.t('addContextNote') }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref, watch } from 'vue';

const appState = inject('appState');

const props = defineProps({
  itemId: { type: String, required: true },
  itemType: { type: String, default: 'album' }, // album, artist, playlist
  itemTitle: { type: String, default: '' },
});

const isEditing = ref(false);
const editText = ref('');
const note = ref(null);

const STORAGE_KEY = 'ap:context-notes';

function getStorageKey(id) {
  return `${STORAGE_KEY}:${props.itemType}:${id}`;
}

function loadNote() {
  if (!props.itemId) {
    note.value = null;
    return;
  }

  try {
    const key = getStorageKey(props.itemId);
    const raw = localStorage.getItem(key);
    note.value = raw ? JSON.parse(raw) : null;
    editText.value = note.value?.text || '';
  } catch {
    note.value = null;
    editText.value = '';
  }
}

function saveNote() {
  const text = editText.value.trim();
  if (!text) {
    deleteNote();
    return;
  }

  const newNote = {
    id: props.itemId,
    itemType: props.itemType,
    itemTitle: props.itemTitle,
    text,
    createdAt: note.value?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const key = getStorageKey(props.itemId);
    localStorage.setItem(key, JSON.stringify(newNote));
    note.value = newNote;
    isEditing.value = false;
    appState.showToast(appState.t('saved'), 'success');
  } catch {
    appState.showToast('Failed to save note', 'error');
  }
}

function deleteNote() {
  if (!confirm(`${appState.t('confirmDeleteComment')}?`)) return;

  try {
    const key = getStorageKey(props.itemId);
    localStorage.removeItem(key);
    note.value = null;
    editText.value = '';
    isEditing.value = false;
    appState.showToast(appState.t('removed'), 'success');
  } catch {
    appState.showToast('Failed to delete note', 'error');
  }
}

function cancelEdit() {
  editText.value = note.value?.text || '';
  isEditing.value = false;
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

const hasNote = computed(() => !!note.value);

watch(() => props.itemId, loadNote, { immediate: true });
</script>

<style scoped>
.context-notes {
  margin: 24px 0;
  padding: 16px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--line);
}

.notes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.notes-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.notes-edit-btn {
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  width: 32px;
  height: 32px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.notes-edit-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(250, 36, 60, 0.3);
}

.note-form {
  background: rgba(250, 36, 60, 0.05);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 12px;
}

.note-input {
  width: 100%;
  background: var(--bg-base);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 10px;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  resize: vertical;
  margin-bottom: 12px;
}

.note-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(250, 36, 60, 0.1);
}

.form-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary,
.btn-danger {
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

.btn-danger {
  background: rgba(255, 69, 58, 0.15);
  color: var(--danger);
  border: 1px solid rgba(255, 69, 58, 0.3);
}

.btn-danger:hover {
  background: rgba(255, 69, 58, 0.25);
}

.note-view {
  padding: 8px 0;
}

.note-content {
  margin: 0;
}

.note-text {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

.note-meta {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
}

.no-note {
  padding: 12px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
  font-style: italic;
  background: rgba(255, 255, 255, 0.02);
  border-radius: var(--radius-sm);
}

@media (max-width: 640px) {
  .context-notes {
    padding: 12px;
    margin: 16px 0;
  }

  .form-actions {
    gap: 6px;
  }

  .btn-primary,
  .btn-secondary,
  .btn-danger {
    padding: 5px 10px;
    font-size: 11px;
  }
}
</style>

