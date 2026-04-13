require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const yt = require('./ytmusic');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// OAuth 2.0 config
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

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3002',
  credentials: true
}));
app.use(express.json());

// Trust proxy for some environments (like Heroku)
app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'bozia-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' 
  }
}));

// Content Security Policy to allow Chrome DevTools and basic operations
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "connect-src 'self' http://localhost:3001 http://localhost:3002 https://*.googleapis.com; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https://*.googleusercontent.com https://*.ytimg.com;"
  );
  next();
});

// Auth Routes
app.get('/api/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'select_account'
  });
  res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    req.session.tokens = tokens;

    // Fetch user profile
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    req.session.user = data;

    res.redirect('/');
  } catch (error) {
    console.error('Error during Google Auth callback:', error);
    res.redirect('/?error=auth_failed');
  }
});

app.get('/api/auth/session', (req, res) => {
  if (req.session.user) {
    res.json({
      auth: {
        enabled: true,
        connected: true,
        user: req.session.user
      }
    });
  } else {
    res.json({
      auth: {
        enabled: !!process.env.GOOGLE_CLIENT_ID,
        connected: false
      }
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.sendStatus(200);
});

// YouTube API Routes
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
      maxResults: 50
    });
    res.json(response.data.items);
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

// YT Music API Routes (Integrated from BoziaYT4PI)
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
  return yt.getLibraryPlaylists(parseInt(limit, 10));
}));

app.get('/api/ytmusic/library/songs', wrap(async (req) => {
  const { limit = 25 } = req.query;
  return yt.getLibrarySongs(parseInt(limit, 10));
}));

app.get('/api/ytmusic/library/albums', wrap(async (req) => {
  const { limit = 25 } = req.query;
  return yt.getLibraryAlbums(parseInt(limit, 10));
}));

app.get('/api/ytmusic/library/artists', wrap(async (req) => {
  const { limit = 25 } = req.query;
  return yt.getLibraryArtists(parseInt(limit, 10));
}));

app.get('/api/ytmusic/playlist/:playlistId', wrap(async (req) => {
  const { limit = 100 } = req.query;
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

// Mock data for initial page load if needed by usePageData
app.get('/api/page/:key', (req, res) => {
  const { key } = req.params;
  // Return some dummy data or handle based on musicData.js structure
  res.json({
    key,
    backendStatus: {
      imports: {
        ytMusicHeaders: false
      }
    }
  });
});

// Static files for production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
}

// Root Route - information that backend is running
app.get('/', (req, res) => {
  // In development, port 3001 is only for API.
  // In production, we might serve the frontend.
  if (process.env.NODE_ENV === 'production') {
    const indexPath = path.join(__dirname, '../build', 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(500).send("Build folder missing. Run 'npm run build' first.");
      }
    });
  } else {
    res.send('BoziaMusic API Server is running. Frontend is usually on port 3002 during development.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
