<template>
  <div v-if="open" class="modal-overlay animate-fade" @click.self="$emit('close')">
    <section class="modal animate-slide-up">
      <header class="modal-header">
        <div class="min-w-0">
          <h2 class="modal-title">{{ t('lyrics') }}</h2>
          <p class="modal-subtitle">{{ track?.title }} — {{ track?.artist }}</p>
        </div>
        <button class="icon-btn" type="button" :title="t('close')" @click="$emit('close')">
          <X :size="18" />
        </button>
      </header>

      <div ref="containerRef" class="modal-body custom-scroll">
        <div v-if="loading" class="state-msg">{{ t('searching') }}</div>

        <div v-else-if="timedLines.length" class="lines">
          <button
            v-for="(line, index) in timedLines"
            :key="`${line.time}-${index}`"
            :data-lyric-index="index"
            class="line"
            :class="activeIndex === index ? 'is-active' : ''"
            type="button"
            @click="$emit('seek', line.time)"
          >
            {{ line.text }}
          </button>
        </div>

        <pre v-else class="plain">{{ plainLyrics || t('emptyData') }}</pre>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, inject, ref, watch } from "vue";
import { X } from "lucide-vue-next";
import { fetchJson } from "../lib/api";

const props = defineProps({
  open: { type: Boolean, default: false },
  track: { type: Object, default: null },
  currentTime: { type: Number, default: 0 },
});

defineEmits(["close", "seek"]);

const app = inject("appState");
function t(key) {
  return app?.t?.(key) ?? key;
}

const loading = ref(false);
const plainLyrics = ref("");
const timedLines = ref([]);
const containerRef = ref(null);

const activeIndex = computed(() => {
  if (!timedLines.value.length) return -1;
  let index = 0;
  for (let i = 0; i < timedLines.value.length; i += 1) {
    if (timedLines.value[i].time <= props.currentTime + 0.2) index = i;
  }
  return index;
});

const followMode = computed(() => app?.lyricsFollowMode?.value ?? true);

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
      if (containerRef.value) containerRef.value.scrollTop = 0;
    } catch (error) {
      plainLyrics.value = error.message;
    } finally {
      loading.value = false;
    }
  },
);

watch(
  () => [props.open, props.currentTime, timedLines.value.length, followMode.value],
  () => {
    if (!props.open || !followMode.value || !timedLines.value.length) return;
    scrollToActive(activeIndex.value);
  },
  { flush: "post" },
);

function scrollToActive(index) {
  if (!containerRef.value || index < 0) return;
  const el = containerRef.value.querySelector(`[data-lyric-index="${index}"]`);
  if (!el) return;
  const top = el.offsetTop;
  const bottom = top + el.offsetHeight;
  const viewTop = containerRef.value.scrollTop;
  const viewBottom = viewTop + containerRef.value.clientHeight;
  if (top < viewTop + 24) {
    containerRef.value.scrollTop = Math.max(0, top - 24);
  } else if (bottom > viewBottom - 24) {
    containerRef.value.scrollTop = Math.max(0, bottom - containerRef.value.clientHeight + 24);
  }
}

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
      return { time: minutes * 60 + seconds + millis / 1000, text: match[4] || "…" };
    })
    .filter(Boolean);
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 260;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  padding: 16px;
}

@media (min-width: 720px) {
  .modal-overlay {
    align-items: center;
  }
}

.modal {
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(30, 30, 35, 0.98) 0%, rgba(20, 20, 25, 0.98) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.modal-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px 24px;
  scroll-behavior: smooth;
}

.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.state-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: rgba(255, 255, 255, 0.35);
  font-size: 15px;
  font-weight: 500;
}

.lines {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.line {
  text-align: left;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.6;
  letter-spacing: -0.01em;
  padding: 10px 14px;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.35);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  position: relative;
  overflow: hidden;
}

.line::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(var(--primary-rgb, 255, 255, 255), 0.1) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s;
}

.line:hover {
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.04);
  transform: translateX(4px);
}

.line:hover::before {
  opacity: 1;
}

.line.is-active {
  color: #fff;
  background: rgba(var(--primary-rgb, 255, 255, 255), 0.12);
  font-weight: 800;
  transform: translateX(6px);
  box-shadow: 0 4px 20px rgba(var(--primary-rgb, 255, 255, 255), 0.15);
}

.line.is-active::before {
  opacity: 1;
}

.plain {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.65);
  letter-spacing: 0.01em;
}
</style>
