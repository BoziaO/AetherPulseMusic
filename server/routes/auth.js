const express = require('express');
const { google } = require('googleapis');

function createAuthRouter(oauth2Client, getFrontendRedirectUrl) {
  const router = express.Router();
  const SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

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
      oauth2Client.setCredentials(tokens);
      req.session.tokens = tokens;

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
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
    const yt = req.app.locals.yt;
    if (!req.session.tokens) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const authHeaders = { Authorization: `Bearer ${req.session.tokens.access_token}` };

    try {
      const playlists = await yt.getLibraryPlaylists(50, authHeaders);
      const items = playlists.map(p => ({
        id: p.browseId,
        snippet: {
          title: p.title,
          description: p.author || '',
          thumbnails: { default: { url: p.thumbnail } }
        },
        contentDetails: { itemCount: p.trackCount || 0 }
      }));
      res.json(items);
    } catch (error) {
      console.error('Error fetching YouTube Music playlists:', error);
      res.status(500).json({ error: 'Failed to fetch playlists' });
    }
  });

  return router;
}

module.exports = createAuthRouter;
