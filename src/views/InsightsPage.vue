<template>
  <div class="animate-in">
    <PageHero
      title="Statystyki"
      subtitle="Szybki podglad historii, ulubionych i energii ostatnich odtworzen."
      eyebrow="AetherPulse"
      :stats="stats"
      :playable="false"
    />

    <div class="grid gap-5 lg:grid-cols-3">
      <section class="panel p-4 lg:col-span-2">
        <h2 class="mb-4 text-xl font-black">Energia historii</h2>
        <div v-if="recent.length" class="space-y-3">
          <div v-for="track in recent.slice(0, 12)" :key="trackKey(track)" class="grid grid-cols-[1fr_90px] items-center gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-black">{{ track.title }}</p>
              <p class="truncate text-xs font-semibold" style="color: var(--text-muted)">{{ track.artist || track.subtitle }}</p>
            </div>
            <div class="h-2 overflow-hidden rounded-full" style="background: var(--bg-card-hover)">
              <div class="h-full rounded-full" :style="{ width: `${estimateEnergy(track)}%`, background: barColor(estimateEnergy(track)) }" />
            </div>
          </div>
        </div>
        <p v-else class="text-sm font-semibold" style="color: var(--text-muted)">Brak historii odtwarzania.</p>
      </section>

      <section class="panel p-4">
        <h2 class="mb-4 text-xl font-black">Najczesciej w historii</h2>
        <div v-if="topArtists.length" class="space-y-2">
          <div v-for="artist in topArtists" :key="artist.name" class="flex items-center justify-between rounded-lg border p-3" style="border-color: var(--surface-line); background: var(--bg-card)">
            <span class="truncate text-sm font-black">{{ artist.name }}</span>
            <span class="text-xs font-black" style="color: var(--primary)">{{ artist.count }}</span>
          </div>
        </div>
        <p v-else class="text-sm font-semibold" style="color: var(--text-muted)">Zagraj kilka utworow, aby zobaczyc ranking.</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from "vue";
import PageHero from "../components/PageHero.vue";
import { estimateEnergy } from "../lib/energy";
import { trackKey } from "../lib/format";

const app = inject("appState");
const recent = computed(() => app.recentPlays.value || []);
const favorites = computed(() => app.favoriteItems.value || []);

const averageEnergy = computed(() => {
  if (!recent.value.length) return 0;
  return Math.round(recent.value.reduce((sum, track) => sum + estimateEnergy(track), 0) / recent.value.length);
});

const stats = computed(() => [
  { label: "Historia", value: String(recent.value.length) },
  { label: "Ulubione", value: String(favorites.value.length) },
  { label: "Srednia energia", value: averageEnergy.value ? `${averageEnergy.value}%` : "-" },
]);

const topArtists = computed(() => {
  const counts = new Map();
  recent.value.forEach((track) => {
    const name = track.artist || track.subtitle || "Unknown";
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
});

function barColor(value) {
  if (value < 38) return "var(--accent)";
  if (value < 68) return "var(--warning)";
  return "var(--primary)";
}
</script>
