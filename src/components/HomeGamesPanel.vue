<template>
  <section v-if="enabled" class="panel mb-7 p-4">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-black">Gry</h2>
        <p class="text-sm font-semibold" style="color: var(--text-muted)">Muzyczna rozrywka w rytmie utworu.</p>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="rounded-full px-2.5 py-1 text-xs font-black"
          style="background: color-mix(in srgb, var(--primary) 14%, var(--bg-card)); color: var(--primary)"
        >
          Energy Rush
        </span>
      </div>
    </div>

    <div :class="densityClass">
      <EnergyRushGame
        :enabled="enabled"
        :now-playing="nowPlaying"
        :current-time="currentTime"
        @reward="handleReward"
      />
    </div>
  </section>
</template>

<script setup>
import { computed, inject } from "vue";
import EnergyRushGame from "./EnergyRushGame.vue";

const app = inject("appState");

const gamesEnabled = computed(() => app?.gamesEnabled?.value ?? true);
const homeDensity = computed(() => app?.homeDensity?.value ?? "spacious");

const enabled = computed(() => gamesEnabled.value);

const nowPlaying = computed(() => app?.nowPlaying?.value ?? null);
const currentTime = computed(() => app?.currentTime?.value ?? 0);

const densityClass = computed(() => (homeDensity.value === "compact" ? "space-y-3" : "space-y-5"));

function handleReward(reward) {
  // Optional: award a small UI feedback.
  // If later we implement queue rewards, we can hook into app.addToQueue here.
  if (app?.showToast) app.showToast(`+${reward} punkty (Energy Rush)`, "success");
}
</script>

