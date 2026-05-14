// AetherPulse — downloads + stream proxy.
//
// Wykorzystuje wbudowany ekstraktor (streamExtractor.js) bazujący na
// youtubei.js, by samodzielnie wydobywać URL strumieni audio z YouTube.
// Dzięki temu nie wymaga zewnętrznej zależności (yt-dlp/ytdl-core w PATH)
// ani dodatkowego mikroserwisu YT_DOWNLOAD_PROVIDER_URL.
//
// Endpointy:
// - GET /api/downloads/info/:videoId          — metadane + URL strumienia
// - GET /api/downloads/stream/:videoId        — proxy z obsługą Range
// - GET /api/downloads/playback/:videoId      — alias /stream do playbacku HTML5
//
// Zewnętrzny dostawca pozostaje opcjonalnym fallbackiem (gdy YT zaktualizuje
// swój player i ekstraktor zawiedzie). Konfiguruj via YT_DOWNLOAD_PROVIDER_URL.

const express = require('express');
const { wrap } = require('../utils/helpers');
const streamExtractor = require('../streamExtractor');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{6,32}$/;
const PROXY_HEADERS_TO_PROPAGATE = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'last-modified',
  'etag',
];

const UPSTREAM_DEFAULT_HEADERS = {
  Accept: 'audio/*, application/octet-stream, */*;q=0.9',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Referer: 'https://www.youtube.com/',
};

function buildUpstreamHeaders(req, range) {
  const headers = { ...UPSTREAM_DEFAULT_HEADERS };
  if (req.headers['user-agent']) headers['User-Agent'] = req.headers['user-agent'];
  if (req.headers.referer) headers.Referer = req.headers.referer;
  if (req.headers.origin) headers.Origin = req.headers.origin;
  if (range) headers.Range = range;
  return headers;
}

function guessMimeType(format) {
  switch ((format || '').toLowerCase()) {
    case 'opus':
      return 'audio/webm';
    case 'm4a':
    case 'aac':
    case 'mp4':
      return 'audio/mp4';
    case 'mp3':
      return 'audio/mpeg';
    default:
      return 'audio/mpeg';
  }
}

async function resolveExternalProvider(videoId, format) {
  const provider = process.env.YT_DOWNLOAD_PROVIDER_URL;
  if (!provider) return null;
  try {
    const url = `${provider.replace(/\/$/, '')}/resolve?videoId=${encodeURIComponent(videoId)}&format=${encodeURIComponent(format)}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return { error: `Provider responded ${response.status}` };
    }
    const data = await response.json();
    if (!data?.url) return { error: 'Provider returned no URL' };
    return { url: data.url, mimeType: data.mimeType || null, source: 'external' };
  } catch (err) {
    return { error: err.message };
  }
}

function createDownloadsRouter() {
  const router = express.Router();

  async function fetchStreamInfo(videoId, format) {
    let result = await streamExtractor.getStreamUrl(videoId, { format });
    if (result.error && process.env.YT_DOWNLOAD_PROVIDER_URL) {
      const external = await resolveExternalProvider(videoId, format);
      if (external && !external.error) {
        result = {
          ...result,
          error: undefined,
          url: external.url,
          mimeType: external.mimeType || guessMimeType(format),
          client: 'external-provider',
        };
      } else if (external?.error) {
        result.providerError = external.error;
      }
    }
    return result;
  }

  // ---------------- /info/:videoId -----------------
  router.get('/info/:videoId', wrap(async (req) => {
    const { videoId } = req.params;
    if (!VIDEO_ID_RE.test(videoId || '')) return { error: 'Invalid videoId' };
    const format = String(req.query.format || 'auto').toLowerCase();

    const result = await fetchStreamInfo(videoId, format);

    return {
      videoId,
      title: result.title || null,
      artist: result.author || null,
      thumbnail: result.thumbnail || null,
      durationSeconds: result.durationSeconds || null,
      durationMs: result.durationMs || null,
      streamUrl: result.url || null,
      mimeType: result.mimeType || guessMimeType(format),
      bitrate: result.bitrate || null,
      contentLength: result.contentLength || null,
      audioQuality: result.audioQuality || null,
      itag: result.itag || null,
      client: result.client || null,
      expiresAt: result.expiresAt || null,
      ...(result.error ? { error: result.error } : {}),
      ...(result.providerError ? { providerError: result.providerError } : {}),
    };
  }));

  async function proxyStream(req, res, upstreamUrl, format) {
    let parsed;
    try {
      parsed = new URL(upstreamUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid upstream URL' });
    }
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Unsupported protocol' });
    }

    try {
      const upstreamHeaders = buildUpstreamHeaders(req, req.headers.range);
      let upstream = await fetch(upstreamUrl, {
        headers: upstreamHeaders,
        redirect: 'follow',
      });

      if (!upstream.ok && upstream.status !== 206) {
        if ([401, 403, 410].includes(upstream.status) && req.params.videoId) {
          streamExtractor.clearCache(req.params.videoId);
          const refreshed = await fetchStreamInfo(req.params.videoId, format);
          if (refreshed?.url && refreshed.url !== upstreamUrl) {
            upstreamUrl = refreshed.url;
            upstream = await fetch(upstreamUrl, {
              headers: buildUpstreamHeaders(req, req.headers.range),
              redirect: 'follow',
            });
          }
        }
      }

      if (!upstream.ok && upstream.status !== 206) {
        return res.status(upstream.status).json({ error: `Upstream responded ${upstream.status}` });
      }

      PROXY_HEADERS_TO_PROPAGATE.forEach((header) => {
        const value = upstream.headers.get(header);
        if (value) res.setHeader(header, value);
      });
      if (!res.getHeader('Content-Type')) {
        const contentType = upstream.headers.get('content-type');
        if (contentType) res.setHeader('Content-Type', contentType);
      }
      if (!upstream.headers.get('content-length')) {
        res.setHeader('Transfer-Encoding', 'chunked');
      }
      if (!res.getHeader('Access-Control-Allow-Origin')) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      }
      res.status(upstream.status === 206 ? 206 : 200);

      if (upstream.body) {
        const { Readable } = require('stream');
        const upstreamStream = Readable.fromWeb(upstream.body);

        req.on('close', () => {
          upstreamStream.destroy();
        });

        try {
          await pipelineAsync(upstreamStream, res);
        } catch (err) {
          console.error('[downloads.proxyStream] pipeline error:', err.message);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Stream pipeline failed' });
          } else {
            res.destroy(err);
          }
        }
      } else {
        const buffer = Buffer.from(await upstream.arrayBuffer());
        res.end(buffer);
      }
    } catch (err) {
      console.error('[downloads.proxyStream] error:', err.message);
      if (req.params.videoId) streamExtractor.clearCache(req.params.videoId);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      } else {
        res.end();
      }
    }
  }

  // ---------------- /stream/:videoId -----------------
  // Streaming proxy chunkami. Akceptuje query `?u=` (gdy klient już zna URL,
  // np. po wcześniejszym /info), w przeciwnym razie sam zaweryfikuje URL przez
  // ekstraktor (mniejszy koszt dla pojedynczego playbacku).
  router.get('/stream/:videoId', async (req, res) => {
    const { videoId } = req.params;
    if (!VIDEO_ID_RE.test(videoId || '')) {
      return res.status(400).json({ error: 'Invalid videoId' });
    }

    let upstreamUrl = req.query.u && typeof req.query.u === 'string' ? req.query.u : null;
    let info = null;
    const format = String(req.query.format || 'auto').toLowerCase();

    if (!upstreamUrl) {
      info = await fetchStreamInfo(videoId, format);
      if (info?.url) upstreamUrl = info.url;
    }

    if (!upstreamUrl) {
      const reason = info?.error || 'No upstream URL available';
      return res.status(502).json({ error: reason });
    }

    let parsed;
    try {
      parsed = new URL(upstreamUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid upstream URL' });
    }
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Unsupported protocol' });
    }

    try {
      const upstreamHeaders = buildUpstreamHeaders(req, req.headers.range);

      let upstream = await fetch(upstreamUrl, {
        headers: upstreamHeaders,
        redirect: 'follow',
      });

      if (!upstream.ok && upstream.status !== 206) {
        if ([401, 403, 410].includes(upstream.status)) {
          streamExtractor.clearCache(videoId);
          const newInfo = await fetchStreamInfo(videoId, format);
          if (newInfo?.url && newInfo.url !== upstreamUrl) {
            upstreamUrl = newInfo.url;
            upstream = await fetch(upstreamUrl, {
              headers: buildUpstreamHeaders(req, req.headers.range),
              redirect: 'follow',
            });
          }
        }
      }

      if (!upstream.ok && upstream.status !== 206) {
        return res.status(upstream.status).json({
          error: `Upstream responded ${upstream.status}`,
        });
      }

      // Propaguj nagłówki sterujące długością/zakresami
      PROXY_HEADERS_TO_PROPAGATE.forEach((header) => {
        const value = upstream.headers.get(header);
        if (value) res.setHeader(header, value);
      });
      if (!res.getHeader('Content-Type')) {
        const contentType = upstream.headers.get('content-type');
        if (contentType) res.setHeader('Content-Type', contentType);
      }
      if (!upstream.headers.get('content-length')) {
        res.setHeader('Transfer-Encoding', 'chunked');
      }
      if (!res.getHeader('Access-Control-Allow-Origin')) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      }
      res.status(upstream.status === 206 ? 206 : 200);

      if (upstream.body) {
        const { Readable } = require('stream');
        const upstreamStream = Readable.fromWeb(upstream.body);

        req.on('close', () => {
          upstreamStream.destroy();
        });

        try {
          await pipelineAsync(upstreamStream, res);
        } catch (err) {
          console.error('[downloads.stream] pipeline error:', err.message);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Stream pipeline failed' });
          } else {
            res.destroy(err);
          }
        }
      } else {
        const buffer = Buffer.from(await upstream.arrayBuffer());
        res.end(buffer);
      }
    } catch (err) {
      console.error('[downloads.stream] error:', err.message);
      streamExtractor.clearCache(videoId);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      } else {
        res.end();
      }
    }
  });

  // Alias: /playback/:videoId — semantyczny endpoint dla HTML5 audio.
  router.get('/playback/:videoId', async (req, res) => {
    const { videoId } = req.params;
    if (!VIDEO_ID_RE.test(videoId || '')) {
      return res.status(400).json({ error: 'Invalid videoId' });
    }
    const format = String(req.query.format || 'auto').toLowerCase();
    const info = await fetchStreamInfo(videoId, format);
    if (!info?.url) {
      const reason = info?.error || 'No stream URL available';
      return res.status(502).json({ error: reason });
    }
    return proxyStream(req, res, info.url, format);
  });

  return router;
}

module.exports = createDownloadsRouter;
