<template>
  <div class="settings-page animate-fade">
    <header class="page-head">
      <h1 class="page-title">{{ t('settingsTitle') }}</h1>
      <p class="page-sub">{{ t('settingsSubtitle') }}</p>
    </header>

    <!-- ── Appearance ─────────────────────────────────────────────── -->
    <section class="card-block">
      <header class="card-head">
        <span class="card-icon" style="--icon-bg: var(--primary)"><Palette :size="16" /></span>
        <h2 class="card-title">{{ t('appearance') }}</h2>
      </header>

      <!-- Theme picker -->
      <div class="row row-column">
        <div>
          <p class="row-title">{{ t('theme') }}</p>
          <p class="row-sub">{{ t('themeDesc') }}</p>
        </div>

        <!-- Filter tabs: dark / light / all -->
        <div class="theme-filter">
          <button
            v-for="tab in ['all', 'dark', 'light']"
            :key="tab"
            class="theme-filter-btn"
            :class="themeFilter === tab ? 'theme-filter-active' : ''"
            type="button"
            @click="themeFilter = tab"
          >
            {{ tab === 'all' ? 'All' : tab === 'dark' ? '🌙 Dark' : '☀️ Light' }}
          </button>
        </div>

        <div class="theme-grid">
          <button
            v-for="theme in filteredThemes"
            :key="theme.id"
            class="theme-card"
            :class="appState.themeId.value === theme.id ? 'theme-card-active' : ''"
            type="button"
            @click="appState.setTheme(theme.id)"
          >
            <!-- Swatch banner -->
            <div class="theme-swatch">
              <span
                v-for="(color, idx) in theme.swatch"
                :key="idx"
                class="swatch-color"
                :style="{ background: color }"
              />
            </div>

            <!-- Info -->
            <div class="theme-info">
              <span class="theme-mode-badge" :class="`theme-mode-${theme.mode}`">
                {{ theme.mode === 'dark' ? '🌙' : '☀️' }}
              </span>
              <p class="theme-name">{{ t(theme.name) }}</p>
              <p class="theme-vibe">{{ theme.vibe }}</p>
            </div>

            <!-- Active check -->
            <div v-if="appState.themeId.value === theme.id" class="theme-check">
              <Check :size="14" />
            </div>
          </button>
        </div>
      </div>

      <!-- Accent colour -->
      <div class="row row-column">
        <div>
          <p class="row-title">{{ t('accentColor') }}</p>
          <p class="row-sub">{{ t('accentColorDesc') }}</p>
        </div>
        <div class="accent-row">
          <button
            v-for="color in accentColors"
            :key="color"
            class="accent-dot"
            :class="appState.accent?.value === color ? 'accent-active' : ''"
            :style="{ background: color }"
            type="button"
            :title="color"
            @click="appState.setAccent?.(appState.accent?.value === color ? '' : color)"
          />
          <label class="accent-custom" title="Custom colour">
            <input
              type="color"
              :value="appState.accent?.value || '#fa243c'"
              @input="(e) => appState.setAccent?.(e.target.value)"
            />
            <Pipette :size="14" />
          </label>
          <button
            v-if="appState.accent?.value"
            class="accent-reset"
            type="button"
            title="Reset accent"
            @click="appState.setAccent?.('')"
          >
            <X :size="14" />
          </button>
        </div>
      </div>

      <!-- Language -->
      <div class="row">
        <div>
          <p class="row-title">{{ t('language') }}</p>
        </div>
        <div class="seg-control">
          <button
            class="seg"
            :class="appState.language.value === 'pl' ? 'seg-active' : ''"
            type="button"
            @click="appState.setLanguage('pl')"
          >
            🇵🇱 Polski
          </button>
          <button
            class="seg"
            :class="appState.language.value === 'en' ? 'seg-active' : ''"
            type="button"
            @click="appState.setLanguage('en')"
          >
            🇬🇧 English
          </button>
        </div>
      </div>
    </section>

    <!-- ── Playback ─────────────────────────────────────────────────── -->
    <section class="card-block">
      <header class="card-head">
        <span class="card-icon" style="--icon-bg: #30d158"><Sliders :size="16" /></span>
        <h2 class="card-title">{{ t('playback') }}</h2>
      </header>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('defaultVolume') }}</p>
          <p class="row-sub">{{ appState.volume.value }}%</p>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          :value="appState.volume.value"
          class="am-slider am-slider-pink volume-slider"
          :style="{ '--progress': `${appState.volume.value}%` }"
          @input="(event) => updateVolume(Number(event.target.value))"
        />
      </div>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('autoScrollLyrics') }}</p>
          <p class="row-sub">{{ t('autoScrollLyricsDesc') }}</p>
        </div>
        <button
          class="toggle"
          :class="appState.lyricsFollowMode.value ? 'toggle-on' : ''"
          type="button"
          @click="appState.lyricsFollowMode.value = !appState.lyricsFollowMode.value"
        >
          <span class="toggle-thumb" />
        </button>
      </div>
    </section>

    <!-- ── Display ─────────────────────────────────────────────────── -->
    <section class="card-block">
      <header class="card-head">
        <span class="card-icon" style="--icon-bg: #0a84ff"><Monitor :size="16" /></span>
        <h2 class="card-title">{{ t('display') }}</h2>
      </header>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('showAnimations') }}</p>
          <p class="row-sub">{{ t('showAnimationsDesc') }}</p>
        </div>
        <button class="toggle" :class="showAnimations ? 'toggle-on' : ''" type="button" @click="showAnimations = !showAnimations">
          <span class="toggle-thumb" />
        </button>
      </div>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('themeEffects') }}</p>
          <p class="row-sub">{{ t('themeEffectsDesc') }}</p>
        </div>
        <button class="toggle" :class="themeEffects ? 'toggle-on' : ''" type="button" @click="themeEffects = !themeEffects">
          <span class="toggle-thumb" />
        </button>
      </div>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('reduceMotion') }}</p>
          <p class="row-sub">{{ t('reduceMotionDesc') }}</p>
        </div>
        <button class="toggle" :class="reduceMotion ? 'toggle-on' : ''" type="button" @click="reduceMotion = !reduceMotion">
          <span class="toggle-thumb" />
        </button>
      </div>
    </section>

    <!-- ── Advanced Playback ──────────────────────────────────────── -->
    <section class="card-block">
      <header class="card-head">
        <span class="card-icon" style="--icon-bg: #ff9f0a"><Speaker :size="16" /></span>
        <h2 class="card-title">{{ t('playback') }} — {{ t('advanced') }}</h2>
      </header>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('crossfade') }}</p>
          <p class="row-sub">{{ t('crossfadeDesc') }}</p>
        </div>
        <button class="toggle" :class="crossfade ? 'toggle-on' : ''" type="button" @click="crossfade = !crossfade">
          <span class="toggle-thumb" />
        </button>
      </div>

      <div v-if="crossfade" class="row">
        <div class="row-text">
          <p class="row-title">{{ t('crossfadeDuration') }}</p>
          <p class="row-sub">{{ crossfadeDuration }}ms</p>
        </div>
        <input
          type="range" min="1000" max="8000" step="500"
          :value="crossfadeDuration"
          class="am-slider am-slider-pink volume-slider"
          :style="{ '--progress': `${((crossfadeDuration - 1000) / 7000) * 100}%` }"
          @input="(event) => crossfadeDuration = Number(event.target.value)"
        />
      </div>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('normalizer') }}</p>
          <p class="row-sub">{{ t('normalizerDesc') }}</p>
        </div>
        <button class="toggle" :class="normalizer ? 'toggle-on' : ''" type="button" @click="normalizer = !normalizer">
          <span class="toggle-thumb" />
        </button>
      </div>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('highQuality') }}</p>
          <p class="row-sub">{{ t('highQualityDesc') }}</p>
        </div>
        <button class="toggle" :class="highQuality ? 'toggle-on' : ''" type="button" @click="highQuality = !highQuality">
          <span class="toggle-thumb" />
        </button>
      </div>
    </section>

    <!-- ── Player Engine ──────────────────────────────────────────── -->
    <section class="card-block">
      <header class="card-head">
        <span class="card-icon" style="--icon-bg: #bf5af2"><Cpu :size="16" /></span>
        <h2 class="card-title">{{ t('playerMode') }}</h2>
      </header>

      <div class="row row-column">
        <div class="row-text">
          <p class="row-title">{{ t('playerMode') }}</p>
          <p class="row-sub">{{ t('playerModeDesc') }}</p>
        </div>
        <div class="player-mode-grid">
          <button
            v-for="mode in playerModeOptions"
            :key="mode.id"
            class="player-mode-card"
            :class="playerPreference === mode.id ? 'player-mode-active' : ''"
            type="button"
            @click="onSetPlayerMode(mode.id)"
          >
            <span class="pm-title">
              {{ t(mode.labelKey) }}
              <span v-if="mode.id === activeEngineId" class="pm-active-badge">
                <BadgeCheck :size="12" /> {{ t('playerEngineActive') }}
              </span>
            </span>
            <span class="pm-desc">{{ t(mode.descKey) }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ── SponsorBlock ──────────────────────────────────────────── -->
    <section class="card-block">
      <header class="card-head">
        <span class="card-icon" style="--icon-bg: #ff6b35"><Shield :size="16" /></span>
        <h2 class="card-title">{{ t('sponsorBlock') }}</h2>
      </header>
      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('sponsorEnable') }}</p>
          <p class="row-sub">{{ t('sponsorBlockDesc') }}</p>
        </div>
        <button class="toggle" :class="sponsorBlockSettings.enabled ? 'toggle-on' : ''" type="button" @click="toggleSponsorBlock">
          <span class="toggle-thumb" />
        </button>
      </div>
      <div v-if="sponsorBlockSettings.enabled" class="sponsor-grid">
        <div v-for="cat in sponsorCategoryList" :key="cat.id" class="sponsor-row">
          <span class="sponsor-cat">
            <span class="sponsor-dot" :style="{ background: cat.color }" />
            {{ t(cat.labelKey) }}
          </span>
          <div class="seg-control">
            <button
              v-for="action in ['skip', 'mark', 'off']"
              :key="action"
              class="seg seg-sm"
              :class="sponsorBlockSettings.categories[cat.id] === action ? 'seg-active' : ''"
              type="button"
              @click="setSponsorAction(cat.id, action)"
            >
              {{ t(`sponsorAction${action.charAt(0).toUpperCase() + action.slice(1)}`) }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Silence Skipper ──────────────────────────────────────── -->
    <section class="card-block">
      <header class="card-head">
        <span class="card-icon" style="--icon-bg: #5e5ce6"><Music2 :size="16" /></span>
        <h2 class="card-title">{{ t('silenceSkipper') }}</h2>
      </header>
      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('silenceEnable') }}</p>
          <p class="row-sub">{{ t('silenceSkipperDesc') }}</p>
        </div>
        <button class="toggle" :class="silenceSkipperSettings.enabled ? 'toggle-on' : ''" type="button" @click="toggleSilenceSkipper">
          <span class="toggle-thumb" />
        </button>
      </div>
      <div v-if="silenceSkipperSettings.enabled" class="row row-column">
        <div class="row-text">
          <p class="row-title">{{ t('silenceThreshold') }}: {{ silenceSkipperSettings.thresholdDb }} dB</p>
          <p class="row-sub">{{ t('silenceThresholdDesc') }}</p>
        </div>
        <input type="range" min="-60" max="-30" step="1" :value="silenceSkipperSettings.thresholdDb" class="am-slider" @input="setSilenceThreshold(Number($event.target.value))" />
      </div>
      <div v-if="silenceSkipperSettings.enabled" class="row row-column">
        <div class="row-text">
          <p class="row-title">{{ t('silenceMinDuration') }}: {{ (silenceSkipperSettings.minSilenceMs / 1000).toFixed(1) }}s</p>
          <p class="row-sub">{{ t('silenceMinDurationDesc') }}</p>
        </div>
        <input type="range" min="500" max="5000" step="100" :value="silenceSkipperSettings.minSilenceMs" class="am-slider" @input="setSilenceMinDuration(Number($event.target.value))" />
      </div>
    </section>

    <!-- ── Audio Mixer ──────────────────────────────────────────── -->
    <section class="card-block">
      <header class="card-head">
        <span class="card-icon" style="--icon-bg: #00d4ff"><SlidersHorizontal :size="16" /></span>
        <h2 class="card-title">{{ t('audioMixer') }}</h2>
      </header>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('equalizer') }}</p>
          <p class="row-sub">{{ t('equalizerDesc') }}</p>
        </div>
        <button class="btn-secondary" type="button" @click="showEqualizer = true">
          <SlidersHorizontal :size="14" />
          {{ t('audioMixer') }}
        </button>
      </div>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('audioQuality') }}</p>
          <p class="row-sub">{{ t('audioQualityDesc') }}</p>
        </div>
        <span class="quality-pill">
          <Wifi v-if="netInfo.type === 'wifi'" :size="14" />
          <Smartphone v-else-if="netInfo.type === 'cellular'" :size="14" />
          <Globe v-else :size="14" />
          {{ networkLabel(netInfo.type) }}
        </span>
      </div>

      <div class="row row-column">
        <div class="row-text">
          <p class="row-title">{{ t('qualityWifi') }}</p>
          <p class="row-sub">{{ t('qualityWifiDesc') }}</p>
        </div>
        <div class="seg-control">
          <button
            v-for="quality in qualityOptions"
            :key="`wifi-${quality}`"
            class="seg"
            :class="qualitySettings.wifi === quality ? 'seg-active' : ''"
            type="button"
            @click="setAudioQuality('wifi', quality)"
          >
            {{ t(`quality${quality.charAt(0).toUpperCase() + quality.slice(1)}`) }}
          </button>
        </div>
      </div>

      <div class="row row-column">
        <div class="row-text">
          <p class="row-title">{{ t('qualityCellular') }}</p>
          <p class="row-sub">{{ t('qualityCellularDesc') }}</p>
        </div>
        <div class="seg-control">
          <button
            v-for="quality in qualityOptions"
            :key="`cell-${quality}`"
            class="seg"
            :class="qualitySettings.cellular === quality ? 'seg-active' : ''"
            type="button"
            @click="setAudioQuality('cellular', quality)"
          >
            {{ t(`quality${quality.charAt(0).toUpperCase() + quality.slice(1)}`) }}
          </button>
        </div>
      </div>
    </section>

    <EqualizerModal :open="showEqualizer" @close="showEqualizer = false" />

    <!-- ── Account ────────────────────────────────────────────────── -->
    <section class="card-block">
      <header class="card-head">
        <span class="card-icon" style="--icon-bg: #ff375f"><UserCircle :size="16" /></span>
        <h2 class="card-title">{{ t('account') }}</h2>
      </header>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('googleAccount') }}</p>
          <p class="row-sub">
            {{ appState.authSession.value.auth?.connected ? t('accountConnected') : t('accountNotConnected') }}
          </p>
        </div>
        <a v-if="!appState.authSession.value.auth?.connected" class="btn-primary" :href="appState.loginUrl.value">
          {{ t('signIn') }}
        </a>
        <button v-else class="btn-secondary" type="button" @click="appState.logout">
          {{ t('logout') }}
        </button>
      </div>

      <template v-if="appState.authSession.value.auth?.connected">
        <div class="row row-column">
          <div class="row-head">
            <div class="row-text">
              <p class="row-title">{{ t('ytLibraryTitle') }}</p>
              <p class="row-sub">
                <span v-if="libLoading">{{ t('ytLibraryLoading') }}</span>
                <span v-else-if="libError" class="error">{{ libError }}</span>
                <span v-else-if="!library.length">{{ t('ytLibraryEmpty') }}</span>
                <span v-else>{{ t('ytLibraryItemCount', { count: library.length }) }}</span>
              </p>
            </div>
            <div class="row-head-actions">
              <button class="icon-btn" type="button" :title="t('ytLibraryReload')" :disabled="libLoading" @click="loadLibrary(true)">
                <RefreshCw :size="15" />
              </button>
              <button class="btn-primary" type="button" :disabled="!library.length || importing" @click="importAll">
                <Download :size="14" />
                {{ importing ? t('ytLibraryImporting') : t('ytLibraryImportAll') }}
              </button>
            </div>
          </div>

          <ul v-if="library.length" class="yt-list">
            <li v-for="pl in library" :key="pl.id" class="yt-item">
              <div class="yt-thumb">
                <img v-if="pl.thumbnail" :src="pl.thumbnail" :alt="pl.title" loading="lazy" />
                <ListMusic v-else :size="18" :style="{ color: 'var(--text-tertiary)' }" />
              </div>
              <div class="yt-meta">
                <span class="yt-title">{{ pl.title }}</span>
                <span class="yt-sub">
                  {{ t('ytLibraryItemCount', { count: pl.itemCount || 0 }) }}
                  <template v-if="isImported(pl.id)"> • {{ t('ytLibraryAlreadyImported') }}</template>
                </span>
              </div>
              <button
                class="btn-secondary yt-btn"
                type="button"
                :disabled="isImported(pl.id) || importingId === pl.id"
                @click="importOne(pl)"
              >
                <Download :size="13" />
                {{ importingId === pl.id ? t('ytLibraryImporting') : t('ytLibraryImportOne') }}
              </button>
            </li>
          </ul>
        </div>
      </template>
    </section>

    <!-- ── Local Data ─────────────────────────────────────────────── -->
    <section class="card-block">
      <header class="card-head">
        <span class="card-icon" style="--icon-bg: #34c759"><Database :size="16" /></span>
        <h2 class="card-title">{{ t('localData') }}</h2>
      </header>

      <div class="data-stats">
        <div class="data-stat">
          <Heart :size="18" class="ds-icon" style="color: var(--primary)" />
          <span class="ds-value">{{ appState.favoriteItems.value.length }}</span>
          <span class="ds-label">{{ t('favoritesStat') }}</span>
        </div>
        <div class="ds-divider" />
        <div class="data-stat">
          <Clock :size="18" class="ds-icon" style="color: #0a84ff" />
          <span class="ds-value">{{ appState.recentPlays.value.length }}</span>
          <span class="ds-label">{{ t('historyStat') }}</span>
        </div>
      </div>

      <div class="row row-actions-row">
        <button class="btn-secondary" type="button" @click="clearLocalData">
          <Trash2 :size="14" />
          {{ t('clearLocalData') }}
        </button>
        <button class="btn-secondary" type="button" @click="clearCache">
          <RotateCcw :size="14" />
          {{ t('clearCache') }}
        </button>
      </div>
    </section>

    <!-- ── Advanced ──────────────────────────────────────────────── -->
    <section class="card-block">
      <header class="card-head">
        <span class="card-icon" style="--icon-bg: #636366"><Settings2 :size="16" /></span>
        <h2 class="card-title">{{ t('advanced') }}</h2>
      </header>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('debugMode') }}</p>
          <p class="row-sub">{{ t('debugModeDesc') }}</p>
        </div>
        <button class="toggle" :class="debugMode ? 'toggle-on' : ''" type="button" @click="debugMode = !debugMode">
          <span class="toggle-thumb" />
        </button>
      </div>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('resetSettings') }}</p>
          <p class="row-sub">{{ t('resetSettingsDesc') }}</p>
        </div>
        <button class="btn-secondary" type="button" @click="resetSettings">
          <RefreshCw :size="14" />
          {{ t('resetSettings') }}
        </button>
      </div>
    </section>

    <!-- ── Keyboard Shortcuts ─────────────────────────────────────── -->
    <section class="card-block">
      <header class="card-head">
        <span class="card-icon" style="--icon-bg: #48484a"><Keyboard :size="16" /></span>
        <h2 class="card-title">{{ t('keyboardShortcuts') }}</h2>
      </header>

      <ul class="shortcut-list">
        <li v-for="shortcut in shortcuts" :key="shortcut.keys">
          <kbd>{{ shortcut.keys }}</kbd>
          <span>{{ shortcut.label }}</span>
        </li>
      </ul>
    </section>

    <!-- ── Privacy ─────────────────────────────────────────────────── -->
    <section class="card-block">
      <header class="card-head">
        <span class="card-icon" style="--icon-bg: #30b0c7"><Shield :size="16" /></span>
        <h2 class="card-title">Prywatność</h2>
      </header>

      <div class="row">
        <div>
          <p class="row-title">{{ t('privacyPolicy') }}</p>
          <p class="row-sub">{{ t('privacyPolicyDesc') }}</p>
        </div>
        <RouterLink class="btn-secondary" to="/privacy">{{ t('privacyView') }}</RouterLink>
      </div>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('cookieSettings') }}</p>
          <p class="row-sub">{{ cookieConsentLabel }}</p>
        </div>
        <div class="row-actions">
          <button class="btn-secondary" type="button" @click="reopenCookieBanner">
            <Cookie :size="14" /> {{ t('cookieReconfigure') }}
          </button>
          <button
            v-if="hasCookieConsent"
            class="btn-secondary danger"
            type="button"
            @click="revokeCookieConsent"
          >
            <Trash2 :size="14" /> {{ t('cookieRevoke') }}
          </button>
        </div>
      </div>
    </section>

    <CookieBanner v-if="showCookieBanner" @close="showCookieBanner = false" />

    <p class="footer">AetherPulse Music • Made with ♥ for music lovers</p>
  </div>
</template>

<script setup>
import { computed, inject, reactive, ref, watch } from "vue";
import {
  BadgeCheck,
  Check,
  Clock,
  Cookie,
  Cpu,
  Database,
  Download,
  Globe,
  Heart,
  Keyboard,
  ListMusic,
  Monitor,
  Music2,
  Palette,
  Pipette,
  RefreshCw,
  RotateCcw,
  Settings2,
  Shield,
  Sliders,
  SlidersHorizontal,
  Smartphone,
  Speaker,
  Trash2,
  UserCircle,
  Wifi,
  X,
} from "lucide-vue-next";

import { fetchJson } from "../lib/api";
import CookieBanner from "../components/CookieBanner.vue";
import EqualizerModal from "../components/EqualizerModal.vue";
import { network as audioNetwork, settings as audioQualitySettings, setQuality } from "../lib/audioQuality";
import {
  silenceSettings as silenceSkipperSettings,
  updateSilenceSettings,
} from "../lib/silenceSkipper";
import {
  SPONSOR_CATEGORIES,
  setSponsorCategory,
  setSponsorEnabled,
  sponsorSettings as sponsorBlockSettings,
} from "../lib/sponsorBlock";

const CHART_REGIONS = [
  { code: "ZZ", label: "🌍 Global" },
  { code: "US", label: "🇺🇸 United States" },
  { code: "GB", label: "🇬🇧 United Kingdom" },
  { code: "PL", label: "🇵🇱 Poland" },
  { code: "DE", label: "🇩🇪 Germany" },
  { code: "FR", label: "🇫🇷 France" },
  { code: "ES", label: "🇪🇸 Spain" },
  { code: "IT", label: "🇮🇹 Italy" },
  { code: "BR", label: "🇧🇷 Brazil" },
  { code: "JP", label: "🇯🇵 Japan" },
  { code: "KR", label: "🇰🇷 South Korea" },
  { code: "IN", label: "🇮🇳 India" },
  { code: "MX", label: "🇲🇽 Mexico" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "AU", label: "🇦🇺 Australia" },
  { code: "NL", label: "🇳🇱 Netherlands" },
  { code: "SE", label: "🇸🇪 Sweden" },
  { code: "NO", label: "🇳🇴 Norway" },
  { code: "TR", label: "🇹🇷 Turkey" },
  { code: "AR", label: "🇦🇷 Argentina" },
];
import { THEMES } from "../data/themes";

const appState = inject("appState");
function t(key, vars) {
  return appState?.t?.(key, vars) ?? key;
}

const showCookieBanner = ref(false);
const showEqualizer = ref(false);

const qualityOptions = ["auto", "low", "medium", "high"];
const qualitySettings = audioQualitySettings;
const netInfo = audioNetwork;

// --- Player engine selection (HTML5 vs iframe) ---
const playerModeOptions = [
  { id: "auto",   labelKey: "playerModeAuto",   descKey: "playerModeAutoDesc" },
  { id: "html5",  labelKey: "playerModeHtml5",  descKey: "playerModeHtml5Desc" },
  { id: "iframe", labelKey: "playerModeIframe", descKey: "playerModeIframeDesc" },
];

const playerPreference = computed(() => appState?.playerPreference?.value || "auto");
const activeEngineId = computed(() => appState?.activeEngine?.value || "iframe");

function onSetPlayerMode(mode) {
  appState?.setPlayerPreference?.(mode);
}

// --- Cookie consent management ---
const cookieConsentTick = ref(0); // force re-eval po zmianie

const hasCookieConsent = computed(() => {
  void cookieConsentTick.value;
  if (typeof localStorage === "undefined") return false;
  return Boolean(localStorage.getItem("cookieConsent"));
});

const cookieConsentLabel = computed(() => {
  void cookieConsentTick.value;
  const consent = localStorage.getItem("cookieConsent");
  if (!consent) return t("cookieConsentNone");
  if (consent === "all") return t("cookieConsentAll");
  if (consent === "none") return t("cookieConsentEssential");
  if (consent === "custom") {
    const analytics = localStorage.getItem("analytics") === "true";
    return t(analytics ? "cookieConsentCustomAnalytics" : "cookieConsentCustomMinimal");
  }
  return consent;
});

function reopenCookieBanner() {
  // Usuwamy zgodę i forsujemy reload — banner pokaże się ponownie.
  localStorage.removeItem("cookieConsent");
  cookieConsentTick.value += 1;
  appState?.showToast?.(t("cookieReconfigureToast"), "info");
  setTimeout(() => location.reload(), 600);
}

function revokeCookieConsent() {
  if (!window.confirm(t("cookieRevokeConfirm"))) return;
  localStorage.removeItem("cookieConsent");
  localStorage.removeItem("analytics");
  cookieConsentTick.value += 1;
  appState?.showToast?.(t("cookieRevoked"), "success");
}

// --- SponsorBlock ---
const sponsorCategoryList = SPONSOR_CATEGORIES;

function toggleSponsorBlock() {
  setSponsorEnabled(!sponsorBlockSettings.enabled);
}

function setSponsorAction(categoryId, action) {
  setSponsorCategory(categoryId, action);
}

// --- Silence Skipper ---
function toggleSilenceSkipper() {
  updateSilenceSettings({ enabled: !silenceSkipperSettings.enabled });
}

function setSilenceThreshold(value) {
  updateSilenceSettings({ thresholdDb: value });
}

function setSilenceMinDuration(value) {
  updateSilenceSettings({ minSilenceMs: value });
}

function setAudioQuality(scope, value) {
  setQuality(scope, value);
}

function networkLabel(type) {
  if (type === "wifi") return t("networkWifi");
  if (type === "cellular") return t("networkCellular");
  return t("networkUnknown");
}

const accentColors = [
  "#fa243c", "#ff375f", "#ff9f0a", "#ffd60a",
  "#30d158", "#0a84ff", "#bf5af2", "#ff6b35",
  "#00d4ff", "#ff2e63", "#00ff87", "#e8a857",
];

const themeFilter = ref("all");
const filteredThemes = computed(() =>
  themeFilter.value === "all"
    ? THEMES
    : THEMES.filter((t) => t.mode === themeFilter.value),
);

const DISPLAY_SETTINGS_KEY = "ap:display-settings";

function loadDisplaySettings() {
  try {
    const raw = localStorage.getItem(DISPLAY_SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function saveDisplaySettings() {
  try {
    localStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify({
      showAnimations: showAnimations.value,
      themeEffects: themeEffects.value,
      reduceMotion: reduceMotion.value,
      crossfade: crossfade.value,
      crossfadeDuration: crossfadeDuration.value,
      normalizer: normalizer.value,
      highQuality: highQuality.value,
      debugMode: debugMode.value,
    }));
  } catch { /* ignore */ }
}

const _ds = loadDisplaySettings();
const showAnimations = ref(_ds.showAnimations ?? true);
const themeEffects = ref(_ds.themeEffects ?? true);
const reduceMotion = ref(_ds.reduceMotion ?? false);
const crossfade = ref(_ds.crossfade ?? false);
const crossfadeDuration = ref(_ds.crossfadeDuration ?? 3000);
const normalizer = ref(_ds.normalizer ?? false);
const highQuality = ref(_ds.highQuality ?? true);
const debugMode = ref(_ds.debugMode ?? false);

// Persist whenever any display setting changes
watch(
  [showAnimations, themeEffects, reduceMotion, crossfade, crossfadeDuration, normalizer, highQuality, debugMode],
  saveDisplaySettings,
);

function updateVolume(value) {
  appState.volume.value = value;
}

function clearLocalData() {
  if (!window.confirm(t("confirmClear"))) return;
  ["boziamusic:favorites", "boziamusic:favoriteTracks", "boziamusic:recent", "ap:search-history"].forEach((key) => {
    localStorage.removeItem(key);
  });
  window.location.reload();
}

function clearCache() {
  if (!window.confirm(t("confirmClear"))) return;
  // Clear any cached data
  if ("caches" in window) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
  appState?.showToast?.(t("cacheCleared"), "success");
}

function resetSettings() {
  if (!window.confirm(t("confirmClear"))) return;
  // Reset all settings to defaults
  showAnimations.value = true;
  themeEffects.value = true;
  reduceMotion.value = false;
  crossfade.value = false;
  crossfadeDuration.value = 3000;
  normalizer.value = false;
  highQuality.value = true;
  debugMode.value = false;
  appState?.showToast?.(t("settingsReset"), "success");
}

const shortcuts = computed(() => [
  { keys: "Space / K", label: `${t("play")} / ${t("pause")}` },
  { keys: "←  →", label: "Seek 10s" },
  { keys: "Shift + ←  →", label: `${t("previous")} / ${t("next")}` },
  { keys: "Q", label: t("queue") },
  { keys: "L", label: t("lyrics") },
  { keys: "/", label: t("searchPlaceholder") },
  { keys: "Esc", label: t("close") },
]);

// ── YouTube library import ──────────────────────────────────
const library = ref([]);
const libLoading = ref(false);
const libError = ref("");
const importing = ref(false);
const importingId = ref("");
const importedIds = ref(new Set());

async function loadLibrary(force = false) {
  if (!appState?.authSession?.value?.auth?.connected) {
    library.value = [];
    return;
  }
  if (libLoading.value) return;
  if (!force && library.value.length) return;
  libLoading.value = true;
  libError.value = "";
  try {
    const data = await fetchJson("/api/auth/youtube/playlists", { timeout: 20000 });
    library.value = Array.isArray(data?.items) ? data.items : [];
  } catch (error) {
    libError.value = error?.message || t("ytLibraryError");
  } finally {
    libLoading.value = false;
  }
  await refreshImportedIds();
}

async function refreshImportedIds() {
  try {
    const list = await fetchJson("/api/local/playlists", { timeout: 8000 });
    importedIds.value = new Set(
      (list || []).map((p) => p.importedFrom).filter(Boolean).map(String),
    );
  } catch {
    // leave prior set intact
  }
}

function isImported(id) {
  return importedIds.value.has(String(id));
}

async function importOne(pl) {
  if (isImported(pl.id)) return;
  importingId.value = pl.id;
  try {
    const res = await fetchJson("/api/auth/youtube/playlists/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [pl.id] }),
      timeout: 90000,
    });
    if (res?.imported) {
      appState?.showToast(t("ytLibraryImported", { count: res.imported }), "success");
    } else if (res?.errors) {
      appState?.showToast(res.results?.[0]?.error || t("ytLibraryError"), "error");
    } else {
      appState?.showToast(t("ytLibraryAlreadyImported"), "info");
    }
    await refreshImportedIds();
  } catch (error) {
    appState?.showToast(error?.message || t("ytLibraryError"), "error");
  } finally {
    importingId.value = "";
  }
}

async function importAll() {
  if (importing.value || !library.value.length) return;
  importing.value = true;
  try {
    const res = await fetchJson("/api/auth/youtube/playlists/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
      timeout: 300000,
    });
    if (res?.errors || res?.skipped) {
      appState?.showToast(
        t("ytLibraryPartial", {
          imported: res.imported || 0,
          skipped: res.skipped || 0,
          errors: res.errors || 0,
        }),
        res.errors ? "error" : "info",
      );
    } else {
      appState?.showToast(t("ytLibraryImported", { count: res.imported || 0 }), "success");
    }
    await refreshImportedIds();
  } catch (error) {
    appState?.showToast(error?.message || t("ytLibraryError"), "error");
  } finally {
    importing.value = false;
  }
}

watch(
  () => appState?.authSession?.value?.auth?.connected,
  (connected) => {
    if (connected) loadLibrary(false);
    else {
      library.value = [];
      libError.value = "";
    }
  },
  { immediate: true },
);
</script>

<style scoped>
/* ── Page layout ─────────────────────────────────────────── */
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 48px;
}

.page-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
}

.page-title {
  margin: 0;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-sub {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-tertiary);
}

/* ── Card blocks ─────────────────────────────────────────── */
.card-block {
  background: var(--bg-elevated);
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--line);
  box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 2px 12px rgba(0,0,0,0.12);
  transition: box-shadow 0.2s;
}

.card-block:hover {
  box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.18);
}

.card-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%);
}

.card-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--icon-bg, var(--primary));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}

.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* ── Rows ────────────────────────────────────────────────── */
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.row-column {
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
}

.row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.row-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.row-actions-row {
  padding-top: 0;
}

.error { color: var(--danger); }

.row-text {
  flex: 1;
  min-width: 0;
}

.row-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.005em;
}

.row-sub {
  margin: 3px 0 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* ── Theme filter ────────────────────────────────────────── */
.theme-filter {
  display: inline-flex;
  gap: 6px;
  background: var(--bg-input);
  border-radius: 10px;
  padding: 3px;
}

.theme-filter-btn {
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  border-radius: 7px;
  transition: background 0.15s, color 0.15s;
}

.theme-filter-active {
  background: var(--bg-elevated);
  color: var(--text-primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.14);
}

/* ── Theme grid ──────────────────────────────────────────── */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 10px;
  width: 100%;
}

.theme-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--bg-card);
  border: 1.5px solid var(--line);
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.18s, border-color 0.18s, box-shadow 0.18s;
  overflow: hidden;
  text-align: left;
}

.theme-card:hover {
  border-color: var(--primary);
  transform: translateY(-3px) scale(1.01);
  box-shadow: 0 10px 28px rgba(0,0,0,0.25);
}

.theme-card-active {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary), 0 6px 20px rgba(var(--primary-rgb), 0.25);
}

/* Swatch banner — full-width colour strip */
.theme-swatch {
  display: flex;
  height: 52px;
  width: 100%;
  overflow: hidden;
}

.swatch-color {
  flex: 1;
  transition: transform 0.18s;
}

.theme-card:hover .swatch-color {
  transform: scaleY(1.06);
}

.theme-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 11px 11px;
}

.theme-mode-badge {
  font-size: 12px;
  line-height: 1;
  margin-bottom: 2px;
}

.theme-name {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.theme-vibe {
  margin: 0;
  font-size: 10px;
  font-weight: 500;
  color: var(--text-tertiary);
  letter-spacing: 0.01em;
}

.theme-check {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.5);
}

/* ── Accent colours ──────────────────────────────────────── */
.accent-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.accent-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2.5px solid transparent;
  transition: transform 0.15s, box-shadow 0.15s;
  flex-shrink: 0;
}

.accent-dot:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.accent-dot.accent-active {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 1px var(--text-primary), 0 4px 12px rgba(0,0,0,0.3);
}

.accent-custom {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, #fa243c, #ff9f0a, #30d158, #0a84ff, #bf5af2, #fa243c);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  border: 2px solid rgba(255,255,255,0.3);
  transition: transform 0.15s;
  overflow: hidden;
  position: relative;
}

.accent-custom:hover { transform: scale(1.12); }

.accent-custom input[type="color"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
  border: none;
  padding: 0;
}

.accent-reset {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-input);
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.accent-reset:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* ── Segment control ─────────────────────────────────────── */
.seg-control {
  display: inline-flex;
  background: var(--bg-input);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}

.seg {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  border-radius: 7px;
  transition: background 0.15s, color 0.15s;
}

.seg-active {
  background: var(--bg-base);
  color: var(--text-primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.16);
}

.seg.seg-sm {
  padding: 4px 10px;
  font-size: 11px;
}

/* ── Toggle switch ───────────────────────────────────────── */
.toggle {
  width: 50px;
  height: 30px;
  border-radius: 15px;
  background: var(--bg-input);
  position: relative;
  flex-shrink: 0;
  transition: background 0.22s;
  border: 1.5px solid var(--line-strong);
}

.toggle-on {
  background: var(--success, #30d158);
  border-color: transparent;
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
}

.toggle-on .toggle-thumb {
  transform: translateX(20px);
}

/* ── Volume slider ───────────────────────────────────────── */
.volume-slider { width: 180px; }

/* ── Quality pill ────────────────────────────────────────── */
.quality-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 13px;
  border-radius: 100px;
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--line);
}

/* ── Player mode grid ────────────────────────────────────── */
.player-mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
  width: 100%;
}

.player-mode-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 13px 15px;
  background: var(--bg-input);
  border: 1.5px solid transparent;
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.player-mode-card:hover { background: var(--bg-hover); }

.player-mode-active {
  background: rgba(var(--primary-rgb), 0.07);
  border-color: var(--primary);
}

.pm-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.pm-active-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--success, #30d158);
  background: rgba(48, 209, 88, 0.14);
  padding: 2px 7px;
  border-radius: 100px;
}

.pm-desc {
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary);
}

/* ── SponsorBlock ────────────────────────────────────────── */
.row-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.btn-secondary.danger { color: var(--danger); }

.sponsor-grid {
  padding: 0 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sponsor-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 13px;
  border-radius: 10px;
  background: var(--bg-input);
  border: 1px solid var(--line);
}

.sponsor-cat {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.sponsor-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

/* ── Data stats ──────────────────────────────────────────── */
.data-stats {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.06) 0%, rgba(var(--primary-rgb), 0.02) 100%);
  border-bottom: 1px solid var(--line);
}

.data-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  flex: 1;
}

.ds-icon {
  margin-bottom: 4px;
}

.ds-divider {
  width: 1px;
  height: 48px;
  background: var(--line-strong);
  margin: 0 24px;
}

.ds-value {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--text-primary);
}

.ds-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

/* ── YouTube library ─────────────────────────────────────── */
.yt-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

.yt-item {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 9px 11px;
  border-radius: 12px;
  background: var(--bg-hover);
  border: 1px solid var(--line);
  transition: background 0.15s;
}

.yt-item:hover { background: var(--bg-active); }

.yt-thumb {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
}

.yt-thumb img { width: 100%; height: 100%; object-fit: cover; }

.yt-meta { min-width: 0; display: flex; flex-direction: column; gap: 2px; }

.yt-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.yt-sub {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.yt-btn {
  padding: 6px 10px !important;
  font-size: 12px !important;
}

/* ── Shortcuts ───────────────────────────────────────────── */
.shortcut-list {
  margin: 0;
  padding: 16px 20px;
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 28px;
}

.shortcut-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}

kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  padding: 4px 9px;
  font-family: -apple-system, "SF Mono", Menlo, monospace;
  font-size: 11px;
  font-weight: 700;
  background: var(--bg-input);
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  color: var(--text-primary);
  box-shadow: 0 1px 0 var(--line-strong);
}

/* ── Footer ──────────────────────────────────────────────── */
.footer {
  margin: 4px 0 0;
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: var(--text-quaternary);
  letter-spacing: 0.01em;
}
</style>
