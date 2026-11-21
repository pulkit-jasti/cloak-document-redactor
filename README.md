<p align="center">
  <a href="https://cloakdoc.app">
    <img src=".github/assets/cloak-banner.png" alt="Cloak: auto-redact personal info from PDFs">
  </a>
</p>

<p align="center">
  Redact personal information from PDFs entirely in your browser.<br>
  No uploads, no server, no account. Your document never leaves your device.
</p>

<p align="center">
  <a href="https://github.com/pulkit-jasti/cloak-document-redactor/actions/workflows/ci.yml"><img src="https://github.com/pulkit-jasti/cloak-document-redactor/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/pulkit-jasti/cloak-document-redactor" alt="License"></a>
</p>

<p align="center">
  <a href="https://cloakdoc.app"><strong>Try it</strong></a> ·
  <a href="https://cloakdoc.app/verify">Verify the privacy claims</a> ·
  <a href="https://github.com/pulkit-jasti/cloak-document-redactor/issues/new/choose">Report a bug</a>
</p>

> [!WARNING]
> **Work in progress.** Cloak is under active development. Detection is not perfect, so always review a redacted document before sharing it.

## Features

- **Fully local.** PDF reading, detection and redaction all run in your browser with WebAssembly.
- **Finds personal info automatically:** names, organizations, addresses, emails, phone numbers, SSNs, credit cards, IBANs, IDs and more.
- **Review before redacting.** Uncheck anything you want to keep, or add your own text to redact.
- **True redaction.** Text is removed from the file, not just covered with a black box.
- **Cleans hidden data:** metadata, bookmarks, comments, attachments and form data.
- **Works offline** once loaded.
- **Optional local LLM** through [Ollama](https://ollama.com/), including plain English instructions like "hide the witnesses but keep the accused".

## How it works

1. **Pick a PDF.** [MuPDF](https://mupdf.com/), running as WebAssembly, extracts the text page by page.
2. **Detect.** A PII detection model ([Transformers.js](https://github.com/huggingface/transformers.js)) and pattern matching find personal info.
3. **Review.** Detections are grouped by category, one card per value, with every page it appears on.
4. **Redact and download.** MuPDF removes the text for real and strips hidden data. You get `<name>_redacted.pdf`.

## Privacy

- No accounts, analytics or cookies.
- Your PDF and its text never leave the browser.
- The only network requests are the site's own files, the detection model (downloaded once, then cached), the ONNX Runtime files, and, only if you turn it on, your own local Ollama server.


## Models

| Model | Download | License |
| ----- | -------- | ------- |
| [Gravitee PII Small](https://huggingface.co/gravitee-io/bert-small-pii-detection) (default) | ~29 MB | Apache-2.0 |
| [PII Redactor](https://huggingface.co/Horizon-Labs/pii-redactor-small) (most accurate) | ~290 MB | Apache-2.0 |

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
git clone https://github.com/pulkit-jasti/cloak-document-redactor.git
cd cloak-document-redactor
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Models load from Hugging Face by default.

### Optional: serve the models locally

Useful if you want to work offline or avoid downloading from Hugging Face on every fresh browser profile. Needs [git-lfs](https://git-lfs.com/) (`git lfs install`).

```bash
mkdir -p models && cd models
git clone https://huggingface.co/Horizon-Labs/pii-redactor-small pii-redactor-small
git clone https://huggingface.co/gravitee-io/bert-small-pii-detection gravitee-pii-small
cd ..
mkdir -p models/gravitee-pii-small/onnx
mv models/gravitee-pii-small/model.quant.onnx models/gravitee-pii-small/onnx/model_quantized.onnx
```

The last two lines move the Gravitee model file to where Transformers.js expects it.

Then set `VITE_MODEL_BASE_URL=http://localhost:8080` in `.env.local` and start the model server in a second terminal:

```bash
npm run models
```

Restart `npm run dev` after changing `.env.local`.

### Optional: Ollama

Install [Ollama](https://ollama.com/), pull a chat model, and start it so it accepts requests from the dev server:

```bash
OLLAMA_ORIGINS=http://localhost:5173 ollama serve
```

Then use **Connect Ollama** on the landing page.

| Script | What it does |
| ------ | ------------ |
| `npm run dev` | Dev server |
| `npm run build` | Type check and production build |
| `npm run lint` | ESLint |
| `npm run test:smoke` | Playwright: runs the full pipeline on a test PDF |
| `npm run test:report` | Playwright: measures how much expected PII gets redacted |

## Built with

React, TypeScript, Vite, Tailwind CSS, shadcn/ui, [MuPDF](https://mupdf.com/), [Transformers.js](https://github.com/huggingface/transformers.js) and Playwright.

## Known limitations

- **English only**, by design.
- **Text-based PDFs only.** Scanned pages are flagged but not read (no OCR yet).
- **Detection can miss things or over-redact.** Always review before sharing.
- **Desktop browsers only** for now. Works in current Chrome, Edge, Firefox and Safari.

## Test documents

All test PDFs are publicly available documents (from sources like justice.gov, ECHR, county courts and arXiv), used unchanged and only to measure detection quality. Anyone named in a document can open an issue to have it removed.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). To report a vulnerability, see [SECURITY.md](SECURITY.md).

## Why open source

I learned most of what I know from free tools, open source code and people who shared their knowledge without asking for anything back. Building free, open tools is my way of giving back. Cloak will always be free, and its code is open for anyone to read, learn from or improve.

## License

[AGPL-3.0-or-later](LICENSE). Cloak bundles [MuPDF](https://mupdf.com/), which is also licensed under AGPL-3.0.

Copyright (C) 2026 [Pulkit Jasti](https://github.com/pulkit-jasti). Third-party licenses are listed at [cloakdoc.app/licenses.txt](https://cloakdoc.app/licenses.txt).
