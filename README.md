> [!WARNING]
> **Work in progress.** Cloak is under active development and not finished yet. Features, UI and behavior can change at any time, and detection is not perfect. Always review a redacted document before sharing it.

# Cloak

Redact personal information from PDFs entirely in your browser. No uploads, no server, no account: your document never leaves your device.

Live at [cloakdoc.app](https://cloakdoc.app). Desktop browsers only for now.

**English only.** Cloak is built for English-language documents only, and supporting other languages is not a goal. The detection model, regex patterns (US phone numbers and SSNs) and UI all assume English.

## How it works

1. **Pick a PDF.** It is read in the browser by [MuPDF](https://mupdf.com/) running as WebAssembly in a Web Worker. Text is extracted page by page. Pages that are only images (scans) are flagged, and a PDF with no text at all is rejected.
2. **Detect personal info.** Each page's text goes through:
   - a PII detection model running in the browser with [Transformers.js](https://github.com/huggingface/transformers.js), inside its own Web Worker, on the CPU (WebAssembly). Finds names, organizations, locations, addresses, IDs and more. See [Models](#models).
   - pattern matching for emails, phone numbers (US), US SSNs, credit cards, IBANs, IP addresses, dates of birth, passport, case, plate and other labeled ID numbers.
   - **Optional:** a local LLM through [Ollama](https://ollama.com/) instead of the built-in model. Falls back to the built-in model if Ollama fails.
3. **Locate every occurrence.** Each detected value is searched on every page using whole-word matching (so "Ann" never matches inside "Annual"). Detections with no match in the PDF are hidden.
4. **Review.** The edit page groups detections by category, with one card per unique value, the pages it appears on and its match count. Unchecking a card keeps that value everywhere in the document. You can also:
   - add your own text to redact,
   - with Ollama connected, describe what to redact in plain English (for example "hide the witnesses but keep the accused"),
   - pick images to remove and choose which external links to keep.
5. **Redact and download.** MuPDF applies true redactions: the text is removed from the file, not just covered with a box. Cloak also removes file properties and XMP metadata, image metadata, bookmarks, comments, attachments and form data, and flattens forms. The file downloads as `<original name>_redacted.pdf`.

### Privacy

- No accounts, analytics or cookies. Fonts are self-hosted.
- The PDF and its text never leave the browser.
- Network requests that do happen: the site's own files, the detection model (downloaded once from Hugging Face, then cached in the browser's Origin Private File System), the ONNX Runtime WebAssembly files (loaded by Transformers.js from `cdn.jsdelivr.net`), and, only in Ollama mode, requests to the user's own Ollama server (`http://localhost:11434` by default).
- `localStorage` holds only settings: the theme, the selected detection model, and the Ollama server URL and selected Ollama models.

### Models

| Model | Hugging Face repo | Download | License |
| ----- | ----------------- | -------- | ------- |
| PII Redactor (default) | [`Horizon-Labs/pii-redactor-small`](https://huggingface.co/Horizon-Labs/pii-redactor-small) | ~290 MB | Apache-2.0 |
| Gravitee PII Small | [`gravitee-io/bert-small-pii-detection`](https://huggingface.co/gravitee-io/bert-small-pii-detection) | ~29 MB | Apache-2.0 |

Both run as 8-bit quantized ONNX models on the CPU. Model files are not part of this repository; they keep their own licenses and notices.

## Stack

- **React 19 + TypeScript**, built with **Vite 8**
- **Tailwind CSS v4**, **shadcn/ui** (Radix), **lucide-react** icons, Geist font
- **React Router v7** (`BrowserRouter`)
- **MuPDF** (`mupdf` npm package, WASM): text extraction, rendering, search and redaction
- **Transformers.js v4** (`@huggingface/transformers`): in-browser PII detection on ONNX Runtime (WASM)
- **libphonenumber-js**, **validator** and **chrono-node**: phone, email, card, IBAN, IP and date matching
- **Ollama** (optional): local LLM detection over `http://localhost:11434`
- **vite-prerender-plugin**: pre-renders the landing page HTML for SEO
- **vite-plugin-svgr**: SVGs imported as React components (`*.svg?react`)
- **`cn` package** for class merging (replaces `clsx` + `tailwind-merge`). There is no `@/lib/utils`; import `cn` from `"cn"`.
- **Playwright**: end-to-end and detection-quality tests

## Project structure

```
src/
  App.tsx                    Routes: /, /verify, /preview, /edit (unknown paths redirect home and clear state)
  pages/
    UploadPage/              Landing page: hero, upload panel, marketing sections, FAQ, footer
    VerifyPage/              How to check that nothing is uploaded and that redactions are real
    PreviewPage.tsx          Redacted PDF preview, download, run time
    EditPage/                Review list (one card per unique value) + highlighted PDF
  components/                Navbar, PdfViewer, CtaButton, CloakingOverlay (loading screen), modals, shadcn ui/
  context/                   CloakContext (document state), ThemeContext, OllamaContext, NerModelContext
  hooks/                     useLeaveGuard (leave-page warning), useInView, useIsClient
  lib/
    pdfPipeline.ts           Text extraction, detection (NER + regex), progress reporting, cancellation
    nerModels.ts             Built-in model list, score thresholds, saved selection
    nerPipeline.ts           Main-thread client for the NER worker
    ollamaClient.ts          Ollama detection, custom instructions, probing and warm-up
    redactPdf.ts             Sends approved values to the MuPDF worker for redaction
  workers/
    mupdf.worker.ts          Load, render, whole-word search, redact, strip metadata, extract text
    ner.worker.ts            Loads the Transformers.js pipeline and runs NER
    opfsCache.ts             Caches model files in the Origin Private File System
  prerender.tsx              Pre-renders / and /verify, with per-page title, description and social tags
public/                      Favicons, manifest, robots.txt, sitemap.xml, llms.txt, OG image
test/                        Playwright specs, test PDFs and expected-PII fixtures
```

## Browser support

Cloak works in current desktop versions of Chrome, Edge, Firefox and Safari. Detection runs on the CPU through WebAssembly in every browser; the GPU (WebGPU) is not used yet. Mobile devices see a "desktop only" screen.

---

## Local setup

### Prerequisites

- Node.js 20.19+ or 22.12+ (required by Vite 8)
- [git-lfs](https://git-lfs.com/), only if you serve the model files locally (step 3)

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
VITE_MODEL_BASE_URL=http://localhost:8080
VITE_REGEX_ENABLED=true
VITE_MODEL_ENABLED=true
VITE_MODEL=
```

| Variable              | Purpose                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `VITE_MODEL_BASE_URL` | Local model file server (step 4). When set, models load from here. When empty, they load from Hugging Face. |
| `VITE_REGEX_ENABLED`  | Set to `false` to turn off regex detection (emails, phones, SSNs). Defaults to on.                        |
| `VITE_MODEL_ENABLED`  | Set to `false` to turn off model detection (built-in NER and Ollama) so only regex runs. Defaults to on.  |
| `VITE_MODEL`          | Playwright tests only. `pii-redactor-small` (default), `gravitee-pii-small`, or `ollama:<model>`. Not read by the app. |
| `VITE_TEST_SET`       | Playwright report only. Which fixture set to run: `1` (default), `2` or `sample`. Not read by the app.    |

### 3. Download the models (optional)

Skip this step and leave `VITE_MODEL_BASE_URL` empty to load models straight from Hugging Face.

With git-lfs installed (`git lfs install`), clone each model into a folder named after its id in `src/lib/nerModels.ts`:

```bash
mkdir -p models
cd models
git clone https://huggingface.co/Horizon-Labs/pii-redactor-small pii-redactor-small
git clone https://huggingface.co/gravitee-io/bert-small-pii-detection gravitee-pii-small
cd ..
```

Transformers.js loads the 8-bit model from `onnx/model_quantized.onnx`. The Gravitee repo keeps that file at the root as `model.quant.onnx`, so move it:

```bash
mkdir -p models/gravitee-pii-small/onnx
mv models/gravitee-pii-small/model.quant.onnx models/gravitee-pii-small/onnx/model_quantized.onnx
```

The `models/` directory is gitignored.

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

### Dev-only tools (`npm run dev`)

- A stopwatch on the loading screen.
- `window.__cloakEntities` and `window.__cloakOllamaModel`, read by the Playwright tests.
- The leave-page warning is turned off.

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

### Test documents

- All test PDFs are publicly available documents, used unchanged.
- Sources include justice.gov, House financial disclosures, ECHR, California WCAB, Hennepin County, county courts, UC Davis and arXiv.
- No private or leaked data. Any personal details were already made public by the source.
- Used only to measure detection quality. Rights stay with the original owners.
- Anyone named in a document, or who owns one, can open an issue in github to have it removed

## Known limitations

- **English only, by design.** Documents in other languages are not supported and won't be.
- **Text-based PDFs only.** Scanned or image-only pages are not read (no OCR yet); they are flagged so you can check them yourself.
- **Detection can miss things or over-redact.** Always review before sharing.
- **Categories are a guide, not a guarantee.** The model sometimes puts a value in the wrong category.
- **Matching needs the exact text.** If the PDF stores a value differently from the extracted text (ligatures, unusual spacing), it can't be located or redacted.
- **CPU only.** Detection doesn't use the GPU yet, so long documents take a while on slower computers.
- **Desktop only.** On phones and tablets the upload panel is replaced with a "desktop only" notice; the rest of the landing page still shows.
- **Nothing is saved.** Reloading or leaving `/preview` or `/edit` discards the document (you get a warning first).

## Why open source

I learned most of what I know from free tools, open source code and people who shared their knowledge without asking for anything back. Building free, open tools is my way of giving back. Cloak will always be free, and its code is open for anyone to read, learn from or improve.

For a privacy tool, open code also matters for trust: anyone can check that documents really never leave the browser.

## License

[AGPL-3.0-or-later](LICENSE). Cloak bundles [MuPDF](https://mupdf.com/), which is also licensed under AGPL-3.0.

Copyright (C) 2026 [Pulkit Jasti](https://github.com/pulkit-jasti).

Licenses of all third-party packages bundled into the site are listed at [cloakdoc.app/licenses.txt](https://cloakdoc.app/licenses.txt). The file is generated on every build by `rollup-plugin-license` (see `vite.config.ts`), and the build fails if a bundled package uses a license outside the allowed list.
