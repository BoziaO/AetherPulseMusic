const express = require('express');
const {
  wrap,
  loadUserState,
  saveUserState,
  mutateUserState,
  createDefaultUserState,
} = require('../utils/helpers');
const { validateBody, validateParams, schemas } = require('../utils/schemas');

const MAX_RECENT_PLAYS = 50;
const MAX_SEARCH_HISTORY = 20;
const MAX_SAVED_QUEUES = 30;

function getTrackKey(track) {
  return track?.videoId || `${track?.title || 'track'}-${track?.artist || track?.subtitle || ''}`;
}

function getUserStateKey(req) {
  return req.session?.user?.email || req.session?.user?.id || req.sessionID || 'guest';
}

function sanitizeArray(value, maxLength) {
  return Array.isArray(value) ? value.slice(0, maxLength) : [];
}

function sanitizeFavorites(value) {
  return Array.isArray(value) ? Array.from(new Set(value.filter(Boolean))).slice(0, 1000) : [];
}

function sanitizeFavoriteTracks(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function sanitizePatch(patch) {
  const next = {};
  if (Array.isArray(patch.recentPlays)) next.recentPlays = sanitizeArray(patch.recentPlays, MAX_RECENT_PLAYS);
  if (Array.isArray(patch.searchHistory)) next.searchHistory = sanitizeArray(patch.searchHistory, MAX_SEARCH_HISTORY);
  if (Array.isArray(patch.favorites)) next.favorites = sanitizeFavorites(patch.favorites);
  if (patch.favoriteTracks !== undefined) next.favoriteTracks = sanitizeFavoriteTracks(patch.favoriteTracks);
  if (Number.isFinite(Number(patch.volume))) next.volume = Math.max(0, Math.min(100, Number(patch.volume)));
  if (patch.language === 'en' || patch.language === 'pl') next.language = patch.language;
  if (patch.themeState && typeof patch.themeState === 'object') next.themeState = patch.themeState;
  if (patch.pageSettings && typeof patch.pageSettings === 'object') next.pageSettings = patch.pageSettings;
  if (patch.lyricsSettings && typeof patch.lyricsSettings === 'object') next.lyricsSettings = patch.lyricsSettings;
  if (Array.isArray(patch.savedQueues)) next.savedQueues = sanitizeArray(patch.savedQueues, MAX_SAVED_QUEUES);
  return next;
}

function createUserRouter() {
  const router = express.Router();

  router.get('/state', (req, res) => {
    const state = loadUserState(getUserStateKey(req));
    res.json(state);
  });

  router.put('/state', wrap(async (req) => {
    const clean = sanitizePatch(req.body || {});
    const state = { ...createDefaultUserState(), ...clean, updatedAt: new Date().toISOString() };
    saveUserState(getUserStateKey(req), state);
    return state;
  }));

  router.patch('/state', wrap(async (req) => {
    const clean = sanitizePatch(req.body || {});
    return mutateUserState(getUserStateKey(req), (current) => ({
      ...current,
      ...clean,
      updatedAt: new Date().toISOString(),
    }));
  }));

  router.post(
    '/recent',
    validateBody(schemas.RecentBodySchema),
    wrap(async (req) => {
      const track = req.body.track;
      const next = mutateUserState(getUserStateKey(req), (current) => {
        const key = getTrackKey(track);
        const recentPlays = [track, ...(current.recentPlays || []).filter((item) => getTrackKey(item) !== key)]
          .slice(0, MAX_RECENT_PLAYS);
        return { ...current, recentPlays, updatedAt: new Date().toISOString() };
      });
      return { recentPlays: next.recentPlays };
    }),
  );

  router.post(
    '/favorites/toggle',
    validateBody(schemas.FavoritesBodySchema),
    wrap(async (req) => {
      const track = req.body.track;
      let isFavorite = false;
      const next = mutateUserState(getUserStateKey(req), (current) => {
        const key = getTrackKey(track);
        const favorites = new Set(current.favorites || []);
        const favoriteTracks = { ...(current.favoriteTracks || {}) };
        isFavorite = !favorites.has(key);
        if (isFavorite) {
          favorites.add(key);
          favoriteTracks[key] = track;
        } else {
          favorites.delete(key);
          delete favoriteTracks[key];
        }
        return {
          ...current,
          favorites: Array.from(favorites),
          favoriteTracks,
          updatedAt: new Date().toISOString(),
        };
      });
      return { favorites: next.favorites, favoriteTracks: next.favoriteTracks, isFavorite };
    }),
  );

  router.get('/queues', (req, res) => {
    const state = loadUserState(getUserStateKey(req));
    res.json({ queues: state.savedQueues || [] });
  });

  router.post(
    '/queues',
    validateBody(schemas.SaveQueueBodySchema),
    wrap(async (req) => {
      const { title, tracks } = req.body;
      const queue = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: title.trim(),
        tracks: sanitizeArray(tracks, 250),
        createdAt: new Date().toISOString(),
      };
      const next = mutateUserState(getUserStateKey(req), (current) => ({
        ...current,
        savedQueues: [queue, ...(current.savedQueues || [])].slice(0, MAX_SAVED_QUEUES),
        updatedAt: new Date().toISOString(),
      }));
      return { queue, queues: next.savedQueues };
    }),
  );

  router.delete(
    '/queues/:queueId',
    validateParams(schemas.QueueParamsSchema),
    wrap(async (req) => {
      const next = mutateUserState(getUserStateKey(req), (current) => ({
        ...current,
        savedQueues: (current.savedQueues || []).filter((queue) => queue.id !== req.params.queueId),
        updatedAt: new Date().toISOString(),
      }));
      return { queues: next.savedQueues };
    }),
  );

  router.delete('/queues', wrap(async (req) => {
    let removed = 0;
    mutateUserState(getUserStateKey(req), (current) => {
      removed = (current.savedQueues || []).length;
      return { ...current, savedQueues: [], updatedAt: new Date().toISOString() };
    });
    return { success: true, removed };
  }));

  return router;
}

module.exports = createUserRouter;
