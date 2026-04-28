const fs = require('fs');
const path = require('path');

const LOCAL_PLAYLISTS_FILE = path.join(__dirname, '..', '..', 'localPlaylists.json');

function loadLocalPlaylists() {
  if (!fs.existsSync(LOCAL_PLAYLISTS_FILE)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(LOCAL_PLAYLISTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveLocalPlaylists(playlists) {
  try {
    fs.writeFileSync(LOCAL_PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));
    return true;
  } catch (err) {
    console.error('[ERROR] Failed to save local playlists:', err.message);
    return false;
  }
}

function wrap(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req, res);
      if (result !== undefined) res.json(result);
    } catch (err) {
      console.error("[ERROR]", req.path, err.message);
      res.status(500).json({ error: err.message });
    }
  };
}

function pickThumbnailUrl(item) {
  return (
    item?.thumbnail ||
    item?.cover ||
    item?.art ||
    (Array.isArray(item?.thumbnails) ? item.thumbnails[item.thumbnails.length - 1]?.url : null) ||
    null
  );
}

function toMediaItem(item) {
  if (!item) return null;
  return {
    title: item.title,
    subtitle: item.subtitle || item.author || item.artist || (Array.isArray(item.artists) ? item.artists.map((a) => a.name).join(", ") : "") || "",
    meta: item.meta || item.resultType || "",
    cover: pickThumbnailUrl(item),
    videoId: item.videoId || null,
    browseId: item.browseId || item.playlistId || null,
    resultType: item.resultType || null,
  };
}

function toQueueItem(track) {
  if (!track) return null;
  const artist =
    track.artist ||
    (Array.isArray(track.artists) ? track.artists.map((a) => a.name).join(", ") : "") ||
    "";
  const textBlob = `${track.title || ""} ${artist || ""}`.toLowerCase();
  let energy = 58;
  ["remix", "dance", "edm", "bass", "phonk", "trap"].forEach((word) => {
    if (textBlob.includes(word)) energy += 9;
  });
  ["acoustic", "sad", "chill", "ambient", "sleep", "piano"].forEach((word) => {
    if (textBlob.includes(word)) energy -= 10;
  });
  energy = Math.max(12, Math.min(95, energy));
  return {
    title: track.title,
    artist,
    detail: track.album?.name || track.subtitle || "",
    duration: track.duration || null,
    energy,
    videoId: track.videoId || null,
    thumbnail: pickThumbnailUrl(track),
  };
}

function hasYtMusicHeaders() {
  const headerFile = path.join(__dirname, "..", "..", "headers.json");
  if (!fs.existsSync(headerFile)) return false;
  try {
    const raw = fs.readFileSync(headerFile, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && Object.keys(parsed).length > 0;
  } catch {
    return false;
  }
}

module.exports = {
  wrap,
  pickThumbnailUrl,
  toMediaItem,
  toQueueItem,
  hasYtMusicHeaders,
  loadLocalPlaylists,
  saveLocalPlaylists,
};
