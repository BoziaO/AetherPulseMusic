// AetherPulse Web Vitals — pomiar Core Web Vitals (LCP, CLS, FID/INP, TTFB)
// bez zewnętrznej zależności. Używa Performance Observer API i przesyła wyniki
// do dowolnego callbacka (np. console.log w dev, sendBeacon w prod).

const observers = new Set();

function reportMetric(name, value, callback) {
  if (typeof callback === "function") {
    try {
      callback({ name, value, rating: rateMetric(name, value), id: performance.now().toString(36) });
    } catch (err) {
      console.warn("webVitals callback error:", err);
    }
  }
}

function rateMetric(name, value) {
  // Granice zgodne z web.dev / Google "Core Web Vitals"
  const thresholds = {
    LCP: [2500, 4000],     // ms
    CLS: [0.1, 0.25],
    INP: [200, 500],       // ms (zastąpiło FID w 2024)
    FID: [100, 300],       // ms
    TTFB: [800, 1800],     // ms
    FCP: [1800, 3000],     // ms
  };
  const range = thresholds[name];
  if (!range) return "unknown";
  if (value <= range[0]) return "good";
  if (value <= range[1]) return "needs-improvement";
  return "poor";
}

function observeLCP(callback) {
  if (typeof PerformanceObserver === "undefined") return;
  try {
    let lastEntry = null;
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      lastEntry = entries[entries.length - 1] || lastEntry;
    });
    obs.observe({ type: "largest-contentful-paint", buffered: true });
    observers.add(obs);

    // Final report on visibility hidden lub pageHide
    const finalize = () => {
      if (lastEntry) {
        reportMetric("LCP", lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime, callback);
      }
      obs.disconnect();
      observers.delete(obs);
    };
    addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") finalize();
    }, { once: true });
    addEventListener("pagehide", finalize, { once: true });
  } catch (err) {
    console.warn("LCP observer failed:", err.message);
  }
}

function observeCLS(callback) {
  if (typeof PerformanceObserver === "undefined") return;
  try {
    let cls = 0;
    let sessionValue = 0;
    let sessionEntries = [];

    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        const firstSessionEntry = sessionEntries[0];
        const lastSessionEntry = sessionEntries[sessionEntries.length - 1];
        if (
          sessionValue &&
          (entry.startTime - lastSessionEntry.startTime > 1000 ||
           entry.startTime - firstSessionEntry.startTime > 5000)
        ) {
          sessionValue = entry.value;
          sessionEntries = [entry];
        } else {
          sessionValue += entry.value;
          sessionEntries.push(entry);
        }
        if (sessionValue > cls) {
          cls = sessionValue;
        }
      }
    });
    obs.observe({ type: "layout-shift", buffered: true });
    observers.add(obs);

    const finalize = () => {
      reportMetric("CLS", Number(cls.toFixed(4)), callback);
      obs.disconnect();
      observers.delete(obs);
    };
    addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") finalize();
    }, { once: true });
    addEventListener("pagehide", finalize, { once: true });
  } catch (err) {
    console.warn("CLS observer failed:", err.message);
  }
}

function observeINP(callback) {
  if (typeof PerformanceObserver === "undefined") return;
  try {
    let maxINP = 0;
    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > maxINP) {
          maxINP = entry.duration;
        }
      }
    });
    // 'event' typ wymaga durationThreshold ≥ 16ms w nowych przeglądarkach
    obs.observe({ type: "event", durationThreshold: 40, buffered: true });
    observers.add(obs);

    const finalize = () => {
      if (maxINP > 0) reportMetric("INP", Math.round(maxINP), callback);
      obs.disconnect();
      observers.delete(obs);
    };
    addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") finalize();
    }, { once: true });
    addEventListener("pagehide", finalize, { once: true });
  } catch (err) {
    // Niektóre przeglądarki nie wspierają 'event' type
  }
}

function observeFCP(callback) {
  if (typeof PerformanceObserver === "undefined") return;
  try {
    const obs = new PerformanceObserver((list) => {
      const fcpEntry = list.getEntries().find((e) => e.name === "first-contentful-paint");
      if (fcpEntry) {
        reportMetric("FCP", Math.round(fcpEntry.startTime), callback);
        obs.disconnect();
        observers.delete(obs);
      }
    });
    obs.observe({ type: "paint", buffered: true });
    observers.add(obs);
  } catch (err) {
    console.warn("FCP observer failed:", err.message);
  }
}

function reportTTFB(callback) {
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav?.responseStart > 0) {
      reportMetric("TTFB", Math.round(nav.responseStart), callback);
    }
  } catch (err) {
    /* ignore */
  }
}

/**
 * Inicjalizuje pomiar wszystkich Core Web Vitals.
 * @param {(metric) => void} onReport callback wywoływany dla każdej metryki
 */
export function initWebVitals(onReport) {
  if (typeof window === "undefined") return;
  reportTTFB(onReport);
  observeLCP(onReport);
  observeCLS(onReport);
  observeINP(onReport);
  observeFCP(onReport);
}

/**
 * Zatrzymuje wszystkie aktywne observery (np. przed unmountem testów).
 */
export function disposeWebVitals() {
  observers.forEach((obs) => {
    try { obs.disconnect(); } catch { /* ignore */ }
  });
  observers.clear();
}

/**
 * Console reporter dla developmentu — koloruje wyniki wg ratingu.
 */
export function consoleReporter() {
  return (metric) => {
    const colors = { good: "#30d158", "needs-improvement": "#ff9f0a", poor: "#ff453a" };
    const color = colors[metric.rating] || "#888";
    console.log(
      `%c[WebVitals] ${metric.name}: ${metric.value}${typeof metric.value === "number" && metric.name !== "CLS" ? "ms" : ""} (${metric.rating})`,
      `color: ${color}; font-weight: bold`,
    );
  };
}
