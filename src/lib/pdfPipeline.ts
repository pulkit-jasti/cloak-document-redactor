import NERPipeline from "@/lib/nerPipeline"
import type { TokenClassificationPipeline } from "@huggingface/transformers"
import type { Redaction } from "@/types"

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

async function runNer(text: string, pipe: TokenClassificationPipeline) {
  const cleaned = cleanTextForNer(text)
  const words = cleaned.split(/\s+/).filter(Boolean)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += CHUNK_WORDS - OVERLAP_WORDS) {
    chunks.push(words.slice(i, i + CHUNK_WORDS).join(" "))
    if (i + CHUNK_WORDS >= words.length) break
  }
  const results = await Promise.all(
    chunks.map((chunk) => pipe(chunk, { aggregation_strategy: "simple" }))
  )
  return results.flatMap((r) => Array.from(r as ArrayLike<(typeof r)[number]>))
}

function extractRegexEntities(text: string): Array<{ type: string; value: string }> {
  const results: Array<{ type: string; value: string }> = []
  for (const { type, pattern } of REGEX_PATTERNS) {
    for (const match of text.matchAll(new RegExp(pattern.source, "g"))) {
      const value = match[0].trim()
      if (value) results.push({ type, value })
    }
  }
  return results
}

export async function extractPdfTextPerPage(bytes: Uint8Array): Promise<string[]> {
  const worker = new Worker(
    new URL('../workers/mupdf.worker.ts', import.meta.url),
    { type: 'module' },
  )
  try {
    return await new Promise<string[]>((resolve, reject) => {
      const handler = (e: MessageEvent) => {
        worker.removeEventListener('message', handler)
        if (e.data.type === 'textExtracted') resolve(e.data.pageTexts as string[])
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

export async function detectPii(pageTexts: string[]): Promise<Redaction[]> {
  const pipe = await NERPipeline.getInstance()
  const seen = new Set<string>()
  const redactions: Redaction[] = []

  for (let pageIdx = 0; pageIdx < pageTexts.length; pageIdx++) {
    const pageNum = pageIdx + 1
    const text = pageTexts[pageIdx]

    const nerResults = await runNer(text, pipe)
    for (const r of nerResults) {
      const group = "entity_group" in r ? r.entity_group : undefined
      if (!group) continue
      const value = r.word.trim()
      if (!value || value.startsWith("##") || value.length < 3) continue
      if (/^(email|phone|ssn|name|address|company|location|manager|fax|date|id)$/i.test(value)) continue
      const key = `${group}:${value.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      redactions.push({ id: crypto.randomUUID(), type: ENTITY_LABELS[group] ?? group, value, page: pageNum, approved: true })
    }

    for (const { type, value } of extractRegexEntities(text)) {
      const key = `${type}:${value.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      redactions.push({ id: crypto.randomUUID(), type, value, page: pageNum, approved: true })
    }
  }

  return redactions
}
