import * as pdfjsLib from "pdfjs-dist"
import NERPipeline from "@/lib/nerPipeline"
import type { TokenClassificationPipeline } from "@huggingface/transformers"
import type { Redaction } from "@/constants/mockData"

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

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href

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

export async function extractPdfTextPerPage(url: string): Promise<string[]> {
  const pdf = await pdfjsLib.getDocument({ url }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    type Item = { str: string; x: number; y: number }
    const items: Item[] = content.items.flatMap((item) => {
      if (!("str" in item) || !item.str.trim()) return []
      const [,, , , x, y] = item.transform as number[]
      return [{ str: item.str, x, y }]
    })

    const ROW_TOLERANCE = 4
    const rows = new Map<number, Item[]>()
    for (const item of items) {
      const key = [...rows.keys()].find((k) => Math.abs(k - item.y) <= ROW_TOLERANCE) ?? item.y
      const row = rows.get(key) ?? []
      row.push(item)
      rows.set(key, row)
    }

    pages.push(
      [...rows.entries()]
        .sort(([a], [b]) => b - a)
        .map(([, row]) => row.sort((a, b) => a.x - b.x).map((t) => t.str).join(" "))
        .join("\n")
    )
  }

  return pages
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
