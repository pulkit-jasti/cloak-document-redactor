import fs from "fs"
import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import license, { type Dependency } from "rollup-plugin-license"
import svgr from "vite-plugin-svgr"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import { vitePrerenderPlugin } from "vite-prerender-plugin"

// The main bundle and each worker are bundled separately, so every build adds its packages here and the merged list is written to dist/licenses.txt.
const LICENSES_FILE = path.resolve(import.meta.dirname, 'dist/licenses.txt')
// Hand-written entries the plugin can't find (CSS font, hosted models, missing license texts), added at the end.
const EXTRA_LICENSES_FILE = path.resolve(import.meta.dirname, 'third-party-extra.txt')
const bundledPackages = new Map<string, Dependency>()

const thirdPartyLicenses = () =>
  license({
    thirdParty: {
      allow: {
        test: '(MIT OR ISC OR Apache-2.0 OR BSD-2-Clause OR BSD-3-Clause OR 0BSD OR OFL-1.1 OR AGPL-3.0-or-later)',
        failOnUnlicensed: true,
        failOnViolation: true,
      },
      output: (deps) => {
        for (const dep of deps) bundledPackages.set(`${dep.name}@${dep.version}`, dep)
        const text = [...bundledPackages.values()]
          .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
          .map((dep) => dep.text())
          .join('\n\n---\n\n')
        fs.mkdirSync(path.dirname(LICENSES_FILE), { recursive: true })
        const extra = fs.readFileSync(EXTRA_LICENSES_FILE, 'utf8')
        fs.writeFileSync(LICENSES_FILE, `Third-party software bundled with Cloak\n\n${text}\n\n---\n\n${extra}`)
      },
    },
  })

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    svgr(),
    vitePrerenderPlugin({
      renderTarget: '#root',
      prerenderScript: path.resolve(import.meta.dirname, './src/prerender.tsx'),
    }),
    thirdPartyLicenses(),
    // Service worker for offline use. Only active in production builds (npm run build + preview).
    VitePWA({
      registerType: 'prompt',
      injectRegister: false, // registered from src/components/PwaToast.tsx
      manifest: false, // public/site.webmanifest is used as is
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,woff2,svg,png,ico,webmanifest,pdf}'],
        globIgnores: [
          // Unused copy of ONNX Runtime: Transformers.js loads it from jsdelivr and caches it with the model.
          '**/ort-wasm-*',
          // Build-time only, never loaded by the browser.
          '**/prerender-*',
        ],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // MuPDF's WASM is about 10 MB
        navigateFallback: '/index.html',
        // Real files (licenses.txt, sitemap.xml, llms.txt...) must not be answered with the app's HTML.
        navigateFallbackDenylist: [/\/[^/?]+\.[^/]+$/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Backup for the ONNX Runtime loader script, in case Transformers.js falls back to importing it directly.
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/onnxruntime-web@[^/]+\/dist\/.+\.mjs$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'onnxruntime',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 10 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['mupdf'],
  },
  worker: {
    format: 'es',
    plugins: () => [thirdPartyLicenses()],
  },
})
