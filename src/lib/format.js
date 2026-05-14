export function trackKey(track) {
  return track?.videoId || `${track?.title || "track"}-${track?.artist || track?.subtitle || track?.author || ""}`;
}

function normalizeImageUrl(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = normalizeImageUrl(item);
      if (url) return url;
    }
    return null;
  }
  if (typeof value === 'object') {
    return (
      value.url || value.src || value.thumbnail || value.default || value.high || value.hq ||
      Object.values(value).map(normalizeImageUrl).find(Boolean) || null
    );
  }
  return null;
}

export function normalizeTrack(item = {}) {
  const artist = item.artist
    || item.subtitle
    || item.author
    || (Array.isArray(item.artists) ? item.artists.map((entry) => entry.name).filter(Boolean).join(', ') : '');
  const thumbnail = normalizeImageUrl(item.thumbnail || item.cover || item.art || item.thumbnails || item.snippet?.thumbnails);

  return {
    ...item,
    title: item.title || item.name || item?.snippet?.title || 'Nieznany utwor',
    artist,
    art: normalizeImageUrl(item.art || item.thumbnail || item.cover || item.thumbnails || item.snippet?.thumbnails),
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

export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}
