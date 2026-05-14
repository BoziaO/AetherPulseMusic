// AetherPulse — Stream Extractor dla YouTube (backend)
// Ekstrakcja URL strumieni audio z YouTube Music używając youtubei.js

const Innertube = require('youtubei.js');

let innertube = null;
const streamCache = new Map(); // Prosta cache dla URL'ów

async function getInnertube() {
  if (!innertube) {
    try {
      innertube = await Innertube.create({
        cache: true,
        generate_session_locally: true,
      });
    } catch (err) {
      console.error('[streamExtractor] Innertube init failed:', err.message);
      innertube = null;
      throw new Error('YouTube session initialization failed');
    }
  }
  return innertube;
}

/**
 * Pobiera informacje o video i ekstrakcja URL audio stream'u
 * @param {string} videoId - YouTube video ID
 * @param {object} options - { format: 'auto'|'opus'|'m4a'|'mp3' }
 * @returns {object} - { url, mimeType, bitrate, format, durationSeconds, title, author, thumbnail, contentLength, expiresAt }
 */
async function getStreamUrl(videoId, options = {}) {
  if (!videoId || typeof videoId !== 'string') {
    return { error: 'Invalid videoId' };
  }

  const { format = 'auto' } = options;

  // Sprawdź cache (URL'y z YouTube wygasają, cache TTL = 4h)
  const cacheKey = `${videoId}:${format}`;
  const cached = streamCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  try {
    const yt = await getInnertube();

    // Pobierz informacje o wideo
    const info = await yt.getInfo(videoId);
    if (!info) {
      return { error: 'Video not found or restricted' };
    }

    // Pobierz dostępne formaty audio
    const formats = info.streaming_data?.adaptive_formats || [];
    const audioFormats = formats.filter(f => 
      f.mime_type && f.mime_type.includes('audio')
    );

    if (audioFormats.length === 0) {
      return { error: 'No audio formats available for this video' };
    }

    // Wybierz format bazując na preferencji
    let selected = null;
    switch (format?.toLowerCase()) {
      case 'opus':
        selected = audioFormats.find(f => f.mime_type.includes('webm') && f.mime_type.includes('opus'));
        break;
      case 'm4a':
      case 'aac':
        selected = audioFormats.find(f => f.mime_type.includes('mp4'));
        break;
      case 'mp3':
        selected = audioFormats.find(f => f.mime_type.includes('mpeg'));
        break;
      default:
        // Preferuj wyższą bitrate dla 'auto'
        selected = audioFormats.sort((a, b) => {
          const bitrateA = parseInt(a.bitrate || 0);
          const bitrateB = parseInt(b.bitrate || 0);
          return bitrateB - bitrateA;
        })[0];
    }

    if (!selected?.url) {
      return { error: `No suitable audio format found (requested: ${format})` };
    }

    // Parse MIME type
    const mimeType = selected.mime_type || 'audio/mpeg';
    const audioFormat = mimeType.split('/')[1]?.split(';')[0] || 'unknown';

    // Przygotuj response
    const result = {
      url: selected.url,
      mimeType,
      bitrate: parseInt(selected.bitrate || 0) || null,
      format: audioFormat,
      contentLength: parseInt(selected.content_length || 0) || null,
      durationSeconds: info.basic_info?.duration || null,
      durationMs: (info.basic_info?.duration || 0) * 1000,
      title: info.basic_info?.title || null,
      author: info.basic_info?.author || null,
      thumbnail: info.basic_info?.thumbnail?.[0]?.url || null,
      audioQuality: selected.quality_label || null,
      itag: selected.itag || null,
      expiresAt: Date.now() + (4 * 60 * 60 * 1000), // 4 godziny
      client: 'innertube',
    };

    // Cache na 4 godziny
    streamCache.set(cacheKey, result);

    return result;
  } catch (err) {
    console.error(`[streamExtractor] Error for videoId=${videoId}:`, err.message);
    return {
      error: err.message || 'Failed to extract stream',
    };
  }
}

/**
 * Wyczyść cache dla konkretnego video (gdy URL wygaśnie wcześniej)
 */
function clearCache(videoId) {
  const keysToDelete = Array.from(streamCache.keys()).filter(k => 
    k.startsWith(videoId + ':')
  );
  keysToDelete.forEach(k => streamCache.delete(k));
  console.debug(`[streamExtractor] Cleared ${keysToDelete.length} cache entries for ${videoId}`);
}

/**
 * Wyczyść całą cache
 */
function clearAllCache() {
  const size = streamCache.size;
  streamCache.clear();
  console.debug(`[streamExtractor] Cleared all ${size} cache entries`);
}

module.exports = {
  getStreamUrl,
  getInnertube,
  clearCache,
  clearAllCache,
};
