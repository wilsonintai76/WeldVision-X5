import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        // Cloud migration: point proxy to Cloudflare Worker in dev
        // Set VITE_API_URL=https://weldvision-api.<subdomain>.workers.dev in .env.local
        // or keep the local Django backend URL for legacy dev mode
        target: process.env.VITE_API_URL || 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
