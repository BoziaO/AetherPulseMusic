<template>
  <div class="privacy-page animate-fade">
    <header class="page-head">
      <p class="page-eyebrow">{{ t('privacyPolicy') }}</p>
      <h1 class="page-title">{{ t('privacyTitle') }}</h1>
      <p class="page-sub">{{ t('privacySubtitle', { date: lastUpdated }) }}</p>
    </header>

    <nav class="toc" :aria-label="t('privacyToc')">
      <h2 class="sr-only">{{ t('privacyToc') }}</h2>
      <ol>
        <li v-for="section in sections" :key="section.id">
          <a :href="`#${section.id}`">{{ t(section.titleKey) }}</a>
        </li>
      </ol>
    </nav>

    <section
      v-for="section in sections"
      :key="section.id"
      :id="section.id"
      class="prose"
    >
      <h2>{{ t(section.titleKey) }}</h2>
      <component :is="section.content" :t="t" :app-version="appVersion" />
    </section>

    <section class="actions-card">
      <h2>{{ t('privacyDataExport') }}</h2>
      <p>{{ t('privacyDataExportDesc') }}</p>
      <div class="actions">
        <button class="btn-secondary" type="button" @click="exportData">
          <Download :size="14" /> {{ t('privacyExportLocal') }}
        </button>
        <button class="btn-secondary danger" type="button" @click="purgeAll">
          <Trash2 :size="14" /> {{ t('privacyEraseAll') }}
        </button>
      </div>
    </section>

    <p class="footer-note">
      <Mail :size="12" /> {{ t('privacyContact') }}
    </p>
  </div>
</template>

<script setup>
import { computed, h, inject } from "vue";
import { Download, Mail, Trash2 } from "lucide-vue-next";

const app = inject("appState");

function t(key, vars) {
  return app?.t?.(key, vars) ?? key;
}

const lastUpdated = "2026-05-13";
const appVersion = "1.0.0";

// Sekcje z treścią — każda jako prosty render-function aby uniknąć
// dużego template'u i wesprzeć future i18n bez plików per-locale.
const sections = computed(() => [
  {
    id: "data-collected",
    titleKey: "privacyDataCollected",
    content: () => h("div", null, [
      h("p", t("privacyDataCollectedIntro")),
      h("ul", null, [
        h("li", null, t("privacyDataLocal")),
        h("li", null, t("privacyDataAccount")),
        h("li", null, t("privacyDataCookies")),
        h("li", null, t("privacyDataNoTracking")),
      ]),
    ]),
  },
  {
    id: "purposes",
    titleKey: "privacyPurposes",
    content: () => h("div", null, [
      h("p", t("privacyPurposesIntro")),
      h("ul", null, [
        h("li", null, t("privacyPurposePersonalization")),
        h("li", null, t("privacyPurposePlayback")),
        h("li", null, t("privacyPurposeImprovement")),
      ]),
    ]),
  },
  {
    id: "third-parties",
    titleKey: "privacyThirdParties",
    content: () => h("div", null, [
      h("p", t("privacyThirdPartiesIntro")),
      h("ul", null, [
        h("li", null, t("privacyThirdYouTube")),
        h("li", null, t("privacyThirdGoogle")),
        h("li", null, t("privacyThirdSponsorBlock")),
        h("li", null, t("privacyThirdLrclib")),
      ]),
    ]),
  },
  {
    id: "user-rights",
    titleKey: "privacyUserRights",
    content: () => h("div", null, [
      h("p", t("privacyUserRightsIntro")),
      h("ul", null, [
        h("li", null, t("privacyRightAccess")),
        h("li", null, t("privacyRightCorrection")),
        h("li", null, t("privacyRightErasure")),
        h("li", null, t("privacyRightPortability")),
        h("li", null, t("privacyRightObjection")),
      ]),
    ]),
  },
  {
    id: "security",
    titleKey: "privacySecurity",
    content: () => h("div", null, [
      h("p", t("privacySecurityIntro")),
      h("ul", null, [
        h("li", null, t("privacySecurityHttps")),
        h("li", null, t("privacySecurityLocal")),
        h("li", null, t("privacySecuritySession")),
      ]),
    ]),
  },
  {
    id: "retention",
    titleKey: "privacyRetention",
    content: () => h("p", t("privacyRetentionDesc")),
  },
  {
    id: "minors",
    titleKey: "privacyMinors",
    content: () => h("p", t("privacyMinorsDesc")),
  },
  {
    id: "changes",
    titleKey: "privacyChanges",
    content: () => h("p", t("privacyChangesDesc", { version: appVersion })),
  },
]);

function exportData() {
  try {
    const dump = {
      exportedAt: new Date().toISOString(),
      version: appVersion,
      localStorage: Object.fromEntries(
        Object.keys(localStorage)
          .filter((k) => k.startsWith("ap:") || k.startsWith("boziamusic:"))
          .map((k) => [k, localStorage.getItem(k)]),
      ),
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aetherpulse-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    app?.showToast?.(t("privacyExportDone"), "success");
  } catch (err) {
    app?.showToast?.(err.message, "error");
  }
}

function purgeAll() {
  if (!window.confirm(t("privacyEraseConfirm"))) return;
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("ap:") || k.startsWith("boziamusic:"))
      .forEach((k) => localStorage.removeItem(k));
    if ("indexedDB" in window) {
      indexedDB.deleteDatabase("aetherpulse-offline");
    }
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
    app?.showToast?.(t("privacyEraseDone"), "success");
    setTimeout(() => location.reload(), 500);
  } catch (err) {
    app?.showToast?.(err.message, "error");
  }
}
</script>

<style scoped>
.privacy-page {
  max-width: 820px;
  margin: 0 auto;
  padding: 0 24px 64px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.page-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 12px;
}

.page-eyebrow {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--primary);
}

.page-title {
  margin: 0;
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.page-sub {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.toc {
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
  padding: 14px 20px;
  border: 1px solid var(--line);
}

.toc ol {
  margin: 0;
  padding-left: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 6px;
  font-size: 13px;
}

.toc a {
  color: var(--text-secondary);
  text-decoration: none;
}

.toc a:hover {
  color: var(--primary);
}

.prose {
  scroll-margin-top: 80px;
}

.prose h2 {
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.prose p {
  margin: 0 0 12px;
  line-height: 1.65;
  color: var(--text-secondary);
}

.prose ul {
  margin: 0;
  padding-left: 22px;
  color: var(--text-secondary);
  line-height: 1.65;
}

.prose li {
  margin-bottom: 6px;
}

.actions-card {
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
  padding: 20px 22px;
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.actions-card h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.actions-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.btn-secondary.danger {
  color: var(--danger);
}

.footer-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
</style>
