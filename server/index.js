require('dotenv').config();
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const yt = require('./ytmusic');

const createAuthRouter = require('./routes/auth');
const createYtmusicRouter = require('./routes/ytmusic');
const createLocalPlaylistsRouter = require('./routes/localPlaylists');
const createLyricsRouter = require('./routes/lyrics');
const createPagesRouter = require('./routes/pages');
const createFlowsRouter = require('./routes/flows');
const createUserRouter = require('./routes/user');

// Initialize the SQLite database (runs schema + legacy JSON migration on first boot).
require('./utils/db').getDb();

const app = express();
const PORT = process.env.NODE_ENV === 'production' ? (process.env.PORT || 5000) : (process.env.BACKEND_PORT || 3001);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI
);

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

function getFrontendRedirectUrl(req, pathname = '/') {
  const configuredUrl = process.env.FRONTEND_URL;
  if (configuredUrl && !configuredUrl.includes('0.0.0.0')) {
    return `${configuredUrl.replace(/\/$/, '')}${pathname}`;
  }

  const origin = req?.headers?.origin;
  if (origin && isAllowedOrigin(origin)) {
    return `${origin.replace(/\/$/, '')}${pathname}`;
  }

  return `http://localhost:5000${pathname}`;
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
app.use(express.json({ limit: '256kb' }));
app.set('trust proxy', 1);

// Rate limiters. Tight limits for endpoints that proxy YouTube traffic
// (high risk of upstream blocking), looser limits for everything else.
const ytSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many search requests. Please slow down.' },
});

const ytApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests to YouTube Music API.' },
});

const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests.' },
});
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

app.use((req, res, next) => {
  // Content Security Policy — allows YouTube embeds, local assets, Google APIs
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "connect-src 'self' http://localhost:3001 http://localhost:3002 https://*.googleapis.com https://music.youtube.com; " +
    "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "frame-src https://www.youtube.com; " +
    "img-src 'self' data: blob: https://*.ytimg.com https://i.ytimg.com https://lh3.googleusercontent.com https://*.ggpht.com https://yt3.ggpht.com https://yt3.googleusercontent.com https://music.youtube.com;" +
    "media-src 'self' blob: https://www.youtube.com https://s.ytimg.com"
  );

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking (allows embedding in YouTube iframes)
  res.setHeader('X-Frame-Options', 'ALLOW-FROM https://www.youtube.com');

  // Disable inline scripts (mostly — unsafe-inline needed for Vite HMR)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
});

// Make YouTube Music client available to routes via app.locals
app.locals.yt = yt;

// Mount routers (rate-limit hot paths first, then fall back to a general limiter).
app.use('/api/ytmusic/search', ytSearchLimiter);
app.use('/api/ytmusic/suggestions', ytSearchLimiter);
app.use('/api/ytmusic', ytApiLimiter);
app.use('/api/lyrics', ytApiLimiter);
app.use('/api/page', ytApiLimiter);
app.use('/api/flows', ytApiLimiter);
app.use('/api/local', generalApiLimiter);
app.use('/api/user', generalApiLimiter);
app.use('/api/auth', generalApiLimiter);

app.use('/api/auth', createAuthRouter(oauth2Client, getFrontendRedirectUrl));
app.use('/api/ytmusic', createYtmusicRouter(yt));
app.use('/api/local/playlists', createLocalPlaylistsRouter(yt));
app.use('/api/lyrics', createLyricsRouter(yt));
app.use('/api/page', createPagesRouter(yt));
app.use('/api/flows', createFlowsRouter(yt));
app.use('/api/user', createUserRouter());

const clientDistPath = path.join(__dirname, '../dist');

// Static files for production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDistPath));
}

// Catch-all for Vue Router (production)
if (process.env.NODE_ENV === 'production') {
  app.get(/.*/, (req, res) => {
    const indexPath = path.join(clientDistPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(500).send("Dist folder missing. Run 'npm run build' first.");
      }
    });
  });
} else {
  app.get('/', (req, res) => {
    res.send('AetherPulse Music API server is running on port 3001. Frontend is on port 5000 during development.');
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
