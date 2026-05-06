<template>
  <div v-if="open" class="fixed inset-0 z-[260] flex items-end justify-center bg-black/60 p-3 sm:items-center" @click.self="$emit('close')">
    <section class="surface max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-lg">
      <header class="flex items-center justify-between border-b p-4" style="border-color: var(--surface-line)">
        <div>
          <h2 class="text-lg font-black">Kolejka</h2>
          <p class="text-xs font-semibold" style="color: var(--text-muted)">{{ tracks.length }} utworow</p>
        </div>
        <button class="icon-button" type="button" title="Zamknij" @click="$emit('close')">
          <X :size="18" />
        </button>
      </header>

      <div class="max-h-[58vh] overflow-y-auto p-2">
        <div v-if="tracks.length" class="space-y-1">
          <div
            v-for="(track, index) in tracks"
            :key="track.videoId || `${track.title}-${index}`"
            class="track-row grid grid-cols-[32px_1fr_auto] items-center gap-3 p-2.5"
            :class="index === currentIndex ? 'track-row-current' : ''"
          >
            <span class="text-xs font-black" style="color: var(--text-soft)">{{ index + 1 }}</span>
            <button class="min-w-0 text-left" type="button" @click="$emit('play-index', index)">
              <span class="block truncate text-sm font-black">{{ track.title }}</span>
              <span class="block truncate text-xs font-semibold" style="color: var(--text-muted)">{{ track.artist || track.subtitle }}</span>
            </button>
            <button class="icon-button h-8 w-8" type="button" title="Usun" @click="$emit('remove', index)">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
        <div v-else class="flex min-h-36 items-center justify-center text-sm font-semibold" style="color: var(--text-muted)">
          Kolejka jest pusta
        </div>
      </div>

      <footer class="grid gap-2 border-t p-4 sm:grid-cols-[1fr_auto]" style="border-color: var(--surface-line)">
        <input v-model="title" class="rounded-lg border px-3 py-2 text-sm font-semibold" style="background: var(--bg-input); border-color: var(--surface-line); color: var(--text-main)" placeholder="Nazwa zapisanej kolejki" />
        <button class="primary-button px-4" type="button" :disabled="!tracks.length || !title.trim()" @click="save">
          <Save :size="16" />
          Zapisz
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { Save, Trash2, X } from "lucide-vue-next";

defineProps({
  open: { type: Boolean, default: false },
  tracks: { type: Array, default: () => [] },
  currentIndex: { type: Number, default: -1 },
});

const emit = defineEmits(["close", "play-index", "remove", "save"]);
const title = ref("");

function save() {
  emit("save", title.value.trim());
  title.value = "";
}
</script>
