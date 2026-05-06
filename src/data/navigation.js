export const userProfile = {
  name: "Gosc",
  initials: "G",
  picture: null,
};

export const navigationGroups = [
  {
    title: "Menu",
    items: [
      { key: "home", label: "Glowna", path: "/", searchPlaceholder: "Szukaj muzyki..." },
      { key: "discover", label: "Odkrywaj", path: "/discover", searchPlaceholder: "Odkryj cos nowego..." },
    ],
  },
  {
    title: "Nastroj",
    items: [
      { key: "chill", label: "Relaks", path: "/chill", searchPlaceholder: "Szukaj spokojnych brzmien..." },
      { key: "energy", label: "Energia", path: "/energy", searchPlaceholder: "Szukaj mocnych utworow..." },
    ],
  },
  {
    title: "Biblioteka",
    items: [
      { key: "playlists", label: "Playlisty", path: "/playlists", searchPlaceholder: "Szukaj playlist..." },
      { key: "favorites", label: "Ulubione", path: "/favorites", searchPlaceholder: "Szukaj w ulubionych..." },
      { key: "recent", label: "Ostatnio grane", path: "/recent", searchPlaceholder: "Szukaj w historii..." },
      { key: "artists", label: "Wykonawcy", path: "/artists", searchPlaceholder: "Szukaj wykonawcow..." },
      { key: "albums", label: "Albumy", path: "/albums", searchPlaceholder: "Szukaj albumow..." },
    ],
  },
  {
    title: "System",
    items: [
      { key: "insights", label: "Statystyki", path: "/insights", searchPlaceholder: "Szukaj..." },
      { key: "settings", label: "Ustawienia", path: "/settings", searchPlaceholder: "Szukaj..." },
    ],
  },
];

export function getPageByPath(path) {
  if (path.startsWith("/artist/")) return navigationGroups[2].items.find((item) => item.key === "artists");
  if (path.startsWith("/album/")) return navigationGroups[2].items.find((item) => item.key === "albums");

  for (const group of navigationGroups) {
    const item = group.items.find((entry) => entry.path === path);
    if (item) return item;
  }
  return navigationGroups[0].items[0];
}
