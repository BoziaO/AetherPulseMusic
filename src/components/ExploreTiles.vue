<template>
  <div class="explore-tiles">
    <div class="tile-main">
      <div class="tile-main-content">
        <span class="eyebrow">DISCOVER</span>
        <h2>New Releases</h2>
        <p>Featured tile, music streaming web Player.</p>
      </div>
    </div>
    <div class="tile-grid">
      <div class="tile small purple">
        <div class="tile-icon"><Zap :size="24" /></div>
        <div class="tile-label">New Releases</div>
      </div>
      <div class="tile small orange">
        <div class="tile-icon"><TrendingUp :size="24" /></div>
        <div class="tile-label">Trending Now</div>
      </div>
      <div class="tile small green">
        <div class="tile-icon"><Music2 :size="24" /></div>
        <div class="tile-label">Your Daily Mix 1</div>
      </div>
      <div class="tile small blue">
        <div class="tile-icon"><Headphones :size="24" /></div>
        <div class="tile-label">Focus Beats</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Zap, TrendingUp, Music2, Headphones } from "lucide-vue-next";
</script>

<style scoped>
.explore-tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 40px;
}

.tile-main {
  background: linear-gradient(135deg, #1a1a20 0%, #0d0d12 100%);
  border-radius: 24px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.tile-main .eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.2em;
  opacity: 0.5;
  margin-bottom: 12px;
}

.tile-main h2 {
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 16px;
}

.tile-main p {
  font-size: 14px;
  opacity: 0.5;
}

.tile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 16px;
}

.tile.small {
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: transform 0.2s;
  cursor: pointer;
}

.tile.small:hover {
  transform: translateY(-4px);
}

.tile.purple { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); }
.tile.orange { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); }
.tile.green { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.tile.blue { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); }

.tile-label {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.tile-icon {
  background: rgba(255, 255, 255, 0.2);
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
