const express = require('express');
const { wrap } = require('../utils/helpers');

function createLyricsRouter(yt) {
  const router = express.Router();
  router.get('/', wrap(async (req) => {
    const { q, videoId, artist, title } = req.query;

    try {
      if (artist && title) {
        const lrcLyrics = await yt.getLrclibLyrics(title, artist);
        if (lrcLyrics) return lrcLyrics;
      }

      if (videoId) {
        const ytLyrics = await yt.getLyrics(videoId);
        if (ytLyrics) return ytLyrics;
      }

      if (q) {
        const searchResults = await yt.search(q, 'songs', 1);
        if (searchResults && searchResults.length > 0) {
          const track = searchResults[0];
          const trackArtist = track.artists ? track.artists[0].name : '';
          const lrcLyrics = await yt.getLrclibLyrics(track.title, trackArtist);
          if (lrcLyrics) return lrcLyrics;

          if (track.videoId) {
            const ytLyrics = await yt.getLyrics(track.videoId);
            if (ytLyrics) return ytLyrics;
          }
        }
      }

      return { lyrics: "Napisy dla tego utworu nie są dostępne." };
    } catch (error) {
      console.warn("Lyrics fetch error:", error.message);
      return { lyrics: "Błąd pobierania napisów. Spróbuj ponownie." };
    }
  }));

  return router;
}

module.exports = createLyricsRouter;
