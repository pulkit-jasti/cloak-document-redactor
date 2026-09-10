# Cloak

Redact PII from PDFs entirely in your browser. No uploads, no server, no cloud: every byte stays on your machine.

Cloak runs a quantized NER model via [Transformers.js](https://github.com/huggingface/transformers.js) directly in the browser (WebGPU where available, WASM fallback everywhere else), combined with regex patterns for structured PII like phone numbers and SSNs.

## How it works

1. Drop a PDF → text is extracted client-side via pdf.js
2. NER model + regex detect PII in the extracted text
3. You review and approve/dismiss detections
4. Black-bar redactions are applied and you download the clean PDF

Everything runs locally. The model is fetched once and cached in the browser's Cache Storage.

## Stack

- **React 19 + TypeScript**: Vite scaffold
- **Transformers.js** (`@huggingface/transformers`): in-browser ML inference
- **ONNX Runtime (WASM/WebGPU)**: model execution backend
- **shadcn/ui** + **Tailwind CSS v4**: UI components
- **React Router v7**: client-side routing

## Browser support

| Browser       | Inference backend              |
| ------------- | ------------------------------ |
| Chrome / Edge | WebGPU (GPU)                   |
| Safari 18+    | WebGPU (GPU)                   |
| Firefox       | WASM (CPU): WebGPU behind flag |
| Other         | WASM (CPU)                     |

WASM works everywhere: just slower. For best performance use Chrome or Edge.

---

## Local setup

### Prerequisites

- Node.js 20+
- [git-lfs](https://git-lfs.com/): required to download model files

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
```

`VITE_MODEL_BASE_URL` points to the local model file server (step 4).  
`VITE_MODEL_ID` must match the folder name under `./models/`.

### 3. Download the model

Make sure git-lfs is installed (`git lfs install`), then:

```bash
mkdir -p models
cd models
git clone https://huggingface.co/Xenova/bert-base-NER bert-base-ner
cd ..
```

This clones ~90MB of model files (quantized ONNX + tokenizer) into `./models/bert-base-ner/`.

> The `models/` directory is gitignored: model files are never committed to this repo.

### 4. Start the model file server

In a separate terminal, serve the models directory with CORS enabled:

```bash
npx serve ./models --cors -p 8080
```

This makes the model accessible at `http://localhost:8080/bert-base-ner/...`. Transformers.js fetches files from here on first load, then caches them in the browser's Cache Storage: subsequent loads are instant.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---
