const express = require('express');
const { wrap, toMediaItem, toQueueItem, hasYtMusicHeaders, loadLocalPlaylists } = require('../utils/helpers');

function createPagesRouter(yt) {
  const router = express.Router();

  router.get('/:key', wrap(async (req) => {
    const { key } = req.params;
    const { recent = "", region = "ZZ" } = req.query;
    const safeRegion = /^[A-Z]{2}$/.test(region) ? region : "ZZ";
    const ytMusicHeaders = hasYtMusicHeaders();
    const authHeaders = req.session.tokens ? { Authorization: `Bearer ${req.session.tokens.access_token}` } : {};

    const base = {
      key,
      backendStatus: { imports: { ytMusicHeaders } },
    };

    if (key === "home") {
      const charts = await yt.getCharts(safeRegion);
      const trendingSongs = (charts?.songs || []).filter(Boolean);
      const librarySongs = await yt.getLibrarySongs(30, authHeaders).catch(() => []);
      const libraryArtists = await yt.getLibraryArtists(20, authHeaders).catch(() => []);

      let recommendations = [];
      let recommendationTracks = [];
      const recentIds = recent.split(",").filter(Boolean);
      if (recentIds.length > 0) {
        try {
          const lastId = recentIds[0];
          const watchPlaylist = await yt.getWatchPlaylist(lastId, null, 12);
          recommendationTracks = (watchPlaylist || []).slice(1);
          recommendations = recommendationTracks.map((track) =>
            toMediaItem({
              ...track,
              resultType: "song",
              meta: "Dla Ciebie",
            }),
          ).filter(Boolean);
        } catch (err) {
          console.warn("Could not fetch personalized recommendations:", err.message);
        }
      }

      if (recommendations.length === 0 && librarySongs.length > 0) {
        recommendationTracks = librarySongs.slice(0, 12).map((song) => ({
          ...song,
          artist: song.artist || song.author || "",
        }));
        recommendations = recommendationTracks.map((track) =>
          toMediaItem({
            ...track,
            resultType: "song",
            meta: "Z Twojej biblioteki",
          }),
        ).filter(Boolean);
      }

      if (recommendations.length === 0 && libraryArtists.length > 0) {
        try {
          const artistName = libraryArtists[0]?.title;
          if (artistName) {
            const searched = await yt.search(`${artistName} top songs`, "songs", 12);
            recommendationTracks = searched || [];
            recommendations = recommendationTracks.map((track) =>
              toMediaItem({
                ...track,
                resultType: "song",
                meta: `Bo słuchasz: ${artistName}`,
              }),
            ).filter(Boolean);
          }
        } catch (err) {
          console.warn("Could not fetch artist-based recommendations:", err.message);
        }
      }

      const homeRows = await yt.getHome(4);
      const primaryRow = homeRows?.[0];
      const hit = trendingSongs[0] || null;

      return {
        ...base,
        eyebrow: "Witaj w AetherPulse|Music",
        title: recommendations.length > 0 ? "Polecane dla Ciebie" : "Trending — utwory na czasie",
        description: recommendations.length > 0
          ? "Na podstawie ostatnich odtworzeń i Twojej biblioteki."
          : "Hit dnia i trendy z YouTube Music (Innertube).",
        chips: ["Dla Ciebie", "Trendy", "Playlisty", "Albumy"],
        spotlightTitle: "Hit dnia",
        spotlightText: hit ? `${hit.title}` : "Najczęściej odtwarzany utwór dzisiaj.",
        spotlightItems: trendingSongs.slice(0, 5).map((s, idx) => `${idx + 1}. ${s.title}`),
        stats: [
          { label: "Trending songs", value: String(trendingSongs.length || 0) },
          { label: "Trending artists", value: String((charts?.artists || []).length || 0) },
          { label: "Twoja biblioteka", value: String(librarySongs.length || 0) },
          { label: "Ostatnio grane", value: String(recentIds.length) },
        ],
        primarySection: {
          title: recommendations.length > 0 ? "Muzyka dla Ciebie" : "Trending (utwory)",
          action: "Odśwież",
          items: recommendations.length > 0
            ? recommendations
            : trendingSongs.slice(0, 18).map((s) => toMediaItem({ ...s, resultType: "song", meta: "Trending" })).filter(Boolean),
        },
        secondarySection: {
          title: recommendations.length > 0 ? "Trending (utwory)" : (primaryRow?.title || "Polecane playlisty"),
          action: "Odśwież",
          items: recommendations.length > 0
            ? trendingSongs.slice(0, 12).map((s) => toMediaItem({ ...s, resultType: "song", meta: "Trending" })).filter(Boolean)
            : (primaryRow?.items || []).map((i) => toMediaItem({ ...i, resultType: i?.browseId?.startsWith("VL") ? "playlist" : i?.resultType })).filter(Boolean),
        },
        tertiarySection: {
          title: "Więcej muzyki",
          action: "Zobacz wszystkie",
          items: trendingSongs.slice(18, 36).map((s) => toMediaItem({ ...s, resultType: "song", meta: "Popularne" })).filter(Boolean),
        },
        chartTitle: "Trendy (artyści)",
        chartItems: (charts?.artists || []).slice(0, 6).map((a, idx) => ({
          label: `#${idx + 1}`,
          title: a.title,
          subtitle: "Artist",
          change: "+",
          browseId: a.browseId || null,
        })),
        queueTitle: "Trending (utwory)",
        queueAction: "Odtwórz",
        queue: trendingSongs.slice(0, 12).map(toQueueItem).filter(Boolean),
        nowPlaying: hit
          ? { title: hit.title, artist: hit.artist || "", art: hit.thumbnail, duration: 240, progress: 10, videoId: hit.videoId || null }
          : undefined,
      };
    }

    if (key === "playlists") {
      const lib = await yt.getLibraryPlaylists(24, authHeaders).catch(() => []);
      const localPlaylists = loadLocalPlaylists();
      const merged = [
        ...localPlaylists.map((p) => ({
          title: p.title,
          author: "Lokalna",
          thumbnail: null,
          browseId: `local-${p.id}`,
          playlistId: `local-${p.id}`,
          trackCount: p.tracks.length,
          source: "local",
        })),
        ...lib.map((p) => ({ ...p, source: "youtube" })),
      ];
      return {
        ...base,
        eyebrow: "Biblioteka",
        title: "Playlisty",
        description: "Playlisty z YouTube Music i lokalne. Kliknij, aby zobaczyć szczegóły i utwory.",
        chips: ["Biblioteka", "Lokalne", "Polecane", "Wyszukaj"],
        stats: [
          { label: "Playlisty YT", value: String((lib || []).length || 0) },
          { label: "Lokalne", value: String(localPlaylists.length || 0) },
          { label: "Edycja", value: ytMusicHeaders ? "ON" : "OFF" },
        ],
        primarySection: {
          title: "Wszystkie playlisty",
          action: "Nowa playlista",
          items: merged.map((p) =>
            toMediaItem({
              title: p.title,
              author: p.author || "YouTube Music",
              thumbnail: p.thumbnail,
              browseId: p.browseId,
              resultType: "playlist",
              meta: p.source === "local" ? "Lokalna" : "Biblioteka",
            }),
          ),
        },
        secondarySection: {
          title: "Polecane playlisty",
          action: "Odśwież",
          items: [],
        },
        chartTitle: "Tip",
        chartItems: [],
        queueTitle: "Utwory w playliście",
        queueAction: "Odtwórz wszystko",
        queue: [],
      };
    }

    if (key === "albums") {
      const libAlbums = await yt.getLibraryAlbums(24, authHeaders).catch(() => []);
      const charts = await yt.getCharts(safeRegion);
      return {
        ...base,
        eyebrow: "Biblioteka",
        title: "Albumy",
        description: "Twoje ulubione albumy oraz trendy.",
        chips: ["Biblioteka", "Trendy"],
        stats: [
          { label: "Albumy (biblioteka)", value: String((libAlbums || []).length || 0) },
          { label: "Trending songs", value: String((charts?.songs || []).length || 0) },
        ],
        primarySection: {
          title: "Albumy z biblioteki",
          action: "Odśwież",
          items: (libAlbums || []).map((a) =>
            toMediaItem({
              title: a.title,
              thumbnail: a.thumbnail,
              browseId: a.browseId,
              resultType: "album",
              meta: "Biblioteka",
            }),
          ),
        },
        secondarySection: {
          title: "Trending (wideo)",
          action: "Odśwież",
          items: (charts?.videos || []).slice(0, 12).map((v) => toMediaItem({ ...v, resultType: "video", meta: "Trending" })).filter(Boolean),
        },
        chartTitle: "Trending (utwory)",
        chartItems: (charts?.songs || []).slice(0, 6).map((s, idx) => ({
          label: `#${idx + 1}`,
          title: s.title,
          subtitle: "Song",
          change: "+",
          videoId: s.videoId || null,
        })),
        queueTitle: "Kolejka",
        queueAction: "Odtwórz",
        queue: (charts?.songs || []).slice(0, 12).map(toQueueItem).filter(Boolean),
      };
    }

    if (key === "artists") {
      const libArtists = await yt.getLibraryArtists(24, authHeaders).catch(() => []);
      const charts = await yt.getCharts(safeRegion);
      return {
        ...base,
        eyebrow: "Biblioteka",
        title: "Wykonawcy",
        description: "Ulubieni wykonawcy oraz trendy.",
        chips: ["Biblioteka", "Trendy"],
        stats: [
          { label: "Artyści (biblioteka)", value: String((libArtists || []).length || 0) },
          { label: "Trending artists", value: String((charts?.artists || []).length || 0) },
        ],
        primarySection: {
          title: "Artyści z biblioteki",
          action: "Odśwież",
          items: (libArtists || []).map((a) =>
            toMediaItem({
              title: a.title,
              thumbnail: a.thumbnail,
              browseId: a.browseId,
              resultType: "artist",
              meta: "Biblioteka",
            }),
          ),
        },
        secondarySection: {
          title: "Trending (artyści)",
          action: "Odśwież",
          items: (charts?.artists || []).slice(0, 18).map((a) => toMediaItem({ ...a, resultType: "artist", meta: "Trending" })).filter(Boolean),
        },
        chartTitle: "Trending (utwory)",
        chartItems: (charts?.songs || []).slice(0, 6).map((s, idx) => ({
          label: `#${idx + 1}`,
          title: s.title,
          subtitle: "Song",
          change: "+",
          videoId: s.videoId || null,
        })),
        queueTitle: "Kolejka",
        queueAction: "Odtwórz",
        queue: (charts?.songs || []).slice(0, 12).map(toQueueItem).filter(Boolean),
      };
    }

    if (key === "discover" || key === "chill" || key === "energy") {
      const moods = await yt.getMoodCategories().catch(() => ({}));
      const all = Object.values(moods || {}).flat();

      const want = key === "chill" ? /chill|relax|calm/i : key === "energy" ? /energy|workout|party|dance/i : null;
      const picked = want ? all.find((c) => want.test(c.title || "")) : all[0];
      const playlists = picked?.params ? await yt.getMoodPlaylists(picked.params).catch(() => []) : [];
      const charts = await yt.getCharts(safeRegion);

      return {
        ...base,
        eyebrow: key === "discover" ? "Odkrywaj" : key === "chill" ? "Relaks" : "Energia",
        title: key === "discover" ? "Odkrywaj nowe brzmienia" : key === "chill" ? "Relaks — playlisty" : "Energia — playlisty",
        description: picked?.title
          ? `Sekcja: ${picked.title} (YouTube Music moods).`
          : "Polecane playlisty z YouTube Music (moods & genres).",
        chips: ["Moods", "Playlisty", "Trendy"],
        stats: [
          { label: "Kategorie moods", value: String(all.length || 0) },
          { label: "Playlisty", value: String((playlists || []).length || 0) },
          { label: "Trending songs", value: String((charts?.songs || []).length || 0) },
        ],
        primarySection: {
          title: picked?.title || "Polecane playlisty",
          action: "Odśwież",
          items: (playlists || []).slice(0, 18).map((p) =>
            toMediaItem({
              title: p.title,
              thumbnail: p.thumbnail,
              browseId: p.playlistId,
              resultType: "playlist",
              meta: "Playlist",
            }),
          ),
        },
        secondarySection: {
          title: "Trending (utwory)",
          action: "Odśwież",
          items: (charts?.songs || []).slice(0, 18).map((s) =>
            toMediaItem({
              title: s.title,
              thumbnail: s.thumbnail,
              videoId: s.videoId,
              resultType: "song",
              meta: "Trending",
            }),
          ).filter(Boolean),
        },
        chartTitle: "Trending (artyści)",
        chartItems: (charts?.artists || []).slice(0, 6).map((a, idx) => ({
          label: `#${idx + 1}`,
          title: a.title,
          subtitle: "Artist",
          change: "+",
          browseId: a.browseId || null,
        })),
        queueTitle: "Kolejka",
        queueAction: "Odtwórz",
        queue: (charts?.songs || []).slice(0, 12).map(toQueueItem).filter(Boolean),
      };
    }

    if (key === "favorites") {
      return {
        ...base,
        eyebrow: "Biblioteka",
        title: "Ulubione",
        description: "Twoje ulubione utwory zapisane podczas słuchania.",
        chips: ["Zapisane"],
        stats: [],
        primarySection: { title: "Ulubione", action: "", items: [] },
        secondarySection: { title: "", action: "", items: [] },
        chartTitle: "", chartItems: [],
        queueTitle: "Ulubione", queueAction: "Odtwórz", queue: [],
      };
    }

    if (key === "recent") {
      return {
        ...base,
        eyebrow: "Historia",
        title: "Ostatnio grane",
        description: "Historia odtwarzanych utworów przechowywana lokalnie w przeglądarce.",
        chips: ["Historia"],
        stats: [],
        primarySection: { title: "Ostatnio grane", action: "", items: [] },
        secondarySection: { title: "", action: "", items: [] },
        chartTitle: "", chartItems: [],
        queueTitle: "Ostatnio grane", queueAction: "Odtwórz", queue: [],
      };
    }

    return {
      ...base,
      eyebrow: "AetherPulse|Music",
      title: "Strona",
      description: "Brak danych dla tej strony.",
      chips: [],
      stats: [],
      primarySection: { title: "Brak", action: "", items: [] },
      secondarySection: { title: "Brak", action: "", items: [] },
      chartTitle: "Brak",
      chartItems: [],
      queueTitle: "Brak",
      queueAction: "",
      queue: [],
    };
  }));

  return router;
}

module.exports = createPagesRouter;
