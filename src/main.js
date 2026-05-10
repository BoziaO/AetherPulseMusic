import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./index.css";
import "./styles/themes.css";
import { useTheme } from "./lib/useTheme";

// Initialize theme engine before first paint so CSS variables are live
useTheme();

createApp(App).use(router).mount("#app");

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
