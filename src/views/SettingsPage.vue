<template>
  <div class="animate-in">
    <PageHero
      title="Ustawienia"
      subtitle="Motyw, jezyk, konto Google i dane lokalne."
      eyebrow="System"
      :playable="false"
    />

    <div class="grid gap-5 xl:grid-cols-2">
      <section class="panel p-4">
        <h2 class="mb-4 text-xl font-black">Wyglad</h2>
        <div class="space-y-4">
          <div>
            <p class="mb-2 text-xs font-black uppercase" style="color: var(--text-soft)">Motyw</p>
            <div class="grid grid-cols-2 gap-2">
              <button
                class="ghost-button px-4"
                type="button"
                :style="theme === 'dark' ? selectedStyle : ''"
                @click="app.setTheme('dark')"
              >
                <Moon :size="16" />
                {{ app.t('dark') }}
              </button>
              <button
                class="ghost-button px-4"
                type="button"
                :style="theme === 'light' ? selectedStyle : ''"
                @click="app.setTheme('light')"
              >
                <Sun :size="16" />
                {{ app.t('light') }}
              </button>
            </div>
          </div>

          <div>
            <p class="mb-2 text-xs font-black uppercase" style="color: var(--text-soft)">Akcent</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in accentColors"
                :key="color"
                class="h-10 w-10 rounded-lg border"
                :style="{ background: color, borderColor: accent === color ? 'var(--text-main)' : 'var(--surface-line)' }"
                type="button"
                :title="color"
                @click="app.setAccent(color)"
              />
            </div>
          </div>

          <div>
            <p class="mb-2 text-xs font-black uppercase" style="color: var(--text-soft)">Jezyk</p>
            <div class="grid grid-cols-2 gap-2">
              <button
                class="ghost-button px-4"
                type="button"
                :style="language === 'pl' ? selectedStyle : ''"
                @click="app.setLanguage('pl')"
              >
                Polski
              </button>
              <button
                class="ghost-button px-4"
                type="button"
                :style="language === 'en' ? selectedStyle : ''"
                @click="app.setLanguage('en')"
              >
                English
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="panel p-4">
        <h2 class="mb-4 text-xl font-black">Odtwarzanie & gra</h2>

        <div class="space-y-3">
          <div class="rounded-lg border p-4" style="border-color: var(--surface-line); background: var(--bg-card)">
            <p class="text-sm font-black">Gry</p>
            <p class="mt-1 text-sm font-semibold" style="color: var(--text-muted)">
              Wlacz mini-gre w sekcji Home.
            </p>

            <div class="mt-3 flex items-center justify-between gap-3">
              <span class="text-sm font-semibold" style="color: var(--text-muted)">Stan</span>
              <button
                class="ghost-button px-4"
                type="button"
                :style="gamesEnabled ? selectedStyle : ''"
                @click="app.gamesEnabled.value = !gamesEnabled"
              >
                {{ gamesEnabled ? 'Wlacz' : 'Wylacz' }}
              </button>
            </div>
          </div>

          <div class="rounded-lg border p-4" style="border-color: var(--surface-line); background: var(--bg-card)">
            <p class="text-sm font-black">Tekst</p>
            <p class="mt-1 text-sm font-semibold" style="color: var(--text-muted)">
              Auto-scroll w LyricsModal.
            </p>

            <div class="mt-3 space-y-2">
              <button
                class="ghost-button w-full px-4"
                type="button"
                :style="lyricsAutoScroll ? selectedStyle : ''"
                @click="app.lyricsFollowMode.value = !lyricsAutoScroll"
              >
                {{ lyricsAutoScroll ? 'Follow: wlaczony' : 'Follow: wylaczony' }}
              </button>
              <button
                class="ghost-button w-full px-4"
                type="button"
                :style="lyricsCompact ? selectedStyle : ''"
                @click="app.lyricsCompact.value = !lyricsCompact"
              >
                {{ lyricsCompact ? 'Tryb: compact' : 'Tryb: spacious' }}
              </button>
            </div>
          </div>

          <div class="rounded-lg border p-4" style="border-color: var(--surface-line); background: var(--bg-card)">
            <p class="text-sm font-black">Gęstość Home</p>
            <p class="mt-1 text-sm font-semibold" style="color: var(--text-muted)">
              Zmienia odstepy i ilosc elementow na stronie Home.
            </p>

            <div class="mt-3 flex gap-2">
              <button
                class="ghost-button flex-1 px-4"
                type="button"
                :style="homeDensity === 'compact' ? selectedStyle : ''"
                @click="app.setHomeDensity('compact')"
              >
                Compact
              </button>
              <button
                class="ghost-button flex-1 px-4"
                type="button"
                :style="homeDensity === 'spacious' ? selectedStyle : ''"
                @click="app.setHomeDensity('spacious')"
              >
                Spacious
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="panel p-4">
        <h2 class="mb-4 text-xl font-black">Konto i dane</h2>
        <div class="space-y-3">
          <div class="rounded-lg border p-4" style="border-color: var(--surface-line); background: var(--bg-card)">
            <p class="text-sm font-black">Google OAuth</p>
            <p class="mt-1 text-sm font-semibold" style="color: var(--text-muted)">
              {{ connected ? 'Polaczone konto Google.' : 'Mozesz polaczyc konto, aby pobierac biblioteke YouTube Music.' }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button v-if="connected" class="ghost-button px-4" type="button" @click="app.logout">
                <LogOut :size="16" />
                {{ app.t('logout') }}
              </button>
              <a v-else class="primary-button px-4" :href="app.loginUrl.value">
                <LogIn :size="16" />
                {{ app.t('signIn') }}
              </a>
            </div>
          </div>

          <div class="rounded-lg border p-4" style="border-color: var(--surface-line); background: var(--bg-card)">
            <p class="text-sm font-black">Dane lokalne</p>
            <p class="mt-1 text-sm font-semibold" style="color: var(--text-muted)">
              Ulubione: {{ app.favoriteItems.value.length }}, historia: {{ app.recentPlays.value.length }}
            </p>
            <button class="ghost-button mt-3 px-4" type="button" @click="clearLocalData">
              <Trash2 :size="16" />
              Wyczysc lokalnie
            </button>
          </div>
        </div>
      </section>

      <section class="panel p-4">
        <h2 class="mb-4 text-xl font-black">Zaawansowane</h2>
        <div class="rounded-lg border p-4" style="border-color: var(--surface-line); background: var(--bg-card)">
          <p class="text-sm font-black">Uwaga</p>
          <p class="mt-1 text-sm font-semibold" style="color: var(--text-muted)">
            Ustawienia gier i tekstu sa zapisywane lokalnie.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from "vue";
import { LogIn, LogOut, Moon, Sun, Trash2 } from "lucide-vue-next";
import PageHero from "../components/PageHero.vue";

const app = inject("appState");
const accentColors = ["#f2573d", "#00a99d", "#7cbd45", "#e0a32f", "#d94678", "#3b82f6"];
const selectedStyle = "border-color: var(--primary); background: color-mix(in srgb, var(--primary) 16%, var(--bg-card)); color: var(--text-main)";

const language = computed(() => app.language.value);
const theme = computed(() => app.theme.value);
const accent = computed(() => app.accent.value);
const connected = computed(() => app.authSession.value?.auth?.connected);

const gamesEnabled = computed(() => app.gamesEnabled.value);
const lyricsAutoScroll = computed(() => app.lyricsFollowMode.value);
const lyricsCompact = computed(() => app.lyricsCompact.value);
const homeDensity = computed(() => app.homeDensity.value);

function clearLocalData() {
  [
    "boziamusic:recent",
    "boziamusic:favorites",
    "boziamusic:favoriteTracks",
    "ap:search-history",
    "ap-games-enabled",
    "ap-lyrics-follow-mode",
    "ap-lyrics-compact",
    "ap-home-density",
  ].forEach((key) => localStorage.removeItem(key));
  window.location.reload();
}
</script>

