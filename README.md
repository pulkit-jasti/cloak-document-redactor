> [!WARNING]
> **Work in progress.** Cloak is under active development and not finished yet. Features, UI and behavior can change at any time, and detection is not perfect. Always review a redacted document before sharing it.

# Cloak

Redact personal information from PDFs entirely in your browser. No uploads, no server, no account: your document never leaves your device.

Live at [cloakdoc.app](https://cloakdoc.app). Desktop browsers only for now.

**English only.** Cloak is built for English-language documents only, and supporting other languages is not a goal. The detection model, regex patterns (US phone numbers and SSNs) and UI all assume English.

## How it works

1. **Pick a PDF.** It is read in the browser by [MuPDF](https://mupdf.com/) running as WebAssembly in a Web Worker. Text is extracted page by page. Pages that are only images (scans) are flagged, and a PDF with no text at all is rejected.
2. **Detect personal info.** Each page's text goes through:
   - a NER model ([`Xenova/bert-base-NER`](https://huggingface.co/Xenova/bert-base-NER)) running in the browser with [Transformers.js](https://github.com/huggingface/transformers.js), inside its own Web Worker (WebGPU when available, WASM otherwise). Finds people, organizations, locations and miscellaneous entities.
   - regex patterns for emails, phone numbers and US SSNs.
   - **Optional:** a local LLM through [Ollama](https://ollama.com/) instead of the built-in model. Falls back to the built-in model if Ollama fails.
3. **Locate every occurrence.** Each detected value is searched on every page using whole-word matching (so "Ann" never matches inside "Annual"). Detections with no match in the PDF are hidden.
4. **Review.** The edit page lists one card per unique value with the pages it appears on and its match count. Unchecking a card keeps that value everywhere in the document.
5. **Redact and download.** MuPDF applies true redactions: the text is removed from the file, not just covered with a box. The file downloads as `<original name>_redacted.pdf`.

### Privacy

- No accounts, analytics or cookies. Fonts are self-hosted.
- The PDF and its text never leave the browser.
- Network requests that do happen: the site's own files, the detection model (downloaded once from Hugging Face, then cached in the browser's Cache Storage), and, only in Ollama mode, requests to the user's own Ollama server on `localhost`.
- `localStorage` holds only the theme and the selected Ollama model.

## Stack

- **React 19 + TypeScript**, built with **Vite 8**
- **Tailwind CSS v4**, **shadcn/ui** (Radix), **lucide-react** icons, Geist font
- **React Router v7** (`BrowserRouter`)
- **MuPDF** (`mupdf` npm package, WASM): text extraction, rendering, search and redaction
- **Transformers.js v4** (`@huggingface/transformers`): in-browser NER on ONNX Runtime (WebGPU/WASM)
- **Ollama** (optional): local LLM detection over `http://localhost:11434`
- **vite-prerender-plugin**: pre-renders the landing page HTML for SEO
- **vite-plugin-svgr**: SVGs imported as React components (`*.svg?react`)
- **`cn` package** for class merging (replaces `clsx` + `tailwind-merge`). There is no `@/lib/utils`; import `cn` from `"cn"`.
- **Playwright**: end-to-end and detection-quality tests

## Project structure

```
src/
  App.tsx                    Routes: /, /preview, /edit (unknown paths redirect home and clear state)
  pages/
    UploadPage/              Landing page: hero, upload panel, marketing sections, FAQ, footer
    PreviewPage.tsx          Redacted PDF preview, download, run time
    EditPage/                Review list (one card per unique value) + highlighted PDF
  components/                Navbar, PdfViewer, CtaButton, CloakingOverlay (loading screen), modals, shadcn ui/
  context/                   CloakContext (document state), ThemeContext, OllamaContext
  lib/
    pdfPipeline.ts           Text extraction, detection (NER + regex), progress reporting, cancellation
    nerPipeline.ts           Main-thread client for the NER worker
    ollamaClient.ts          Ollama detection, probing and warm-up
    redactPdf.ts             Sends approved values to the MuPDF worker for redaction
  workers/
    mupdf.worker.ts          Load, render, whole-word search, redact, extract text
    ner.worker.ts            Loads the Transformers.js pipeline and runs NER
  prerender.tsx              Landing page pre-render entry
public/                      Favicons, manifest, robots.txt, sitemap.xml, llms.txt, OG image
test/                        Playwright specs, test PDFs and expected-PII fixtures
```

## Browser support

| Browser       | Inference backend               |
| ------------- | ------------------------------- |
| Chrome / Edge | WebGPU (GPU)                    |
| Safari 18+    | WebGPU (GPU)                    |
| Firefox       | WASM (CPU), WebGPU behind flag  |
| Other         | WASM (CPU)                      |

WASM works everywhere, just slower. Mobile devices see a "desktop only" screen.

---

## Local setup

### Prerequisites

- Node.js 20+
- [git-lfs](https://git-lfs.com/), needed to download the model files

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Then fill in `.env.local`:

```
VITE_ENV=development
VITE_MODEL_BASE_URL=http://localhost:8080
VITE_MODEL_ID=bert-base-ner
VITE_REGEX_ENABLED=true
```

| Variable              | Purpose                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `VITE_ENV`            | `development` loads the model from `VITE_MODEL_BASE_URL` and enables dev tools (see below).               |
| `VITE_MODEL_BASE_URL` | Local model file server (step 4). Only used in development.                                               |
| `VITE_MODEL_ID`       | In development, the folder name under `./models/`. In production, the Hugging Face model id.              |
| `VITE_REGEX_ENABLED`  | Set to `false` to turn off regex detection (emails, phones, SSNs). Defaults to on.                        |
| `VITE_MODEL`          | Optional. `ollama:<model>` preselects an Ollama model; also used by the Playwright tests.                  |

### 3. Download the model

With git-lfs installed (`git lfs install`):

```bash
mkdir -p models
cd models
git clone https://huggingface.co/Xenova/bert-base-NER bert-base-ner
cd ..
```

The repo contains several ONNX variants (over 1 GB in total); Transformers.js only loads the one it needs. The `models/` directory is gitignored.

### 4. Start the model file server

In a separate terminal:

```bash
npm run models
```

This serves `./models` with CORS on port 8080. Transformers.js fetches the files on first load and then caches them in the browser.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Optional: Ollama

Install [Ollama](https://ollama.com/) and pull a chat model. Ollama must allow requests from the app's origin, so start it with:

```bash
OLLAMA_ORIGINS=http://localhost:5173 ollama serve
```

Then use **Connect Ollama** on the landing page and pick a model in the model selector. The app shows the exact command for your OS.

### Dev-only tools (`VITE_ENV=development`)

- A "Load model" pill in the corner that preloads the NER model and shows download progress.
- A stopwatch on the loading screen.
- A console line after each run: `[Cloak] Cloaked in 12.4s | model: <model> | pages: <n>`.

## Scripts

| Script                | What it does                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run dev`         | Vite dev server                                                                                  |
| `npm run build`       | Type check, then production build with the pre-rendered landing page                             |
| `npm run preview`     | Serve the production build                                                                       |
| `npm run lint`        | ESLint (also runs on staged files through husky + lint-staged)                                   |
| `npm run models`      | Local model file server on port 8080                                                             |
| `npm run test:smoke`  | Playwright: uploads a test PDF, runs the full pipeline and downloads the result                  |
| `npm run test:report` | Playwright: runs the fixture PDFs and reports how much of the expected PII was redacted          |

The tests need the dev server running, plus the model server (`npm run models`) or, for Ollama runs (`VITE_MODEL=ollama:<model>`), Ollama on port 11434. Results are written to `test/results/` (gitignored).

## Known limitations

- **English only, by design.** Documents in other languages are not supported and won't be.
- **Text-based PDFs only.** Scanned or image-only pages are not read (no OCR yet); they are flagged so you can check them yourself.
- **Detection can miss things or over-redact.** Always review before sharing.
- **Entity categories are unreliable** with the current models, so there are no per-type filters yet.
- **Matching needs the exact text.** If the PDF stores a value differently from the extracted text (ligatures, unusual spacing), it can't be located or redacted.
- **No manual additions yet.** You can't add text the model missed.
- **Desktop only.** The mobile screen also hides the landing page content from mobile crawlers.
- **No leave-page warning yet.** Reloading or leaving `/preview` or `/edit` discards the document.

## License

[AGPL-3.0-or-later](LICENSE). Cloak bundles [MuPDF](https://mupdf.com/), which is also licensed under AGPL-3.0.

Copyright (C) 2026 [Pulkit Jasti](https://github.com/pulkit-jasti).
