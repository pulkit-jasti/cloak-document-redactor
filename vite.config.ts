import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import svgr from "vite-plugin-svgr"
import { defineConfig } from "vite"
import { vitePrerenderPlugin } from "vite-prerender-plugin"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    svgr(),
    vitePrerenderPlugin({
      renderTarget: '#root',
      prerenderScript: path.resolve(import.meta.dirname, './src/prerender.tsx'),
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
  },
})
