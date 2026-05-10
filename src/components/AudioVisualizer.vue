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
import { inject, onMounted, onBeforeUnmount, ref, watch } from 'vue';

const appState = inject('appState');

const canvas = ref(null);
const videoElement = document.querySelector('#yt-hidden-player iframe');
const width = ref(300);
const height = ref(80);
const isAnalyzing = ref(false);
let audioContext = null;
let analyser = null;
let animationId = null;

function toggle() {
  isAnalyzing.value = !isAnalyzing.value;
  if (isAnalyzing.value) {
    initializeAudio();
    animate();
  } else {
    if (animationId) cancelAnimationFrame(animationId);
    const ctx = canvas.value?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillRect(0, 0, width.value, height.value);
    }
  }
}

function initializeAudio() {
  if (audioContext) return;

  try {
    // Create audio context from window for user gesture
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;

    // Try to connect to YouTube player audio (cross-origin limitation)
    // For demo: use microphone or local audio
    // Users can grant permission formic input
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const source = audioContext.createMediaStreamAudioSource(stream);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
      })
      .catch(() => {
        // Fallback: create a dummy oscillator for demo
        const osc = audioContext.createOscillator();
        osc.connect(analyser);
        analyser.connect(audioContext.destination);
        osc.start();
      });
  } catch (e) {
    console.warn('Audio API not available:', e.message);
    isAnalyzing.value = false;
  }
}

function animate() {
  if (!isAnalyzing.value) return;

  animationId = requestAnimationFrame(animate);

  if (!analyser || !canvas.value) return;

  const ctx = canvas.value.getContext('2d');
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  // Clear canvas
  ctx.fillStyle = 'rgba(0, 0, 0, 0.0)';
  ctx.fillRect(0, 0, width.value, height.value);

  // Draw bars
  const barWidth = (width.value / dataArray.length) * 2.5;
  const hue = (Date.now() / 50) % 360;

  let x = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const barHeight = (dataArray[i] / 255) * height.value;

    // Gradient color
    ctx.fillStyle = `hsl(${hue + (i * 360 / dataArray.length)}, 100%, 50%)`;
    ctx.fillRect(x, height.value - barHeight, barWidth, barHeight);

    x += barWidth + 1;
  }
}

onMounted(() => {
  if (canvas.value) {
    width.value = canvas.value.parentElement?.clientWidth || 300;
    height.value = 80;
  }
});

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId);
  if (audioContext) {
    audioContext.close();
  }
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

