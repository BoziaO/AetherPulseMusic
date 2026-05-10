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
const width = ref(300);
const height = ref(80);
const isAnalyzing = ref(false);
let audioContext = null;
let analyser = null;
let animationId = null;
let sourceNode = null;
let retryInterval = null;

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
  const ctx = canvas.value?.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, width.value, height.value);
  }
}

function initializeAudio() {
  if (audioContext) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;

    connectToMediaElement();
    
    retryInterval = setInterval(() => {
      if (!sourceNode && isAnalyzing.value) {
        connectToMediaElement();
      }
    }, 2000);
  } catch (e) {
    console.warn('Audio API not available:', e.message);
    isAnalyzing.value = false;
    appState?.showToast?.('Visualizer initialization failed', 'error');
  }
}

function connectToMediaElement() {
  try {
    const videoElements = document.querySelectorAll('video');
    let mediaElement = null;
    
    for (const video of videoElements) {
      if (video.readyState >= 2 && video.duration > 0 && !video.paused) {
        mediaElement = video;
        break;
      }
    }

    if (mediaElement) {
      if (sourceNode) {
        sourceNode.disconnect();
      }
      
      sourceNode = audioContext.createMediaElementSource(mediaElement);
      sourceNode.connect(analyser);
      analyser.connect(audioContext.destination);
      
      console.log('Audio visualizer connected to media element');
      if (retryInterval) {
        clearInterval(retryInterval);
        retryInterval = null;
      }
    }
  } catch (err) {
    console.warn('Failed to connect to media element:', err.message);
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
  stopVisualization();
  if (sourceNode) {
    sourceNode.disconnect();
    sourceNode = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
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

