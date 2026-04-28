# AetherPulse|Music — Roadmap

> React 19 + Express | YouTube Music Innertube | Modern UI

---

## Phase 1 — Foundation & Stability (Completed)
**Focus: Core infrastructure and reliability.**

| Priority | Task | Status | Description |
|-----------|---------|--------|-------------|
| Critical | Security | Done | Environment variables validation and hidden secrets management. |
| Important | Error Handling | Done | Global Error Boundaries implemented to prevent full-app crashes. |
| Important | Theming Engine | Done | Dark/Light mode support with custom accent colors. |
| Medium | Dependencies | Done | Fully compatible with React 19 and modern ESM standards. |

---

## Phase 2 — UX & Advanced Player (Completed)
**Focus: User experience and playback richness.**

| Priority | Task | Status | Description |
|-----------|---------|--------|-------------|
| Important | Advanced Player | Done | Full queue support, shuffle, repeat, seek bar, and volume management. |
| Important | Keyboard Shortcuts | Done | Comprehensive shortcuts for power users (Play, Seek, Volume, Modals). |
| Important | PWA Support | Done | Service Worker and Manifest for mobile installation + Media Session API integration. |
| Important | Smart Search | Done | Debounced search with real-time suggestions and category filters. |
| Medium | Dynamic UI | Done | Liquid Glass effects and transparency controls in the theme engine. |

---

## Phase 3 — Enhanced Features & Content (Completed)
**Focus: Lyrics, Library, and Personalization.**

| Priority | Task | Status | Description |
|-----------|---------|--------|-------------|
| Critical | Real-time Lyrics | Done | Integration with LRCLIB.net for synced lyrics with auto-scroll and jump-to-time. |
| Important | Local Library | Done | Create, edit, and delete local playlists; import from YouTube Music. |
| Important | Favorites System | Done | Local favorites and listening history tracking via localStorage. |
| Important | Internationalization | Done | Full bilingual UI support (English / Polish) with language context. |
| Important | Insights Page | Done | Listening statistics, top artists, and energy analysis dashboard. |
| Medium | Detail Pages | Done | Artist and Album detail views with discography and related tracks. |

---

## Phase 4 — Quality & Architecture (Completed)
**Focus: Code quality, backend stability, and documentation.**

| Priority | Task | Status | Description |
|-----------|---------|--------|-------------|
| Important | Backend Router Fix | Done | Moved router instantiation inside factory functions to prevent shared mutable state and duplicate route registration. |
| Important | Utility Extraction | Done | Centralized `loadLocalPlaylists` / `saveLocalPlaylists` into `helpers.js` to eliminate duplication and add filesystem error handling. |
| Important | Documentation | Done | Rewrote README with full system architecture, data flow diagrams, component tree, and API overview. |
| Medium | Code Quality | Done | Fixed ESLint warnings (unused variables), improved async error handling, and hardened local playlist persistence. |

---

## Phase 5 — Polish & Performance (Completed)
**Focus: Visual refinement, responsiveness, and user delight.**

| Priority | Task | Status | Description |
|-----------|---------|--------|-------------|
| Important | Dynamic Colors | Done | Canvas-based dominant color extraction from album art; tints player gradient and glow via CSS custom properties. Toggle in theme settings. |
| Important | Mobile Experience | Done | Touch-optimized progress bar seeking, swipe-to-skip on mini player, lyrics/queue buttons visible on mobile. |
| Medium | Accessibility | Done | Focus trap hook for all modals, comprehensive ARIA labels on buttons, `prefers-reduced-motion` media query already in CSS. |
| Medium | Offline Support | Done | Custom Service Worker (`sw.js`) with cache-first static assets, network-first API calls, and stale-while-revalidate for images. |
| Medium | Animation Polish | Done | Page transitions on route change, staggered list item animations in TrackList and MediaGrid, enhanced skeleton shimmer. |
| Nice to have | Mini Player | Done | Compact bottom bar with cover art, track info, play/pause, next, expand button, and live progress line. |

---

## Phase 6 — Scalability & Infrastructure (Future)
**Focus: Persistence, Security, and Global Deployment.**

| Priority | Task | Status | Description |
|-----------|---------|--------|-------------|
| Important | Database | Upcoming | PostgreSQL + Prisma integration for cloud user accounts and cross-device sync. |
| Important | CI/CD | Upcoming | GitHub Actions for automated testing, linting, and deployment to cloud providers. |
| Medium | Performance | Upcoming | Redis caching layer for API responses and server-side rate limiting. |
| Medium | Analytics | Upcoming | Privacy-friendly monitoring with Sentry and Plausible. |
| Nice to have | Collaborative | Upcoming | Shared playlists and real-time "Listen Together" sessions. |

---

## Legend

| Symbol | Priority |
|--------|-----------|
| Critical | Blocks release or causes data loss |
| Important | Core user-facing feature or significant technical debt |
| Medium | Enhancement or non-blocking improvement |
| Nice to have | Experimental or future exploration |

---

*Stack: React 19, Express 5, Tailwind CSS, YouTube Music Innertube, LRCLIB API*
