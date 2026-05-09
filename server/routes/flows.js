const express = require('express');
const { wrap, loadLocalPlaylists, toQueueItem } = require('../utils/helpers');
const { validateBody, schemas } = require('../utils/schemas');

const DEFAULT_SESSION_MINUTES = 35;
const DEFAULT_NOVELTY = 55;
const MIN_SESSION_MINUTES = 10;
const MAX_SESSION_MINUTES = 120;
const MIN_NOVELTY = 0;
const MAX_NOVELTY = 100;
const MAX_CLIENT_POOL_SIZE = 120;
const DEFAULT_TRACK_SECONDS = 180;
const STAGE_WEIGHTS = [0.28, 0.46, 0.26];
const ENERGY_KEYWORDS = {
  high: ['remix', 'dance', 'edm', 'bass', 'phonk', 'trap', 'workout', 'party', 'club', 'speed', 'hard', 'drill'],
  low: ['acoustic', 'sad', 'chill', 'ambient', 'sleep', 'piano', 'lofi', 'calm', 'soft', 'slow', 'rain'],
};

const FLOW_PRESETS = {
  focus: { label: 'Focus Arc', stages: [35, 58, 42] },
  energy: { label: 'Energy Arc', stages: [45, 82, 60] },
  chill: { label: 'Chill Arc', stages: [28, 46, 26] },
  discover: { label: 'Discovery Arc', stages: [52, 72, 44] },
};

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function getTrackKey(track) {
  return track?.videoId || `${track?.title || 'track'}-${track?.artist || track?.subtitle || track?.author || ''}`;
}

function normalizeTrack(item) {
  if (!item || !item.videoId) return null;
  return {
    ...item,
    title: item.title || item.name || 'Unknown track',
    artist:
      item.artist ||
      item.subtitle ||
      item.author ||
      (Array.isArray(item.artists) ? item.artists.map((artist) => artist.name).filter(Boolean).join(', ') : '') ||
      '',
    thumbnail: item.thumbnail || item.cover || item.art || null,
    duration: item.duration || '3:00',
  };
}

function estimateEnergy(track) {
  const queueItemEnergy = Number(track?.energy);
  if (Number.isFinite(queueItemEnergy)) return Math.max(1, Math.min(100, queueItemEnergy));

  const textBlob = `${track?.title || ''} ${track?.artist || ''} ${track?.subtitle || ''}`.toLowerCase();
  let score = 52;
  ENERGY_KEYWORDS.high.forEach((word) => {
    if (textBlob.includes(word)) score += 9;
  });
  ENERGY_KEYWORDS.low.forEach((word) => {
    if (textBlob.includes(word)) score -= 10;
  });

  const durationText = String(track?.duration || '');
  const durationParts = durationText.split(':').map((part) => Number(part));
  if (durationParts.length === 2 && durationParts.every(Number.isFinite)) {
    const seconds = durationParts[0] * 60 + durationParts[1];
    if (seconds < 150) score += 4;
    if (seconds > 360) score -= 4;
  }

  return Math.max(12, Math.min(95, score));
}

function uniqTracks(...groups) {
  const uniq = new Map();
  groups.flat().forEach((item) => {
    const normalized = normalizeTrack(item);
    if (!normalized) return;
    const key = getTrackKey(normalized);
    if (!uniq.has(key)) uniq.set(key, normalized);
  });
  return Array.from(uniq.values());
}

function scoreTrack(track, targetEnergy, novelty, historyKeys, favoriteKeys) {
  const trackEnergy = estimateEnergy(track);
  const energyGap = Math.abs(targetEnergy - trackEnergy);
  const affinity = favoriteKeys.has(track.videoId) ? 14 : historyKeys.has(track.videoId) ? 7 : 0;
  const noveltyShift = novelty > 60 ? -affinity : affinity;
  const randomDrift = Math.random() * 6;
  return energyGap - noveltyShift + randomDrift;
}

function buildRevolutionQueue(candidates, options, historyKeys, favoriteKeys) {
  const preset = FLOW_PRESETS[options.preset] ? options.preset : 'discover';
  const base = FLOW_PRESETS[preset];
  const sessionMinutes = clampNumber(options.sessionMinutes, MIN_SESSION_MINUTES, MAX_SESSION_MINUTES, DEFAULT_SESSION_MINUTES);
  const novelty = clampNumber(options.novelty, MIN_NOVELTY, MAX_NOVELTY, DEFAULT_NOVELTY);
  const targetSeconds = sessionMinutes * 60;
  const stageTargets = STAGE_WEIGHTS.map((weight) => Math.max(1, Math.round((targetSeconds * weight) / DEFAULT_TRACK_SECONDS)));
  const result = [];
  const used = new Set();

  base.stages.forEach((targetEnergy, stageIndex) => {
    const desiredCount = stageTargets[stageIndex];
    for (let index = 0; index < desiredCount; index += 1) {
      const next = candidates
        .filter((track) => !used.has(track.videoId))
        .map((track) => ({ track, score: scoreTrack(track, targetEnergy, novelty, historyKeys, favoriteKeys) }))
        .sort((a, b) => a.score - b.score)[0]?.track;

      if (!next) break;
      used.add(next.videoId);
      result.push({ ...next, flowStage: stageIndex + 1, flowTargetEnergy: targetEnergy, energy: estimateEnergy(next) });
    }
  });

  return result.length ? result : candidates.slice(0, 12).map((track) => ({ ...track, energy: estimateEnergy(track) }));
}

async function getServerPool(yt, authHeaders) {
  const [charts, librarySongs] = await Promise.all([
    yt.getCharts('ZZ').catch(() => ({})),
    yt.getLibrarySongs(40, authHeaders).catch(() => []),
  ]);
  const localTracks = loadLocalPlaylists().flatMap((playlist) => playlist.tracks || []);
  return [charts?.songs || [], charts?.videos || [], librarySongs || [], localTracks || []].flat();
}

function createFlowsRouter(yt) {
  const router = express.Router();

  router.get('/revolution/presets', (req, res) => {
    res.json({ presets: FLOW_PRESETS });
  });

  router.post('/revolution', wrap(async (req) => {
    const body = req.body || {};
    const authHeaders = req.session.tokens ? { Authorization: `Bearer ${req.session.tokens.access_token}` } : {};
    const clientPool = Array.isArray(body.pool) ? body.pool.slice(0, MAX_CLIENT_POOL_SIZE) : [];
    const recentTracks = Array.isArray(body.recentTracks) ? body.recentTracks : [];
    const favoriteTracks = Array.isArray(body.favoriteTracks) ? body.favoriteTracks : [];
    const serverPool = await getServerPool(yt, authHeaders);
    const candidates = uniqTracks(clientPool, favoriteTracks, recentTracks, serverPool);

    if (!candidates.length) {
      return { queue: [], trackCount: 0, error: 'No playable tracks available for flow generation.' };
    }

    const options = {
      preset: body.preset || 'discover',
      sessionMinutes: body.sessionMinutes,
      novelty: body.novelty,
    };
    const historyKeys = new Set(recentTracks.map((track) => track?.videoId).filter(Boolean));
    const favoriteKeys = new Set(favoriteTracks.map((track) => track?.videoId).filter(Boolean));
    const queue = buildRevolutionQueue(candidates, options, historyKeys, favoriteKeys);
    const averageEnergy = queue.length
      ? Math.round(queue.reduce((sum, track) => sum + estimateEnergy(track), 0) / queue.length)
      : 0;

    return {
      preset: FLOW_PRESETS[options.preset] ? options.preset : 'discover',
      label: (FLOW_PRESETS[options.preset] || FLOW_PRESETS.discover).label,
      sessionMinutes: clampNumber(options.sessionMinutes, MIN_SESSION_MINUTES, MAX_SESSION_MINUTES, DEFAULT_SESSION_MINUTES),
      novelty: clampNumber(options.novelty, MIN_NOVELTY, MAX_NOVELTY, DEFAULT_NOVELTY),
      generatedAt: new Date().toISOString(),
      sourceCount: candidates.length,
      trackCount: queue.length,
      averageEnergy,
      queue: queue.map((track) => ({ ...toQueueItem(track), ...track })),
    };
  }));

  return router;
}

module.exports = createFlowsRouter;
