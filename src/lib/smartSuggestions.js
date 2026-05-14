// AetherPulse Smart Suggestions — algorytm doboru muzyki na podstawie:
// - pory dnia (poranek, południe, popołudnie, wieczór, noc),
// - poziomu energii w niedawnej historii,
// - dnia tygodnia (weekend vs dni robocze),
// - ulubionych gatunków/artystów.
//
// Wynikiem jest "Mood" — wstępnie zdefiniowany preset z kolorami, opisem
// i sugerowanymi tagami wyszukiwania. UI Insights/Home może go wykorzystać
// do rekomendacji playlist.

/**
 * Czas dnia — używane też przez UI heatmapy.
 * Granice godzin są intuicyjne, dostosowane do polskiej pory dnia.
 */
export function getCurrentTimeOfDay(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 11) return "morning";       // 5–11
  if (h >= 11 && h < 14) return "noon";         // 11–14
  if (h >= 14 && h < 18) return "afternoon";    // 14–18
  if (h >= 18 && h < 23) return "evening";      // 18–23
  return "night";                               // 23–5
}

/**
 * Czy weekend? (sobota lub niedziela)
 */
export function isWeekend(now = new Date()) {
  const d = now.getDay();
  return d === 0 || d === 6;
}

/**
 * Mood presets — id, czas, gradient (do tła karty), tagi do wyszukiwania,
 * energy range (granice 0..100).
 *
 * `id` jest też używane jako klucz do i18n: `mood_${id}` i `moodDesc_${id}`.
 */
export const MOOD_PRESETS = [
  {
    id: "morning_focus",
    timeOfDay: "morning",
    weekendOnly: false,
    energyRange: [40, 75],
    gradient: ["#FFA17F", "#FFC371"],
    tags: ["morning coffee", "focus", "instrumental", "lo-fi beats", "productive"],
  },
  {
    id: "weekend_chill",
    timeOfDay: "morning",
    weekendOnly: true,
    energyRange: [20, 55],
    gradient: ["#a18cd1", "#fbc2eb"],
    tags: ["weekend chill", "soft pop", "acoustic", "lazy morning"],
  },
  {
    id: "noon_uplift",
    timeOfDay: "noon",
    weekendOnly: false,
    energyRange: [55, 90],
    gradient: ["#fad0c4", "#ff9a9e"],
    tags: ["upbeat pop", "energy boost", "feel good", "indie"],
  },
  {
    id: "afternoon_focus",
    timeOfDay: "afternoon",
    weekendOnly: false,
    energyRange: [45, 70],
    gradient: ["#84fab0", "#8fd3f4"],
    tags: ["deep focus", "concentration", "ambient", "post-rock"],
  },
  {
    id: "evening_relax",
    timeOfDay: "evening",
    weekendOnly: false,
    energyRange: [25, 60],
    gradient: ["#667eea", "#764ba2"],
    tags: ["evening unwind", "chillhop", "mellow", "indie folk"],
  },
  {
    id: "evening_party",
    timeOfDay: "evening",
    weekendOnly: true,
    energyRange: [70, 95],
    gradient: ["#ff6e7f", "#bfe9ff"],
    tags: ["weekend party", "dance hits", "club", "edm"],
  },
  {
    id: "night_dream",
    timeOfDay: "night",
    weekendOnly: false,
    energyRange: [10, 45],
    gradient: ["#0f2027", "#2c5364"],
    tags: ["sleep", "ambient", "dreampop", "late night vibes"],
  },
];

/**
 * Wybiera najlepiej dopasowany Mood na podstawie:
 * @param {Object} ctx
 * @param {number} [ctx.avgEnergy] — średnia energia w ostatniej historii (0..100)
 * @param {string[]} [ctx.favoriteGenres] — top gatunki (luzny match)
 * @param {Date} [ctx.now] — opcjonalny override "teraz" do testów
 * @returns {Object} mood preset
 */
export function getCurrentMood(ctx = {}) {
  const now = ctx.now instanceof Date ? ctx.now : new Date();
  const timeOfDay = getCurrentTimeOfDay(now);
  const weekend = isWeekend(now);
  const avgEnergy = Number.isFinite(ctx.avgEnergy) ? ctx.avgEnergy : 50;

  // Filtruj po pora_dnia + ewentualny weekend filter.
  let candidates = MOOD_PRESETS.filter((m) => m.timeOfDay === timeOfDay);
  if (weekend) {
    // W weekend preferujemy weekend-only jeśli istnieją, ale nie odrzucamy reszty
    const weekendVariants = candidates.filter((m) => m.weekendOnly);
    if (weekendVariants.length) candidates = weekendVariants;
  } else {
    candidates = candidates.filter((m) => !m.weekendOnly);
  }

  if (!candidates.length) candidates = MOOD_PRESETS;

  // Wybierz mood, którego energy range najlepiej obejmuje avgEnergy.
  // Jeśli avg jest poza zakresem — preferuj najbliższy.
  let best = candidates[0];
  let bestScore = Infinity;
  for (const mood of candidates) {
    const [low, high] = mood.energyRange;
    const inRange = avgEnergy >= low && avgEnergy <= high;
    const distance = inRange
      ? 0
      : Math.min(Math.abs(avgEnergy - low), Math.abs(avgEnergy - high));
    if (distance < bestScore) {
      best = mood;
      bestScore = distance;
    }
  }
  return best;
}

/**
 * Generuje query string do wyszukiwania w YouTube Music dla danego mood.
 * Może być kombinacją z ulubionymi gatunkami/artystami.
 */
export function buildMoodQuery(mood, { mixWithFavorites = [] } = {}) {
  const baseTags = mood.tags || [];
  const tag = baseTags[Math.floor(Math.random() * baseTags.length)] || "music";

  if (mixWithFavorites.length && Math.random() < 0.5) {
    const favorite = mixWithFavorites[Math.floor(Math.random() * mixWithFavorites.length)];
    return `${tag} ${favorite}`.trim();
  }
  return tag;
}
