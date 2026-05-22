export const navigationGroups = [
  {
    titleKey: null,
    items: [
      { key: "home", labelKey: "navHome", path: "/" },
      { key: "discover", labelKey: "navExplore", path: "/discover" },
      { key: "playlists", labelKey: "navLibrary", path: "/playlists" },
      { key: "radio", labelKey: "navRadio", path: "/radio" },
    ],
  },
  {
    titleKey: "navPlaylists",
    items: [
      { key: "favorites", labelKey: "navFavorites", path: "/favorites" },
      { key: "late-night", labelKey: "navLateNight", path: "/chill" },
      { key: "focus", labelKey: "navFocus", path: "/energy" },
      { key: "weekly", labelKey: "navWeekly", path: "/discover" },
    ],
  },
];

export function getPageByPath(path) {
  if (path.startsWith("/artist/")) return findItem("artists");
  if (path.startsWith("/album/")) return findItem("albums");
  if (path === "/insights") return { key: "insights", labelKey: "navInsights", path: "/insights" };
  if (path === "/settings") return { key: "settings", labelKey: "navSettings", path: "/settings" };
  if (path === "/for-you") return findItem("for-you");
  if (path === "/downloads") return findItem("downloads");

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
