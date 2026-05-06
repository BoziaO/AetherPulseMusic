<template>
  <div v-if="items.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
    <button
      v-for="(item, index) in items"
      :key="itemKey(item, index)"
      class="media-card interactive min-w-0 p-2 text-left"
      type="button"
      @click="$emit('open', item)"
    >
      <span class="relative mb-3 block aspect-square overflow-hidden rounded-lg" style="background: var(--bg-card)">
        <img
          v-if="item.thumbnail || item.cover || item.art"
          :src="item.thumbnail || item.cover || item.art"
          alt=""
          class="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <span v-else class="flex h-full w-full items-center justify-center" style="color: var(--text-soft)">
          <Music2 :size="34" />
        </span>
        <span class="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-lg">
          <Play :size="17" fill="currentColor" />
        </span>
      </span>
      <span class="block truncate text-sm font-black">{{ item.title || item.name }}</span>
      <span class="mt-1 block truncate text-xs font-semibold" style="color: var(--text-muted)">
        {{ item.subtitle || item.author || item.artist || item.meta || "YouTube Music" }}
      </span>
    </button>
  </div>

  <div v-else class="panel flex min-h-44 items-center justify-center p-6 text-center text-sm font-semibold" style="color: var(--text-muted)">
    {{ emptyLabel }}
  </div>
</template>

<script setup>
import { Music2, Play } from "lucide-vue-next";

defineProps({
  items: { type: Array, default: () => [] },
  emptyLabel: { type: String, default: "Brak danych" },
});

defineEmits(["open"]);

function itemKey(item, index) {
  return item?.videoId || item?.browseId || item?.playlistId || `${item?.title || "item"}-${index}`;
}
</script>
