export function trackKey(track) {
  return track?.videoId || `${track?.title || "track"}-${track?.artist || track?.subtitle || track?.author || ""}`;
}

function scoreImageUrl(url) {
  if (typeof url !== 'string') return 0;
  const lower = url.toLowerCase();
  let score = 0;

  if (lower.includes('maxresdefault')) score += 1200;
  else if (lower.includes('sddefault')) score += 1100;
  else if (lower.includes('hqdefault')) score += 1000;
  else if (lower.includes('mqdefault')) score += 900;
  else if (lower.includes('default')) score += 800;

  const sizeMatch = lower.match(/[?&]s=(\d+)/);
  if (sizeMatch) score += Number(sizeMatch[1]);
  const resMatch = lower.match(/\/(\d+)x(\d+)\//);
  if (resMatch) score += Math.max(Number(resMatch[1]), Number(resMatch[2]));
  return score;
}

function normalizeImageUrl(value, _visited = new Set()) {
  if (!value) return null;
  if (typeof value === 'string') return value;

  // Guard against circular references
  if (typeof value === 'object') {
    if (_visited.has(value)) return null;
    _visited.add(value);
  }

  const candidates = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = normalizeImageUrl(item, _visited);
      if (url) candidates.push(url);
    }
  } else if (typeof value === 'object') {
    const direct = value.url || value.src || value.thumbnail || value.default || value.high || value.hq;
    if (typeof direct === 'string') {
      candidates.push(direct);
    } else if (Array.isArray(direct)) {
      const nested = normalizeImageUrl(direct, _visited);
      if (nested) candidates.push(nested);
    }
    for (const nested of Object.values(value)) {
      if (nested && typeof nested === 'object') {
        const url = normalizeImageUrl(nested, _visited);
        if (url) candidates.push(url);
      }
    }
  }

  if (!candidates.length) return null;
  return candidates.sort((a, b) => scoreImageUrl(b) - scoreImageUrl(a))[0] || null;
}

export function normalizeTrack(item = {}) {
  const artist = item.artist
    || item.subtitle
    || item.author
    || (Array.isArray(item.artists) ? item.artists.map((entry) => entry.name).filter(Boolean).join(', ') : '');
  const rawThumb = normalizeImageUrl(item.thumbnails || item.thumbnail || item.cover || item.art || item.snippet?.thumbnails);
  const thumbnail = upgradeThumbUrl(rawThumb);

  return {
    ...item,
    title: item.title || item.name || item?.snippet?.title || '',
    artist,
    art: thumbnail,
    thumbnail,
    duration: item.duration || item?.video?.duration || item?.snippet?.duration || '',
    videoId:
      item.videoId ||
      (typeof item.id === 'string' ? item.id : null) ||
      item.id?.videoId ||
      item.video?.id ||
      null,
  };
}

export function formatNumber(num) {
  if (num === null || num === undefined) return "";
  const n = Number(num);
  if (isNaN(n)) return num;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

export function secondsFromDuration(duration) {
  if (typeof duration === "number") return duration;
  if (!duration || typeof duration !== "string") return 0;
  const parts = duration.split(":").map(Number);
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export function formatClock(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(safe / 60);
  const secs = String(safe % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const MOJIBAKE_REPLACEMENTS = [
  ["Ä…", "ą"],
  ["Ä‡", "ć"],
  ["Ä™", "ę"],
  ["Ĺ‚", "ł"],
  ["Ĺ„", "ń"],
  ["Ăł", "ó"],
  ["Ĺ›", "ś"],
  ["Ĺş", "ź"],
  ["ĹĽ", "ż"],
  ["Ä„", "Ą"],
  ["Ä†", "Ć"],
  ["Ä", "Ę"],
  ["Ĺ", "Ł"],
  ["Ĺ", "Ń"],
  ["Ă“", "Ó"],
  ["Ĺš", "Ś"],
  ["Ĺą", "Ź"],
  ["Ĺ»", "Ż"],
  ["â€”", "-"],
  ["â€“", "-"],
  ["â€¢", "•"],
  ["â€˘", "•"],
  ["âť¤", "♥"],
  ["ď¸Ź", ""],
  ["âš ", "!"],
];

export function cleanText(value) {
  if (typeof value !== "string") return value;
  return MOJIBAKE_REPLACEMENTS.reduce((text, [bad, good]) => text.replaceAll(bad, good), value);
}

export function cleanData(value) {
  if (Array.isArray(value)) return value.map(cleanData);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cleanData(entry)]));
  }
  return cleanText(value);
}

// Upgrade thumbnail URL to the highest available resolution.
// Shared utility used by FullPlayer, offlineStore, and normalizeTrack.
export function upgradeThumbUrl(url) {
  if (!url || typeof url !== 'string') return url;
  // lh3/yt3 googleusercontent — YTMusic album art, artist photos
  if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
    return url
      .replace(/=w\d+-h\d+(-[a-z0-9-]+)*/i, '=w1200-h1200-l90-rj')
      .replace(/=s\d+(-[a-z0-9-]+)*/i, '=s1200')
      .replace(/=w\d+$/i, '=w1200');
  }
  // ytimg.com — standard YouTube video thumbnails
  if (url.includes('ytimg.com')) {
    return url.replace(
      /\/(default|mqdefault|hqdefault|sddefault|0|1|2|3)\.jpg/i,
      '/maxresdefault.jpg',
    );
  }
  return url;
}
