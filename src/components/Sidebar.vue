<template>
  <aside
    class="sidebar fixed inset-y-0 left-0 z-[220] w-[260px] flex flex-col transition-transform"
    :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
  >
    <div class="flex items-center justify-between px-6 pt-6 pb-4">
      <RouterLink to="/" class="brand" @click="emit('close')">
        <img src="/icon.svg" alt="" class="brand-logo" />
        <span class="brand-text">{{ t('appName') }}</span>
      </RouterLink>

      <button class="icon-btn lg:hidden" type="button" :title="t('close')" @click="emit('close')">
        <X :size="18" />
      </button>
    </div>

    <nav class="flex-1 overflow-y-auto scrollbar-hide px-3 pb-6">
      <section v-for="group in navigationGroups" :key="group.titleKey || group.items[0].key" class="mb-5">
        <p
          v-if="group.titleKey"
          class="mb-1 px-3 text-[11px] font-bold uppercase tracking-[0.06em]"
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
            <component :is="iconFor(item.key)" :size="18" />
            <span class="truncate">{{ t(item.labelKey) }}</span>
          </RouterLink>
        </div>
      </section>
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
  background: var(--bg-sidebar);
  backdrop-filter: var(--glass);
  -webkit-backdrop-filter: var(--glass);
  border-right: 1px solid var(--line);
  box-shadow: 1px 0 0 var(--line), 8px 0 32px rgba(0, 0, 0, 0.3);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  position: relative;
  padding: 4px 0;
}

.brand-logo {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  object-fit: cover;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.08);
  filter: drop-shadow(0 0 8px rgba(var(--primary-rgb), 0.3));
  transition: filter var(--transition-base), transform var(--transition-base);
}

.brand:hover .brand-logo {
  filter: drop-shadow(0 0 12px rgba(var(--primary-rgb), 0.5));
  transform: scale(1.04);
}

.brand-text {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, var(--text-primary) 40%, rgba(var(--primary-rgb), 0.75) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
  position: relative;
  overflow: hidden;
}

.nav-link:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  transform: translateX(2px);
}

.nav-link:active {
  transform: scale(0.97) translateX(0);
}

.nav-link.is-active {
  background: rgba(var(--primary-rgb), 0.1);
  color: var(--primary);
  font-weight: 600;
}

.nav-link.is-active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 18%;
  height: 64%;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--primary-hover), var(--primary));
  box-shadow: 0 0 8px rgba(var(--primary-rgb), 0.6);
}

.nav-link.is-active::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at left center, rgba(var(--primary-rgb), 0.08) 0%, transparent 70%);
  pointer-events: none;
  border-radius: inherit;
}

.nav-link.is-active:hover {
  background: rgba(var(--primary-rgb), 0.15);
  transform: translateX(2px);
}
</style>
