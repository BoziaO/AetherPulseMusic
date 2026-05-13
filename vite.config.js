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
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router')) return 'vendor'
          if (id.includes('node_modules/lucide')) return 'ui'
          if (id.includes('src/views/')) return 'views'
          if (id.includes('src/components/')) return 'components'
        }
      }
    }
  },
  preview: {
    port: 5000,
    host: "0.0.0.0",
  },
});
