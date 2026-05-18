<template>
  <Transition name="cookie-rise">
    <div v-if="showBanner" class="cookie-wrap" role="dialog" aria-modal="false" aria-labelledby="cookie-title">
      <div class="cookie-card">
        <div class="cookie-icon">🍪</div>
        <div class="cookie-body">
          <h3 id="cookie-title" class="cookie-title">Prywatność</h3>
          <p class="cookie-text">Używamy plików cookie, aby poprawić Twoje doświadczenie. Możesz wybrać, które dane chcesz udostępnić.</p>
        </div>
        <div class="cookie-actions">
          <button class="cookie-btn cookie-btn-ghost" type="button" @click="reject">Odrzuć</button>
          <button class="cookie-btn cookie-btn-outline" type="button" @click="showCustomize = true">Dostosuj</button>
          <button class="cookie-btn cookie-btn-primary" type="button" @click="acceptAll">Akceptuję wszystkie</button>
        </div>
        <button class="cookie-close" type="button" :title="'Zamknij'" @click="reject">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <Transition name="fade-up">
        <div v-if="showCustomize" class="cookie-panel">
          <h4 class="panel-title">Ustawienia plików cookie</h4>
          <label class="panel-toggle">
            <div class="toggle-info">
              <span class="toggle-name">Analityczne</span>
              <span class="toggle-desc">Pomagają nam ulepszać aplikację</span>
            </div>
            <button
              class="toggle-switch"
              :class="analytics ? 'is-on' : ''"
              type="button"
              role="switch"
              :aria-checked="analytics"
              @click="analytics = !analytics"
            >
              <span class="toggle-knob" />
            </button>
          </label>
          <div class="panel-actions">
            <button class="cookie-btn cookie-btn-ghost" type="button" @click="showCustomize = false">Anuluj</button>
            <button class="cookie-btn cookie-btn-primary" type="button" @click="saveCustom">Zapisz</button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const emit = defineEmits(['consent-changed']);

const showBanner = ref(false);
const showCustomize = ref(false);
const analytics = ref(false);

function acceptAll() {
  localStorage.setItem('cookieConsent', 'all');
  localStorage.setItem('analytics', 'true');
  analytics.value = true;
  showBanner.value = false;
  emit('consent-changed', { type: 'all', analytics: true });
}

function reject() {
  localStorage.setItem('cookieConsent', 'none');
  localStorage.setItem('analytics', 'false');
  showBanner.value = false;
  emit('consent-changed', { type: 'none', analytics: false });
}

function saveCustom() {
  localStorage.setItem('cookieConsent', 'custom');
  localStorage.setItem('analytics', analytics.value.toString());
  showBanner.value = false;
  showCustomize.value = false;
  emit('consent-changed', { type: 'custom', analytics: analytics.value });
}

onMounted(() => {
  const consent = localStorage.getItem('cookieConsent');
  if (!consent) {
    setTimeout(() => { showBanner.value = true; }, 1200);
  } else {
    analytics.value = localStorage.getItem('analytics') === 'true';
  }
});

watch(showCustomize, (val) => {
  if (val) {
    const close = (e) => { if (e.key === 'Escape') showCustomize.value = false; };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }
});
</script>

<style scoped>
.cookie-rise-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.cookie-rise-leave-active {
  transition: all 0.25s ease-in;
}
.cookie-rise-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.96);
}
.cookie-rise-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}

.fade-up-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.fade-up-leave-active { transition: all 0.2s ease; }
.fade-up-enter-from { opacity: 0; transform: translateY(8px); }
.fade-up-leave-to { opacity: 0; transform: translateY(4px); }

.cookie-wrap {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: min(680px, calc(100vw - 32px));
  z-index: 9000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cookie-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(18, 18, 24, 0.92);
  backdrop-filter: blur(24px) saturate(1.8);
  -webkit-backdrop-filter: blur(24px) saturate(1.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5), 0 0 0 0.5px rgba(255,255,255,0.06) inset;
}

.cookie-icon {
  font-size: 28px;
  flex-shrink: 0;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

.cookie-body {
  flex: 1;
  min-width: 0;
}

.cookie-title {
  margin: 0 0 2px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.cookie-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.55);
}

.cookie-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.cookie-btn {
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  border: none;
}

.cookie-btn-ghost {
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
}
.cookie-btn-ghost:hover { color: rgba(255, 255, 255, 0.8); }

.cookie-btn-outline {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.cookie-btn-outline:hover { background: rgba(255, 255, 255, 0.14); }

.cookie-btn-primary {
  background: var(--primary);
  color: #fff;
}
.cookie-btn-primary:hover { filter: brightness(1.1); }

.cookie-close {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: rgba(255,255,255,0.35);
  cursor: pointer;
  border-radius: 50%;
  transition: color 0.15s, background 0.15s;
}
.cookie-close:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.08); }

.cookie-panel {
  background: rgba(18, 18, 24, 0.95);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}

.panel-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toggle-info { flex: 1; min-width: 0; }

.toggle-name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
}

.toggle-desc {
  display: block;
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  margin-top: 2px;
}

.toggle-switch {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: rgba(255,255,255,0.15);
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
  border: none;
  transition: background 0.2s;
}
.toggle-switch.is-on { background: var(--primary); }

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
}
.toggle-switch.is-on .toggle-knob { transform: translateX(18px); }

.panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 560px) {
  .cookie-card {
    flex-direction: column;
    align-items: flex-start;
    padding-right: 36px;
  }
  .cookie-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
