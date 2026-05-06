import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5000,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL || "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5000,
    host: "0.0.0.0",
  },
});
