import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/views': resolve(__dirname, 'src/views'),
      '@/lib': resolve(__dirname, 'src/lib'),
      '@/data': resolve(__dirname, 'src/data')
    }
  },
  // Optymalizacje dev servera — szybszy start
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'lucide-vue-next'],
    exclude: ['youtubei.js'], // ESM-only, nie wymaga pre-bundle
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // sourcemap włączamy tylko w dev — w prod oszczędzamy ~80% rozmiaru bundla
    sourcemap: process.env.NODE_ENV !== 'production',
    // Modern browsers tylko (mniejszy bundle, ESM nativnie)
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Drobnoziarniste chunki: vendor / ui / lazy views
        manualChunks(id) {
          // Lucide icons — duże, ale tree-shakeable; nie chunkujemy ich razem z vendor
          if (id.includes('node_modules/lucide-vue-next')) return 'ui'
          if (
            id.includes('node_modules/vue') ||
            id.includes('node_modules/vue-router') ||
            id.includes('node_modules/pinia')
          ) return 'vendor'
          // Lazy-loaded widoki — niech każdy ma swój chunk
          if (id.includes('src/views/ForYouPage.vue')) return 'view-foryou'
          if (id.includes('src/views/DownloadsPage.vue')) return 'view-downloads'
          if (id.includes('src/views/SettingsPage.vue')) return 'view-settings'
          if (id.includes('src/views/InsightsPage.vue')) return 'view-insights'
          // Reszta widoków razem (niewielkie)
          if (id.includes('src/views/')) return 'views'
          // Modale lazy-loaded (FullPlayer, Lyrics, Queue, Equalizer, LegalDisclaimer)
          if (
            id.includes('FullPlayer.vue') ||
            id.includes('LyricsModal.vue') ||
            id.includes('QueueModal.vue') ||
            id.includes('EqualizerModal.vue') ||
            id.includes('LegalDisclaimerModal.vue')
          ) return 'modals'
          if (id.includes('src/components/')) return 'components'
        },
        // Hashed nazwy plików dla immutable cache
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  preview: {
    port: 5000,
    host: "0.0.0.0",
  },
});
