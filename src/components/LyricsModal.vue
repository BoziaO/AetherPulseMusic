<template>
  <div v-if="open" class="fixed inset-0 z-[260] flex items-end justify-center bg-black/60 p-3 sm:items-center" @click.self="$emit('close')">
    <section class="surface max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-lg">
      <header class="flex items-center justify-between border-b p-4" style="border-color: var(--surface-line)">
        <div class="min-w-0">
          <h2 class="truncate text-lg font-black">Tekst</h2>
          <p class="truncate text-xs font-semibold" style="color: var(--text-muted)">{{ track?.title }} - {{ track?.artist }}</p>
        </div>
        <button class="icon-button" type="button" title="Zamknij" @click="$emit('close')">
          <X :size="18" />
        </button>
      </header>

      <div class="max-h-[64vh] overflow-y-auto p-5">
        <div v-if="loading" class="flex min-h-48 items-center justify-center text-sm font-semibold" style="color: var(--text-muted)">
          Ladowanie tekstu...
        </div>

        <div v-else-if="timedLines.length" class="space-y-2">
          <button
            v-for="(line, index) in timedLines"
            :key="`${line.time}-${index}`"
            class="block w-full rounded-lg px-3 py-2 text-left text-base font-black transition-colors"
            :style="activeIndex === index ? activeLineStyle : inactiveLineStyle"
            type="button"
            @click="$emit('seek', line.time)"
          >
            {{ line.text }}
          </button>
        </div>

        <pre v-else class="whitespace-pre-wrap text-sm font-semibold leading-7" style="color: var(--text-muted)">{{ plainLyrics || "Brak tekstu dla tego utworu." }}</pre>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { X } from "lucide-vue-next";
import { fetchJson } from "../lib/api";

const props = defineProps({
  open: { type: Boolean, default: false },
  track: { type: Object, default: null },
  currentTime: { type: Number, default: 0 },
});

defineEmits(["close", "seek"]);

const loading = ref(false);
const plainLyrics = ref("");
const timedLines = ref([]);

const activeLineStyle = "background: color-mix(in srgb, var(--primary) 18%, var(--bg-card)); color: var(--text-main)";
const inactiveLineStyle = "background: transparent; color: var(--text-muted)";

const activeIndex = computed(() => {
  if (!timedLines.value.length) return -1;
  let index = 0;
  for (let i = 0; i < timedLines.value.length; i += 1) {
    if (timedLines.value[i].time <= props.currentTime + 0.2) index = i;
  }
  return index;
});

watch(
  () => [props.open, props.track?.videoId, props.track?.title],
  async () => {
    if (!props.open || !props.track) return;
    loading.value = true;
    plainLyrics.value = "";
    timedLines.value = [];
    try {
      const params = new URLSearchParams();
      if (props.track.videoId) params.set("videoId", props.track.videoId);
      if (props.track.title) params.set("title", props.track.title);
      if (props.track.artist) params.set("artist", props.track.artist);
      const data = await fetchJson(`/api/lyrics?${params.toString()}`, { timeout: 12000 });
      const text = data.syncedLyrics || data.lyrics || data.plainLyrics || "";
      timedLines.value = parseTimedLyrics(text);
      plainLyrics.value = timedLines.value.length ? "" : text;
    } catch (error) {
      plainLyrics.value = error.message;
    } finally {
      loading.value = false;
    }
  },
);

function parseTimedLyrics(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/);
      if (!match) return null;
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const millis = Number((match[3] || "0").padEnd(3, "0"));
      return { time: minutes * 60 + seconds + millis / 1000, text: match[4] || "..." };
    })
    .filter(Boolean);
}
</script>
