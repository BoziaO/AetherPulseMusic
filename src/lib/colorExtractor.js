/**
 * Lightweight dominant color extraction from image URLs using HTML Canvas.
 * No external dependencies.
 */

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function hexToRgb(hex) {
  const c = hex.replace("#", "");
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

function getLuminance(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function colorDistance(c1, c2) {
  return Math.sqrt((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2);
}

/**
 * Extract dominant and accent colors from an image URL.
 * Returns { primary: string, secondary: string, bg: string }
 */
export function extractColors(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        const buckets = new Map();
        const bucketSize = 24;

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;

          // Skip near-grayscale
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (max - min < 20) continue;

          // Skip very dark / very light
          const lum = getLuminance(r, g, b);
          if (lum < 0.08 || lum > 0.94) continue;

          const br = Math.floor(r / bucketSize) * bucketSize;
          const bg_ = Math.floor(g / bucketSize) * bucketSize;
          const bb = Math.floor(b / bucketSize) * bucketSize;
          const key = `${br},${bg_},${bb}`;
          buckets.set(key, (buckets.get(key) || 0) + 1);
        }

        const sorted = Array.from(buckets.entries()).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) {
          resolve(null);
          return;
        }

        const dominantRgb = sorted[0][0].split(",").map(Number);
        let secondaryRgb = dominantRgb;

        // Find a contrasting secondary color
        for (let i = 1; i < sorted.length; i++) {
          const candidate = sorted[i][0].split(",").map(Number);
          if (colorDistance(dominantRgb, candidate) > 60) {
            secondaryRgb = candidate;
            break;
          }
        }

        const primary = rgbToHex(...dominantRgb);
        const secondary = rgbToHex(...secondaryRgb);

        // Generate a dark background tint from the primary
        const [dr, dg, db] = dominantRgb;
        const bg = rgbToHex(Math.floor(dr * 0.15), Math.floor(dg * 0.15), Math.floor(db * 0.15));

        resolve({ primary, secondary, bg });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

/**
 * Apply extracted colors as CSS custom properties.
 */
export function applyDynamicColors(colors) {
  const root = document.documentElement;
  if (!colors) {
    root.style.removeProperty("--dynamic-primary");
    root.style.removeProperty("--dynamic-secondary");
    root.style.removeProperty("--dynamic-bg");
    root.style.removeProperty("--dynamic-primary-rgb");
    return;
  }
  root.style.setProperty("--dynamic-primary", colors.primary);
  root.style.setProperty("--dynamic-secondary", colors.secondary);
  root.style.setProperty("--dynamic-bg", colors.bg);
  const [r, g, b] = hexToRgb(colors.primary);
  root.style.setProperty("--dynamic-primary-rgb", `${r}, ${g}, ${b}`);
}

/**
 * Clear dynamic color CSS variables.
 */
export function clearDynamicColors() {
  applyDynamicColors(null);
}
