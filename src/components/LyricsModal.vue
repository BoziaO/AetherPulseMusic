<template>
  <div v-if="open" class="modal-overlay animate-fade" @click.self="$emit('close')">
    <section class="modal animate-slide-up">
      <header class="modal-header">
        <div class="modal-header-info min-w-0">
          <h2 class="modal-title">{{ t('lyrics') }}</h2>
          <p class="modal-subtitle line-clamp-1">{{ track?.title }} — {{ track?.artist }}</p>
        </div>
        <button class="icon-btn" type="button" :title="t('close')" @click="$emit('close')">
          <X :size="18" />
        </button>
      </header>

      <div class="modal-body-wrap">
        <div ref="containerRef" class="modal-body custom-scroll">

          <!-- Loading state -->
          <div v-if="loading" class="state-center">
            <div class="loading-dots">
              <span /><span /><span />
            </div>
          </div>

          <!-- Timed / synced lyrics -->
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

          <!-- Plain / untimed or empty -->
          <div v-else class="plain-wrap">
            <pre class="plain">{{ plainLyrics || t('emptyData') }}</pre>
          </div>

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
/* ── Overlay ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 260;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  padding: 16px;
}

@media (min-width: 720px) {
  .modal-overlay {
    align-items: center;
  }
}

/* ── Modal shell ── */
.modal {
  width: 100%;
  max-width: 600px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  /* Uses theme colors instead of hardcoded dark values */
  background: linear-gradient(170deg, var(--bg-elevated) 0%, var(--bg-base) 100%);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow:
    0 0 0 1px var(--line),
    0 40px 100px rgba(0, 0, 0, 0.65),
    0 8px 32px rgba(0, 0, 0, 0.4);
}

/* ── Header ── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 18px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.modal-header-info {
  min-width: 0;
  flex: 1;
}

.modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: var(--font-weight-display, 700);
  letter-spacing: var(--letter-spacing, -0.02em);
  color: var(--text-primary);
  line-height: 1.2;
}

.modal-subtitle {
  margin: 5px 0 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Scrollable body ── */
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
  padding: 60px 28px;
  scroll-behavior: smooth;
}

.modal-body::-webkit-scrollbar {
  width: 3px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(var(--primary-rgb), 0.25);
  border-radius: 2px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--primary-rgb), 0.5);
}

/* ── Fade overlays ── */
.fade-top,
.fade-bottom {
  position: absolute;
  left: 0;
  right: 0;
  height: 80px;
  pointer-events: none;
  z-index: 2;
}

.fade-top {
  top: 0;
  /* Fades using the actual theme background color */
  background: linear-gradient(to bottom, var(--bg-elevated) 0%, transparent 100%);
}

.fade-bottom {
  bottom: 0;
  background: linear-gradient(to top, var(--bg-base) 0%, transparent 100%);
}

/* ── Loading ── */
.state-center {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
}

.loading-dots {
  display: flex;
  gap: 10px;
  align-items: center;
}

.loading-dots span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  /* Uses theme primary color instead of hardcoded white */
  background: var(--primary);
  opacity: 0.3;
  animation: dot-bounce 1.3s ease-in-out infinite;
}

.loading-dots span:nth-child(2) { animation-delay: 0.22s; }
.loading-dots span:nth-child(3) { animation-delay: 0.44s; }

@keyframes dot-bounce {
  0%, 60%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.3;
  }
  30% {
    transform: translateY(-10px) scale(1.15);
    opacity: 1;
  }
}

/* ── Timed lyrics ── */
.lines {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 24px 0;
}

.line {
  display: block;
  text-align: center;
  font-size: 20px;
  font-weight: var(--font-weight-display, 700);
  line-height: 1.55;
  letter-spacing: var(--letter-spacing, -0.02em);
  padding: 9px 20px;
  border-radius: var(--radius-lg);
  /* Default: very dimmed — future lines */
  color: var(--text-quaternary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition:
    color 0.42s cubic-bezier(0.4, 0, 0.2, 1),
    font-size 0.42s cubic-bezier(0.4, 0, 0.2, 1),
    font-weight 0.42s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.42s cubic-bezier(0.4, 0, 0.2, 1),
    background 0.2s ease,
    text-shadow 0.42s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  transform-origin: center;
}

.line:hover {
  color: var(--text-secondary);
  background: rgba(var(--primary-rgb), 0.06);
}

.line.is-past {
  color: var(--text-tertiary);
  font-size: 19px;
}

.line.is-future {
  color: var(--text-quaternary);
  font-size: 19px;
}

/* Active line: theme primary color with multi-layer glow */
.line.is-active {
  color: var(--primary);
  font-size: 26px;
  font-weight: var(--font-weight-display, 800);
  transform: scale(1.03);
  text-shadow:
    0 0 48px rgba(var(--primary-rgb), 0.55),
    0 0 20px rgba(var(--primary-rgb), 0.3),
    0 2px 12px rgba(0, 0, 0, 0.35);
}

/* ── Plain / untimed lyrics ── */
.plain-wrap {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 200px;
  padding: 4px 0;
}

.plain {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 15px;
  line-height: 2;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
  text-align: center;
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .line {
    transition: color 0.01ms, background 0.01ms;
  }
  .loading-dots span {
    animation: none;
    opacity: 0.6;
  }
}
</style>
