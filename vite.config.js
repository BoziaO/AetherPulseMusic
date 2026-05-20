import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const isElectron = process.env.VITE_ELECTRON === 'true'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/views': resolve(__dirname, 'src/views'),
      '@/lib': resolve(__dirname, 'src/lib'),
      '@/data': resolve(__dirname, 'src/data')
    }
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'lucide-vue-next'],
  },
  define: {
    'process.env.VITE_ELECTRON': JSON.stringify(isElectron),
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        passes: 2,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/lucide-vue-next')) return 'ui'
          if (
            id.includes('node_modules/vue') ||
            id.includes('node_modules/vue-router') ||
            id.includes('node_modules/pinia')
          ) return 'vendor'
          if (id.includes('src/views/ForYouPage.vue')) return 'view-foryou'
          if (id.includes('src/views/DownloadsPage.vue')) return 'view-downloads'
          if (id.includes('src/views/SettingsPage.vue')) return 'view-settings'
          if (id.includes('src/views/InsightsPage.vue')) return 'view-insights'
          if (id.includes('src/views/')) return 'views'
          if (
            id.includes('FullPlayer.vue') ||
            id.includes('LyricsModal.vue') ||
            id.includes('QueueModal.vue') ||
            id.includes('EqualizerModal.vue') ||
            id.includes('LegalDisclaimerModal.vue')
          ) return 'modals'
          if (id.includes('src/components/')) return 'components'
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  preview: {
    port: 5000,
    host: '0.0.0.0',
  },
});

