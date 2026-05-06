<template>
  <aside
    class="fixed inset-y-0 left-0 z-[220] w-[260px] px-6 py-8 transition-transform lg:translate-x-0"
    :class="open ? 'translate-x-0' : '-translate-x-full'"
    style="background: var(--bg-sidebar); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); border-right: 1px solid var(--surface-line)"
  > 
    <div class="mb-10 flex items-center justify-between">
      <RouterLink to="/" class="flex items-center gap-3 group cursor-pointer" @click="emit('close')">
        <div
          class="w-11 h-11 flex items-center justify-center text-white rounded-2xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"
          :style="{ background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #ff9988))' }"
        >
          <Zap :size="22" fill="white" />
        </div>
        <div>
          <h2 class="text-xl font-black tracking-tighter uppercase italic" :style="{ color: 'var(--text-main)' }">
            AetherPulse<span :style="{ color: 'var(--primary)' }"> Music</span>
          </h2>
          <p class="text-[9px] uppercase tracking-[0.3em] font-black" :style="{ color: 'var(--text-soft)' }">
              Powered by Energy
            </p>
        </div>
      </RouterLink>

      <button class="icon-button lg:hidden" type="button" @click="emit('close')">
        <X :size="20" />
      </button>
    </div>

    <nav class="space-y-8">
      <section v-for="group in navigationGroups" :key="group.title">
        <p class="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-soft)]">
          {{ group.title }}
        </p>
        <div class="space-y-[2px]">
          <RouterLink
            v-for="item in group.items"
            :key="item.key"
            :to="item.path"
            class="group flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors"
            :class="isActive(item) ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-main)] hover:bg-[var(--surface-line)]'"
            @click="emit('close')"
          >
            <component :is="iconFor(item.key)" :size="20" :class="isActive(item) ? 'text-white' : 'text-[var(--primary)]'" />
            <span class="truncate">{{ item.label }}</span>
          </RouterLink>
        </div>
      </section>
    </nav>
  </aside>

  <button
    v-if="open"
    class="fixed inset-0 z-[210] bg-black/50 lg:hidden"
    type="button"
    title="Zamknij menu"
    @click="emit('close')"
  />
</template>

<script setup>
import { RouterLink } from "vue-router";
import {
  Album,
  BarChart3,
  Compass,
  Heart, 
  Home,
  Library,
  ListMusic,
  Music2,
  Settings,
  Sparkles,
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

const icons = {
  home: Home,
  discover: Compass,
  chill: Sparkles,
  energy: Zap,
  playlists: Library,
  favorites: Heart,
  recent: ListMusic,
  artists: UserRound,
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
