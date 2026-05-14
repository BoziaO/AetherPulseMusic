import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./index.css";
import "./styles/themes.css";
import { useTheme } from "./lib/useTheme";
import { consoleReporter, initWebVitals } from "./lib/webVitals";

// Initialize theme engine before first paint so CSS variables are live
useTheme();

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.mount("#app");

// Web Vitals reporting — w dev: console, w prod: można podpiąć beacon do backendu.
initWebVitals(import.meta.env.DEV ? consoleReporter() : (metric) => {
  // W prod możemy wysyłać do /api/metrics (poza scope tego PR)
  if (typeof navigator.sendBeacon === "function") {
    try {
      const payload = JSON.stringify({ ...metric, ts: Date.now(), path: location.pathname });
      navigator.sendBeacon("/api/metrics/web-vitals", payload);
    } catch { /* ignore */ }
  }
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
