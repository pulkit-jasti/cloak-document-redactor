import NERPipeline, { ModelStatus } from "@/lib/nerPipeline"
import { DEFAULT_NER_MODEL_ID } from "@/lib/nerModels"
import type { PageStats, Redaction } from "@/types"
import { findPhoneNumbersInText } from "libphonenumber-js"
import isEmail from "validator/es/lib/isEmail"
import isCreditCard from "validator/es/lib/isCreditCard"
import isIBAN from "validator/es/lib/isIBAN"

export const ENTITY_LABELS: Record<string, string> = {
  PER: "Person",
  ORG: "Organization",
  LOC: "Location",
  MISC: "Miscellaneous",
  PERSON: "Person",
  ORGANIZATION: "Organization",
  LOCATION: "Location",
  STREET_ADDRESS: "Address",
  POSTCODE: "Postcode",
  COORDINATE: "Coordinates",
  EMAIL: "Email",
  PHONE: "Phone",
  URL: "URL",
  USERNAME: "Username",
  PASSWORD: "Password",
  SECRET: "Secret",
  DATE: "Date",
  DATE_OF_BIRTH: "Date of Birth",
  AGE: "Age",
  NATIONAL_ID: "National ID",
  TAX_ID: "Tax ID",
  PASSPORT: "Passport",
  DRIVER_LICENSE: "Driver License",
  LICENSE_NUMBER: "License Number",
  MEDICAL_ID: "Medical ID",
  VEHICLE_ID: "Vehicle ID",
  ACCOUNT_ID: "Account ID",
  BANK_ACCOUNT: "Bank Account",
  CREDIT_CARD: "Credit Card",
  CREDIT_CARD_CVV: "Card CVV",
  IP_ADDRESS: "IP Address",
  MAC_ADDRESS: "MAC Address",
  DEVICE_ID: "Device ID",
}

type Span = [number, number]

type PiiDetector = {
  type: string
  find: (text: string) => Span[]
}

function matchAndValidate(pattern: RegExp, isValid: (match: string) => boolean) {
  return (text: string): Span[] =>
    [...text.matchAll(pattern)].filter((m) => isValid(m[0])).map((m) => [m.index, m.index + m[0].length])
}

const PII_DETECTORS: PiiDetector[] = [
  {
    type: "Email",
    find: matchAndValidate(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (m) => isEmail(m)),
  },
  {
    type: "Phone",
    find: (text) => findPhoneNumbersInText(text, "US").map((m) => [m.startsAt, m.endsAt]),
  },
  {
    type: "Credit Card",
    find: matchAndValidate(/\b(?:\d[ -]?){12,18}\d\b/g, (m) => isCreditCard(m.replace(/[ -]/g, ""))),
  },
  {
    type: "IBAN",
    find: matchAndValidate(/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/g, (m) => isIBAN(m.replace(/ /g, ""))),
  },
  {
    type: "SSN",
    find: matchAndValidate(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, isValidSsn),
  },
]

function isValidSsn(match: string): boolean {
  const digits = match.replace(/\D/g, "")
  const area = digits.slice(0, 3)
  return area !== "000" && area !== "666" && area[0] !== "9" && digits.slice(3, 5) !== "00" && digits.slice(5) !== "0000"
}

const REGEX_ENABLED = import.meta.env.VITE_REGEX_ENABLED !== "false"
const MODEL_ENABLED = import.meta.env.VITE_MODEL_ENABLED !== "false"

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

async function runNer(modelId: string, text: string) {
  const cleaned = cleanTextForNer(text)
  const words = cleaned.split(/\s+/).filter(Boolean)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += CHUNK_WORDS - OVERLAP_WORDS) {
    chunks.push(words.slice(i, i + CHUNK_WORDS).join(" "))
    if (i + CHUNK_WORDS >= words.length) break
  }
  return NERPipeline.run(modelId, chunks)
}

export function valueKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

export function extractRegexEntities(text: string): Array<{ type: string; value: string }> {
  if (!REGEX_ENABLED) return []
  const results: Array<{ type: string; value: string }> = []
  const taken: Span[] = []
  for (const { type, find } of PII_DETECTORS) {
    for (const [start, end] of find(text)) {
      if (taken.some(([s, e]) => start < e && end > s)) continue
      taken.push([start, end])
      results.push({ type, value: text.slice(start, end).trim() })
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
  mode?: 'ner' | 'ollama'
  nerModel?: string
  ollamaModel?: string
  signal?: AbortSignal
  onProgress?: (progress: CloakProgress) => void
}

export async function detectPii(pageTexts: string[], options: DetectPiiOptions = {}): Promise<Redaction[]> {
  const { mode = 'ner', nerModel = DEFAULT_NER_MODEL_ID, ollamaModel, signal, onProgress } = options

  if (MODEL_ENABLED && mode === 'ollama' && ollamaModel) {
    const { detectPiiWithOllama } = await import('@/lib/ollamaClient')
    try {
      return await detectPiiWithOllama(pageTexts, ollamaModel, { signal, onProgress })
    } catch (err) {
      if (signal?.aborted) throw err
      console.warn('[Cloak] Ollama failed, falling back to NER:', err)
    }
  }

  if (MODEL_ENABLED) {
    await NERPipeline.getInstance(nerModel, (event) => {
      if (event.status === ModelStatus.Loading && event.total && event.progress != null) {
        onProgress?.({ stage: 'model', percent: event.progress })
      }
    })
  }
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

    const nerResults = MODEL_ENABLED ? await runNer(nerModel, text) : []
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
