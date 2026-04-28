const express = require('express');
const { wrap } = require('../utils/helpers');

function createYtmusicRouter(yt) {
  const router = express.Router();
  router.get('/search', wrap(async (req) => {
    const { q, filter, limit = 20 } = req.query;
    if (!q) return { error: "q is required" };
    return yt.search(q, filter || null, parseInt(limit, 10));
  }));

  router.get('/suggestions', wrap(async (req) => {
    const { q } = req.query;
    if (!q) return { error: "q is required" };
    const suggestions = await yt.getSearchSuggestions(q);
    return { suggestions };
  }));

  router.get('/home', wrap(async (req) => {
    const { limit = 3 } = req.query;
    return yt.getHome(parseInt(limit, 10));
  }));

  router.get('/artist/:channelId', wrap(async (req) => {
    return yt.getArtist(req.params.channelId);
  }));

  router.get('/album/:browseId', wrap(async (req) => {
    return yt.getAlbum(req.params.browseId);
  }));

  router.get('/song/:videoId', wrap(async (req) => {
    const song = await yt.getSong(req.params.videoId);
    if (!song) return { error: "Song not found" };
    return song;
  }));

  router.get('/lyrics/:videoId', wrap(async (req) => {
    const lyrics = await yt.getLyrics(req.params.videoId);
    if (!lyrics) return { error: "Lyrics not found" };
    return lyrics;
  }));

  router.get('/watch', wrap(async (req) => {
    const { videoId, playlistId, limit = 25, radio = "false", shuffle = "false" } = req.query;
    if (!videoId) return { error: "videoId is required" };
    return yt.getWatchPlaylist(videoId, playlistId || null, parseInt(limit, 10), radio === "true", shuffle === "true");
  }));

  router.get('/moods', wrap(async () => yt.getMoodCategories()));

  router.get('/moods/playlists', wrap(async (req) => {
    const { params } = req.query;
    if (!params) return { error: "params is required" };
    return yt.getMoodPlaylists(params);
  }));

  router.get('/charts', wrap(async (req) => {
    const { country = "ZZ" } = req.query;
    return yt.getCharts(country);
  }));

  router.get('/library/playlists', wrap(async (req) => {
    const { limit = 25 } = req.query;
    const authHeaders = req.session.tokens ? { Authorization: `Bearer ${req.session.tokens.access_token}` } : {};
    return yt.getLibraryPlaylists(parseInt(limit, 10), authHeaders);
  }));

  router.get('/library/songs', wrap(async (req) => {
    const { limit = 25 } = req.query;
    const authHeaders = req.session.tokens ? { Authorization: `Bearer ${req.session.tokens.access_token}` } : {};
    return yt.getLibrarySongs(parseInt(limit, 10), authHeaders);
  }));

  router.get('/library/albums', wrap(async (req) => {
    const { limit = 25 } = req.query;
    const authHeaders = req.session.tokens ? { Authorization: `Bearer ${req.session.tokens.access_token}` } : {};
    return yt.getLibraryAlbums(parseInt(limit, 10), authHeaders);
  }));

  router.get('/library/artists', wrap(async (req) => {
    const { limit = 25 } = req.query;
    const authHeaders = req.session.tokens ? { Authorization: `Bearer ${req.session.tokens.access_token}` } : {};
    return yt.getLibraryArtists(parseInt(limit, 10), authHeaders);
  }));

  router.get('/playlist/:playlistId', wrap(async (req) => {
    const { limit = 500 } = req.query;
    return yt.getPlaylist(req.params.playlistId, parseInt(limit, 10));
  }));

  router.post('/playlist/:playlistId/tracks', wrap(async (req) => {
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

  router.delete('/playlist/:playlistId/tracks', wrap(async (req) => {
    const { videos } = req.body;
    if (!videos) return { error: "videos is required" };
    const ok = await yt.removePlaylistItems(req.params.playlistId, videos);
    return { success: ok };
  }));

  router.post('/playlists', wrap(async (req) => {
    const { title, description = "", privacyStatus = "PRIVATE", videoIds = [] } = req.body || {};
    if (!title) return { error: "title is required" };
    const playlistId = await yt.createPlaylist(title, description, privacyStatus, videoIds);
    if (!playlistId) return { error: "Failed to create playlist" };
    return { playlistId };
  }));

  router.delete('/playlist/:playlistId', wrap(async (req) => {
    const ok = await yt.deletePlaylist(req.params.playlistId);
    return { success: ok };
  }));

  router.patch('/playlist/:playlistId', wrap(async (req) => {
    const { title, description, privacyStatus } = req.body || {};
    const ok = await yt.editPlaylist(req.params.playlistId, { title, description, privacyStatus });
    return { success: ok };
  }));

  return router;
}

module.exports = createYtmusicRouter;
