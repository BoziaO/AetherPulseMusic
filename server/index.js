require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const yt = require('./ytmusic');

const app = express();
const PORT = process.env.NODE_ENV === 'production' ? (process.env.PORT || 5000) : (process.env.BACKEND_PORT || 3001);
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5000',
  'http://localhost:5000',
  'http://localhost:3002',
  'http://0.0.0.0:5000',
];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://0.0.0.0:')) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const { hostname } = new URL(origin);
    const replitDomain = process.env.REPLIT_DEV_DOMAIN;
    return (
      (replitDomain && hostname === replitDomain) ||
      hostname.endsWith('.replit.dev') ||
      hostname.endsWith('.replit.app')
    );
  } catch {
    return false;
  }
}

function getFrontendRedirectUrl(pathname = '/') {
  const configuredUrl = process.env.FRONTEND_URL;
  if (configuredUrl && !configuredUrl.includes('0.0.0.0')) {
    return configuredUrl;
  }
  return pathname;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.set('trust proxy', 1);
app.use(session({
  secret: (() => {
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.SESSION_SECRET) {
        console.error('SESSION_SECRET must be set in production');
        process.exit(1);
      }
      return process.env.SESSION_SECRET;
    }
    return process.env.SESSION_SECRET || 'aetherpulse-dev-secret';
  })(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Fix: expanded CSP to allow YouTube thumbnails, Google fonts and YouTube IFrame API
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "connect-src 'self' http://localhost:3001 http://localhost:3002 https://*.googleapis.com https://music.youtube.com; " +
    "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "frame-src https://www.youtube.com; " +
    "img-src 'self' data: blob: https://*.ytimg.com https://i.ytimg.com https://lh3.googleusercontent.com https://*.ggpht.com https://yt3.ggpht.com https://yt3.googleusercontent.com https://music.youtube.com;"
  );
  next();
});

app.get('/api/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'select_account',
  });
  res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    req.session.tokens = tokens;

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    req.session.user = data;

    res.redirect(getFrontendRedirectUrl('/'));
  } catch (error) {
    console.error('Error during Google Auth callback:', error);
    res.redirect(`${getFrontendRedirectUrl('/')}?error=auth_failed`);
  }
});

app.get('/api/auth/session', (req, res) => {
  if (req.session.user) {
    return res.json({
      auth: {
        enabled: true,
        connected: true,
        user: req.session.user,
      },
    });
  }

  res.json({
    auth: {
      enabled: !!process.env.GOOGLE_CLIENT_ID,
      connected: false,
    },
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.sendStatus(200));
});

app.get('/api/youtube/playlists', async (req, res) => {
  if (!req.session.tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  oauth2Client.setCredentials(req.session.tokens);
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  try {
    const response = await youtube.playlists.list({
      part: 'snippet,contentDetails',
      mine: true,
      maxResults: 50,
    });
    res.json(response.data.items || []);
  } catch (error) {
    console.error('Error fetching YouTube playlists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

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

// YT Music API Routes
app.get('/api/ytmusic/search', wrap(async (req) => {
  const { q, filter, limit = 20 } = req.query;
  if (!q) return { error: "q is required" };
  return yt.search(q, filter || null, parseInt(limit, 10));
}));

app.get('/api/ytmusic/suggestions', wrap(async (req) => {
  const { q } = req.query;
  if (!q) return { error: "q is required" };
  const suggestions = await yt.getSearchSuggestions(q);
  return { suggestions };
}));

app.get('/api/ytmusic/home', wrap(async (req) => {
  const { limit = 3 } = req.query;
  return yt.getHome(parseInt(limit, 10));
}));

app.get('/api/ytmusic/artist/:channelId', wrap(async (req) => {
  return yt.getArtist(req.params.channelId);
}));

app.get('/api/ytmusic/album/:browseId', wrap(async (req) => {
  return yt.getAlbum(req.params.browseId);
}));

app.get('/api/ytmusic/song/:videoId', wrap(async (req) => {
  const song = await yt.getSong(req.params.videoId);
  if (!song) return { error: "Song not found" };
  return song;
}));

app.get('/api/ytmusic/lyrics/:videoId', wrap(async (req) => {
  const lyrics = await yt.getLyrics(req.params.videoId);
  if (!lyrics) return { error: "Lyrics not found" };
  return lyrics;
}));

app.get('/api/ytmusic/watch', wrap(async (req) => {
  const { videoId, playlistId, limit = 25, radio = "false", shuffle = "false" } = req.query;
  if (!videoId) return { error: "videoId is required" };
  return yt.getWatchPlaylist(videoId, playlistId || null, parseInt(limit, 10), radio === "true", shuffle === "true");
}));

app.get('/api/ytmusic/moods', wrap(async () => yt.getMoodCategories()));

app.get('/api/ytmusic/moods/playlists', wrap(async (req) => {
  const { params } = req.query;
  if (!params) return { error: "params is required" };
  return yt.getMoodPlaylists(params);
}));

app.get('/api/ytmusic/charts', wrap(async (req) => {
  const { country = "ZZ" } = req.query;
  return yt.getCharts(country);
}));

app.get('/api/ytmusic/library/playlists', wrap(async (req) => {
  const { limit = 25 } = req.query;
  const authHeaders = req.session.tokens ? { Authorization: `Bearer ${req.session.tokens.access_token}` } : {};
  return yt.getLibraryPlaylists(parseInt(limit, 10), authHeaders);
}));

app.get('/api/ytmusic/library/songs', wrap(async (req) => {
  const { limit = 25 } = req.query;
  const authHeaders = req.session.tokens ? { Authorization: `Bearer ${req.session.tokens.access_token}` } : {};
  return yt.getLibrarySongs(parseInt(limit, 10), authHeaders);
}));

app.get('/api/ytmusic/library/albums', wrap(async (req) => {
  const { limit = 25 } = req.query;
  const authHeaders = req.session.tokens ? { Authorization: `Bearer ${req.session.tokens.access_token}` } : {};
  return yt.getLibraryAlbums(parseInt(limit, 10), authHeaders);
}));

app.get('/api/ytmusic/library/artists', wrap(async (req) => {
  const { limit = 25 } = req.query;
  const authHeaders = req.session.tokens ? { Authorization: `Bearer ${req.session.tokens.access_token}` } : {};
  return yt.getLibraryArtists(parseInt(limit, 10), authHeaders);
}));

app.get('/api/ytmusic/playlist/:playlistId', wrap(async (req) => {
  const { limit = 500 } = req.query;
  return yt.getPlaylist(req.params.playlistId, parseInt(limit, 10));
}));

app.post('/api/ytmusic/playlist/:playlistId/tracks', wrap(async (req) => {
  const { videoIds = [], sourcePlaylistId, duplicates = false } = req.body;
  if (!videoIds.length && !sourcePlaylistId)
    return { error: "videoIds or sourcePlaylistId required" };
  const ok = await yt.addPlaylistItems(
    req.params.playlistId,
    videoIds,
    sourcePlaylistId,
    duplicates,
  );
  return { success: ok };
}));

app.delete('/api/ytmusic/playlist/:playlistId/tracks', wrap(async (req) => {
  const { videos } = req.body;
  if (!videos) return { error: "videos is required" };
  const ok = await yt.removePlaylistItems(req.params.playlistId, videos);
  return { success: ok };
}));

app.post('/api/ytmusic/playlists', wrap(async (req) => {
  const { title, description = "", privacyStatus = "PRIVATE", videoIds = [] } = req.body || {};
  if (!title) return { error: "title is required" };
  const playlistId = await yt.createPlaylist(title, description, privacyStatus, videoIds);
  if (!playlistId) return { error: "Failed to create playlist" };
  return { playlistId };
}));

app.delete('/api/ytmusic/playlist/:playlistId', wrap(async (req) => {
  const ok = await yt.deletePlaylist(req.params.playlistId);
  return { success: ok };
}));

app.patch('/api/ytmusic/playlist/:playlistId', wrap(async (req) => {
  const { title, description, privacyStatus } = req.body || {};
  const ok = await yt.editPlaylist(req.params.playlistId, { title, description, privacyStatus });
  return { success: ok };
}));

function hasYtMusicHeaders() {
  const headerFile = path.join(__dirname, "..", "headers.json");
  if (!fs.existsSync(headerFile)) return false;
  try {
    const raw = fs.readFileSync(headerFile, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && Object.keys(parsed).length > 0;
  } catch {
    return false;
  }
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
  return {
    title: track.title,
    artist,
    detail: track.album?.name || track.subtitle || "",
    duration: track.duration || null,
    energy: 60,
    videoId: track.videoId || null,
    thumbnail: pickThumbnailUrl(track),
  };
}

app.get('/api/page/:key', wrap(async (req) => {
  const { key } = req.params;
  const { recent = "" } = req.query;
  const ytMusicHeaders = hasYtMusicHeaders();
  const authHeaders = req.session.tokens ? { Authorization: `Bearer ${req.session.tokens.access_token}` } : {};

  const base = {
    key,
    backendStatus: { imports: { ytMusicHeaders } },
  };

  if (key === "home") {
    const charts = await yt.getCharts("ZZ");
    const trendingSongs = (charts?.songs || []).filter(Boolean);
    
    // Personalized recommendations based on recent plays
    let recommendations = [];
    const recentIds = recent.split(",").filter(Boolean);
    if (recentIds.length > 0) {
      try {
        const lastId = recentIds[0];
        const watchPlaylist = await yt.getWatchPlaylist(lastId, null, 12);
        recommendations = (watchPlaylist?.tracks || []).slice(1).map(toMediaItem).filter(Boolean);
      } catch (err) {
        console.warn("Could not fetch personalized recommendations:", err.message);
      }
    }

    const homeRows = await yt.getHome(4);
    const primaryRow = homeRows?.[0];
    const hit = trendingSongs[0] || null;

    return {
      ...base,
      eyebrow: "Witaj w AetherPulse|Music",
      title: recommendations.length > 0 ? "Polecane dla Ciebie" : "Trending — utwory na czasie",
      description: recommendations.length > 0 
        ? "Na podstawie Twojej ostatniej aktywności." 
        : "Hit dnia i trendy z YouTube Music (Innertube).",
      chips: ["Dla Ciebie", "Trendy", "Playlisty", "Albumy"],
      spotlightTitle: "Hit dnia",
      spotlightText: hit ? `${hit.title}` : "Najczęściej odtwarzany utwór dzisiaj.",
      spotlightItems: trendingSongs.slice(0, 5).map((s, idx) => `${idx + 1}. ${s.title}`),
      stats: [
        { label: "Trending songs", value: String(trendingSongs.length || 0) },
        { label: "Trending artists", value: String((charts?.artists || []).length || 0) },
        { label: "Ostatnio grane", value: String(recentIds.length) },
      ],
      primarySection: {
        title: recommendations.length > 0 ? "Twoje rekomendacje" : "Trending (utwory)",
        action: "Odśwież",
        items: recommendations.length > 0 
          ? recommendations 
          : trendingSongs.slice(0, 18).map((s) => toMediaItem({ ...s, resultType: "song", meta: "Trending" })).filter(Boolean),
      },
      secondarySection: {
        title: recommendations.length > 0 ? "Trending (utwory)" : (primaryRow?.title || "Polecane playlisty"),
        action: "Odśwież",
        items: recommendations.length > 0
          ? trendingSongs.slice(0, 12).map((s) => toMediaItem({ ...s, resultType: "song", meta: "Trending" })).filter(Boolean)
          : (primaryRow?.items || []).map((i) => toMediaItem({ ...i, resultType: i?.browseId?.startsWith("VL") ? "playlist" : i?.resultType })).filter(Boolean),
      },
      tertiarySection: {
        title: "Popularne utwory",
        action: "Zobacz wszystkie",
        items: trendingSongs.slice(18, 36).map((s) => toMediaItem({ ...s, resultType: "song", meta: "Popularne" })).filter(Boolean),
      },
      chartTitle: "Trendy (artyści)",
      chartItems: (charts?.artists || []).slice(0, 6).map((a, idx) => ({
        label: `#${idx + 1}`,
        title: a.title,
        subtitle: "Artist",
        change: "+",
        browseId: a.browseId || null,
      })),
      queueTitle: "Trending (utwory)",
      queueAction: "Odtwórz",
      queue: trendingSongs.slice(0, 12).map(toQueueItem).filter(Boolean),
      nowPlaying: hit
        ? { title: hit.title, artist: hit.artist || "", art: hit.thumbnail, duration: 240, progress: 10, videoId: hit.videoId || null }
        : undefined,
    };
  }

  if (key === "playlists") {
    const lib = await yt.getLibraryPlaylists(24, authHeaders).catch(() => []);
    const localPlaylists = loadLocalPlaylists();
    const merged = [
      ...localPlaylists.map((p) => ({
        title: p.title,
        author: "Lokalna",
        thumbnail: null,
        browseId: `local-${p.id}`,
        playlistId: `local-${p.id}`,
        trackCount: p.tracks.length,
        source: "local",
      })),
      ...lib.map((p) => ({ ...p, source: "youtube" })),
    ];
    return {
      ...base,
      eyebrow: "Biblioteka",
      title: "Playlisty",
      description: "Playlisty z YouTube Music i lokalne. Kliknij, aby zobaczyć szczegóły i utwory.",
      chips: ["Biblioteka", "Lokalne", "Polecane", "Wyszukaj"],
      stats: [
        { label: "Playlisty YT", value: String((lib || []).length || 0) },
        { label: "Lokalne", value: String(localPlaylists.length || 0) },
        { label: "Edycja", value: ytMusicHeaders ? "ON" : "OFF" },
      ],
      primarySection: {
        title: "Wszystkie playlisty",
        // Fix: primary section action for playlists should be "Nowa playlista"
        action: "Nowa playlista",
        items: merged.map((p) =>
          toMediaItem({
            title: p.title,
            author: p.author || "YouTube Music",
            thumbnail: p.thumbnail,
            browseId: p.browseId,
            resultType: "playlist",
            meta: p.source === "local" ? "Lokalna" : "Biblioteka",
          }),
        ),
      },
      secondarySection: {
        title: "Polecane playlisty",
        action: "Odśwież",
        items: [],
      },
      chartTitle: "Tip",
      chartItems: [],
      queueTitle: "Utwory w playliście",
      queueAction: "Odtwórz wszystko",
      queue: [],
    };
  }

  if (key === "albums") {
    const libAlbums = await yt.getLibraryAlbums(24, authHeaders).catch(() => []);
    const charts = await yt.getCharts("ZZ");
    return {
      ...base,
      eyebrow: "Biblioteka",
      title: "Albumy",
      description: "Twoje ulubione albumy oraz trendy.",
      chips: ["Biblioteka", "Trendy"],
      stats: [
        { label: "Albumy (biblioteka)", value: String((libAlbums || []).length || 0) },
        { label: "Trending songs", value: String((charts?.songs || []).length || 0) },
      ],
      primarySection: {
        title: "Albumy z biblioteki",
        action: "Odśwież",
        items: (libAlbums || []).map((a) =>
          toMediaItem({
            title: a.title,
            thumbnail: a.thumbnail,
            browseId: a.browseId,
            resultType: "album",
            meta: "Biblioteka",
          }),
        ),
      },
      secondarySection: {
        title: "Trending (wideo)",
        action: "Odśwież",
        items: (charts?.videos || []).slice(0, 12).map((v) => toMediaItem({ ...v, resultType: "video", meta: "Trending" })).filter(Boolean),
      },
      chartTitle: "Trending (utwory)",
      chartItems: (charts?.songs || []).slice(0, 6).map((s, idx) => ({
        label: `#${idx + 1}`,
        title: s.title,
        subtitle: "Song",
        change: "+",
        videoId: s.videoId || null,
      })),
      queueTitle: "Kolejka",
      queueAction: "Odtwórz",
      queue: (charts?.songs || []).slice(0, 12).map(toQueueItem).filter(Boolean),
    };
  }

  if (key === "artists") {
    const libArtists = await yt.getLibraryArtists(24, authHeaders).catch(() => []);
    const charts = await yt.getCharts("ZZ");
    return {
      ...base,
      eyebrow: "Biblioteka",
      title: "Wykonawcy",
      description: "Ulubieni wykonawcy oraz trendy.",
      chips: ["Biblioteka", "Trendy"],
      stats: [
        { label: "Artyści (biblioteka)", value: String((libArtists || []).length || 0) },
        { label: "Trending artists", value: String((charts?.artists || []).length || 0) },
      ],
      primarySection: {
        title: "Artyści z biblioteki",
        action: "Odśwież",
        items: (libArtists || []).map((a) =>
          toMediaItem({
            title: a.title,
            thumbnail: a.thumbnail,
            browseId: a.browseId,
            resultType: "artist",
            meta: "Biblioteka",
          }),
        ),
      },
      secondarySection: {
        title: "Trending (artyści)",
        action: "Odśwież",
        items: (charts?.artists || []).slice(0, 18).map((a) => toMediaItem({ ...a, resultType: "artist", meta: "Trending" })).filter(Boolean),
      },
      chartTitle: "Trending (utwory)",
      chartItems: (charts?.songs || []).slice(0, 6).map((s, idx) => ({
        label: `#${idx + 1}`,
        title: s.title,
        subtitle: "Song",
        change: "+",
        videoId: s.videoId || null,
      })),
      queueTitle: "Kolejka",
      queueAction: "Odtwórz",
      queue: (charts?.songs || []).slice(0, 12).map(toQueueItem).filter(Boolean),
    };
  }

  if (key === "discover" || key === "chill" || key === "energy") {
    const moods = await yt.getMoodCategories().catch(() => ({}));
    const all = Object.values(moods || {}).flat();

    const want = key === "chill" ? /chill|relax|calm/i : key === "energy" ? /energy|workout|party|dance/i : null;
    const picked = want ? all.find((c) => want.test(c.title || "")) : all[0];
    const playlists = picked?.params ? await yt.getMoodPlaylists(picked.params).catch(() => []) : [];
    const charts = await yt.getCharts("ZZ");

    return {
      ...base,
      eyebrow: key === "discover" ? "Odkrywaj" : key === "chill" ? "Relaks" : "Energia",
      title: key === "discover" ? "Odkrywaj nowe brzmienia" : key === "chill" ? "Relaks — playlisty" : "Energia — playlisty",
      description: picked?.title
        ? `Sekcja: ${picked.title} (YouTube Music moods).`
        : "Polecane playlisty z YouTube Music (moods & genres).",
      chips: ["Moods", "Playlisty", "Trendy"],
      stats: [
        { label: "Kategorie moods", value: String(all.length || 0) },
        { label: "Playlisty", value: String((playlists || []).length || 0) },
        { label: "Trending songs", value: String((charts?.songs || []).length || 0) },
      ],
      primarySection: {
        title: picked?.title || "Polecane playlisty",
        action: "Odśwież",
        items: (playlists || []).slice(0, 18).map((p) =>
          toMediaItem({
            title: p.title,
            thumbnail: p.thumbnail,
            browseId: p.playlistId,
            resultType: "playlist",
            meta: "Playlist",
          }),
        ),
      },
      secondarySection: {
        title: "Trending (utwory)",
        action: "Odśwież",
        items: (charts?.songs || []).slice(0, 18).map((s) =>
          toMediaItem({
            title: s.title,
            thumbnail: s.thumbnail,
            videoId: s.videoId,
            resultType: "song",
            meta: "Trending",
          }),
        ).filter(Boolean),
      },
      chartTitle: "Trending (artyści)",
      chartItems: (charts?.artists || []).slice(0, 6).map((a, idx) => ({
        label: `#${idx + 1}`,
        title: a.title,
        subtitle: "Artist",
        change: "+",
        browseId: a.browseId || null,
      })),
      queueTitle: "Kolejka",
      queueAction: "Odtwórz",
      queue: (charts?.songs || []).slice(0, 12).map(toQueueItem).filter(Boolean),
    };
  }

  return {
    ...base,
    eyebrow: "AetherPulse|Music",
    title: "Strona",
    description: "Brak danych dla tej strony.",
    chips: [],
    stats: [],
    primarySection: { title: "Brak", action: "", items: [] },
    secondarySection: { title: "Brak", action: "", items: [] },
    chartTitle: "Brak",
    chartItems: [],
    queueTitle: "Brak",
    queueAction: "",
    queue: [],
  };
}));

// Local Playlists JSON file handling
const LOCAL_PLAYLISTS_FILE = path.join(__dirname, '..', 'localPlaylists.json');

function loadLocalPlaylists() {
  if (!fs.existsSync(LOCAL_PLAYLISTS_FILE)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(LOCAL_PLAYLISTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveLocalPlaylists(playlists) {
  fs.writeFileSync(LOCAL_PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));
}

// Local Playlists Routes
app.get('/api/local/playlists', (req, res) => {
  const playlists = loadLocalPlaylists();
  res.json(playlists);
});

app.post('/api/local/playlists', (req, res) => {
  const { title, description = "" } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const playlists = loadLocalPlaylists();
  const newPlaylist = {
    id: Date.now().toString(),
    title,
    description,
    tracks: [],
    createdAt: new Date().toISOString(),
  };
  playlists.push(newPlaylist);
  saveLocalPlaylists(playlists);
  res.json(newPlaylist);
});

app.get('/api/local/playlists/:id', (req, res) => {
  const playlists = loadLocalPlaylists();
  const playlist = playlists.find((p) => p.id === req.params.id);
  if (!playlist) return res.status(404).json({ error: "Playlist not found" });
  res.json(playlist);
});

app.post('/api/local/playlists/:id/tracks', (req, res) => {
  const { videoId, title, artist, thumbnail, duration } = req.body;
  if (!videoId || !title) return res.status(400).json({ error: "videoId and title required" });
  const playlists = loadLocalPlaylists();
  const playlist = playlists.find((p) => p.id === req.params.id);
  if (!playlist) return res.status(404).json({ error: "Playlist not found" });
  const track = { videoId, title, artist: artist || "", thumbnail, duration: duration || "" };
  playlist.tracks.push(track);
  saveLocalPlaylists(playlists);
  res.json({ success: true });
});

app.delete('/api/local/playlists/:id/tracks', (req, res) => {
  const { videoId } = req.body;
  if (!videoId) return res.status(400).json({ error: "videoId required" });
  const playlists = loadLocalPlaylists();
  const playlist = playlists.find((p) => p.id === req.params.id);
  if (!playlist) return res.status(404).json({ error: "Playlist not found" });
  playlist.tracks = playlist.tracks.filter((t) => t.videoId !== videoId);
  saveLocalPlaylists(playlists);
  res.json({ success: true });
});

app.delete('/api/local/playlists/:id', (req, res) => {
  const playlists = loadLocalPlaylists();
  const index = playlists.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Playlist not found" });
  playlists.splice(index, 1);
  saveLocalPlaylists(playlists);
  res.json({ success: true });
});

// Import YouTube playlist to local storage
app.post('/api/local/playlists/import-yt/:playlistId', wrap(async (req) => {
  const { playlistId } = req.params;
  const cleanId = playlistId.replace(/^VL/, '');

  // Fetch the YouTube playlist data
  const ytPlaylist = await yt.getPlaylist(cleanId, 500);
  if (!ytPlaylist) {
    return { error: 'Nie znaleziono playlisty YouTube Music.' };
  }

  const tracks = (ytPlaylist.tracks || []).filter(Boolean);
  const title = ytPlaylist.title || 'Importowana playlista';
  const description = ytPlaylist.author
    ? `Importowane z YouTube Music — ${ytPlaylist.author}`
    : 'Importowane z YouTube Music';

  // Create a new local playlist
  const playlists = loadLocalPlaylists();
  const newPlaylist = {
    id: Date.now().toString(),
    title,
    description,
    tracks: tracks.map((t) => ({
      videoId: t.videoId || '',
      title: t.title || 'Nieznany',
      artist:
        t.artist ||
        (Array.isArray(t.artists) ? t.artists.map((a) => a.name).join(', ') : '') ||
        t.author ||
        '',
      thumbnail:
        t.thumbnail ||
        (Array.isArray(t.thumbnails) ? t.thumbnails[t.thumbnails.length - 1]?.url : null) ||
        null,
      duration: t.duration || '',
    })).filter((t) => t.videoId),
    importedFrom: playlistId,
    createdAt: new Date().toISOString(),
  };

  playlists.push(newPlaylist);
  saveLocalPlaylists(playlists);

  return { success: true, localId: newPlaylist.id, title: newPlaylist.title, trackCount: newPlaylist.tracks.length };
}));

// Static files for production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
}

// Catch-all for React Router (production)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../build', 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(500).send("Build folder missing. Run 'npm run build' first.");
      }
    });
  });
} else {
  app.get('/', (req, res) => {
    res.send('AetherPulse|Music API Server is running on port 3001. Frontend is on port 5000 during development.');
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
