<template>
  <div class="audio-visualizer-container">
    <canvas
      ref="canvas"
      :width="width"
      :height="height"
      class="audio-visualizer"
      :class="{ active: isAnalyzing }"
    />
    <button
      class="visualizer-toggle"
      type="button"
      :title="appState.t('toggleVisualizer')"
      @click="toggle"
    >
      {{ isAnalyzing ? '⊙' : '◯' }}
    </button>
  </div>
</template>

<script setup>
import { inject, onMounted, onBeforeUnmount, ref } from 'vue';
import { getChainForElement } from '../lib/audioEngine';

const appState = inject('appState');

const canvas = ref(null);
const width = ref(300);
const height = ref(80);
const isAnalyzing = ref(false);

// AnalyserNode jest podpinany RÓWNOLEGLE do istniejącego chain'a audioEngine
// (nie tworzymy własnego MediaElementSource — to wywoływałoby InvalidStateError,
// bo HTML5 audio jest już podłączony do globalnego AudioContext przez audioEngine).
let analyser = null;
let analyserCtx = null;
let animationId = null;
let retryInterval = null;
let lastTapNode = null;

function toggle() {
  isAnalyzing.value = !isAnalyzing.value;
  if (isAnalyzing.value) {
    initializeAudio();
    animate();
  } else {
    stopVisualization();
  }
}

function stopVisualization() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (retryInterval) {
    clearInterval(retryInterval);
    retryInterval = null;
  }
  // Disconnect analyser z chain'a audioEngine (chain żyje dalej, my odpinamy się od niego).
  if (analyser) {
    try { analyser.disconnect(); } catch { /* ignore */ }
  }
  if (lastTapNode && analyser) {
    try { lastTapNode.disconnect(analyser); } catch { /* ignore */ }
  }
  analyser = null;
  analyserCtx = null;
  lastTapNode = null;

  const ctx = canvas.value?.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, width.value, height.value);
  }
}

function initializeAudio() {
  if (analyser) return;
  // Próbuje natychmiast podłączyć się do globalnego chain HTML5 audio.
  if (!connectToAudioEngine()) {
    // Jeśli HTML5 audio jeszcze nie istnieje (iframe mode), retry co 2s.
    retryInterval = setInterval(() => {
      if (!analyser && isAnalyzing.value) {
        connectToAudioEngine();
      }
    }, 2000);
  }
}

function connectToAudioEngine() {
  try {
    const audioEl = document.getElementById('ap-html5-player');
    if (!audioEl) return false;
    const handle = getChainForElement(audioEl);
    if (!handle?.context || !handle?.tap) return false;

    // Tworzymy AnalyserNode w TYM SAMYM AudioContext co audioEngine.
    analyserCtx = handle.context;
    analyser = analyserCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;

    // Równoległe podpięcie — chain audio jest dalej kierowany do destination
    // (przez `tap` → destination), my dodajemy gałąź `tap → analyser`.
    handle.tap.connect(analyser);
    lastTapNode = handle.tap;

    if (retryInterval) {
      clearInterval(retryInterval);
      retryInterval = null;
    }
    return true;
  } catch (err) {
    console.warn('Failed to connect visualizer to audio engine:', err.message);
    return false;
  }
}

function animate() {
  if (!isAnalyzing.value) return;

  animationId = requestAnimationFrame(animate);

  if (!analyser || !canvas.value) return;

  const ctx = canvas.value.getContext('2d');
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(0, 0, width.value, height.value);

  const barWidth = (width.value / bufferLength) * 2.5;
  
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataArray[i] / 255) * height.value * 0.9;
    
    const gradient = ctx.createLinearGradient(0, height.value - barHeight, 0, height.value);
    const hue = (Date.now() / 80 + i * 2) % 360;
    
    gradient.addColorStop(0, `hsla(${hue}, 100%, 65%, 0.95)`);
    gradient.addColorStop(0.5, `hsla(${hue + 20}, 100%, 55%, 0.85)`);
    gradient.addColorStop(1, `hsla(${hue + 40}, 100%, 45%, 0.6)`);
    
    ctx.fillStyle = gradient;
    
    const radius = Math.min(barWidth / 2, 3);
    if (barHeight > radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, height.value - barHeight);
      ctx.lineTo(x + barWidth - radius, height.value - barHeight);
      ctx.quadraticCurveTo(x + barWidth, height.value - barHeight, x + barWidth, height.value - barHeight + radius);
      ctx.lineTo(x + barWidth, height.value);
      ctx.lineTo(x, height.value);
      ctx.lineTo(x, height.value - barHeight + radius);
      ctx.quadraticCurveTo(x, height.value - barHeight, x + radius, height.value - barHeight);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(x, height.value - barHeight, barWidth, barHeight);
    }

    x += barWidth + 2;
  }
}

onMounted(() => {
  if (canvas.value) {
    width.value = canvas.value.parentElement?.clientWidth || 300;
    height.value = 80;
  }
});

onBeforeUnmount(() => {
  // stopVisualization() obsługuje cancel rAF, clearInterval i disconnect analyser
  // — NIE zamykamy AudioContext, bo jest współdzielony z audioEngine.
  stopVisualization();
});
</script>

<style scoped>
.audio-visualizer-container {
  position: relative;
  width: 100%;
  margin: 16px 0;
  padding: 12px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--line);
}

.audio-visualizer {
  width: 100%;
  height: 80px;
  border-radius: var(--radius-sm);
  background: rgba(0, 0, 0, 0.3);
  display: block;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.audio-visualizer.active {
  opacity: 1;
}

.visualizer-toggle {
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.visualizer-toggle:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(250, 36, 60, 0.3);
}
</style>

