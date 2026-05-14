import path from "path"
import { readFileSync, writeFileSync } from "fs"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

/** Writes dist/version.json after every build so the running app can poll it. */
const versionJsonPlugin = (): Plugin => ({
  name: 'version-json',
  writeBundle(options) {
    const outDir = options.dir ?? 'dist'
    writeFileSync(
      path.resolve(outDir, 'version.json'),
      JSON.stringify({ version: pkg.version, buildTime: new Date().toISOString() })
    )
  },
})

export default defineConfig({
  plugins: [react(), versionJsonPlugin()],
  define: {
    // Injected at build time — available as __APP_VERSION__ in source code
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
