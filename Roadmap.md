# 🎵 AetherPulse|Music — Roadmap

> React 19 + Express | YouTube Music Innertube | Modern UI

---

## ✅ Phase 1 — Foundation & Stability (Completed)
**Focus: Core infrastructure and reliability.**

| Priority | Task | Status | Description |
|-----------|---------|--------|-------------|
| 🚨 CRITICAL | Security | Done | Environment variables validation and hidden secrets management. |
| ⚡ IMPORTANT | Error Handling | Done | Global Error Boundaries implemented to prevent full-app crashes. |
| ⚡ IMPORTANT | Theming Engine | Done | Dark/Light mode support with custom accent colors. |
| 🔶 MEDIUM | Dependencies | Done | Fully compatible with React 19 and modern ESM standards. |

---

## ✅ Phase 2 — UX & Advanced Player (Completed)
**Focus: User experience and playback richness.**

| Priority | Task | Status | Description |
|-----------|---------|--------|-------------|
| ⚡ IMPORTANT | Advanced Player | Done | Full queue support, shuffle, repeat, seek bar, and volume management. |
| ⚡ IMPORTANT | Keyboard Shortcuts | Done | Comprehensive shortcuts for power users (Play, Seek, Volume, Modals). |
| ⚡ IMPORTANT | PWA Support | Done | Service Worker and Manifest for mobile installation + Media Session API integration. |
| ⚡ IMPORTANT | Smart Search | Done | Debounced search with real-time suggestions and category filters. |
| 🔶 MEDIUM | Dynamic UI | Done | Liquid Glass effects and transparency controls in the theme engine. |

---

## 🟡 Phase 3 — Enhanced Features & Content (Current)
**Focus: Lyrics, Library, and Personalization.**

| Priority | Task | Status | Description |
|-----------|---------|--------|-------------|
| 🚨 CRITICAL | Real-time Lyrics | Done | Integration with LRCLIB.net for synced lyrics with auto-scroll and jump-to-time. |
| ⚡ IMPORTANT | Local Library | Done | Create, edit, and delete local playlists; import from YouTube Music. |
| ⚡ IMPORTANT | Favorites System | Done | Local favorites and listening history tracking. |
| 🔶 MEDIUM | Dynamic Colors | Pending | Extracting dominant colors from album art to tint the UI dynamically (ColorThief). |
| 🔶 MEDIUM | Internationalization | Done | English documentation completed; full i18n support (EN/PL) planned. |

---

## 🔵 Phase 4 — Scalability & Infrastructure (Future)
**Focus: Persistence, Security, and Global Deployment.**

| Priority | Task | Status | Description |
|-----------|---------|--------|-------------|
| ⚡ IMPORTANT | Database | Upcoming | PostgreSQL + Prisma integration for cloud user accounts and cross-device sync. |
| ⚡ IMPORTANT | CI/CD | Upcoming | GitHub Actions for automated testing and deployment to cloud providers. |
| 🔶 MEDIUM | Performance | Upcoming | Redis caching layer for API responses and server-side rate limiting. |
| 🔶 MEDIUM | Analytics | Upcoming | Privacy-friendly monitoring with Sentry and Plausible. |
| 💡 NICE TO HAVE | Collaborative | Upcoming | Shared playlists and real-time "Listen Together" sessions. |

---

## Legend

| Symbol | Priority |
|--------|-----------|
| 🚨 | Critical |
| ⚡ | Important |
| 🔶 | Medium |
| 💡 | Nice to have |

---

*Stack: React 19, Express, Tailwind CSS, YouTube Music Innertube, LRCLIB API*
