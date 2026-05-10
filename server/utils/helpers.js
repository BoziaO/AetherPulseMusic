const fs = require('fs');
const path = require('path');
const db = require('./db');

function normalizeUserStateKey(key) {
  return String(key || 'guest').replace(/[^a-zA-Z0-9@._-]/g, '_').slice(0, 120) || 'guest';
}

function loadLocalPlaylists() {
  return db.listLocalPlaylists();
}

function getLocalPlaylist(id) {
  return db.getLocalPlaylist(id);
}

function createLocalPlaylist(playlist) {
  return db.createLocalPlaylist(playlist);
}

function deleteLocalPlaylist(id) {
  return db.deleteLocalPlaylist(id);
}

function mutateLocalPlaylistTracks(id, mutator) {
  return db.mutateLocalPlaylistTracks(id, mutator);
}

function createDefaultUserState() {
  return {
    recentPlays: [],
    favorites: [],
    favoriteTracks: {},
    searchHistory: [],
    savedQueues: [],
    volume: 80,
    language: 'en',
    themeState: null,
    pageSettings: null,
    lyricsSettings: null,
    updatedAt: null,
  };
}

function loadUserState(key = 'guest') {
  const stateKey = normalizeUserStateKey(key);
  const stored = db.getUserState(stateKey);
  return { ...createDefaultUserState(), ...(stored || {}) };
}

function saveUserState(key = 'guest', state) {
  const stateKey = normalizeUserStateKey(key);
  const merged = { ...createDefaultUserState(), ...state };
  try {
    db.putUserState(stateKey, merged);
    return true;
  } catch (err) {
    console.error('[ERROR] Failed to save user state:', err.message);
    return false;
  }
}

function mutateUserState(key, mutator) {
  const stateKey = normalizeUserStateKey(key);
  return db.mutateUserState(stateKey, (current) => {
    const base = { ...createDefaultUserState(), ...(current || {}) };
    const next = mutator(base);
    return { ...createDefaultUserState(), ...next };
  });
}

function wrap(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req, res);
      if (result !== undefined && !res.headersSent) {
        res.json(result);
      }
    } catch (err) {
      console.error("[ERROR]", req.path, err.message, err.stack);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Internal server error' });
      }
    }
  };
}

function pickThumbnailUrl(item) {
  return (
    item?.thumbnail ||
    item?.cover ||
    item?.art ||
    (Array.isArray(item?.thumbnails) ? item.thumbnails[item.thumbnails.length - 1]?.url : null) ||
    null
  );
}

function toMediaItem(item) {
  if (!item) return null;
  return {
    title: item.title || 'Untitled',
    subtitle: item.subtitle || item.author || item.artist || (Array.isArray(item.artists) ? item.artists.map((a) => a?.name || '').filter(Boolean).join(", ") : "") || "",
    meta: item.meta || item.resultType || "",
    cover: pickThumbnailUrl(item),
    videoId: item.videoId || null,
    browseId: item.browseId || item.playlistId || null,
    resultType: item.resultType || null,
  };
}

function toQueueItem(track) {
  if (!track) return null;
  const artist =
    track.artist ||
    (Array.isArray(track.artists) ? track.artists.map((a) => a?.name || '').filter(Boolean).join(", ") : "") ||
    "";
  const textBlob = `${track.title || ""} ${artist || ""}`.toLowerCase();
  let energy = 58;
  ["remix", "dance", "edm", "bass", "phonk", "trap"].forEach((word) => {
    if (textBlob.includes(word)) energy += 9;
  });
  ["acoustic", "sad", "chill", "ambient", "sleep", "piano"].forEach((word) => {
    if (textBlob.includes(word)) energy -= 10;
  });
  energy = Math.max(12, Math.min(95, energy));
  return {
    title: track.title || 'Unknown track',
    artist,
    detail: track.album?.name || track.subtitle || "",
    duration: track.duration || null,
    energy,
    videoId: track.videoId || null,
    thumbnail: pickThumbnailUrl(track),
  };
}

function hasYtMusicHeaders() {
  const headerFile = path.join(__dirname, "..", "..", "headers.json");
  if (!fs.existsSync(headerFile)) return false;
  try {
    const raw = fs.readFileSync(headerFile, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && Object.keys(parsed).length > 0;
  } catch {
    return false;
  }
}

module.exports = {
  wrap,
  pickThumbnailUrl,
  toMediaItem,
  toQueueItem,
  hasYtMusicHeaders,
  loadLocalPlaylists,
  getLocalPlaylist,
  createLocalPlaylist,
  deleteLocalPlaylist,
  mutateLocalPlaylistTracks,
  createDefaultUserState,
  loadUserState,
  saveUserState,
  mutateUserState,
};
