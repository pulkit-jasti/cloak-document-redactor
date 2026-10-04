import NERPipeline, { ModelStatus, type NerEntity } from "@/lib/nerPipeline"
import { DEFAULT_NER_MODEL_ID } from "@/lib/nerModels"
import type { PageStats, Redaction } from "@/types"
import { findPhoneNumbersInText } from "libphonenumber-js"
import isEmail from "validator/es/lib/isEmail"
import isCreditCard from "validator/es/lib/isCreditCard"
import isIBAN from "validator/es/lib/isIBAN"
import isIP from "validator/es/lib/isIP"
import { strict as chrono } from "chrono-node"

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

const MIN_SCORE: Record<string, number> = {
  Person: 0.7,
  Organization: 0.85,
  Location: 0.85,
}
const DEFAULT_MIN_SCORE = 0.6

type Span = [number, number]

type PiiDetector = {
  type: string | null
  find: (text: string) => Span[]
}

function matchAndValidate(pattern: RegExp, isValid: (match: string) => boolean) {
  return (text: string): Span[] =>
    [...text.matchAll(pattern)].filter((m) => isValid(m[0])).map((m) => [m.index, m.index + m[0].length])
}

const ID_VALUE = String.raw`(?=[A-Z0-9:/-]*\d)[A-Z0-9][A-Z0-9:/-]{2,}[A-Z0-9]`

function labeledId(labels: string) {
  const pattern = new RegExp(String.raw`\b(?:${labels})\b[\s:#().]*(?:(?:no|num|number)\b\.?[\s:#().]*)?(${ID_VALUE})`, "gi")
  return (text: string): Span[] =>
    [...text.matchAll(pattern)].map((m) => {
      const start = m.index + m[0].length - m[1].length
      return [start, start + m[1].length]
    })
}

const TITLED_NAME = /\b(?:Dr|Mr|Mrs|Ms|Judge|Justice|SA|Agent|Officer|Commander|Sergeant|Sgt|Det|Detective|Inspector|Counsel)\.?[ \t]+([A-Z][a-zA-Z-]*(?:['’][A-Z][a-zA-Z-]+)?(?:[ \t]+[A-Z]\.)?(?:[ \t]+[A-Z][a-zA-Z-]*(?:['’][A-Z][a-zA-Z-]+)?)?)/g

function findTitledNames(text: string): Span[] {
  return [...text.matchAll(TITLED_NAME)].map((m) => {
    const start = m.index + m[0].length - m[1].length
    return [start, start + m[1].length]
  })
}

function findBirthDates(text: string): Span[] {
  const dates: Span[] = chrono
    .parse(text)
    .filter((r) => hasBirthContext(text, r.index))
    .map((r) => [r.index, r.index + r.text.length])
  for (const m of text.matchAll(/\b(?:year of birth|yob|dob|born(?:\s+in)?)\b[\s:]*((?:19|20)\d{2})\b/gi)) {
    const start = m.index + m[0].length - m[1].length
    dates.push([start, start + 4])
  }
  return dates
}

const PII_DETECTORS: PiiDetector[] = [
  {
    type: "Email",
    find: matchAndValidate(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (m) => isEmail(m)),
  },
  {
    type: "IP Address",
    find: (text) => [
      ...matchAndValidate(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, (m) => isIP(m, 4))(text),
      ...matchAndValidate(/(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{1,4}/g, (m) => isIP(m, 6))(text),
    ],
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
  {
    type: "Date of Birth",
    find: findBirthDates,
  },
  {
    type: "Passport",
    find: labeledId(String.raw`passport(?:\s+card)?`),
  },
  {
    type: "Visa",
    find: labeledId("visa"),
  },
  {
    type: "Case Number",
    find: (text) => [
      ...labeledId("case|file|docket|magistrate|application|adjudication")(text),
      ...matchAndValidate(/\b\d{1,2}:\d{2}-[a-z]{2,3}-\d{3,6}(?:-[A-Z]{2,4})*\b/gi, () => true)(text),
      ...matchAndValidate(/\b\d{2}-\d{4}-\d{6,8}(?:-[A-Z]{2,5})+\b/g, () => true)(text),
    ],
  },
  {
    type: "License Plate",
    find: labeledId(String.raw`(?:license\s+)?plate`),
  },
  {
    type: "ID Number",
    find: labeledId(String.raw`serial|sbn|badge|id|driver'?s\s+license|license`),
  },
  {
    type: "Person",
    find: findTitledNames,
  },
  {
    type: null,
    find: (text) => chrono.parse(text).map((r) => [r.index, r.index + r.text.length]),
  },
  {
    type: "Phone",
    find: (text) => findPhoneNumbersInText(text, "US").map((m) => [m.startsAt, m.endsAt]),
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

function titleCaseCapsRuns(line: string): string {
  return line.replace(/\b[A-Z][A-Z'’-]+(?:\s+[A-Z][A-Z'’.-]*)+\b/g, (run) =>
    run.replace(/[A-Z][A-Z'’-]*/g, (word) => word[0] + word.slice(1).toLowerCase()),
  )
}

function cleanTextForNer(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      line = line.replace(/https?:\/\/\S+/g, "")
      line = line.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}:\d{2}\b/g, "")
      line = line.replace(/\bL\d{6,}-\d+\b/g, "")
      line = line.replace(/#\s*\S+/g, "")
      return titleCaseCapsRuns(line)
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

const WORD_CHAR = /[\p{L}\p{N}]/u
const BIRTH_CONTEXT = /\b(dob|d\.o\.b|date of birth|birth\s?date|birthday|born|year of birth)\b/i
const BIRTH_WINDOW = 40

function hasBirthContext(text: string, index: number): boolean {
  return BIRTH_CONTEXT.test(text.slice(Math.max(0, index - BIRTH_WINDOW), index))
}

function isBirthDate(value: string, text: string): boolean {
  let i = text.indexOf(value)
  while (i !== -1) {
    if (hasBirthContext(text, i)) return true
    i = text.indexOf(value, i + 1)
  }
  return false
}

function snapToWords(word: string, text: string): string {
  const parts = word.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const body = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*')
  const whole = `(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`
  const exact = new RegExp(whole, 'u').exec(text) ?? new RegExp(whole, 'iu').exec(text)
  if (exact) return exact[0]
  const match = new RegExp(body, 'iu').exec(text)
  if (!match) return word.trim()
  let start = match.index
  let end = start + match[0].length
  while (start > 0 && WORD_CHAR.test(text[start - 1])) start--
  while (end < text.length && WORD_CHAR.test(text[end])) end++
  return text.slice(start, end)
}

function cleanPersonValue(value: string): string {
  const lines = value.split("\n").map((l) => l.trim()).filter(Boolean)
  const wordCount = (l: string) => l.split(/\s+/).length
  const longest = lines.reduce((best, l) => (wordCount(l) > wordCount(best) ? l : best), lines[0] ?? "")
  const words = (wordCount(longest) > 1 ? longest : lines.join(" ")).split(/\s+/)
  while (words.length > 1 && /^\p{Ll}/u.test(words[words.length - 1])) words.pop()
  return words.join(" ")
}

const NAME_SUFFIX =/^(jr|sr|ii|iii|iv|md|phd|esq)\.?$/i

export function spreadSurnames(redactions: Redaction[]): Redaction[] {
  const seen = new Set(redactions.map((r) => valueKey(r.value)))
  const added: Redaction[] = []
  for (const r of redactions) {
    if (r.type !== "Person") continue
    const words = r.value.replace(/,/g, " ").split(/\s+/).filter((w) => !NAME_SUFFIX.test(w))
    if (words.length < 2) continue
    const surname = words[words.length - 1].replace(/[^\p{L}'’-]/gu, "")
    if (surname.length < 3 || !/^\p{Lu}/u.test(surname)) continue
    const key = valueKey(surname)
    if (seen.has(key)) continue
    seen.add(key)
    added.push({ ...r, id: crypto.randomUUID(), value: surname })
  }
  return [...redactions, ...added]
}

export type RegexResult = { entities: Array<{ type: string; value: string }>; claimed: Span[] }

export function extractRegexEntities(text: string): RegexResult {
  const entities: Array<{ type: string; value: string }> = []
  const claimed: Span[] = []
  if (!REGEX_ENABLED) return { entities, claimed }
  for (const { type, find } of PII_DETECTORS) {
    for (const [start, end] of find(text)) {
      if (claimed.some(([s, e]) => start < e && end > s)) continue
      claimed.push([start, end])
      if (type) entities.push({ type, value: text.slice(start, end).trim() })
    }
  }
  return { entities, claimed }
}

export function isClaimed(value: string, text: string, claimed: Span[]): boolean {
  let i = text.indexOf(value)
  if (i === -1) return false
  while (i !== -1) {
    const end = i + value.length
    if (!claimed.some(([s, e]) => i < e && end > s)) return false
    i = text.indexOf(value, i + 1)
  }
  return true
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
      return spreadSurnames(await detectPiiWithOllama(pageTexts, ollamaModel, { signal, onProgress }))
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

  const claimedByPage: Span[][] = []

  const addNerResults = (nerResults: NerEntity[], pageNum: number, text: string) => {
    for (const r of nerResults) {
      const group = r.entity_group
      if (!group || group === 'MISC') continue
      const type = ENTITY_LABELS[group] ?? group
      if (r.score < (MIN_SCORE[type] ?? DEFAULT_MIN_SCORE)) continue
      const snapped = snapToWords(r.word.replace(/^##/, ''), text)
      const value = type === 'Person' ? cleanPersonValue(snapped) : snapped
      if (!value || value.length < 3) continue
      if (/^\p{Ll}/u.test(value) || /^[A-Z]{2,4}$/.test(value)) continue
      if (type === 'Date' && !isBirthDate(value, text)) continue
      if (isClaimed(value, text, claimedByPage[pageNum - 1])) continue
      if (/^(email|phone|ssn|name|address|company|location|manager|fax|date|id)$/i.test(value)) continue
      const key = valueKey(value)
      if (seen.has(key)) continue
      seen.add(key)
      redactions.push({ id: crypto.randomUUID(), type, value, page: pageNum, approved: true })
    }
  }

  for (let pageIdx = 0; pageIdx < pageTexts.length; pageIdx++) {
    signal?.throwIfAborted()
    onProgress?.({ stage: 'scanning', done: pageIdx, total: pageTexts.length, parallel: false })
    const pageNum = pageIdx + 1
    const text = pageTexts[pageIdx]

    const { entities, claimed } = extractRegexEntities(text)
    claimedByPage[pageIdx] = claimed
    for (const { type, value } of entities) {
      const key = valueKey(value)
      if (seen.has(key)) continue
      seen.add(key)
      redactions.push({ id: crypto.randomUUID(), type, value, page: pageNum, approved: true })
    }

    if (MODEL_ENABLED) addNerResults(await runNer(nerModel, text), pageNum, text)
  }

  return spreadSurnames(redactions)
}
