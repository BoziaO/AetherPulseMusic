const express = require('express');
const { wrap, loadLocalPlaylists, saveLocalPlaylists } = require('../utils/helpers');

function createLocalPlaylistsRouter(yt) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const playlists = loadLocalPlaylists();
    res.json(playlists);
  });

  router.post('/', (req, res) => {
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

  router.post('/import-yt/:playlistId', wrap(async (req) => {
    const { playlistId } = req.params;
    const cleanId = playlistId.replace(/^VL/, '');

    const ytPlaylist = await yt.getPlaylist(cleanId, 500);
    if (!ytPlaylist) {
      return { error: 'Nie znaleziono playlisty YouTube Music.' };
    }

    const tracks = (ytPlaylist.tracks || []).filter(Boolean);
    const title = ytPlaylist.title || 'Importowana playlista';
    const description = ytPlaylist.author
      ? `Importowane z YouTube Music — ${ytPlaylist.author}`
      : 'Importowane z YouTube Music';

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

  router.get('/:id', (req, res) => {
    const playlists = loadLocalPlaylists();
    const playlist = playlists.find((p) => p.id === req.params.id);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
    res.json(playlist);
  });

  router.post('/:id/tracks', (req, res) => {
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

  router.delete('/:id/tracks', (req, res) => {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ error: "videoId required" });
    const playlists = loadLocalPlaylists();
    const playlist = playlists.find((p) => p.id === req.params.id);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
    playlist.tracks = playlist.tracks.filter((t) => t.videoId !== videoId);
    saveLocalPlaylists(playlists);
    res.json({ success: true });
  });

  router.delete('/:id', (req, res) => {
    const playlists = loadLocalPlaylists();
    const index = playlists.findIndex((p) => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Playlist not found" });
    playlists.splice(index, 1);
    saveLocalPlaylists(playlists);
    res.json({ success: true });
  });

  return router;
}

module.exports = createLocalPlaylistsRouter;
