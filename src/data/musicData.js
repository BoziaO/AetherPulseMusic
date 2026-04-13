export const userProfile = {
  name: "Gość",
  initials: "G",
  picture: null,
};

export const navigationGroups = [
  {
    title: "Menu",
    items: [
      { key: "home", label: "Główna", path: "/", eyebrow: "Witaj w BoziaMusic", searchPlaceholder: "Szukaj ulubionej muzyki..." },
      { key: "discover", label: "Odkrywaj", path: "/discover", eyebrow: "Nowe brzmienia", searchPlaceholder: "Odkryj coś nowego..." },
    ],
  },
  {
    title: "Nastrój",
    items: [
      { key: "chill", label: "Relaks", path: "/chill", eyebrow: "Spokojny wieczór", searchPlaceholder: "Szukaj relaksu..." },
      { key: "energy", label: "Energia", path: "/energy", eyebrow: "Mocne uderzenie", searchPlaceholder: "Szukaj energii..." },
    ],
  },
  {
    title: "Biblioteka",
    items: [
      { key: "playlists", label: "Playlisty", path: "/playlists", eyebrow: "Twoje kolekcje", searchPlaceholder: "Szukaj w swoich playlistach..." },
      { key: "artists", label: "Wykonawcy", path: "/artists", eyebrow: "Ulubieni twórcy", searchPlaceholder: "Szukaj wykonawców..." },
      { key: "albums", label: "Albumy", path: "/albums", eyebrow: "Pełne wydania", searchPlaceholder: "Szukaj albumów..." },
    ],
  },
];

export function getPageByPath(path) {
  for (const group of navigationGroups) {
    const item = group.items.find((i) => i.path === path);
    if (item) return item;
  }
  return navigationGroups[0].items[0];
}

export const pageContent = {
  home: {
    key: "home",
    title: "Twoja codzienna dawka energii",
    description: "Wyselekcjonowane utwory specjalnie dla Twojego nastroju.",
    chips: ["Pop", "Electronic", "Lo-Fi", "Focus"],
    spotlightTitle: "Hit Dnia",
    spotlightText: "Najczęściej odtwarzany utwór dzisiaj.",
    spotlightItems: ["1. Super Song - Artist A", "2. Cool Track - Artist B"],
    stats: [
      { label: "Odsłuchań", value: "1,240" },
      { label: "Ulubionych", value: "85" },
      { label: "Playlist", value: "12" },
    ],
    primarySection: {
      title: "Rekomendacje",
      action: "Więcej",
      items: [
        { title: "Chill Morning", subtitle: "Relaksacyjne dźwięki", cover: "https://picsum.photos/seed/1/200/200", meta: "Playlist • 24 tracks" },
        { title: "Electro Rush", subtitle: "Szybkie tempo", cover: "https://picsum.photos/seed/2/200/200", meta: "Album • 12 tracks" },
      ],
    },
    secondarySection: {
      title: "Ostatnio odtwarzane",
      action: "Historia",
      items: [
        { title: "Midnight City", subtitle: "M83", cover: "https://picsum.photos/seed/3/200/200", meta: "Single" },
      ],
    },
    chartTitle: "Top Wykonawcy",
    chartItems: [
      { label: "#1", title: "Artist X", subtitle: "Pop", change: "+2" },
      { label: "#2", title: "Artist Y", subtitle: "Rock", change: "-1" },
    ],
    queueTitle: "Następne w kolejce",
    queueAction: "Zarządzaj",
    queue: [
      { title: "Song One", artist: "Artist One", detail: "Electronic", duration: "3:45", energy: 85 },
      { title: "Song Two", artist: "Artist Two", detail: "Lo-fi", duration: "4:20", energy: 40 },
    ],
  },
  playlists: {
    key: "playlists",
    title: "Twoje Playlisty",
    description: "Importuj i zarządzaj swoimi kolekcjami z YouTube.",
    chips: ["Zsynchronizowane", "Lokalne", "Ulubione"],
    spotlightTitle: "Importuj z YouTube",
    spotlightText: "Połącz konto Google, aby pobrać swoje playlisty.",
    spotlightItems: [],
    stats: [
      { label: "Playlisty YT", value: "0" },
      { label: "Zsynchronizowano", value: "0" },
    ],
    primarySection: {
      title: "Moje Playlisty",
      action: "Nowa playlista",
      items: [],
    },
    secondarySection: {
      title: "Odkryte playlisty",
      action: "Szukaj",
      items: [],
    },
    chartTitle: "Polecane",
    chartItems: [],
    queueTitle: "Piosenki w wybranej playliście",
    queueAction: "Odtwórz wszystko",
    queue: [],
  }
};
