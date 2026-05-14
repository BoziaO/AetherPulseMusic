<template>
  <Transition name="legal-modal">
    <div v-if="open" class="legal-overlay" @click.self="$emit('decline')">
      <section class="legal-modal" role="alertdialog" aria-modal="true">
        <header class="legal-head">
          <ShieldAlert :size="22" :style="{ color: 'var(--warning)' }" />
          <h2 class="legal-title">{{ t('legalDisclaimerTitle') }}</h2>
        </header>

        <div class="legal-body">
          <p>{{ t('legalDisclaimerBody') }}</p>
        </div>

        <footer class="legal-actions">
          <button class="btn-secondary" type="button" @click="$emit('decline')">
            {{ t('legalDisclaimerDecline') }}
          </button>
          <button class="btn-primary" type="button" @click="$emit('accept')">
            <Check :size="14" />
            {{ t('legalDisclaimerAccept') }}
          </button>
        </footer>
      </section>
    </div>
  </Transition>
</template>

<script setup>
import { inject } from "vue";
import { Check, ShieldAlert } from "lucide-vue-next";

defineProps({
  open: { type: Boolean, default: false },
});

defineEmits(["accept", "decline"]);

const app = inject("appState");
function t(key, vars) {
  return app?.t?.(key, vars) ?? key;
}
</script>

<style scoped>
.legal-overlay {
  position: fixed;
  inset: 0;
  z-index: 320;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  padding: 16px;
}

.legal-modal {
  width: 100%;
  max-width: 520px;
  background: var(--bg-card-strong);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-strong);
  overflow: hidden;
}

.legal-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 22px;
  background: rgba(255, 214, 10, 0.06);
  border-bottom: 1px solid var(--line);
}

.legal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.legal-body {
  padding: 20px 22px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-secondary);
}

.legal-body p {
  margin: 0;
}

.legal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 18px 18px;
  border-top: 1px solid var(--line);
}

.legal-modal-enter-active,
.legal-modal-leave-active {
  transition: opacity 0.2s ease;
}

.legal-modal-enter-active .legal-modal,
.legal-modal-leave-active .legal-modal {
  transition: transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.2s ease;
}

.legal-modal-enter-from,
.legal-modal-leave-to {
  opacity: 0;
}

.legal-modal-enter-from .legal-modal,
.legal-modal-leave-to .legal-modal {
  transform: translateY(20px) scale(0.95);
  opacity: 0;
}
</style>
