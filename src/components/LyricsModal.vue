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

      <div class="modal-body-wrap">
        <div ref="containerRef" class="modal-body custom-scroll">
          <div v-if="loading" class="state-msg">
            <div class="loading-dots">
              <span /><span /><span />
            </div>
          </div>

          <div v-else-if="timedLines.length" class="lines">
            <button
              v-for="(line, index) in timedLines"
              :key="`${line.time}-${index}`"
              :data-lyric-index="index"
              class="line"
              :class="{
                'is-active': activeIndex === index,
                'is-past': index < activeIndex,
                'is-future': index > activeIndex && activeIndex >= 0,
              }"
              type="button"
              @click="$emit('seek', line.time)"
            >
              {{ line.text }}
            </button>
          </div>

          <pre v-else class="plain">{{ plainLyrics || t('emptyData') }}</pre>
        </div>
        <div class="fade-top" />
        <div class="fade-bottom" />
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
  const containerHeight = containerRef.value.clientHeight;
  const targetTop = el.offsetTop - containerHeight / 2 + el.offsetHeight / 2;
  containerRef.value.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
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
  backdrop-filter: blur(12px);
  padding: 16px;
}

@media (min-width: 720px) {
  .modal-overlay {
    align-items: center;
  }
}

.modal {
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(18, 18, 22, 0.98) 0%, rgba(12, 12, 16, 0.98) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 32px 100px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(24px);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
}

.modal-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal-body-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 48px 24px;
  scroll-behavior: smooth;
}

.modal-body::-webkit-scrollbar {
  width: 4px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
}

.fade-top,
.fade-bottom {
  position: absolute;
  left: 0;
  right: 0;
  height: 64px;
  pointer-events: none;
  z-index: 2;
}

.fade-top {
  top: 0;
  background: linear-gradient(to bottom, rgba(14, 14, 18, 0.95) 0%, transparent 100%);
}

.fade-bottom {
  bottom: 0;
  background: linear-gradient(to top, rgba(12, 12, 16, 0.95) 0%, transparent 100%);
}

.state-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.loading-dots {
  display: flex;
  gap: 8px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  animation: dot-bounce 1.2s ease-in-out infinite;
}

.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
  30% { transform: translateY(-8px); opacity: 1; }
}

.lines {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 20px 0;
}

.line {
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.5;
  letter-spacing: -0.02em;
  padding: 10px 16px;
  border-radius: 14px;
  color: rgba(255, 255, 255, 0.22);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  transform-origin: center;
}

.line:hover {
  color: rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.04);
}

.line.is-past {
  color: rgba(255, 255, 255, 0.32);
  font-size: 20px;
}

.line.is-future {
  color: rgba(255, 255, 255, 0.18);
  font-size: 20px;
}

.line.is-active {
  color: #fff;
  font-size: 26px;
  font-weight: 800;
  transform: scale(1.02);
  text-shadow:
    0 0 40px rgba(var(--primary-rgb, 255, 255, 255), 0.5),
    0 2px 20px rgba(0, 0, 0, 0.4);
}

.plain {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.65);
  letter-spacing: 0.01em;
  text-align: center;
}
</style>
