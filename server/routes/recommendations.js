const express = require('express');
const { wrap } = require('../utils/helpers');

const MAX_POOL = 80;

function getTrackKey(track) {
  return track?.videoId || `${track?.title || 'track'}-${track?.artist || track?.subtitle || ''}`;
}

function normalizeTrack(item) {
  if (!item) return null;
  const videoId =
    item.videoId ||
    item.id ||
    item.video_id ||
    item?.video?.id ||
    (item?.id?.videoId ? item.id.videoId : null) ||
    null;
  if (!videoId) return null;
  return {
    videoId,
    title:
      item.title || item.name || item?.video?.title || item?.snippet?.title || 'Unknown track',
    artist:
      item.artist ||
      item.subtitle ||
      item.author ||
      (Array.isArray(item.artists)
        ? item.artists.map((artist) => artist.name).filter(Boolean).join(', ')
        : '') ||
      item?.video?.author ||
      '',
    thumbnail:
      item.thumbnail || item.cover || item.art || item?.video?.thumbnail || item?.snippet?.thumbnails?.[0]?.url || null,
    duration: item.duration || item?.video?.duration || item?.snippet?.duration || '',
  };
}

function uniqTracks(...groups) {
  const seen = new Set();
  const out = [];
  groups.flat().forEach((item) => {
    const normalized = normalizeTrack(item);
    if (!normalized || !normalized.videoId) return;
    const key = getTrackKey(normalized);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  });
  return out;
}

async function safeCall(promise) {
  try {
    return await promise;
  } catch (err) {
    return null;
  }
}

function createRecommendationsRouter(yt) {
  const router = express.Router();

  // Pool dla "Dla Ciebie" — łączy chart, library i podobne utwory.
  router.get('/pool', wrap(async (req) => {
    const authHeaders = req.session?.tokens
      ? { Authorization: `Bearer ${req.session.tokens.access_token}` }
      : {};
    const seedVideoIds = String(req.query.seeds || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 5);

    const [charts, librarySongs, libraryAlbums, ...watchPools] = await Promise.all([
      safeCall(yt.getCharts('ZZ')),
      safeCall(yt.getLibrarySongs(40, authHeaders)),
      safeCall(yt.getLibraryAlbums(20, authHeaders)),
      ...seedVideoIds.map((id) =>
        safeCall(yt.getWatchPlaylist(id, null, 25, true, false)),
      ),
    ]);

    const watchTracks = watchPools
      .filter(Boolean)
      .flatMap((wp) => wp?.tracks || []);

    const albumTracks = (libraryAlbums || [])
      .filter(Boolean)
      .flatMap((album) => album?.tracks || []);

    let chartCandidates = uniqTracks(charts?.songs || [], charts?.videos || []);
    if (!chartCandidates.length) {
      const fallbackCharts = await safeCall(yt.search('Top songs', 'songs', 40));
      chartCandidates = uniqTracks(fallbackCharts || []);
    }

    const pool = uniqTracks(
      chartCandidates,
      librarySongs || [],
      albumTracks,
      watchTracks,
    ).slice(0, MAX_POOL);

    return {
      generatedAt: new Date().toISOString(),
      hasLibrary: Boolean(req.session?.tokens),
      pool,
      seedVideoIds,
    };
  }));

  // Smart Radio — uruchamia "watch playlist" w trybie radio dla podanego nasiona.
  router.get('/smart-radio/:videoId', wrap(async (req) => {
    const { videoId } = req.params;
    if (!/^[A-Za-z0-9_-]{6,32}$/.test(videoId || '')) {
      return { error: 'Invalid videoId', tracks: [] };
    }
    const data = await safeCall(yt.getWatchPlaylist(videoId, null, 50, true, false));
    if (!data) return { tracks: [], error: 'Smart radio unavailable' };
    return {
      generatedAt: new Date().toISOString(),
      seedVideoId: videoId,
      tracks: (data.tracks || []).map(normalizeTrack).filter(Boolean),
    };
  }));

  return router;
}

module.exports = createRecommendationsRouter;
