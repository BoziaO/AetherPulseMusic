const express = require('express');
const { wrap } = require('../utils/helpers');
const { validateQuery, validateParams, validateBody, schemas } = require('../utils/schemas');

async function getDislikes(videoId) {
  try {
    const response = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.dislikes || 0;
  } catch (error) {
    console.error('Error fetching dislikes:', error);
    return null;
  }
}

async function getSponsorSegments(videoId) {
  try {
    const response = await fetch(`https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.filter(segment => ['sponsor', 'intro', 'selfpromo'].includes(segment.category));
  } catch (error) {
    console.error('Error fetching sponsor segments:', error);
    return [];
  }
}

function createYtmusicRouter(yt) {
  const router = express.Router();

  router.get(
    '/search',
    validateQuery(schemas.SearchQuerySchema),
    wrap(async (req) => {
      const { q, filter, limit } = req.query;
      return yt.search(q, filter || null, limit);
    }),
  );

  router.get(
    '/suggestions',
    validateQuery(schemas.SuggestionsQuerySchema),
    wrap(async (req) => {
      const suggestions = await yt.getSearchSuggestions(req.query.q);
      return { suggestions };
    }),
  );

  router.get(
    '/home',
    validateQuery(schemas.HomeQuerySchema),
    wrap(async (req) => yt.getHome(req.query.limit)),
  );

  router.get(
    '/artist/:channelId',
    validateParams(schemas.ChannelParamsSchema),
    wrap(async (req) => yt.getArtist(req.params.channelId)),
  );

  router.get(
    '/album/:browseId',
    validateParams(schemas.AlbumParamsSchema),
    wrap(async (req) => yt.getAlbum(req.params.browseId)),
  );

  router.get(
    '/song/:videoId',
    validateParams(schemas.VideoParamsSchema),
    wrap(async (req) => {
      const song = await yt.getSong(req.params.videoId);
      if (!song) return { error: 'Song not found' };
      const dislikes = await getDislikes(req.params.videoId);
      const sponsorSegments = await getSponsorSegments(req.params.videoId);
      return { ...song, dislikes, sponsorSegments };
    }),
  );

  router.get(
    '/lyrics/:videoId',
    validateParams(schemas.VideoParamsSchema),
    wrap(async (req) => {
      const lyrics = await yt.getLyrics(req.params.videoId);
      if (!lyrics) return { error: 'Lyrics not found' };
      return lyrics;
    }),
  );

  router.get(
    '/watch',
    validateQuery(schemas.WatchQuerySchema),
    wrap(async (req) => {
      const { videoId, playlistId, limit, radio, shuffle } = req.query;
      return yt.getWatchPlaylist(videoId, playlistId || null, limit, radio === 'true', shuffle === 'true');
    }),
  );

  router.get('/moods', wrap(async () => yt.getMoodCategories()));

  router.get(
    '/moods/playlists',
    validateQuery(schemas.MoodPlaylistsQuerySchema),
    wrap(async (req) => yt.getMoodPlaylists(req.query.params)),
  );

  router.get(
    '/charts',
    validateQuery(schemas.ChartsQuerySchema),
    wrap(async (req) => yt.getCharts(req.query.country)),
  );

  router.get(
    '/library/playlists',
    validateQuery(schemas.LibraryQuerySchema),
    wrap(async (req) => {
      const authHeaders = req.session.tokens ? { Authorization: `Bearer ${req.session.tokens.access_token}` } : {};
      return yt.getLibraryPlaylists(req.query.limit, authHeaders);
    }),
  );

  router.get(
    '/library/songs',
    validateQuery(schemas.LibraryQuerySchema),
    wrap(async (req) => {
      const authHeaders = req.session.tokens ? { Authorization: `Bearer ${req.session.tokens.access_token}` } : {};
      return yt.getLibrarySongs(req.query.limit, authHeaders);
    }),
  );

  router.get(
    '/library/albums',
    validateQuery(schemas.LibraryQuerySchema),
    wrap(async (req) => {
      const authHeaders = req.session.tokens ? { Authorization: `Bearer ${req.session.tokens.access_token}` } : {};
      return yt.getLibraryAlbums(req.query.limit, authHeaders);
    }),
  );

  router.get(
    '/library/artists',
    validateQuery(schemas.LibraryQuerySchema),
    wrap(async (req) => {
      const authHeaders = req.session.tokens ? { Authorization: `Bearer ${req.session.tokens.access_token}` } : {};
      return yt.getLibraryArtists(req.query.limit, authHeaders);
    }),
  );

  router.get(
    '/playlist/:playlistId',
    validateParams(schemas.PlaylistParamsSchema),
    validateQuery(schemas.PlaylistQuerySchema),
    wrap(async (req) => yt.getPlaylist(req.params.playlistId, req.query.limit)),
  );

  router.post(
    '/playlist/:playlistId/tracks',
    validateParams(schemas.PlaylistParamsSchema),
    validateBody(schemas.AddYtPlaylistTracksBodySchema),
    wrap(async (req) => {
      const { videoIds, sourcePlaylistId, duplicates } = req.body;
      const ok = await yt.addPlaylistItems(
        req.params.playlistId,
        videoIds,
        sourcePlaylistId,
        duplicates,
      );
      return { success: ok };
    }),
  );

  router.delete(
    '/playlist/:playlistId/tracks',
    validateParams(schemas.PlaylistParamsSchema),
    validateBody(schemas.RemoveYtPlaylistTracksBodySchema),
    wrap(async (req) => {
      const ok = await yt.removePlaylistItems(req.params.playlistId, req.body.videos);
      return { success: ok };
    }),
  );

  router.post(
    '/playlists',
    validateBody(schemas.CreateYtPlaylistBodySchema),
    wrap(async (req) => {
      const { title, description, privacyStatus, videoIds } = req.body;
      const playlistId = await yt.createPlaylist(title, description, privacyStatus, videoIds);
      if (!playlistId) return { error: 'Failed to create playlist' };
      return { playlistId };
    }),
  );

  router.delete(
    '/playlist/:playlistId',
    validateParams(schemas.PlaylistParamsSchema),
    wrap(async (req) => {
      const ok = await yt.deletePlaylist(req.params.playlistId);
      return { success: ok };
    }),
  );

  router.patch(
    '/playlist/:playlistId',
    validateParams(schemas.PlaylistParamsSchema),
    validateBody(schemas.EditYtPlaylistBodySchema),
    wrap(async (req) => {
      const { title, description, privacyStatus } = req.body;
      const ok = await yt.editPlaylist(req.params.playlistId, { title, description, privacyStatus });
      return { success: ok };
    }),
  );

  return router;
}

module.exports = createYtmusicRouter;
