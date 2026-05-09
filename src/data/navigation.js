export const navigationGroups = [
  {
    titleKey: null,
    items: [
      { key: "home", labelKey: "navHome", path: "/" },
      { key: "discover", labelKey: "navBrowse", path: "/discover" },
      { key: "chill", labelKey: "navChill", path: "/chill" },
      { key: "energy", labelKey: "navEnergy", path: "/energy" },
    ],
  },
  {
    titleKey: "navLibrary",
    items: [
      { key: "recent", labelKey: "navRecent", path: "/recent" },
      { key: "favorites", labelKey: "navFavorites", path: "/favorites" },
      { key: "artists", labelKey: "navArtists", path: "/artists" },
      { key: "albums", labelKey: "navAlbums", path: "/albums" },
      { key: "playlists", labelKey: "navPlaylists", path: "/playlists" },
    ],
  },
];

export function getPageByPath(path) {
  if (path.startsWith("/artist/")) return findItem("artists");
  if (path.startsWith("/album/")) return findItem("albums");
  if (path === "/insights") return { key: "insights", labelKey: "navInsights", path: "/insights" };
  if (path === "/settings") return { key: "settings", labelKey: "navSettings", path: "/settings" };

  for (const group of navigationGroups) {
    const match = group.items.find((entry) => entry.path === path);
    if (match) return match;
  }
  return navigationGroups[0].items[0];
}

function findItem(key) {
  for (const group of navigationGroups) {
    const match = group.items.find((entry) => entry.key === key);
    if (match) return match;
  }
  return null;
}
