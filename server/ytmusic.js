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

async function getAlbum(browseId) {
  const data = await sendRequest("browse", { browseId });

  const header =
    nav(data, "header", "musicDetailHeaderRenderer") ||
    nav(data, "header", "musicImmersiveHeaderRenderer");

  const title = getText(nav(header, "title"));
  const subtitle = nav(header, "subtitle", "runs") || [];
  const artist = subtitle[2] ? subtitle[2].text : null;
  const year = subtitle[subtitle.length - 1]?.text || null;
  const thumbnail = getBestThumbnail(header);
  const description = getText(nav(header, "description"));

  const tracks = [];
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

    const videoId = nav(r, "playlistItemData", "videoId");
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

    tracks.push({ videoId, title: trackTitle, duration });
  }

  return { browseId, title, artist, year, thumbnail, description, tracks };
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

  const data = await sendRequest("next", body);

  const contents =
    nav(
      data,
      "contents",
      "singleColumnMusicWatchNextResultsRenderer",
      "playlist",
      "musicQueueRenderer",
      "content",
      "playlistPanelRenderer",
      "contents",
    ) || [];

  const tracks = [];
  for (const item of contents) {
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
    if (tracks.length >= limit) break;
  }

  return tracks;
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

async function getLibraryPlaylists(limit = 25) {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_liked_playlists" },
    loadAuthHeaders(),
  );
  return parseLibraryItems(data, limit);
}

async function getLibrarySongs(limit = 25) {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_liked_videos" },
    loadAuthHeaders(),
  );
  return parseLibraryItems(data, limit);
}

async function getLibraryAlbums(limit = 25) {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_liked_albums" },
    loadAuthHeaders(),
  );
  return parseLibraryItems(data, limit);
}

async function getLibraryArtists(limit = 25) {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_library_corpus_artists" },
    loadAuthHeaders(),
  );
  return parseLibraryItems(data, limit);
}

async function getLibrarySubscriptions(limit = 25) {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_library_corpus_track_artists" },
    loadAuthHeaders(),
  );
  return parseLibraryItems(data, limit);
}

async function getLibraryPodcasts(limit = 25) {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_library_non_music_audio_list" },
    loadAuthHeaders(),
  );
  return parseLibraryItems(data, limit);
}

async function getLibraryChannels(limit = 25) {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_library_non_music_audio_channels" },
    loadAuthHeaders(),
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

async function getHistory() {
  const data = await sendRequest(
    "browse",
    { browseId: "FEmusic_history" },
    loadAuthHeaders(),
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

async function rateSong(videoId, rating) {
  const ENDPOINT_MAP = {
    LIKE: "like/like",
    DISLIKE: "like/dislike",
    INDIFFERENT: "like/removelike",
  };
  const endpoint = ENDPOINT_MAP[rating];
  if (!endpoint) throw new Error(`Invalid rating: ${rating}`);
  await sendRequest(endpoint, { target: { videoId } }, loadAuthHeaders());
  return true;
}

async function ratePlaylist(playlistId, rating) {
  return rateSong(playlistId, rating);
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
  saveSnapshot("playlist", data);

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

  for (const item of contents) {
    const t = parseTrack(item);
    if (t) tracks.push(t);
    if (tracks.length >= limit) break;
  }

  if (tracks.length < limit && continuation) {
    const contData = await sendRequest("browse", { continuation });
    const contContents =
      nav(
        contData,
        "continuationContents",
        "musicPlaylistShelfContinuation",
        "contents",
      ) || [];
    for (const item of contContents) {
      const t = parseTrack(item);
      if (t) tracks.push(t);
      if (tracks.length >= limit) break;
    }
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
