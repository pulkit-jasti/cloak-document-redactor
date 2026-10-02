import NERPipeline, { ModelStatus } from "@/lib/nerPipeline"
import type { PageStats, Redaction } from "@/types"

export const ENTITY_LABELS: Record<string, string> = {
  PER: "Person",
  ORG: "Organization",
  LOC: "Location",
  MISC: "Miscellaneous",
}

const REGEX_PATTERNS: Array<{ type: string; pattern: RegExp }> = [
  { type: "Email", pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { type: "Phone", pattern: /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g },
  { type: "SSN", pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g },
]

const REGEX_ENABLED = import.meta.env.VITE_REGEX_ENABLED !== "false"

const CHUNK_WORDS = 200
const OVERLAP_WORDS = 30

function cleanTextForNer(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      line = line.replace(/https?:\/\/\S+/g, "")
      line = line.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}:\d{2}\b/g, "")
      line = line.replace(/\bL\d{6,}-\d+\b/g, "")
      line = line.replace(/#\s*\S+/g, "")
      return line
    })
    .filter((line) => /[a-zA-Z]{2,}/.test(line))
    .join("\n")
}

async function runNer(text: string) {
  const cleaned = cleanTextForNer(text)
  const words = cleaned.split(/\s+/).filter(Boolean)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += CHUNK_WORDS - OVERLAP_WORDS) {
    chunks.push(words.slice(i, i + CHUNK_WORDS).join(" "))
    if (i + CHUNK_WORDS >= words.length) break
  }
  return NERPipeline.run(chunks)
}

export function valueKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

export function extractRegexEntities(text: string): Array<{ type: string; value: string }> {
  if (!REGEX_ENABLED) return []
  const results: Array<{ type: string; value: string }> = []
  for (const { type, pattern } of REGEX_PATTERNS) {
    for (const match of text.matchAll(new RegExp(pattern.source, "g"))) {
      const value = match[0].trim()
      if (value) results.push({ type, value })
    }
  }
  return results
}

export type CloakProgress =
  | { stage: 'model'; percent: number }
  | { stage: 'reading' }
  | { stage: 'scanning'; done: number; total: number; parallel: boolean }
  | { stage: 'redacting' }

export type ExtractedPdf = { pageTexts: string[]; pageStats: PageStats[] }

export async function extractPdfTextPerPage(bytes: Uint8Array, signal?: AbortSignal): Promise<ExtractedPdf> {
  const worker = new Worker(
    new URL('../workers/mupdf.worker.ts', import.meta.url),
    { type: 'module' },
  )
  try {
    return await new Promise<ExtractedPdf>((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason)
      signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
      const handler = (e: MessageEvent) => {
        worker.removeEventListener('message', handler)
        if (e.data.type === 'textExtracted') resolve({ pageTexts: e.data.pageTexts, pageStats: e.data.pageStats })
        else reject(new Error(e.data.message ?? 'Text extraction failed'))
      }
      worker.addEventListener('message', handler)
      worker.onerror = reject
      worker.postMessage({ id: 0, type: 'extractText', bytes })
    })
  } finally {
    worker.terminate()
  }
}

export interface DetectPiiOptions {
  mode?: 'bert' | 'ollama'
  ollamaModel?: string
  signal?: AbortSignal
  onProgress?: (progress: CloakProgress) => void
}

export async function detectPii(pageTexts: string[], options: DetectPiiOptions = {}): Promise<Redaction[]> {
  const { mode = 'bert', ollamaModel, signal, onProgress } = options

  if (mode === 'ollama' && ollamaModel) {
    const { detectPiiWithOllama } = await import('@/lib/ollamaClient')
    try {
      return await detectPiiWithOllama(pageTexts, ollamaModel, { signal, onProgress })
    } catch (err) {
      if (signal?.aborted) throw err
      console.warn('[Cloak] Ollama failed, falling back to BERT:', err)
    }
  }

  await NERPipeline.getInstance((event) => {
    if (event.status === ModelStatus.Loading && event.total && event.progress != null) {
      onProgress?.({ stage: 'model', percent: event.progress })
    }
  })
  const seen = new Set<string>()
  const redactions: Redaction[] = []

  for (let pageIdx = 0; pageIdx < pageTexts.length; pageIdx++) {
    signal?.throwIfAborted()
    onProgress?.({ stage: 'scanning', done: pageIdx, total: pageTexts.length, parallel: false })
    const pageNum = pageIdx + 1
    const text = pageTexts[pageIdx]

    for (const { type, value } of extractRegexEntities(text)) {
      const key = valueKey(value)
      if (seen.has(key)) continue
      seen.add(key)
      redactions.push({ id: crypto.randomUUID(), type, value, page: pageNum, approved: true })
    }

    const nerResults = await runNer(text)
    for (const r of nerResults) {
      const group = r.entity_group
      if (!group) continue
      const value = r.word.trim()
      if (!value || value.startsWith("##") || value.length < 3) continue
      if (/^(email|phone|ssn|name|address|company|location|manager|fax|date|id)$/i.test(value)) continue
      const key = valueKey(value)
      if (seen.has(key)) continue
      seen.add(key)
      redactions.push({ id: crypto.randomUUID(), type: ENTITY_LABELS[group] ?? group, value, page: pageNum, approved: true })
    }

  }

  return redactions
}
