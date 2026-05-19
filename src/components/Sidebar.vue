<!--
Sidebar: Główny panel nawigacyjny aplikacji.
Zawiera linki do sekcji muzycznych, statystyk oraz ustawień. Zastosowano efekty szklanego interfejsu (glassmorphism).
-->
<template>
  <aside
    class="sidebar fixed inset-y-0 left-0 z-[220] w-[260px] flex flex-col transition-all duration-300 ease-in-out"
    :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
  >
    <div class="flex items-center justify-between px-7 pt-7 pb-5">
      <RouterLink to="/" class="brand" @click="emit('close')">
        <img src="/icon.svg" alt="" class="brand-logo" />
        <span class="brand-text">{{ t('appName') }}</span>
      </RouterLink>

      <button class="icon-btn lg:hidden" type="button" :title="t('close')" @click="emit('close')">
        <X :size="18" />
      </button>
    </div>

    <nav class="flex-1 overflow-y-auto scrollbar-hide px-4 pb-8">
      <section v-for="group in navigationGroups" :key="group.titleKey || group.items[0].key" class="mb-6">
        <p
          v-if="group.titleKey"
          class="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em]"
          :style="{ color: 'var(--text-tertiary)' }"
        >
          {{ t(group.titleKey) }}
        </p>
        <div class="space-y-0.5">
          <RouterLink
            v-for="item in group.items"
            :key="item.key"
            :to="item.path"
            class="nav-link"
            :class="isActive(item) ? 'is-active' : ''"
            @click="emit('close')"
          >
            <span class="nav-icon-wrap" :class="isActive(item) ? 'nav-icon-active' : ''">
              <component :is="iconFor(item.key)" :size="15" />
            </span>
            <span class="nav-label truncate">{{ t(item.labelKey) }}</span>
          </RouterLink>
        </div>
      </section>

      <div class="mt-auto pt-4 border-t border-white/[0.05]">
        <button
          class="nav-link w-full text-left group"
          type="button"
          @click="app?.openImportModal?.()"
        >
          <span class="nav-icon-wrap group-hover:bg-primary/20 group-hover:text-primary">
            <DownloadCloud :size="15" />
          </span>
          <span class="nav-label truncate">{{ t('importPlaylist') }}</span>
        </button>
      </div>
    </nav>
  </aside>

  <button
    v-if="open"
    class="fixed inset-0 z-[210] bg-black/50 lg:hidden"
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
  Music2,
  Radio,
  Settings,
  Sparkles,
  Star,
  UserRound,
  X,
  Zap,
} from "lucide-vue-next";
// Music2 kept for fallback iconFor()
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
  "for-you": Star,
  discover: Compass,
  chill: Sparkles,
  energy: Zap,
  recent: ListMusic,
  favorites: Heart,
  downloads: DownloadCloud,
  artists: UserRound,
  albums: Album,
  playlists: Library,
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
  background: rgba(18, 18, 22, 0.85);
  backdrop-filter: blur(25px) saturate(180%);
  -webkit-backdrop-filter: blur(25px) saturate(180%);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 10px 0 30px rgba(0, 0, 0, 0.5);
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
}

.brand-logo {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  object-fit: cover;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  transition: filter var(--transition-base), transform var(--transition-base);
}

.brand:hover .brand-logo {
  transform: scale(1.05) rotate(-3deg);
}

.brand-text {
  font-size: 17px;
  font-weight: 900;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 14px;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  transform: translateX(4px);
}

.nav-label {
  letter-spacing: -0.01em;
  opacity: 0.85;
  transition: opacity 0.2s;
}

.nav-link:hover .nav-label { opacity: 1; }

.nav-link.is-active {
  background: rgba(var(--primary-rgb), 0.12);
  color: var(--primary);
}

.nav-icon-wrap {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-tertiary);
  transition: all 0.2s;
}

.nav-icon-active {
  background: rgba(var(--primary-rgb), 0.2) !important;
  color: var(--primary) !important;
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.2);
}

.nav-link.is-active::before {
  content: "";
  position: absolute;
  left: -4px;
  top: 20%;
  height: 60%;
  width: 3px;
  border-radius: 0 4px 4px 0;
  background: var(--primary);
  box-shadow: 4px 0 10px var(--primary);
}
</style>
