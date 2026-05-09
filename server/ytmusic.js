// YouTube Music Innertube API client and response parsers

"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");

const YTM_DOMAIN = "music.youtube.com";
const YTM_BASE_API = "/youtubei/v1/";
const YTM_PARAMS = "alt=json";

const YTM_CONTEXT = {
  client: {
    clientName: "WEB_REMIX",
    clientVersion: "1.20240101.01.00",
    hl: "en",
    gl: "US",
    experimentIds: [],
    experimentsToken: "",
    utcOffsetMinutes: 0,
  },
};

const SEARCH_FILTER_PARAMS = {
  songs: "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D",
  videos: "EgWKAQIQAWoKEAkQChAFEAMQBA%3D%3D",
  albums: "EgWKAQIYAWoKEAkQChAFEAMQBA%3D%3D",
  artists: "EgWKAQIgAWoKEAkQChAFEAMQBA%3D%3D",
  playlists: "EgeKAQQoAEABagoQAxAEEAkQChAF",
  community_playlists: "EgeKAQQoADgBagoQAxAEEAkQChAF",
  featured_playlists: "EgeKAQQoADIBagoQAxAEEAkQChAF",
  uploads: "EgWKAQIoAWoKEAkQChAFEAMQBA%3D%3D",
  podcasts: "EgWKAQJQAWoKEAkQChAFEAMQBA%3D%3D",
  episodes: "EgWKAQJIAWoKEAkQChAFEAMQBA%3D%3D",
  profiles: "EgWKAQJYAWoKEAkQChAFEAMQBA%3D%3D",
};

function sendRequest(endpoint, body = {}, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ context: YTM_CONTEXT, ...body });

    const defaultHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      Origin: `https://${YTM_DOMAIN}`,
      Referer: `https://${YTM_DOMAIN}/`,
      "X-YouTube-Client-Name": "67",
      "X-YouTube-Client-Version": "1.20240101.01.00",
    };

    const options = {
      hostname: YTM_DOMAIN,
      path: `${YTM_BASE_API}${endpoint}?${YTM_PARAMS}`,
      method: "POST",
      headers: { ...defaultHeaders, ...headers },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

const SNAPSHOT_DIR = path.join(__dirname, "ytmusic-snapshots");

function saveSnapshot(name, data) {
  if (!fs.existsSync(SNAPSHOT_DIR))
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const file = path.join(SNAPSHOT_DIR, `${name}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

function nav(obj, ...keys) {
  try {
    return keys.reduce((o, k) => o[k], obj);
  } catch {
    return undefined;
  }
}

function getText(obj) {
  if (!obj) return null;
  if (typeof obj === "string") return obj;
  if (obj.simpleText) return obj.simpleText;
  if (obj.runs) return obj.runs.map((r) => r.text).join("");
  return null;
}

function getThumbnails(obj) {
  const t =
    nav(obj, "thumbnail", "thumbnails") ||
    nav(obj, "thumbnails") ||
    nav(obj, "thumbnailRenderer", "musicThumbnailRenderer", "thumbnail", "thumbnails") ||
    nav(
      obj,
      "thumbnail",
      "musicThumbnailRenderer",
      "thumbnail",
      "thumbnails",
    ) ||
    [];
  return t;
}

function getBestThumbnail(obj) {
  const thumbs = getThumbnails(obj);
  if (!thumbs.length) return null;
  return thumbs[thumbs.length - 1].url;
}

function getArtists(obj) {
  const runs =
    nav(
      obj,
      "flexColumns",
      1,
      "musicResponsiveListItemFlexColumnRenderer",
      "text",
      "runs",
    ) || [];
  const artists = [];
  for (const run of runs) {
    if (
      nav(
        run,
        "navigationEndpoint",
        "browseEndpoint",
        "browseEndpointContextSupportedConfigs",
        "browseEndpointContextMusicConfig",
        "pageType",
      ) === "MUSIC_PAGE_TYPE_ARTIST"
    ) {
      artists.push({
        name: run.text,
        id: nav(run, "navigationEndpoint", "browseEndpoint", "browseId"),
      });
    }
  }
  return artists.length ? artists : null;
}

async function search(query, filter = null, limit = 20) {
  const body = { query };
  if (filter && SEARCH_FILTER_PARAMS[filter]) {
    body.params = SEARCH_FILTER_PARAMS[filter];
  }

  const data = await sendRequest("search", body);
  const contents =
    nav(
      data,
      "contents",
      "tabbedSearchResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
    ) ||
    nav(data, "contents", "sectionListRenderer", "contents") ||
    [];

  const results = [];

  for (const section of contents) {
    const items =
      nav(section, "musicShelfRenderer", "contents") ||
      nav(section, "musicCardShelfRenderer", "contents") ||
      [];

    const category = getText(
      nav(section, "musicShelfRenderer", "title") ||
        nav(
          section,
          "musicCardShelfRenderer",
          "header",
          "musicCardShelfHeaderBasicRenderer",
          "title",
        ),
    );

    for (const item of items) {
      const r = parseSearchItem(item, category);
      if (r) results.push(r);
      if (results.length >= limit) return results;
    }
  }

  return results;
}

function parseSearchItem(item, category) {
  const r = item.musicResponsiveListItemRenderer;
  if (!r) return null;

  const videoId =
    nav(r, "playlistItemData", "videoId") ||
    nav(
      r,
      "overlay",
      "musicItemThumbnailOverlayRenderer",
      "content",
      "musicPlayButtonRenderer",
      "playNavigationEndpoint",
      "watchEndpoint",
      "videoId",
    );

  const title = getText(
    nav(
      r,
      "flexColumns",
      0,
      "musicResponsiveListItemFlexColumnRenderer",
      "text",
    ),
  );

  const browseId = nav(r, "navigationEndpoint", "browseEndpoint", "browseId");

  const pageType =
    nav(
      r,
      "navigationEndpoint",
      "browseEndpoint",
      "browseEndpointContextSupportedConfigs",
      "browseEndpointContextMusicConfig",
      "pageType",
    ) || "";

  let resultType = "song";
  if (pageType.includes("ARTIST")) resultType = "artist";
  else if (pageType.includes("ALBUM")) resultType = "album";
  else if (pageType.includes("PLAYLIST")) resultType = "playlist";
  else if (pageType.includes("PODCAST")) resultType = "podcast";
  else if (videoId) {
    const subRuns =
      nav(
        r,
        "flexColumns",
        1,
        "musicResponsiveListItemFlexColumnRenderer",
        "text",
        "runs",
      ) || [];
    if (subRuns.some((run) => run.text === "Video")) resultType = "video";
  }

  const thumbnail = getBestThumbnail(r);

  const secondaryRuns =
    nav(
      r,
      "flexColumns",
      1,
      "musicResponsiveListItemFlexColumnRenderer",
      "text",
      "runs",
    ) || [];
  const artists = secondaryRuns
    .filter(
      (run) =>
        nav(
          run,
          "navigationEndpoint",
          "browseEndpoint",
          "browseEndpointContextSupportedConfigs",
          "browseEndpointContextMusicConfig",
          "pageType",
        ) === "MUSIC_PAGE_TYPE_ARTIST",
    )
    .map((run) => ({
      name: run.text,
      id: nav(run, "navigationEndpoint", "browseEndpoint", "browseId"),
    }));

  const albumRun = secondaryRuns.find(
    (run) =>
      nav(
        run,
        "navigationEndpoint",
        "browseEndpoint",
        "browseEndpointContextSupportedConfigs",
        "browseEndpointContextMusicConfig",
        "pageType",
      ) === "MUSIC_PAGE_TYPE_ALBUM",
  );
  const album = albumRun
    ? {
        name: albumRun.text,
        id: nav(albumRun, "navigationEndpoint", "browseEndpoint", "browseId"),
      }
    : null;

  const durationRun = secondaryRuns.find((run) => /^\d+:\d+$/.test(run.text));
  const duration = durationRun ? durationRun.text : null;

  const result = {
    category,
    resultType,
    title,
    thumbnail,
  };

  if (videoId) result.videoId = videoId;
  if (browseId) result.browseId = browseId;
  if (artists.length) result.artists = artists;
  if (album) result.album = album;
  if (duration) result.duration = duration;

  return result;
}

async function getSearchSuggestions(query) {
  const data = await sendRequest("music/get_search_suggestions", {
    input: query,
  });
  const suggestions = [];

  const contents =
    nav(data, "contents", 0, "searchSuggestionsSectionRenderer", "contents") ||
    [];
  for (const item of contents) {
    const suggestion =
      nav(item, "searchSuggestionRenderer", "suggestion") ||
      nav(item, "historySuggestionRenderer", "suggestion");
    if (suggestion) {
      suggestions.push(getText(suggestion));
    }
  }
  return suggestions;
}

async function getArtist(channelId) {
  const data = await sendRequest("browse", { browseId: channelId });

  const header =
    nav(data, "header", "musicImmersiveHeaderRenderer") ||
    nav(data, "header", "musicVisualHeaderRenderer");

  const name = getText(nav(header, "title"));
  const description = getText(nav(header, "description"));
  const views = getText(
    nav(
      header,
      "menu",
      "menuRenderer",
      "topLevelButtons",
      0,
      "buttonRenderer",
      "text",
    ),
  );

  const thumbnails = getThumbnails(header);

  let subscribers = null;
  const subText = nav(
    data,
    "header",
    "musicImmersiveHeaderRenderer",
    "subscriptionButton",
    "subscribeButtonRenderer",
    "subscriberCountText",
  );
  if (subText) subscribers = getText(subText);

  const sections =
    nav(
      data,
      "contents",
      "singleColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
    ) || [];

  const result = {
    name,
    channelId,
    description,
    views,
    subscribers,
    thumbnails,
    songs: null,
    albums: null,
    singles: null,
    videos: null,
    related: null,
  };

  for (const section of sections) {
    const shelf =
      nav(section, "musicShelfRenderer") ||
      nav(section, "musicCarouselShelfRenderer");
    if (!shelf) continue;

    const shelfTitle = getText(
      nav(shelf, "header", "musicCarouselShelfBasicHeaderRenderer", "title") ||
        nav(shelf, "title"),
    );

    const contents = nav(shelf, "contents") || [];
    const moreEndpoint = nav(
      shelf,
      "header",
      "musicCarouselShelfBasicHeaderRenderer",
      "moreContentButton",
      "buttonRenderer",
      "navigationEndpoint",
      "browseEndpoint",
    );

    const parsed = parseArtistShelf(shelfTitle, contents, moreEndpoint);
    if (parsed) {
      const key = shelfTitle ? shelfTitle.toLowerCase() : "";
      if (key.includes("song")) result.songs = parsed;
      else if (key.includes("album")) result.albums = parsed;
      else if (key.includes("single")) result.singles = parsed;
      else if (key.includes("video")) result.videos = parsed;
      else if (key.includes("related") || key.includes("fans"))
        result.related = parsed;
    }
  }

  return result;
}

function parseArtistShelf(title, contents, moreEndpoint) {
  const results = [];
  for (const item of contents) {
    const r =
      item.musicResponsiveListItemRenderer || item.musicTwoRowItemRenderer;
    if (!r) continue;

    const videoId =
      nav(r, "playlistItemData", "videoId") ||
      nav(r, "navigationEndpoint", "watchEndpoint", "videoId");
    const browseId = nav(r, "navigationEndpoint", "browseEndpoint", "browseId");
    const params = nav(r, "navigationEndpoint", "browseEndpoint", "params");
    const itemTitle = getText(
      nav(r, "title") ||
        nav(
          r,
          "flexColumns",
          0,
          "musicResponsiveListItemFlexColumnRenderer",
          "text",
        ),
    );
    const thumbnail = getBestThumbnail(r);

    const entry = { title: itemTitle, thumbnail };
    if (videoId) entry.videoId = videoId;
    if (browseId) entry.browseId = browseId;
    if (params) entry.params = params;
    results.push(entry);
  }

  return {
    results,
    browseId: nav(moreEndpoint, "browseId") || null,
    params: nav(moreEndpoint, "params") || null,
  };
}

async function getArtistAlbums(channelId, params, limit = 100) {
  const data = await sendRequest("browse", { browseId: channelId, params });
  const items =
    nav(
      data,
      "contents",
      "singleColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
      0,
      "gridRenderer",
      "items",
    ) || [];

  return items
    .slice(0, limit)
    .map((item) => {
      const r = item.musicTwoRowItemRenderer;
      if (!r) return null;
      return {
        browseId: nav(r, "navigationEndpoint", "browseEndpoint", "browseId"),
        params: nav(r, "navigationEndpoint", "browseEndpoint", "params"),
        title: getText(nav(r, "title")),
        year: getText(nav(r, "subtitle")),
        thumbnail: getBestThumbnail(r),
      };
    })
    .filter(Boolean);
}

function extractAlbumTrack(renderer, fallbackArtist, fallbackThumbnail) {
  if (!renderer) return null;

  const videoId =
    nav(renderer, "playlistItemData", "videoId") ||
    nav(renderer, "overlay", "musicItemThumbnailOverlayRenderer", "content", "musicPlayButtonRenderer", "playNavigationEndpoint", "watchEndpoint", "videoId") ||
    nav(renderer, "navigationEndpoint", "watchEndpoint", "videoId") ||
    nav(
      renderer,
      "flexColumns",
      0,
      "musicResponsiveListItemFlexColumnRenderer",
      "text",
      "runs",
      0,
      "navigationEndpoint",
      "watchEndpoint",
      "videoId",
    );

  const title = getText(
    nav(
      renderer,
      "flexColumns",
      0,
      "musicResponsiveListItemFlexColumnRenderer",
      "text",
    ),
  );
  if (!title) return null;

  // Prefer parsed artist list (handles "Artist1, Artist2" correctly).
  const artistRuns =
    nav(
      renderer,
      "flexColumns",
      1,
      "musicResponsiveListItemFlexColumnRenderer",
      "text",
      "runs",
    ) || [];
  const artistNames = artistRuns
    .map((run) => (typeof run?.text === "string" ? run.text.trim() : ""))
    .filter((text) => text && text !== "•" && text !== " • ");
  const parsedArtist = artistNames.join(", ").replace(/\s+,/g, ",");

  const artist =
    parsedArtist ||
    getText(
      nav(
        renderer,
        "flexColumns",
        1,
        "musicResponsiveListItemFlexColumnRenderer",
        "text",
      ),
    ) ||
    fallbackArtist ||
    "";

  const duration = getText(
    nav(
      renderer,
      "fixedColumns",
      0,
      "musicResponsiveListItemFixedColumnRenderer",
      "text",
    ),
  );

  const thumbnail = getBestThumbnail(renderer) || fallbackThumbnail || null;

  return { videoId: videoId || null, title, artist, duration, thumbnail };
}

function collectTracksFromSections(sections, fallbackArtist, fallbackThumbnail) {
  const out = [];
  if (!Array.isArray(sections)) return out;
  for (const section of sections) {
    const shelves = [
      nav(section, "musicShelfRenderer", "contents"),
      nav(section, "musicPlaylistShelfRenderer", "contents"),
    ];
    for (const shelf of shelves) {
      if (!Array.isArray(shelf)) continue;
      for (const item of shelf) {
        const track = extractAlbumTrack(
          item.musicResponsiveListItemRenderer,
          fallbackArtist,
          fallbackThumbnail,
        );
        if (track) out.push(track);
      }
    }
    if (out.length) break;
  }
  return out;
}

function extractAudioPlaylistId(data, header) {
  // 1. microformat canonical URL (?list=OLAK5uy_...)
  const canonical = nav(
    data,
    "microformat",
    "microformatDataRenderer",
    "urlCanonical",
  );
  if (typeof canonical === "string") {
    const match = canonical.match(/[?&]list=([^&]+)/);
    if (match) return match[1];
  }

  // 2. header play button navigation endpoint
  const buttons =
    nav(header, "buttons") ||
    nav(header, "menu", "menuRenderer", "topLevelButtons") ||
    nav(header, "playButton") ||
    [];
  const btnArray = Array.isArray(buttons) ? buttons : [buttons];
  for (const btn of btnArray) {
    const pid =
      nav(btn, "musicPlayButtonRenderer", "playNavigationEndpoint", "watchEndpoint", "playlistId") ||
      nav(btn, "musicPlayButtonRenderer", "playNavigationEndpoint", "watchPlaylistEndpoint", "playlistId") ||
      nav(btn, "buttonRenderer", "navigationEndpoint", "watchPlaylistEndpoint", "playlistId") ||
      nav(btn, "buttonRenderer", "navigationEndpoint", "watchEndpoint", "playlistId");
    if (pid) return pid;
  }

  return null;
}

function parseAlbumHeader(data) {
  const header =
    nav(data, "header", "musicDetailHeaderRenderer") ||
    nav(data, "header", "musicImmersiveHeaderRenderer") ||
    nav(data, "header", "musicResponsiveHeaderRenderer");

  if (!header) {
    // modern two-column layout embeds the header under contents
    const tc = nav(
      data,
      "contents",
      "twoColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
      0,
      "musicResponsiveHeaderRenderer",
    );
    if (tc) return tc;
  }
  return header;
}

async function getAlbum(browseId) {
  const data = await sendRequest("browse", { browseId });

  const header = parseAlbumHeader(data);

  const title = getText(nav(header, "title"));
  const subtitleRuns = nav(header, "subtitle", "runs") || [];
  const secondSubtitleRuns = nav(header, "secondSubtitle", "runs") || [];
  // Modern musicResponsiveHeaderRenderer puts the artist in straplineTextOne.
  const straplineRuns = nav(header, "straplineTextOne", "runs") || [];
  const combinedSubtitle = [...subtitleRuns, ...secondSubtitleRuns, ...straplineRuns];

  const isArtistRun = (run) =>
    nav(
      run,
      "navigationEndpoint",
      "browseEndpoint",
      "browseEndpointContextSupportedConfigs",
      "browseEndpointContextMusicConfig",
      "pageType",
    ) === "MUSIC_PAGE_TYPE_ARTIST";

  // Prefer a navigable artist run (reliable identification).
  // Order of preference: strapline → subtitle → second-subtitle.
  let artistRun =
    straplineRuns.find(isArtistRun) ||
    subtitleRuns.find(isArtistRun) ||
    secondSubtitleRuns.find(isArtistRun);

  // Legacy musicDetailHeaderRenderer: subtitle is [type, sep, artist, sep, year].
  if (!artistRun && subtitleRuns.length >= 3) {
    const candidate = subtitleRuns[2];
    if (candidate && typeof candidate.text === "string" && !/^\d{4}$/.test(candidate.text.trim())) {
      artistRun = candidate;
    }
  }

  // Last resort: any strapline run.
  if (!artistRun && straplineRuns.length) {
    artistRun = straplineRuns.find((r) => typeof r?.text === "string" && r.text.trim()) || null;
  }

  const albumArtist = artistRun ? artistRun.text : null;

  // Pull year from the last 4-digit token in any subtitle run.
  const yearRun = [...combinedSubtitle]
    .reverse()
    .find((run) => typeof run?.text === "string" && /^\d{4}$/.test(run.text.trim()));
  const year = yearRun ? yearRun.text.trim() : null;

  const thumbnail = getBestThumbnail(header) || getBestThumbnail(data);
  const description =
    getText(nav(header, "description")) ||
    getText(
      nav(header, "description", "musicDescriptionShelfRenderer", "description"),
    ) ||
    "";

  // Collect track sections from either single- or two-column layouts.
  const singleColSections =
    nav(
      data,
      "contents",
      "singleColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
    ) || [];

  const twoColPrimary =
    nav(
      data,
      "contents",
      "twoColumnBrowseResultsRenderer",
      "secondaryContents",
      "sectionListRenderer",
      "contents",
    ) || [];

  const twoColTabs =
    nav(
      data,
      "contents",
      "twoColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
    ) || [];

  const allSections = [...singleColSections, ...twoColPrimary, ...twoColTabs];

  let tracks = collectTracksFromSections(allSections, albumArtist, thumbnail);

  // Fallback: if the album browse returned no track renderers, re-fetch
  // via the audioPlaylistId (works for albums that only expose tracks
  // through the watch-next / playlist endpoint).
  const audioPlaylistId = extractAudioPlaylistId(data, header);
  if (!tracks.length && audioPlaylistId) {
    try {
      const pl = await getPlaylist(audioPlaylistId, 200);
      tracks = (pl?.tracks || []).map((track) => ({
        videoId: track.videoId || null,
        title: track.title,
        artist:
          track.artist ||
          (Array.isArray(track.artists)
            ? track.artists.map((a) => a.name).filter(Boolean).join(", ")
            : "") ||
          albumArtist ||
          "",
        duration: track.duration || null,
        thumbnail:
          track.thumbnail ||
          (Array.isArray(track.thumbnails)
            ? track.thumbnails[track.thumbnails.length - 1]?.url
            : null) ||
          thumbnail,
      }));
    } catch (err) {
      console.warn(`[ytmusic] album ${browseId} fallback to playlist ${audioPlaylistId} failed:`, err.message);
    }
  }

  return {
    browseId,
    audioPlaylistId,
    title,
    artist: albumArtist,
    artists: albumArtist ? [{ name: albumArtist }] : [],
    year,
    thumbnail,
    description,
    tracks,
  };
}

async function getUser(channelId) {
  const data = await sendRequest("browse", { browseId: channelId });

  const name = getText(
    nav(data, "header", "musicImmersiveHeaderRenderer", "title"),
  );
  const contents =
    nav(
      data,
      "contents",
      "singleColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
    ) || [];

  const videos = [];
  const playlists = [];

  for (const section of contents) {
    const shelf =
      nav(section, "musicShelfRenderer") ||
      nav(section, "musicCarouselShelfRenderer");
    if (!shelf) continue;
    const shelfTitle =
      getText(
        nav(
          shelf,
          "header",
          "musicCarouselShelfBasicHeaderRenderer",
          "title",
        ) || nav(shelf, "title"),
      ) || "";
    const items = nav(shelf, "contents") || [];

    for (const item of items) {
      const r =
        item.musicTwoRowItemRenderer || item.musicResponsiveListItemRenderer;
      if (!r) continue;
      const entry = {
        title: getText(
          nav(r, "title") ||
            nav(
              r,
              "flexColumns",
              0,
              "musicResponsiveListItemFlexColumnRenderer",
              "text",
            ),
        ),
        browseId: nav(r, "navigationEndpoint", "browseEndpoint", "browseId"),
        videoId: nav(r, "navigationEndpoint", "watchEndpoint", "videoId"),
        thumbnail: getBestThumbnail(r),
      };
      if (shelfTitle.toLowerCase().includes("playlist")) playlists.push(entry);
      else videos.push(entry);
    }
  }

  return { channelId, name, videos, playlists };
}

async function getSong(videoId) {
  const data = await sendRequest("player", {
    videoId,
    playbackContext: {
      contentPlaybackContext: { signatureTimestamp: 19950 },
    },
  });

  const vd = nav(data, "videoDetails");
  if (!vd) return null;

  return {
    videoId: vd.videoId,
    title: vd.title,
    author: vd.author,
    channelId: vd.channelId,
    durationSeconds: parseInt(vd.lengthSeconds, 10) || 0,
    thumbnail: getBestThumbnail(vd),
    viewCount: vd.viewCount,
    isLiveContent: vd.isLiveContent,
    keywords: vd.keywords || [],
  };
}

async function getLyrics(videoId) {
  const nextData = await sendRequest("next", { videoId });

  const tabs =
    nav(
      nextData,
      "contents",
      "singleColumnMusicWatchNextResultsRenderer",
      "tabbedRenderer",
      "watchNextTabbedResultsRenderer",
      "tabs",
    ) || [];

  let lyricsBrowseId = null;
  for (const tab of tabs) {
    const endpoint = nav(tab, "tabRenderer", "endpoint", "browseEndpoint");
    const tabTitle = nav(tab, "tabRenderer", "title") || "";
    if (
      tabTitle.toLowerCase().includes("lyric") ||
      tabTitle.toLowerCase().includes("lyrics")
    ) {
      lyricsBrowseId = endpoint?.browseId;
      break;
    }
    if (endpoint?.browseId === "FEmusic_lyrics") {
      lyricsBrowseId = endpoint.browseId;
      break;
    }
  }

  if (!lyricsBrowseId) return null;

  const lyricsData = await sendRequest("browse", { browseId: lyricsBrowseId });
  const lyricsText = getText(
    nav(
      lyricsData,
      "contents",
      "sectionListRenderer",
      "contents",
      0,
      "musicDescriptionShelfRenderer",
      "description",
    ),
  );

  const source = getText(
    nav(
      lyricsData,
      "contents",
      "sectionListRenderer",
      "contents",
      0,
      "musicDescriptionShelfRenderer",
      "footer",
    ),
  );

  if (!lyricsText) return null;
  return { lyrics: lyricsText, source };
}

async function getLrclibLyrics(title, artist) {
  return new Promise((resolve) => {
    // Clean artist name (use only the first one if multiple)
    const cleanArtist = (artist || "").split(',')[0].split('&')[0].split('feat.')[0].trim();
    const cleanTitle = (title || "").split('(feat.')[0].split(' feat.')[0].split('-')[0].trim();

    const fetchLrc = (url) => {
      https.get(url, { headers: { 'User-Agent': 'AetherPulseMusic/0.1.0' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              // Handle search result vs get result
              const best = Array.isArray(json) ? json[0] : json;
              if (best && (best.syncedLyrics || best.plainLyrics)) {
                return resolve({
                  lyrics: best.syncedLyrics || best.plainLyrics,
                  source: "LRCLIB",
                  isSynced: !!best.syncedLyrics
                });
              }
            } catch (e) {}
          }
          
          // If this was an exact match attempt and failed, try search as fallback
          if (url.includes('/api/get?')) {
            const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTitle} ${cleanArtist}`)}`;
            fetchLrc(searchUrl);
          } else {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    };

    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
    fetchLrc(url);
  });
}

async function getWatchPlaylist(
  videoId,
  playlistId = null,
  limit = 25,
  radio = false,
  shuffle = false,
) {
  const body = { videoId, isAudioOnly: true };
  if (playlistId) body.playlistId = playlistId;
  if (radio) body.params = "wAEB8gECKAE%3D";
  if (shuffle) body.params = "wAEB";

  const tracks = [];

  const parsePanelItems = (items) => {
    for (const item of items || []) {
      const r = nav(item, "playlistPanelVideoRenderer");
      if (!r) continue;
      tracks.push({
        videoId: r.videoId,
        title: getText(r.title),
        artist: getText(nav(r, "shortBylineText")),
        duration: getText(r.lengthText),
        thumbnail: getBestThumbnail(r),
        selected: r.selected || false,
      });
      if (tracks.length >= limit) return true;
    }
    return false;
  };

  let data = await sendRequest("next", body);
  let items =
    nav(
      data,
      "contents",
      "singleColumnMusicWatchNextResultsRenderer",
      "playlist",
      "musicQueueRenderer",
      "content",
      "playlistPanelRenderer",
      "contents",
    ) ||
    nav(
      data,
      "contents",
      "singleColumnMusicWatchNextResultsRenderer",
      "tabbedRenderer",
      "watchNextTabbedResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "musicQueueRenderer",
      "content",
      "playlistPanelRenderer",
      "contents",
    ) ||
    [];

  parsePanelItems(items);

  // Continuation support (fix playlists capped ~50 items)
  let continuation =
    nav(
      data,
      "contents",
      "singleColumnMusicWatchNextResultsRenderer",
      "playlist",
      "musicQueueRenderer",
      "content",
      "playlistPanelRenderer",
      "continuations",
      0,
      "nextContinuationData",
      "continuation",
    ) ||
    nav(
      data,
      "contents",
      "singleColumnMusicWatchNextResultsRenderer",
      "tabbedRenderer",
      "watchNextTabbedResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "musicQueueRenderer",
      "content",
      "playlistPanelRenderer",
      "continuations",
      0,
      "nextContinuationData",
      "continuation",
    ) ||
    null;

  while (tracks.length < limit && continuation) {
    const contData = await sendRequest("next", { continuation });
    const contItems =
      nav(
        contData,
        "continuationContents",
        "playlistPanelContinuation",
        "contents",
      ) || [];

    const done = parsePanelItems(contItems);
    if (done) break;

    continuation = nav(
      contData,
      "continuationContents",
      "playlistPanelContinuation",
      "continuations",
      0,
      "nextContinuationData",
      "continuation",
    );
  }

  return tracks.slice(0, limit);
}

async function getMoodCategories() {
  const data = await sendRequest("browse", {
    browseId: "FEmusic_moods_and_genres",
  });
  const contents =
    nav(
      data,
      "contents",
      "singleColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
    ) || [];

  const categories = {};
  for (const section of contents) {
    const items = nav(section, "gridRenderer", "items") || [];
    const title = getText(
      nav(section, "gridRenderer", "header", "gridHeaderRenderer", "title"),
    );
    if (!title) continue;
    categories[title] = items
      .map((item) => {
        const r = item.musicNavigationButtonRenderer;
        if (!r) return null;
        return {
          title: getText(r.buttonText),
          params: nav(r, "clickCommand", "browseEndpoint", "params"),
          color: nav(r, "solid", "leftStripeColor"),
        };
      })
      .filter(Boolean);
  }

  return categories;
}

async function getMoodPlaylists(params) {
  const data = await sendRequest("browse", {
    browseId: "FEmusic_moods_and_genres_category",
    params,
  });

  const playlists = [];
  const contents =
    nav(
      data,
      "contents",
      "singleColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
    ) || [];

  for (const section of contents) {
    const items =
      nav(section, "gridRenderer", "items") ||
      nav(section, "musicCarouselShelfRenderer", "contents") ||
      [];
    for (const item of items) {
      const r = item.musicTwoRowItemRenderer;
      if (!r) continue;
      playlists.push({
        title: getText(nav(r, "title")),
        playlistId: nav(r, "navigationEndpoint", "browseEndpoint", "browseId"),
        thumbnail: getBestThumbnail(r),
      });
    }
  }

  return playlists;
}

async function getCharts(country = "ZZ") {
  const body = { browseId: "FEmusic_charts" };
  if (country !== "ZZ") body.formData = { selectedValues: [country] };

  const data = await sendRequest("browse", body);
  const contents =
    nav(
      data,
      "contents",
      "singleColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
    ) || [];

  const charts = {
    countries: null,
    videos: [],
    songs: [],
    artists: [],
    trending: [],
  };

  const countryDropdown = nav(
    data,
    "header",
    "musicChartHeaderRenderer",
    "dropdowns",
    0,
    "dropdownRenderer",
    "entries",
  );
  if (countryDropdown) {
    charts.countries = countryDropdown.map((entry) => ({
      title: getText(nav(entry, "dropdownItemRenderer", "title")),
      value: nav(entry, "dropdownItemRenderer", "value"),
    }));
  }

  for (const section of contents) {
    const shelf =
      nav(section, "musicCarouselShelfRenderer") ||
      nav(section, "musicShelfRenderer");
    if (!shelf) continue;
    const shelfTitle =
      getText(
        nav(
          shelf,
          "header",
          "musicCarouselShelfBasicHeaderRenderer",
          "title",
        ) || nav(shelf, "title"),
      ) || "";
    const items = nav(shelf, "contents") || [];
    const parsed = items
      .map((item) => {
        const r =
          item.musicResponsiveListItemRenderer || item.musicTwoRowItemRenderer;
        if (!r) return null;
        return {
          title: getText(
            nav(r, "title") ||
              nav(
                r,
                "flexColumns",
                0,
                "musicResponsiveListItemFlexColumnRenderer",
                "text",
              ),
          ),
          videoId: nav(r, "playlistItemData", "videoId"),
          browseId: nav(r, "navigationEndpoint", "browseEndpoint", "browseId"),
          thumbnail: getBestThumbnail(r),
        };
      })
      .filter(Boolean);

    const key = shelfTitle.toLowerCase();
    if (key.includes("video")) charts.videos = parsed;
    else if (key.includes("song")) charts.songs = parsed;
    else if (key.includes("artist")) charts.artists = parsed;
    else if (key.includes("trending")) charts.trending = parsed;
  }

  return charts;
}

async function getHome(limit = 3) {
  const data = await sendRequest("browse", { browseId: "FEmusic_home" });
  const contents =
    nav(
      data,
      "contents",
      "singleColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
    ) || [];

  const rows = [];
  for (const section of contents) {
    const shelf = nav(section, "musicCarouselShelfRenderer");
    if (!shelf) continue;
    const title = getText(
      nav(shelf, "header", "musicCarouselShelfBasicHeaderRenderer", "title"),
    );
    const items = (nav(shelf, "contents") || [])
      .map((item) => {
        const r = item.musicTwoRowItemRenderer;
        if (!r) return null;
        return {
          title: getText(nav(r, "title")),
          browseId: nav(r, "navigationEndpoint", "browseEndpoint", "browseId"),
          playlistId:
            nav(
              r,
              "thumbnailOverlay",
              "musicItemThumbnailOverlayRenderer",
              "content",
              "musicPlayButtonRenderer",
              "playNavigationEndpoint",
              "watchPlaylistEndpoint",
              "playlistId",
            ) ||
            nav(r, "menu", "menuRenderer", "items", 0, "menuNavigationItemRenderer", "navigationEndpoint", "watchPlaylistEndpoint", "playlistId") ||
            (nav(r, "navigationEndpoint", "browseEndpoint", "browseId") || "").replace(/^VL/, "") ||
            null,
          videoId: nav(r, "navigationEndpoint", "watchEndpoint", "videoId"),
          subtitle: getText(nav(r, "subtitle")),
          thumbnail: getBestThumbnail(r),
        };
      })
      .filter(Boolean);

    rows.push({ title, items });
    if (rows.length >= limit) break;
  }

  return rows;
}

function loadAuthHeaders() {
  const headerFile = path.join(__dirname, "..", "headers.json");
  if (!fs.existsSync(headerFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(headerFile, "utf8"));
  } catch {
    return {};
  }
}

async function getLibraryPlaylists(limit = 25, authHeaders = {}) {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_liked_playlists" },
    { ...loadAuthHeaders(), ...authHeaders },
  );
  return parseLibraryItems(data, limit);
}

async function getLibrarySongs(limit = 25, authHeaders = {}) {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_liked_videos" },
    { ...loadAuthHeaders(), ...authHeaders },
  );
  return parseLibraryItems(data, limit);
}

async function getLibraryAlbums(limit = 25, authHeaders = {}) {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_liked_albums" },
    { ...loadAuthHeaders(), ...authHeaders },
  );
  return parseLibraryItems(data, limit);
}

async function getLibraryArtists(limit = 25, authHeaders = {}) {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_library_corpus_artists" },
    { ...loadAuthHeaders(), ...authHeaders },
  );
  return parseLibraryItems(data, limit);
}

async function getLibrarySubscriptions(limit = 25, authHeaders = {}) {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_library_corpus_track_artists" },
    { ...loadAuthHeaders(), ...authHeaders },
  );
  return parseLibraryItems(data, limit);
}

async function getLibraryPodcasts(limit = 25, authHeaders = {}) {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_library_non_music_audio_list" },
    { ...loadAuthHeaders(), ...authHeaders },
  );
  return parseLibraryItems(data, limit);
}

async function getLibraryChannels(limit = 25, authHeaders = {}) {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_library_non_music_audio_channels" },
    { ...loadAuthHeaders(), ...authHeaders },
  );
  return parseLibraryItems(data, limit);
}

function parseLibraryItems(data, limit) {
  const items =
    nav(
      data,
      "contents",
      "singleColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
      0,
      "musicShelfRenderer",
      "contents",
    ) ||
    nav(
      data,
      "contents",
      "singleColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
      0,
      "gridRenderer",
      "items",
    ) ||
    [];

  return items
    .slice(0, limit)
    .map((item) => {
      const r =
        item.musicTwoRowItemRenderer || item.musicResponsiveListItemRenderer;
      if (!r) return null;
      return {
        title: getText(
          nav(r, "title") ||
            nav(
              r,
              "flexColumns",
              0,
              "musicResponsiveListItemFlexColumnRenderer",
              "text",
            ),
        ),
        browseId: nav(r, "navigationEndpoint", "browseEndpoint", "browseId"),
        videoId: nav(r, "playlistItemData", "videoId"),
        thumbnail: getBestThumbnail(r),
      };
    })
    .filter(Boolean);
}

async function getHistory(authHeaders = {}) {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_history" },
    { ...loadAuthHeaders(), ...authHeaders },
  );
  return parseLibraryItems(data, 200);
}

async function removeHistoryItems(feedbackTokens) {
  if (!Array.isArray(feedbackTokens)) feedbackTokens = [feedbackTokens];
  const data = await sendRequest(
    "feedback",
    {
      feedbackTokens: feedbackTokens.map((t) => ({ feedbackToken: t })),
    },
    loadAuthHeaders(),
  );
  return nav(data, "feedbackResponses", 0, "isProcessed") === true;
}

async function rateSong(videoId, rating, authHeaders = {}) {
  const ENDPOINT_MAP = {
    LIKE: "like/like",
    DISLIKE: "like/dislike",
    INDIFFERENT: "like/removelike",
  };
  const endpoint = ENDPOINT_MAP[rating];
  if (!endpoint) throw new Error(`Invalid rating: ${rating}`);
  await sendRequest(endpoint, { target: { videoId } }, { ...loadAuthHeaders(), ...authHeaders });
  return true;
}

async function ratePlaylist(playlistId, rating, authHeaders = {}) {
  return rateSong(playlistId, rating, authHeaders);
}

async function subscribeArtists(channelIds) {
  if (!Array.isArray(channelIds)) channelIds = [channelIds];
  await sendRequest(
    "subscription/subscribe",
    {
      channelIds,
    },
    loadAuthHeaders(),
  );
  return true;
}

async function unsubscribeArtists(channelIds) {
  if (!Array.isArray(channelIds)) channelIds = [channelIds];
  await sendRequest(
    "subscription/unsubscribe",
    {
      channelIds,
    },
    loadAuthHeaders(),
  );
  return true;
}

async function editSongLibraryStatus(feedbackTokens) {
  if (!Array.isArray(feedbackTokens)) feedbackTokens = [feedbackTokens];
  const data = await sendRequest(
    "feedback",
    {
      feedbackTokens: feedbackTokens.map((t) => ({ feedbackToken: t })),
    },
    loadAuthHeaders(),
  );
  return data;
}

async function getPlaylist(playlistId, limit = 100) {
  const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
  const data = await sendRequest("browse", { browseId });

  const header =
    nav(data, "header", "musicDetailHeaderRenderer") ||
    nav(
      data,
      "header",
      "musicEditablePlaylistDetailHeaderRenderer",
      "header",
      "musicDetailHeaderRenderer",
    );

  const title = getText(nav(header, "title"));
  const description = getText(nav(header, "description"));
  const author = getText(
    nav(
      header,
      "byline",
      "musicDetailHeaderButtonsBylineRenderer",
      "description",
      "runs",
      0,
    ),
  );
  const trackCountString = getText(nav(header, "secondSubtitle", "runs", 0)) || "0";
  const trackCount = parseInt(trackCountString.replace(/[^0-9]/g, "") || "0", 10);
  const thumbnail = getBestThumbnail(header);

  const tracks = [];
  let contents =
    nav(
      data,
      "contents",
      "singleColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
      0,
      "musicPlaylistShelfRenderer",
      "contents",
    ) || [];

  let continuation = nav(
    data,
    "contents",
    "singleColumnBrowseResultsRenderer",
    "tabs",
    0,
    "tabRenderer",
    "content",
    "sectionListRenderer",
    "contents",
    0,
    "musicPlaylistShelfRenderer",
    "continuations",
    0,
    "nextContinuationData",
    "continuation",
  );

  if (!title && !thumbnail && !contents.length) {
    const plainPlaylistId = playlistId.replace(/^VL/, "");
    const nextData = await sendRequest("next", {
      playlistId: plainPlaylistId,
      isAudioOnly: true,
    });

    const panel =
      nav(
        nextData,
        "contents",
        "singleColumnMusicWatchNextResultsRenderer",
        "tabbedRenderer",
        "watchNextTabbedResultsRenderer",
        "tabs",
        0,
        "tabRenderer",
        "content",
        "musicQueueRenderer",
        "content",
        "playlistPanelRenderer",
      ) ||
      nav(
        nextData,
        "contents",
        "singleColumnMusicWatchNextResultsRenderer",
        "playlist",
        "musicQueueRenderer",
        "content",
        "playlistPanelRenderer",
      );

    const panelContents = nav(panel, "contents") || [];
    const parsedTracks = panelContents
      .map((item) => {
        const r = nav(item, "playlistPanelVideoRenderer");
        if (!r) return null;

        const runs = nav(r, "longBylineText", "runs") || [];
        const artists = runs
          .filter(
            (run) =>
              nav(
                run,
                "navigationEndpoint",
                "browseEndpoint",
                "browseEndpointContextSupportedConfigs",
                "browseEndpointContextMusicConfig",
                "pageType",
              ) === "MUSIC_PAGE_TYPE_ARTIST",
          )
          .map((run) => ({
            name: run.text,
            id: nav(run, "navigationEndpoint", "browseEndpoint", "browseId"),
          }));

        const albumRun = runs.find(
          (run) =>
            nav(
              run,
              "navigationEndpoint",
              "browseEndpoint",
              "browseEndpointContextSupportedConfigs",
              "browseEndpointContextMusicConfig",
              "pageType",
            ) === "MUSIC_PAGE_TYPE_ALBUM",
        );

        return {
          videoId: r.videoId,
          title: getText(r.title),
          duration: getText(r.lengthText),
          artists,
          album: albumRun
            ? {
                name: albumRun.text,
                id: nav(albumRun, "navigationEndpoint", "browseEndpoint", "browseId"),
              }
            : null,
          thumbnail: getBestThumbnail(r),
        };
      })
      .filter(Boolean)
      .slice(0, limit);

    const first = parsedTracks[0] || null;
    let tracks = parsedTracks;

    // If Innertube 'browse' fails, use watch/next playlist queue as a scalable fallback.
    if (tracks.length < limit && first?.videoId) {
      try {
        const more = await getWatchPlaylist(first.videoId, plainPlaylistId, limit, false, false);
        const mapped = more.map((t) => ({
          videoId: t.videoId,
          title: t.title,
          duration: t.duration,
          artists: t.artist ? [{ name: t.artist, id: null }] : [],
          album: null,
          thumbnail: t.thumbnail,
        }));
        if (mapped.length > tracks.length) tracks = mapped;
      } catch {
        // ignore
      }
    }

    return {
      playlistId: browseId,
      title: getText(nav(panel, "title")) || "Playlista",
      description: getText(nav(panel, "descriptionText")) || null,
      author: getText(nav(panel, "longBylineText")) || null,
      trackCount: tracks.length,
      thumbnail: getBestThumbnail(panel) || first?.thumbnail || null,
      tracks,
    };
  }

  const parseTrack = (item) => {
    const r = item.musicResponsiveListItemRenderer;
    if (!r) return null;
    const videoId = nav(r, "playlistItemData", "videoId");
    const setVideoId = nav(r, "playlistItemData", "playlistSetVideoId");
    const trackTitle = getText(
      nav(
        r,
        "flexColumns",
        0,
        "musicResponsiveListItemFlexColumnRenderer",
        "text",
      ),
    );
    const duration = getText(
      nav(
        r,
        "fixedColumns",
        0,
        "musicResponsiveListItemFixedColumnRenderer",
        "text",
      ),
    );
    const artists = [];
    const runs =
      nav(
        r,
        "flexColumns",
        1,
        "musicResponsiveListItemFlexColumnRenderer",
        "text",
        "runs",
      ) || [];
    for (const run of runs) {
      const pt = nav(
        run,
        "navigationEndpoint",
        "browseEndpoint",
        "browseEndpointContextSupportedConfigs",
        "browseEndpointContextMusicConfig",
        "pageType",
      );
      if (pt === "MUSIC_PAGE_TYPE_ARTIST") {
        artists.push({
          name: run.text,
          id: nav(run, "navigationEndpoint", "browseEndpoint", "browseId"),
        });
      }
    }

    const album = {
      name: getText(
        nav(
          r,
          "flexColumns",
          2,
          "musicResponsiveListItemFlexColumnRenderer",
          "text",
        ),
      ),
      id: nav(
        r,
        "flexColumns",
        2,
        "musicResponsiveListItemFlexColumnRenderer",
        "text",
        "runs",
        0,
        "navigationEndpoint",
        "browseEndpoint",
        "browseId",
      ),
    };

    return {
      videoId,
      setVideoId,
      title: trackTitle,
      duration,
      artists,
      album,
      thumbnail: getBestThumbnail(r),
    };
  };

  const consume = (arr) => {
    for (const item of arr) {
      const t = parseTrack(item);
      if (t) tracks.push(t);
      if (tracks.length >= limit) return true;
    }
    return false;
  };

  consume(contents);

  // Pull continuations until we hit limit (fix: playlists showing ~50 only)
  while (tracks.length < limit && continuation) {
    const contData = await sendRequest("browse", { continuation });
    const contContents =
      nav(
        contData,
        "continuationContents",
        "musicPlaylistShelfContinuation",
        "contents",
      ) || [];
    const done = consume(contContents);
    if (done) break;
    continuation = nav(
      contData,
      "continuationContents",
      "musicPlaylistShelfContinuation",
      "continuations",
      0,
      "nextContinuationData",
      "continuation",
    );
  }

  return {
    playlistId: browseId,
    title,
    description,
    author,
    trackCount,
    thumbnail,
    tracks,
  };
}

async function getPlaylistSuggestions(playlistId) {
  const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
  const data = await sendRequest(
    "browse",
    { browseId, params: "wAEB" },
    loadAuthHeaders(),
  );

  const items =
    nav(
      data,
      "contents",
      "singleColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
      1,
      "musicShelfRenderer",
      "contents",
    ) || [];

  return items
    .map((item) => {
      const r = item.musicResponsiveListItemRenderer;
      if (!r) return null;
      return {
        videoId: nav(r, "playlistItemData", "videoId"),
        title: getText(
          nav(
            r,
            "flexColumns",
            0,
            "musicResponsiveListItemFlexColumnRenderer",
            "text",
          ),
        ),
        thumbnail: getBestThumbnail(r),
      };
    })
    .filter(Boolean);
}

async function createPlaylist(
  title,
  description = "",
  privacyStatus = "PRIVATE",
  videoIds = [],
) {
  const body = {
    title,
    description,
    privacyStatus,
  };
  if (videoIds.length) {
    body.videoIds = videoIds;
  }

  const data = await sendRequest("playlist/create", body, loadAuthHeaders());
  return nav(data, "playlistId") || null;
}

async function deletePlaylist(playlistId) {
  const data = await sendRequest(
    "playlist/delete",
    { playlistId },
    loadAuthHeaders(),
  );
  return nav(data, "status") === "STATUS_SUCCEEDED";
}

async function editPlaylist(
  playlistId,
  { title, description, privacyStatus, moveItem, addPlaylistId } = {},
) {
  const body = { playlistId };
  const actions = [];

  if (title !== undefined)
    actions.push({ action: "ACTION_SET_PLAYLIST_NAME", playlistName: title });
  if (description !== undefined)
    actions.push({
      action: "ACTION_SET_PLAYLIST_DESCRIPTION",
      playlistDescription: description,
    });
  if (privacyStatus !== undefined)
    actions.push({
      action: "ACTION_SET_PLAYLIST_PRIVACY",
      playlistPrivacy: privacyStatus,
    });
  if (moveItem) {
    actions.push({
      action: "ACTION_MOVE_VIDEO_BEFORE",
      setVideoId: moveItem.setVideoId,
      movedSetVideoIdSuccessor: moveItem.movedSetVideoIdSuccessor,
    });
  }
  if (addPlaylistId)
    actions.push({
      action: "ACTION_ADD_PLAYLIST",
      addedFullListId: addPlaylistId,
    });

  body.actions = actions;
  const data = await sendRequest(
    "browse/edit_playlist",
    body,
    loadAuthHeaders(),
  );
  return nav(data, "status") === "STATUS_SUCCEEDED";
}

async function addPlaylistItems(
  playlistId,
  videoIds,
  sourcePlaylistId = null,
  duplicates = false,
) {
  if (!Array.isArray(videoIds)) videoIds = [videoIds];
  const body = {
    playlistId,
    actions: videoIds.map((id) => ({
      action: "ACTION_ADD_VIDEO",
      addedVideoId: id,
      dedupeOption: duplicates ? "DEDUPE_OPTION_SKIP" : "DEDUPE_OPTION_NONE",
    })),
  };
  if (sourcePlaylistId) {
    body.actions = [
      {
        action: "ACTION_ADD_PLAYLIST",
        addedFullListId: sourcePlaylistId,
      },
    ];
  }
  const data = await sendRequest(
    "browse/edit_playlist",
    body,
    loadAuthHeaders(),
  );
  return nav(data, "status") === "STATUS_SUCCEEDED";
}

async function removePlaylistItems(playlistId, videos) {
  if (!Array.isArray(videos)) videos = [videos];
  const body = {
    playlistId,
    actions: videos.map((v) => ({
      action: "ACTION_REMOVE_VIDEO",
      removedVideoId: v.videoId,
      setVideoId: v.setVideoId,
    })),
  };
  const data = await sendRequest(
    "browse/edit_playlist",
    body,
    loadAuthHeaders(),
  );
  return nav(data, "status") === "STATUS_SUCCEEDED";
}

async function getPodcast(browseId) {
  const data = await sendRequest("browse", { browseId });

  const header =
    nav(data, "header", "musicImmersiveHeaderRenderer") ||
    nav(data, "header", "musicDetailHeaderRenderer");
  const title = getText(nav(header, "title"));
  const description = getText(nav(header, "description"));
  const thumbnail = getBestThumbnail(header);

  const episodes = [];
  const contents =
    nav(
      data,
      "contents",
      "singleColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
      0,
      "musicShelfRenderer",
      "contents",
    ) || [];

  for (const item of contents) {
    const r = item.musicResponsiveListItemRenderer;
    if (!r) continue;
    episodes.push({
      videoId: nav(r, "playlistItemData", "videoId"),
      title: getText(
        nav(
          r,
          "flexColumns",
          0,
          "musicResponsiveListItemFlexColumnRenderer",
          "text",
        ),
      ),
      subtitle: getText(
        nav(
          r,
          "flexColumns",
          1,
          "musicResponsiveListItemFlexColumnRenderer",
          "text",
        ),
      ),
      duration: getText(
        nav(
          r,
          "fixedColumns",
          0,
          "musicResponsiveListItemFixedColumnRenderer",
          "text",
        ),
      ),
      thumbnail: getBestThumbnail(r),
    });
  }

  return { browseId, title, description, thumbnail, episodes };
}

async function getEpisode(videoId) {
  return getSong(videoId);
}

async function getChannel(channelId) {
  return getUser(channelId);
}

async function getPodcastEpisodes(browseId, limit = 50) {
  const podcast = await getPodcast(browseId);
  return podcast.episodes.slice(0, limit);
}

module.exports = {
  search,
  getSearchSuggestions,
  getHome,
  getArtist,
  getArtistAlbums,
  getAlbum,
  getUser,
  getSong,
  getLyrics,
  getLrclibLyrics,
  getWatchPlaylist,
  getMoodCategories,
  getMoodPlaylists,
  getCharts,
  getLibraryPlaylists,
  getLibrarySongs,
  getLibraryAlbums,
  getLibraryArtists,
  getLibrarySubscriptions,
  getLibraryPodcasts,
  getLibraryChannels,
  getHistory,
  removeHistoryItems,
  rateSong,
  ratePlaylist,
  subscribeArtists,
  unsubscribeArtists,
  editSongLibraryStatus,
  getPlaylist,
  getPlaylistSuggestions,
  createPlaylist,
  deletePlaylist,
  editPlaylist,
  addPlaylistItems,
  removePlaylistItems,
  getPodcast,
  getEpisode,
  getChannel,
  getPodcastEpisodes,
  saveSnapshot,
  sendRequest,
};
