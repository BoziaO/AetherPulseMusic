export function parseDurationSeconds(duration) {
  if (!duration || typeof duration !== "string") return 180;
  const parts = duration.split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return 180;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 180;
}

export function estimateEnergy(track) {
  const name = `${track?.title || ""} ${track?.artist || track?.subtitle || ""}`.toLowerCase();
  let energy = 50;
  const boosts = ["remix", "nightcore", "bass", "phonk", "hard", "edm", "dance", "trap", "drill"];
  const lowers = ["acoustic", "piano", "ambient", "lofi", "chill", "sleep", "sad", "ballad", "slow"];
  boosts.forEach((word) => {
    if (name.includes(word)) energy += 10;
  });
  lowers.forEach((word) => {
    if (name.includes(word)) energy -= 10;
  });
  const durationSec = parseDurationSeconds(track?.duration);
  if (durationSec < 150) energy += 6;
  if (durationSec > 320) energy -= 5;
  return Math.max(10, Math.min(95, energy));
}

export function getEnergyDescriptor(value) {
  if (value <= 28) return { labelKey: "moodSad", color: "#60a5fa" };
  if (value <= 45) return { labelKey: "moodCalm", color: "#22d3ee" };
  if (value <= 62) return { labelKey: "moodFlow", color: "#a78bfa" };
  if (value <= 78) return { labelKey: "moodEnergy", color: "#f59e0b" };
  return { labelKey: "moodLightning", color: "#f97316" };
}

