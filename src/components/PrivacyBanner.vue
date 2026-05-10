<template>
  <div v-if="visible" class="privacy-banner">
    <div class="privacy-content">
      <div class="privacy-icon">🔒</div>
      <div class="privacy-text">
        <p class="privacy-title">{{ appState.t('privacyBanner') }}</p>
        <p class="privacy-desc">{{ appState.t('privacyDescription') }}</p>
      </div>
      <button
        class="privacy-close"
        type="button"
        :title="appState.t('close')"
        @click="visible = false"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<script setup>
import { inject, ref } from 'vue';

const appState = inject('appState');
const visible = ref(true);
</script>

<style scoped>
.privacy-banner {
  position: relative;
  background: linear-gradient(135deg, var(--accent-color), rgba(250, 36, 60, 0.8));
  border-radius: var(--radius-md);
  padding: 14px 16px;
  margin: 0 16px 16px;
  margin-top: 8px;
  box-shadow: 0 4px 12px rgba(250, 36, 60, 0.15);
  display: block;
  opacity: 1;
  animation: slide-in 0.3s ease-out;
}

.privacy-banner[v-show] {
  display: block;
}

.privacy-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: white;
}

.privacy-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.privacy-text {
  flex: 1;
  min-width: 0;
}

.privacy-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}

.privacy-desc {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 500;
  opacity: 0.95;
  line-height: 1.35;
}

.privacy-close {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: -2px;
}

.privacy-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .privacy-banner {
    margin: 0 12px 12px;
    padding: 12px 14px;
  }

  .privacy-content {
    gap: 10px;
  }

  .privacy-title {
    font-size: 13px;
  }

  .privacy-desc {
    font-size: 11px;
  }
}
</style>


