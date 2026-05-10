const fs = require('fs');
const os = require('os');
const path = require('path');

// Using JSON file storage for development (no native bindings required)
// For production, consider using sql.js or upgrading to better-sqlite3 with proper Python setup
const DATA_DIR = process.env.AETHERPULSE_DATA_DIR || path.join(os.tmpdir(), 'aetherpulse-music-data');
const DB_FILE = path.join(DATA_DIR, 'aetherpulse.sqlite');

const LOCAL_PLAYLISTS_FILE = path.join(DATA_DIR, 'localPlaylists.json');
const USER_STATE_FILE = path.join(DATA_DIR, 'userState.json');

const LEGACY_SERVER_DATA_DIR = path.join(__dirname, '..', 'data');
const LEGACY_LOCAL_PLAYLISTS_FILE = path.join(__dirname, '..', '..', 'localPlaylists.json');
const LEGACY_USER_STATE_FILE = path.join(__dirname, '..', '..', 'userState.json');
const LEGACY_SERVER_LOCAL_PLAYLISTS_FILE = path.join(LEGACY_SERVER_DATA_DIR, 'localPlaylists.json');
const LEGACY_SERVER_USER_STATE_FILE = path.join(LEGACY_SERVER_DATA_DIR, 'userState.json');

const LEGACY_PLAYLIST_SOURCES = [
  LOCAL_PLAYLISTS_FILE,
  LEGACY_SERVER_LOCAL_PLAYLISTS_FILE,
  LEGACY_LOCAL_PLAYLISTS_FILE,
];
const LEGACY_USER_STATE_SOURCES = [
  USER_STATE_FILE,
  LEGACY_SERVER_USER_STATE_FILE,
  LEGACY_USER_STATE_FILE,
];

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

function writeJsonFile(filePath, data) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// In-memory cache
let playlistsCache = null;
let userStateCache = null;

function loadPlaylists() {
  if (playlistsCache !== null) return playlistsCache;
  playlistsCache = Array.isArray(readJsonFile(LOCAL_PLAYLISTS_FILE, null))
    ? readJsonFile(LOCAL_PLAYLISTS_FILE, [])
    : [];
  return playlistsCache;
}

function savePlaylists() {
  if (playlistsCache !== null) {
    writeJsonFile(LOCAL_PLAYLISTS_FILE, playlistsCache);
  }
}

function loadUserStates() {
  if (userStateCache !== null) return userStateCache;
  userStateCache = readJsonFile(USER_STATE_FILE, {});
  return userStateCache;
}

function saveUserStates() {
  if (userStateCache !== null) {
    writeJsonFile(USER_STATE_FILE, userStateCache);
  }
}

function getDb() {
  // Simulate database initialization
  ensureDataDir();
  console.log('[db] Using JSON file storage (development mode)');
  loadPlaylists();
  loadUserStates();
  return {}; // Return empty object - functions below handle the actual logic
}

function listLocalPlaylists() {
  const playlists = loadPlaylists();
  return playlists.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description || '',
    importedFrom: p.importedFrom,
    createdAt: p.createdAt,
    tracks: Array.isArray(p.tracks) ? p.tracks : [],
  }));
}

function getLocalPlaylist(id) {
  const playlists = loadPlaylists();
  const p = playlists.find(pl => pl.id === id);
  if (!p) return null;
  return {
    id: p.id,
    title: p.title,
    description: p.description || '',
    importedFrom: p.importedFrom,
    createdAt: p.createdAt,
    tracks: Array.isArray(p.tracks) ? p.tracks : [],
  };
}

function createLocalPlaylist(playlist) {
  const playlists = loadPlaylists();
  const newPlaylist = {
    id: String(playlist.id),
    title: String(playlist.title || 'Untitled'),
    description: String(playlist.description || ''),
    importedFrom: playlist.importedFrom ? String(playlist.importedFrom) : undefined,
    createdAt: playlist.createdAt || new Date().toISOString(),
    tracks: Array.isArray(playlist.tracks) ? playlist.tracks : [],
  };
  playlists.push(newPlaylist);
  savePlaylists();
  return newPlaylist;
}

function deleteLocalPlaylist(id) {
  const playlists = loadPlaylists();
  const index = playlists.findIndex(p => p.id === id);
  if (index === -1) return false;
  playlists.splice(index, 1);
  savePlaylists();
  return true;
}

function mutateLocalPlaylistTracks(id, mutator) {
  const playlists = loadPlaylists();
  const playlist = playlists.find(p => p.id === id);
  if (!playlist) return null;
  const nextTracks = mutator(Array.isArray(playlist.tracks) ? playlist.tracks.slice() : []);
  if (!Array.isArray(nextTracks)) {
    throw new Error('mutator must return an array of tracks');
  }
  playlist.tracks = nextTracks;
  savePlaylists();
  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description || '',
    importedFrom: playlist.importedFrom,
    createdAt: playlist.createdAt,
    tracks: nextTracks,
  };
}

function getUserState(userKey) {
  const states = loadUserStates();
  const state = states[userKey];
  if (!state) return null;
  return typeof state === 'string' ? JSON.parse(state) : state;
}

function putUserState(userKey, state) {
  const states = loadUserStates();
  states[userKey] = state;
  saveUserStates();
}

function mutateUserState(userKey, mutator) {
  const states = loadUserStates();
  let current = states[userKey];
  if (typeof current === 'string') {
    try {
      current = JSON.parse(current);
    } catch {
      current = null;
    }
  }
  const next = mutator(current);
  if (!next || typeof next !== 'object') {
    throw new Error('mutator must return a state object');
  }
  states[userKey] = next;
  saveUserStates();
  return next;
}

function close() {
  savePlaylists();
  saveUserStates();
}

module.exports = {
  getDb,
  listLocalPlaylists,
  getLocalPlaylist,
  createLocalPlaylist,
  deleteLocalPlaylist,
  mutateLocalPlaylistTracks,
  getUserState,
  putUserState,
  mutateUserState,
  close,
  DATA_DIR,
  DB_FILE,
};
