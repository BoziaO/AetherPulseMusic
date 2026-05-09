const express = require('express');
const { google } = require('googleapis');
const { loadLocalPlaylists, createLocalPlaylist } = require('../utils/helpers');
const { validateBody, schemas } = require('../utils/schemas');

function createAuthRouter(oauth2Client, getFrontendRedirectUrl) {
  const router = express.Router();
  const SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  function createUserAuthClient(tokens) {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI,
    );
    client.setCredentials(tokens);
    return client;
  }

  function pickThumbnail(thumbnails) {
    if (!thumbnails) return null;
    return (
      thumbnails.maxres?.url ||
      thumbnails.standard?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      null
    );
  }

  async function fetchUserPlaylists(tokens) {
    const auth = createUserAuthClient(tokens);
    const youtube = google.youtube({ version: 'v3', auth });
    const items = [];
    let pageToken = undefined;
    do {
      const { data } = await youtube.playlists.list({
        mine: true,
        part: ['snippet', 'contentDetails'],
        maxResults: 50,
        pageToken,
      });
      for (const p of data.items || []) {
        items.push({
          id: p.id,
          title: p.snippet?.title || 'Untitled',
          description: p.snippet?.description || '',
          thumbnail: pickThumbnail(p.snippet?.thumbnails),
          itemCount: p.contentDetails?.itemCount || 0,
          publishedAt: p.snippet?.publishedAt || null,
        });
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
    return items;
  }

  router.get('/google', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'select_account',
    });
    res.redirect(url);
  });

  router.get('/google/callback', async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code);
      req.session.tokens = tokens;

      const oauth2 = google.oauth2({ version: 'v2', auth: createUserAuthClient(tokens) });
      const { data } = await oauth2.userinfo.get();
      req.session.user = data;

      res.redirect(getFrontendRedirectUrl(req, '/'));
    } catch (error) {
      console.error('Error during Google Auth callback:', error);
      res.redirect(`${getFrontendRedirectUrl(req, '/')}?error=auth_failed`);
    }
  });

  router.get('/session', (req, res) => {
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

  router.post('/logout', (req, res) => {
    req.session.destroy(() => res.sendStatus(200));
  });

  router.get('/youtube/playlists', async (req, res) => {
    if (!req.session.tokens) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
      const items = await fetchUserPlaylists(req.session.tokens);
      res.json({ items });
    } catch (error) {
      console.error('[auth] fetchUserPlaylists failed:', error?.message || error);
      const status = error?.code === 401 || error?.code === 403 ? 401 : 500;
      res.status(status).json({ error: error?.message || 'Failed to fetch playlists' });
    }
  });

  router.post(
    '/youtube/playlists/import',
    validateBody(schemas.ImportYouTubeBulkBodySchema),
    async (req, res) => {
      if (!req.session.tokens) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const yt = req.app.locals.yt;
      const { ids, all } = req.body;

      try {
        let targets;
        if (all) {
          targets = (await fetchUserPlaylists(req.session.tokens)).map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
          }));
        } else {
          targets = ids.map((id) => ({ id, title: null, description: null }));
        }

        const existing = loadLocalPlaylists();
        const alreadyImported = new Set(
          existing
            .map((p) => p.importedFrom)
            .filter(Boolean)
            .map(String),
        );

        const results = [];
        for (const target of targets) {
          if (alreadyImported.has(target.id)) {
            results.push({ id: target.id, status: 'skipped', reason: 'already_imported' });
            continue;
          }
          try {
            const ytPlaylist = await yt.getPlaylist(target.id, 500);
            const tracks = (ytPlaylist?.tracks || [])
              .map((t) => ({
                videoId: t.videoId || '',
                title: t.title || 'Unknown',
                artist:
                  t.artist ||
                  (Array.isArray(t.artists)
                    ? t.artists.map((a) => a.name).filter(Boolean).join(', ')
                    : '') ||
                  t.author ||
                  '',
                thumbnail:
                  t.thumbnail ||
                  (Array.isArray(t.thumbnails)
                    ? t.thumbnails[t.thumbnails.length - 1]?.url
                    : null) ||
                  null,
                duration: t.duration || '',
              }))
              .filter((t) => t.videoId);

            const entry = createLocalPlaylist({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              title: ytPlaylist?.title || target.title || 'Imported playlist',
              description:
                target.description ||
                (ytPlaylist?.author ? `Imported from YouTube — ${ytPlaylist.author}` : 'Imported from YouTube'),
              tracks,
              importedFrom: target.id,
              createdAt: new Date().toISOString(),
            });
            alreadyImported.add(target.id);
            results.push({ id: target.id, status: 'imported', localId: entry.id, trackCount: tracks.length });
          } catch (err) {
            console.warn('[auth] import of', target.id, 'failed:', err?.message || err);
            results.push({ id: target.id, status: 'error', error: err?.message || 'unknown' });
          }
        }

        const imported = results.filter((r) => r.status === 'imported').length;
        const skipped = results.filter((r) => r.status === 'skipped').length;
        const errors = results.filter((r) => r.status === 'error').length;

        res.json({ imported, skipped, errors, results });
      } catch (error) {
        console.error('[auth] bulk import failed:', error?.message || error);
        res.status(500).json({ error: error?.message || 'Import failed' });
      }
    },
  );

  return router;
}

module.exports = createAuthRouter;
