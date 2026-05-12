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
      // All /api/* → Cloudflare Worker (D1 + R2 + KV + Worker AI + Hono)
      // Django has been fully removed from the infrastructure.
      '/api': {
        target: process.env.VITE_WORKER_URL || 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
