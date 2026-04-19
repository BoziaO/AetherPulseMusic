export const userProfile = {
  name: "Gość",
  initials: "G",
  picture: null,
};

export const navigationGroups = [
  {
    title: "Menu",
    items: [
      { key: "home", label: "Główna", path: "/", eyebrow: "Witaj w AetherPulseMusic", searchPlaceholder: "Szukaj ulubionej muzyki..." },
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
      { key: "favorites", label: "Ulubione", path: "/favorites", eyebrow: "Zapisane utwory", searchPlaceholder: "Szukaj i dodawaj ulubione..." },
      { key: "recent", label: "Ostatnio grane", path: "/recent", eyebrow: "Historia odsłuchu", searchPlaceholder: "Szukaj w historii..." },
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
    description: "Wyselekcjonowane utwory, szybkie playlisty i historia odsłuchu dopasowane do Twojego rytmu.",
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
    tertiarySection: {
      title: "Popularne piosenki",
      action: "Zobacz wszystkie",
      items: [
        { title: "Blinding Lights", subtitle: "The Weeknd", cover: "https://picsum.photos/seed/4/200/200", meta: "Single • 3:20", videoId: "4NRXx6U8ABQ" },
        { title: "Watermelon Sugar", subtitle: "Harry Styles", cover: "https://picsum.photos/seed/5/200/200", meta: "Single • 2:54", videoId: "E07s5ZYygMg" },
        { title: "Levitating", subtitle: "Dua Lipa", cover: "https://picsum.photos/seed/6/200/200", meta: "Single • 3:23", videoId: "TUVcZfQe-Kw" },
        { title: "Good 4 U", subtitle: "Olivia Rodrigo", cover: "https://picsum.photos/seed/7/200/200", meta: "Single • 2:58", videoId: "gNi_6U5Pm_o" },
        { title: "Stay", subtitle: "The Kid Laroi & Justin Bieber", cover: "https://picsum.photos/seed/8/200/200", meta: "Single • 2:21", videoId: "kTJczUoc26U" },
        { title: "Peaches", subtitle: "Justin Bieber ft. Daniel Caesar & Giveon", cover: "https://picsum.photos/seed/9/200/200", meta: "Single • 3:18", videoId: "tQ0yjYUFKAE" },
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
  },
  favorites: {
    key: "favorites",
    title: "Ulubione utwory",
    description: "Szybki dostęp do muzyki zapisanej podczas słuchania.",
    chips: ["Zapisane", "Szybki start", "Offline lista"],
    stats: [
      { label: "Ulubione", value: "0" },
      { label: "Źródło", value: "Local" },
      { label: "Tryb", value: "Fast" },
    ],
    primarySection: {
      title: "Twoje ulubione",
      action: "Dodawaj sercem",
      items: [],
    },
    secondarySection: {
      title: "Podpowiedź",
      action: "Słuchaj",
      items: [],
    },
    chartTitle: "Nawyk",
    chartItems: [],
    queueTitle: "Ulubiona kolejka",
    queueAction: "Odtwórz",
    queue: [],
  },
  recent: {
    key: "recent",
    title: "Ostatnio odtwarzane",
    description: "Wróć do utworów, które były odtwarzane w tej przeglądarce.",
    chips: ["Historia", "Szybki powrót", "Lokalnie"],
    stats: [
      { label: "Historia", value: "0" },
      { label: "Pamięć", value: "Local" },
      { label: "Limit", value: "25" },
    ],
    primarySection: {
      title: "Najnowsze odsłuchy",
      action: "Automatycznie",
      items: [],
    },
    secondarySection: {
      title: "Podpowiedź",
      action: "Odtwarzaj",
      items: [],
    },
    chartTitle: "Historia",
    chartItems: [],
    queueTitle: "Ostatnia kolejka",
    queueAction: "Odtwórz",
    queue: [],
  }
};
