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
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.brand-logo {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  object-fit: cover;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
}

.brand-text {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.nav-link:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-link.is-active {
  background: var(--bg-active);
  color: var(--primary);
}
</style>
