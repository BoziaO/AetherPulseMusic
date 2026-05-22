<!--
Sidebar: Główny panel nawigacyjny aplikacji.
Zawiera linki do sekcji muzycznych, statystyk oraz ustawień. Zastosowano efekty szklanego interfejsu (glassmorphism).
-->
<template>
  <aside
    class="sidebar fixed inset-y-0 left-0 z-[220] w-[260px] flex flex-col transition-all duration-300 ease-in-out"
    :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
  >
    <div class="flex items-center gap-3 px-6 pt-8 pb-8">
      <RouterLink to="/" class="brand" @click="emit('close')">
        <div class="brand-logo-container">
          <img src="/icon.svg" alt="" class="brand-logo" />
        </div>
        <span class="brand-text">{{ t('appName') }}</span>
      </RouterLink>

      <button class="icon-btn lg:hidden ml-auto" type="button" :title="t('close')" @click="emit('close')">
        <X :size="18" />
      </button>
    </div>

    <nav class="flex-1 overflow-y-auto scrollbar-hide px-4 pb-8">
      <section v-for="group in navigationGroups" :key="group.titleKey || group.items[0].key" class="mb-8">
        <p
          v-if="group.titleKey"
          class="mb-3 px-4 text-[11px] font-bold uppercase tracking-[0.15em] opacity-40"
          :style="{ color: 'var(--text-primary)' }"
        >
          {{ t(group.titleKey) }}
        </p>
        <div class="space-y-1">
          <RouterLink
            v-for="item in group.items"
            :key="item.key"
            :to="item.path"
            class="nav-link"
            :class="isActive(item) ? 'is-active' : ''"
            @click="emit('close')"
          >
            <span class="nav-icon-wrap" :class="isActive(item) ? 'nav-icon-active' : ''">
              <component :is="iconFor(item.key)" :size="18" />
            </span>
            <span class="nav-label truncate">{{ t(item.labelKey) }}</span>
          </RouterLink>
        </div>
      </section>

      <div class="mt-auto pt-6 px-2">
        <button
          class="import-btn w-full group"
          type="button"
          @click="app?.openImportModal?.()"
        >
          <div class="import-icon">
            <DownloadCloud :size="16" />
          </div>
          <span>{{ t('importPlaylist') }}</span>
        </button>
      </div>
    </nav>
  </aside>

  <button
    v-if="open"
    class="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm lg:hidden"
    type="button"
    :title="t('close')"
    @click="emit('close')"
  />
</template>

<script setup>
import { inject } from "vue";
import { RouterLink } from "vue-router";
import {
  Album,
  BarChart3,
  Compass,
  DownloadCloud,
  Heart,
  Library,
  ListMusic,
  Moon,
  Music2,
  Radio,
  Settings,
  Sparkles,
  Star,
  UserRound,
  X,
  Zap,
} from "lucide-vue-next";
import { navigationGroups } from "../data/navigation";

const props = defineProps({
  open: { type: Boolean, default: false },
  currentPath: { type: String, default: "/" },
});

const emit = defineEmits(["close"]);
const app = inject("appState");

function t(key) {
  return app?.t?.(key) ?? key;
}

const icons = {
  home: Radio,
  discover: Compass,
  playlists: Library,
  radio: Radio,
  favorites: Heart,
  "late-night": Moon,
  focus: Zap,
  weekly: Sparkles,
  albums: Album,
  insights: BarChart3,
  settings: Settings,
};

function iconFor(key) {
  return icons[key] || Music2;
}

function isActive(item) {
  if (item.path === "/") return props.currentPath === "/";
  return props.currentPath === item.path || props.currentPath.startsWith(`${item.path}/`);
}
</script>

<style scoped>
.sidebar {
  background: #0d0d12;
  border-right: 1px solid rgba(255, 255, 255, 0.03);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.brand-logo-container {
  width: 32px;
  height: 32px;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.brand-logo {
  width: 20px;
  height: 20px;
  filter: brightness(0) invert(1);
}

.brand-text {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
}

.nav-link.is-active {
  background: rgba(var(--primary-rgb), 0.15);
  color: #fff;
}

.nav-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  transition: transform 0.2s;
}

.nav-link.is-active .nav-icon-wrap {
  color: var(--primary);
  transform: scale(1.1);
}

.nav-label {
  font-weight: 600;
}

.import-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.import-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.import-icon {
  color: var(--primary);
}
</style>

