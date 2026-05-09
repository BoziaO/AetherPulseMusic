const express = require('express');
const {
  wrap,
  loadLocalPlaylists,
  getLocalPlaylist,
  createLocalPlaylist,
  deleteLocalPlaylist,
  mutateLocalPlaylistTracks,
} = require('../utils/helpers');
const { z, validateBody, validateParams, schemas } = require('../utils/schemas');

const IdParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
});

function createLocalPlaylistsRouter(yt) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(loadLocalPlaylists());
  });

  router.post('/', validateBody(schemas.CreateLocalPlaylistBodySchema), (req, res) => {
    const { title, description } = req.body;
    const newPlaylist = createLocalPlaylist({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      description,
      tracks: [],
      createdAt: new Date().toISOString(),
    });
    res.json(newPlaylist);
  });

  router.post(
    '/import-yt/:playlistId',
    validateParams(schemas.ImportYtPlaylistParamsSchema),
    wrap(async (req) => {
      const { playlistId } = req.params;
      const cleanId = playlistId.replace(/^VL/, '');

      const ytPlaylist = await yt.getPlaylist(cleanId, 500);
      if (!ytPlaylist) {
        return { error: 'Nie znaleziono playlisty YouTube Music.' };
      }

      const tracks = (ytPlaylist.tracks || [])
        .filter(Boolean)
        .map((t) => ({
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
        }))
        .filter((t) => t.videoId);

      const title = ytPlaylist.title || 'Importowana playlista';
      const description = ytPlaylist.author
        ? `Importowane z YouTube Music — ${ytPlaylist.author}`
        : 'Importowane z YouTube Music';

      const newPlaylist = createLocalPlaylist({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        description,
        tracks,
        importedFrom: playlistId,
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        localId: newPlaylist.id,
        title: newPlaylist.title,
        trackCount: newPlaylist.tracks.length,
      };
    }),
  );

  router.get('/:id', validateParams(IdParamsSchema), (req, res) => {
    const playlist = getLocalPlaylist(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  });

  router.post(
    '/:id/tracks',
    validateParams(IdParamsSchema),
    validateBody(schemas.AddPlaylistTrackBodySchema),
    (req, res) => {
      const { videoId, title, artist, thumbnail, duration } = req.body;
      const track = { videoId, title, artist: artist || '', thumbnail: thumbnail || null, duration: duration || '' };
      const updated = mutateLocalPlaylistTracks(req.params.id, (tracks) => {
        tracks.push(track);
        return tracks;
      });
      if (!updated) return res.status(404).json({ error: 'Playlist not found' });
      res.json({ success: true });
    },
  );

  router.delete(
    '/:id/tracks',
    validateParams(IdParamsSchema),
    validateBody(schemas.RemovePlaylistTrackBodySchema),
    (req, res) => {
      const { videoId } = req.body;
      const updated = mutateLocalPlaylistTracks(req.params.id, (tracks) =>
        tracks.filter((t) => t.videoId !== videoId),
      );
      if (!updated) return res.status(404).json({ error: 'Playlist not found' });
      res.json({ success: true });
    },
  );

  router.delete('/:id', validateParams(IdParamsSchema), (req, res) => {
    const ok = deleteLocalPlaylist(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Playlist not found' });
    res.json({ success: true });
  });

  return router;
}

module.exports = createLocalPlaylistsRouter;
