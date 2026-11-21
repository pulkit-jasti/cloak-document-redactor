import fs from "fs"
import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import license, { type Dependency } from "rollup-plugin-license"
import svgr from "vite-plugin-svgr"
import { defineConfig } from "vite"
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
