const express = require('express');
const { wrap, loadUserState, saveUserState, createDefaultUserState } = require('../utils/helpers');

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
    const current = loadUserState(getUserStateKey(req));
    const clean = sanitizePatch(req.body || {});
    const state = { ...current, ...clean, updatedAt: new Date().toISOString() };
    saveUserState(getUserStateKey(req), state);
    return state;
  }));

  router.post('/recent', wrap(async (req) => {
    const track = req.body?.track;
    if (!track) return { error: 'track is required' };
    const state = loadUserState(getUserStateKey(req));
    const key = getTrackKey(track);
    state.recentPlays = [track, ...state.recentPlays.filter((item) => getTrackKey(item) !== key)].slice(0, MAX_RECENT_PLAYS);
    state.updatedAt = new Date().toISOString();
    saveUserState(getUserStateKey(req), state);
    return { recentPlays: state.recentPlays };
  }));

  router.post('/favorites/toggle', wrap(async (req) => {
    const track = req.body?.track;
    if (!track) return { error: 'track is required' };
    const state = loadUserState(getUserStateKey(req));
    const key = getTrackKey(track);
    const favorites = new Set(state.favorites || []);
    const favoriteTracks = { ...(state.favoriteTracks || {}) };
    const isFavorite = !favorites.has(key);

    if (isFavorite) {
      favorites.add(key);
      favoriteTracks[key] = track;
    } else {
      favorites.delete(key);
      delete favoriteTracks[key];
    }

    state.favorites = Array.from(favorites);
    state.favoriteTracks = favoriteTracks;
    state.updatedAt = new Date().toISOString();
    saveUserState(getUserStateKey(req), state);
    return { favorites: state.favorites, favoriteTracks: state.favoriteTracks, isFavorite };
  }));

  router.get('/queues', (req, res) => {
    const state = loadUserState(getUserStateKey(req));
    res.json({ queues: state.savedQueues || [] });
  });

  router.post('/queues', wrap(async (req) => {
    const { title, tracks = [] } = req.body || {};
    if (!title?.trim()) return { error: 'title is required' };
    const state = loadUserState(getUserStateKey(req));
    const queue = {
      id: `${Date.now()}`,
      title: title.trim(),
      tracks: sanitizeArray(tracks, 250),
      createdAt: new Date().toISOString(),
    };
    state.savedQueues = [queue, ...(state.savedQueues || [])].slice(0, MAX_SAVED_QUEUES);
    state.updatedAt = new Date().toISOString();
    saveUserState(getUserStateKey(req), state);
    return { queue, queues: state.savedQueues };
  }));

  router.delete('/queues/:queueId', wrap(async (req) => {
    const state = loadUserState(getUserStateKey(req));
    state.savedQueues = (state.savedQueues || []).filter((queue) => queue.id !== req.params.queueId);
    state.updatedAt = new Date().toISOString();
    saveUserState(getUserStateKey(req), state);
    return { queues: state.savedQueues };
  }));

  router.delete('/queues', wrap(async (req) => {
    const state = loadUserState(getUserStateKey(req));
    const removed = (state.savedQueues || []).length;
    state.savedQueues = [];
    state.updatedAt = new Date().toISOString();
    saveUserState(getUserStateKey(req), state);
    return { success: true, removed };
  }));

  return router;
}

module.exports = createUserRouter;
