<template>
  <Transition name="slide-up">
    <div v-if="showBanner" class="cookie-banner" role="dialog" aria-modal="false" aria-labelledby="cookie-title">
      <div class="cookie-content">
        <div class="cookie-text">
          <h3 id="cookie-title" class="sr-only">{{ t('cookieSettings') }}</h3>
          <p>{{ t('cookieMessage') }}</p>
        </div>
        
        <!-- Main Action Buttons -->
        <div class="cookie-buttons">
          <button 
            class="btn-accept" 
            @click="acceptAll" 
            :aria-label="t('acceptAll')"
          >
            {{ t('acceptAll') }}
          </button>
          
          <button 
            class="btn-custom" 
            @click="showCustomize = true" 
            :aria-label="t('customize')"
          >
            {{ t('customize') }}
          </button>
          
          <button 
            class="btn-reject" 
            @click="reject" 
            :aria-label="t('reject')"
          >
            {{ t('reject') }}
          </button>
        </div>
      </div>

      <!-- Customization Panel -->
      <div v-if="showCustomize" class="cookie-customize" role="region" aria-label="Cookie settings">
        <h3>{{ t('cookieSettings') }}</h3>
        <label class="toggle-label">
          <input 
            type="checkbox" 
            v-model="analytics" 
            aria-describedby="analytics-desc"
          />
          <span>{{ t('analyticsCookies') }}</span>
        </label>
        <p id="analytics-desc" class="help-text">
          {{ t('analyticsDescription') || 'We use these to improve your experience.' }}
        </p>

        <div class="customize-buttons">
          <button @click="saveCustom" class="btn-save">{{ t('saveSettings') }}</button>
          <button @click="showCustomize = false" class="btn-cancel">{{ t('cancel') }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, inject, watch } from 'vue';

// Props & Emits
const emit = defineEmits(['consent-changed']);

// State
const showBanner = ref(false);
const showCustomize = ref(false);
const analytics = ref(false);

// Dependencies
const app = inject('appState');

// Helper for translations
function t(key) {
  return app?.t?.(key) ?? key;
}

// --- Actions ---

function acceptAll() {
  localStorage.setItem('cookieConsent', 'all');
  localStorage.setItem('analytics', 'true');
  analytics.value = true;
  closeBanner();
  emit('consent-changed', { type: 'all', analytics: true });
  applyAnalytics(true);
}

function reject() {
  localStorage.setItem('cookieConsent', 'none');
  localStorage.setItem('analytics', 'false');
  analytics.value = false;
  closeBanner();
  emit('consent-changed', { type: 'none', analytics: false });
  applyAnalytics(false);
}

function saveCustom() {
  localStorage.setItem('cookieConsent', 'custom');
  localStorage.setItem('analytics', analytics.value.toString());
  closeBanner();
  showCustomize.value = false;
  emit('consent-changed', { type: 'custom', analytics: analytics.value });
  applyAnalytics(analytics.value);
}

function closeBanner() {
  showBanner.value = false;
}

// --- Lifecycle & Logic ---

onMounted(() => {
  const consent = localStorage.getItem('cookieConsent');
  
  if (!consent) {
    showBanner.value = true;
    analytics.value = false; // Default to off
  } else {
    // Restore state
    analytics.value = localStorage.getItem('analytics') === 'true';
    
    // Re-apply analytics if they were previously accepted
    if (consent === 'all' || (consent === 'custom' && analytics.value)) {
      applyAnalytics(true);
    }
  }
});

// Watch for Escape key to close customize panel
watch(showCustomize, (val) => {
  if (val) {
    const handleEsc = (e) => {
      if (e.key === 'Escape') showCustomize.value = false;
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }
});

// --- Analytics Logic ---

/**
 * Placeholder for your actual analytics initialization.
 * Replace this with your specific library (GA4, Plausible, etc.)
 */
function applyAnalytics(enabled) {
  if (enabled) {
    if (!window.analyticsInitialized) {
      console.log('🍪 Analytics enabled');
      // TODO: Initialize your analytics script here
      // Example: initGoogleAnalytics();
      window.analyticsInitialized = true;
    }
  } else {
    console.log('🚫 Analytics disabled');
    // Optional: Clean up listeners if your library supports it
  }
}
</script>

<style scoped>
/* Animation */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* Layout */
.cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border-top: 1px solid var(--border);
  padding: 16px 24px;
  z-index: 1000;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

.cookie-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .cookie-content {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.cookie-text p {
  margin: 0;
  line-height: 1.5;
  color: var(--text-secondary);
}

.cookie-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

/* Buttons */
button {
  font-family: inherit;
  font-size: 0.9rem;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.btn-accept {
  background: var(--primary);
  color: white;
  border: 1px solid var(--primary);
}

.btn-accept:hover {
  background: var(--primary-dark, #0056b3); /* Fallback */
  transform: translateY(-1px);
}

.btn-custom {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-primary);
}

.btn-custom:hover {
  background: var(--bg-tertiary);
  border-color: var(--text-secondary);
}

.btn-reject {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.btn-reject:hover {
  background: rgba(0,0,0,0.05);
  color: var(--text-primary);
}

/* Customize Panel */
.cookie-customize {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  cursor: pointer;
}

.help-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
}

.customize-buttons {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  justify-content: flex-end;
}

.btn-save {
  background: var(--primary);
  color: white;
  border: none;
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

/* Accessibility Utilities */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>