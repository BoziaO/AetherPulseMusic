const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.AETHERPULSE_DATA_DIR || path.join(os.tmpdir(), 'aetherpulse-music-data');
const DB_FILE = path.join(DATA_DIR, 'aetherpulse.sqlite');

const LEGACY_SERVER_DATA_DIR = path.join(__dirname, '..', 'data');
const LEGACY_LOCAL_PLAYLISTS_FILE = path.join(__dirname, '..', '..', 'localPlaylists.json');
const LEGACY_USER_STATE_FILE = path.join(__dirname, '..', '..', 'userState.json');
const LEGACY_SERVER_LOCAL_PLAYLISTS_FILE = path.join(LEGACY_SERVER_DATA_DIR, 'localPlaylists.json');
const LEGACY_SERVER_USER_STATE_FILE = path.join(LEGACY_SERVER_DATA_DIR, 'userState.json');
const LOCAL_PLAYLISTS_FILE = path.join(DATA_DIR, 'localPlaylists.json');
const USER_STATE_FILE = path.join(DATA_DIR, 'userState.json');

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

let db = null;

function getDb() {
  if (db) return db;
  ensureDataDir();
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  initSchema(db);
  runMigrations(db);
  return db;
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS local_playlists (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      imported_from TEXT,
      created_at    TEXT NOT NULL,
      tracks_json   TEXT NOT NULL DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_local_playlists_created_at
      ON local_playlists(created_at);

    CREATE TABLE IF NOT EXISTS user_states (
      user_key   TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}

function runMigrations(database) {
  const hasMigration = database
    .prepare('SELECT 1 FROM migrations WHERE name = ?')
    .pluck();
  const recordMigration = database.prepare(
    'INSERT INTO migrations (name, applied_at) VALUES (?, ?)',
  );

  if (!hasMigration.get('001_import_legacy_json')) {
    importLegacyJson(database);
    recordMigration.run('001_import_legacy_json', new Date().toISOString());
  }
}

function importLegacyJson(database) {
  let importedPlaylists = 0;
  let importedUserStates = 0;
  let playlistSourcePath = null;
  let userStateSourcePath = null;

  for (const source of LEGACY_PLAYLIST_SOURCES) {
    const data = readJsonFile(source, null);
    if (Array.isArray(data) && data.length > 0) {
      const insert = database.prepare(`
        INSERT OR IGNORE INTO local_playlists
          (id, title, description, imported_from, created_at, tracks_json)
        VALUES (@id, @title, @description, @importedFrom, @createdAt, @tracksJson)
      `);
      const transaction = database.transaction((playlists) => {
        for (const playlist of playlists) {
          if (!playlist || typeof playlist !== 'object' || !playlist.id) continue;
          insert.run({
            id: String(playlist.id),
            title: String(playlist.title || 'Untitled'),
            description: String(playlist.description || ''),
            importedFrom: playlist.importedFrom ? String(playlist.importedFrom) : null,
            createdAt: playlist.createdAt || new Date().toISOString(),
            tracksJson: JSON.stringify(Array.isArray(playlist.tracks) ? playlist.tracks : []),
          });
          importedPlaylists += 1;
        }
      });
      transaction(data);
      playlistSourcePath = source;
      break;
    }
  }

  for (const source of LEGACY_USER_STATE_SOURCES) {
    const data = readJsonFile(source, null);
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const insert = database.prepare(`
        INSERT OR IGNORE INTO user_states (user_key, state_json, updated_at)
        VALUES (@userKey, @stateJson, @updatedAt)
      `);
      const transaction = database.transaction((entries) => {
        for (const [key, state] of entries) {
          if (!key || !state || typeof state !== 'object') continue;
          insert.run({
            userKey: String(key),
            stateJson: JSON.stringify(state),
            updatedAt: state.updatedAt || new Date().toISOString(),
          });
          importedUserStates += 1;
        }
      });
      transaction(Object.entries(data));
      userStateSourcePath = source;
      break;
    }
  }

  if (importedPlaylists > 0 || importedUserStates > 0) {
    console.log(
      `[db] Imported legacy JSON: ${importedPlaylists} playlists, ${importedUserStates} user states.`,
    );
  }

  for (const source of [playlistSourcePath, userStateSourcePath]) {
    if (!source) continue;
    try {
      fs.renameSync(source, `${source}.imported`);
    } catch (err) {
      console.warn(`[db] Could not rename legacy file ${source}: ${err.message}`);
    }
  }
}

function rowToPlaylist(row) {
  if (!row) return null;
  let tracks = [];
  try {
    tracks = JSON.parse(row.tracks_json || '[]');
    if (!Array.isArray(tracks)) tracks = [];
  } catch {
    tracks = [];
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    importedFrom: row.imported_from || undefined,
    createdAt: row.created_at,
    tracks,
  };
}

function listLocalPlaylists() {
  const rows = getDb()
    .prepare('SELECT * FROM local_playlists ORDER BY created_at ASC')
    .all();
  return rows.map(rowToPlaylist);
}

function getLocalPlaylist(id) {
  const row = getDb()
    .prepare('SELECT * FROM local_playlists WHERE id = ?')
    .get(id);
  return rowToPlaylist(row);
}

function createLocalPlaylist(playlist) {
  const record = {
    id: String(playlist.id),
    title: String(playlist.title || 'Untitled'),
    description: String(playlist.description || ''),
    importedFrom: playlist.importedFrom ? String(playlist.importedFrom) : null,
    createdAt: playlist.createdAt || new Date().toISOString(),
    tracksJson: JSON.stringify(Array.isArray(playlist.tracks) ? playlist.tracks : []),
  };
  getDb()
    .prepare(`
      INSERT INTO local_playlists
        (id, title, description, imported_from, created_at, tracks_json)
      VALUES (@id, @title, @description, @importedFrom, @createdAt, @tracksJson)
    `)
    .run(record);
  return getLocalPlaylist(record.id);
}

function deleteLocalPlaylist(id) {
  const result = getDb()
    .prepare('DELETE FROM local_playlists WHERE id = ?')
    .run(id);
  return result.changes > 0;
}

function mutateLocalPlaylistTracks(id, mutator) {
  const database = getDb();
  const txn = database.transaction(() => {
    const row = database
      .prepare('SELECT * FROM local_playlists WHERE id = ?')
      .get(id);
    if (!row) return null;
    const playlist = rowToPlaylist(row);
    const nextTracks = mutator(playlist.tracks.slice());
    if (!Array.isArray(nextTracks)) {
      throw new Error('mutator must return an array of tracks');
    }
    database
      .prepare('UPDATE local_playlists SET tracks_json = ? WHERE id = ?')
      .run(JSON.stringify(nextTracks), id);
    return { ...playlist, tracks: nextTracks };
  });
  return txn();
}

function getUserState(userKey) {
  const row = getDb()
    .prepare('SELECT state_json FROM user_states WHERE user_key = ?')
    .get(userKey);
  if (!row) return null;
  try {
    return JSON.parse(row.state_json);
  } catch {
    return null;
  }
}

function putUserState(userKey, state) {
  const updatedAt = state?.updatedAt || new Date().toISOString();
  getDb()
    .prepare(`
      INSERT INTO user_states (user_key, state_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_key) DO UPDATE SET
        state_json = excluded.state_json,
        updated_at = excluded.updated_at
    `)
    .run(userKey, JSON.stringify(state), updatedAt);
}

function mutateUserState(userKey, mutator) {
  const database = getDb();
  const txn = database.transaction(() => {
    const row = database
      .prepare('SELECT state_json FROM user_states WHERE user_key = ?')
      .get(userKey);
    let current = null;
    if (row) {
      try {
        current = JSON.parse(row.state_json);
      } catch {
        current = null;
      }
    }
    const next = mutator(current);
    if (!next || typeof next !== 'object') {
      throw new Error('mutator must return a state object');
    }
    const updatedAt = next.updatedAt || new Date().toISOString();
    database
      .prepare(`
        INSERT INTO user_states (user_key, state_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_key) DO UPDATE SET
          state_json = excluded.state_json,
          updated_at = excluded.updated_at
      `)
      .run(userKey, JSON.stringify(next), updatedAt);
    return next;
  });
  return txn();
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
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
