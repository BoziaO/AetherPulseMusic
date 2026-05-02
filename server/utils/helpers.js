const fs = require('fs');
const os = require('os');
const path = require('path');

const DATA_DIR = process.env.AETHERPULSE_DATA_DIR || path.join(os.tmpdir(), 'aetherpulse-music-data');
const LEGACY_SERVER_DATA_DIR = path.join(__dirname, '..', 'data');
const LEGACY_LOCAL_PLAYLISTS_FILE = path.join(__dirname, '..', '..', 'localPlaylists.json');
const LEGACY_USER_STATE_FILE = path.join(__dirname, '..', '..', 'userState.json');
const LEGACY_SERVER_LOCAL_PLAYLISTS_FILE = path.join(LEGACY_SERVER_DATA_DIR, 'localPlaylists.json');
const LEGACY_SERVER_USER_STATE_FILE = path.join(LEGACY_SERVER_DATA_DIR, 'userState.json');
const LOCAL_PLAYLISTS_FILE = path.join(DATA_DIR, 'localPlaylists.json');
const USER_STATE_FILE = path.join(DATA_DIR, 'userState.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function loadLocalPlaylists() {
  return readJsonFile(
    LOCAL_PLAYLISTS_FILE,
    readJsonFile(LEGACY_SERVER_LOCAL_PLAYLISTS_FILE, readJsonFile(LEGACY_LOCAL_PLAYLISTS_FILE, [])),
  );
}

function saveLocalPlaylists(playlists) {
  try {
    ensureDataDir();
    fs.writeFileSync(LOCAL_PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));
    return true;
  } catch (err) {
    console.error('[ERROR] Failed to save local playlists:', err.message);
    return false;
  }
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

function loadAllUserStates() {
  const parsed = readJsonFile(
    USER_STATE_FILE,
    readJsonFile(LEGACY_SERVER_USER_STATE_FILE, readJsonFile(LEGACY_USER_STATE_FILE, {})),
  );
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function saveAllUserStates(states) {
  try {
    ensureDataDir();
    fs.writeFileSync(USER_STATE_FILE, JSON.stringify(states, null, 2));
    return true;
  } catch (err) {
    console.error('[ERROR] Failed to save user state:', err.message);
    return false;
  }
}

function normalizeUserStateKey(key) {
  return String(key || 'guest').replace(/[^a-zA-Z0-9@._-]/g, '_').slice(0, 120) || 'guest';
}

function loadUserState(key = 'guest') {
  const states = loadAllUserStates();
  const stateKey = normalizeUserStateKey(key);
  return { ...createDefaultUserState(), ...(states[stateKey] || {}) };
}

function saveUserState(key = 'guest', state) {
  const states = loadAllUserStates();
  const stateKey = normalizeUserStateKey(key);
  states[stateKey] = { ...createDefaultUserState(), ...state };
  return saveAllUserStates(states);
}

function wrap(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req, res);
      if (result !== undefined) res.json(result);
    } catch (err) {
      console.error("[ERROR]", req.path, err.message);
      res.status(500).json({ error: err.message });
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
    title: item.title,
    subtitle: item.subtitle || item.author || item.artist || (Array.isArray(item.artists) ? item.artists.map((a) => a.name).join(", ") : "") || "",
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
    (Array.isArray(track.artists) ? track.artists.map((a) => a.name).join(", ") : "") ||
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
    title: track.title,
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
  saveLocalPlaylists,
  createDefaultUserState,
  loadUserState,
  saveUserState,
};
