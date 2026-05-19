<!-- 
AudioVisualizer: Zaawansowana wizualizacja 3D przy użyciu Three.js.
Renderuje interaktywne spektrum audio w formie pulsującego pierścienia w przestrzeni 3D.
-->
<template>
  <div class="audio-visualizer-container" ref="container">
    <div
      ref="canvasContainer"
      class="three-container"
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
import * as THREE from 'three';
import { getChainForElement } from '../lib/audioEngine';

const appState = inject('appState');
const container = ref(null);
const canvasContainer = ref(null);
const isAnalyzing = ref(false);

let analyser = null;
let analyserCtx = null;
let animationId = null;
let retryInterval = null;
let lastTapNode = null;

// Three.js objects
let scene, camera, renderer, bars = [];
const BAR_COUNT = 64;
const RADIUS = 5;

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
    clearInterval(retryInterval);
    retryInterval = null;
  if (analyser) {
    try { analyser.disconnect(); } catch { /* ignore */ }
  }
  if (lastTapNode && analyser) {
    try { lastTapNode.disconnect(analyser); } catch { /* ignore */ }
  }
  analyser = null;
  analyserCtx = null;
  lastTapNode = null;

  if (renderer) {
    renderer.domElement.style.opacity = '0';
    setTimeout(() => {
      if (!isAnalyzing.value && renderer) {
        renderer.clear();
      }
    }, 2000);
  }
}

function initializeAudio() {
  if (analyser) return;
  if (!connectToAudioEngine()) {
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

    analyserCtx = handle.context;
    analyser = analyserCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

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

function initThree() {
  if (!canvasContainer.value) return;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, canvasContainer.value.clientWidth / 150, 0.1, 1000);
  camera.position.z = 12;
  camera.position.y = 4;
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(canvasContainer.value.clientWidth, 150);
  renderer.setPixelRatio(window.devicePixelRatio);
  canvasContainer.value.appendChild(renderer.domElement);

  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(0.4, 1, 0.4);
  
  for (let i = 0; i < BAR_COUNT; i++) {
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(`hsl(${(i / BAR_COUNT) * 360}, 100%, 50%)`),
      emissive: new THREE.Color(`hsl(${(i / BAR_COUNT) * 360}, 100%, 20%)`),
    });
    const bar = new THREE.Mesh(geometry, material);
    
    const angle = (i / BAR_COUNT) * Math.PI * 2;
    bar.position.x = Math.cos(angle) * RADIUS;
    bar.position.z = Math.sin(angle) * RADIUS;
    bar.rotation.y = -angle;
    
    bars.push(bar);
    group.add(bar);
  }
  scene.add(group);
  
  const light = new THREE.PointLight(0xffffff, 1, 100);
  light.position.set(0, 10, 0);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));
}

function animate() {
  if (!isAnalyzing.value) return;
  animationId = requestAnimationFrame(animate);

  if (!analyser || !renderer) return;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  for (let i = 0; i < BAR_COUNT; i++) {
    const bar = bars[i];
    // Mapujemy dane audio na skalę słupków (wykorzystujemy niższe częstotliwości dla lepszego efektu)
    const audioIndex = Math.floor((i / BAR_COUNT) * (bufferLength / 2));
    const scale = (dataArray[audioIndex] / 255) * 8 + 0.1;
    
    bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, scale, 0.2);
    bar.position.y = bar.scale.y / 2;
    
    // Dynamiczna zmiana koloru w zależności od intensywności
    bar.material.emissiveIntensity = bar.scale.y / 4;
  }

  scene.rotation.y += 0.005;
  renderer.render(scene, camera);
}

onMounted(() => {
  initThree();
  window.addEventListener('resize', handleResize);
});

function handleResize() {
  if (!renderer || !canvasContainer.value) return;
  const width = canvasContainer.value.clientWidth;
  camera.aspect = width / 150;
  camera.updateProjectionMatrix();
  renderer.setSize(width, 150);
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  stopVisualization();
  if (renderer) {
    renderer.dispose();
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

.three-container {
  width: 100%;
  height: 150px;
  border-radius: var(--radius-sm);
  background: rgba(0, 0, 0, 0.3);
  display: block;
  opacity: 0;
  transition: opacity 0.2s;
  overflow: hidden;
}

.three-container.active {
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
