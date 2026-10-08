import type { Redaction } from '@/types'
import { extractRegexEntities, isClaimed, valueKey, type DetectPiiOptions } from '@/lib/pdfPipeline'

export const DEFAULT_OLLAMA_URL = 'http://localhost:11434'
const URL_STORAGE_KEY = 'cloak:ollama:url'

export function normalizeOllamaUrl(url: string): string {
  return url.trim().replace(/\/+$/, '') || DEFAULT_OLLAMA_URL
}

export function getOllamaUrl(): string {
  try {
    return normalizeOllamaUrl(localStorage.getItem(URL_STORAGE_KEY) ?? '')
  } catch {
    return DEFAULT_OLLAMA_URL
  }
}

export function setOllamaUrl(url: string) {
  const value = normalizeOllamaUrl(url)
  try {
    if (value === DEFAULT_OLLAMA_URL) localStorage.removeItem(URL_STORAGE_KEY)
    else localStorage.setItem(URL_STORAGE_KEY, value)
  } catch {
    return
  }
}

export function isLocalOllamaUrl(url: string): boolean {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(normalizeOllamaUrl(url)).hostname)
  } catch {
    return false
  }
}
const PROBE_TIMEOUT_MS = 2000
const PAGE_TIMEOUT_MS = 180_000
const MAX_PAGE_CHARS = 20_000
const MODEL_OPTIONS = { num_ctx: 8192, num_predict: 4096, temperature: 0.2 }
const MAX_CONSECUTIVE_REPEATS = 3
const MAX_TOTAL_REPEATS = 6

export type OllamaModel = {
  name: string
  size: number // bytes
  parameterSize: string
  quantization: string
  family: string
}

export type OllamaProbeResult =
  | { status: 'available'; models: OllamaModel[] }
  | { status: 'unavailable' }
  | { status: 'cors_blocked' }


async function fetchModelCapabilities(name: string): Promise<string[] | null> {
  try {
    const res = await fetch(`${getOllamaUrl()}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const json = await res.json()
    return Array.isArray(json.capabilities) ? json.capabilities : null
  } catch {
    return null
  }
}

function isChatModelByHeuristic(m: { name: string; details?: { family?: string } }): boolean {
  const name = m.name.toLowerCase()
  const family = (m.details?.family ?? '').toLowerCase()
  return !name.includes('embed') && family !== 'bert' && family !== 'nomic-bert'
}

export async function probeOllama(): Promise<OllamaProbeResult> {
  // Step 1: normal fetch to get model list
  try {
    const res = await fetch(`${getOllamaUrl()}/api/tags`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    const json = await res.json()
    const rawModels: { name: string; size?: number; details?: { parameter_size?: string; quantization_level?: string; family?: string } }[] = json.models ?? []

    // Fetch capabilities for all models in parallel, filter to chat-capable only
    const withCapabilities = await Promise.all(
      rawModels.map(async (m) => {
        const capabilities = await fetchModelCapabilities(m.name)
        const isChat = capabilities
          ? capabilities.includes('completion')
          : isChatModelByHeuristic(m)
        return { m, isChat }
      })
    )

    const chatModels = withCapabilities
      .filter(({ isChat }) => isChat)
      .map(({ m }) => ({
        name: m.name,
        size: m.size ?? 0,
        parameterSize: m.details?.parameter_size ?? '',
        quantization: m.details?.quantization_level ?? '',
        family: m.details?.family ?? '',
      }))

    return { status: 'available', models: chatModels }
  } catch {
    // Step 2: no-cors fetch to distinguish "CORS blocked" from "not running"
    // - If Ollama is running: resolves with opaque response (status 0, no body)
    // - If Ollama is not running: rejects with TypeError (connection refused)
    try {
      await fetch(`${getOllamaUrl()}/api/tags`, {
        mode: 'no-cors',
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      })
      return { status: 'cors_blocked' }
    } catch {
      return { status: 'unavailable' }
    }
  }
}

export async function warmUpModel(model: string): Promise<void> {
  await fetch(`${getOllamaUrl()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'hi' }],
      stream: false,
      options: { ...MODEL_OPTIONS, num_predict: 1 },
    }),
  })
}

const ENTITY_LABELS: Record<string, string> = {
  Person: 'Person',
  Organization: 'Organization',
  Location: 'Location',
  Miscellaneous: 'Miscellaneous',
}

const PROMPT_TEMPLATE = `You are a privacy redaction assistant. Find the personal details in the text below that identify specific private individuals.

Return ONLY a JSON array. Each element: { "type": one of "Person"|"Organization"|"Location"|"Miscellaneous", "value": the exact text }

- Person: names of specific people, including full names, single first names or surnames that refer to a specific person, aliases, and people named in cited court cases
- Organization: ONLY organizations tied to a specific person, such as their employer, school, bank, or law firm. Never courts, government agencies, legislatures, or other public institutions
- Location: ONLY street addresses and cities or towns tied to where a specific person lives or works. Never countries, states, or places mentioned in general
- Miscellaneous: ONLY personal account or reference numbers that are not in a standard format, such as masked account numbers (e.g. "X4288")

Do NOT return any of these, they are handled separately: email addresses, phone numbers, Social Security numbers, credit card numbers, IBANs, IP addresses, passport or visa numbers, case numbers, license plates, dates of any kind including dates of birth, medical conditions, or medications

Rules:
- "value" must be the detail itself only, never the label or field name (e.g. for "Name: John Smith" return "John Smith", not "Name: John Smith")
- Copy each value exactly as it appears in the text, character for character
- One entity per item: never merge two entities into one value
- Never return job titles, roles (e.g. "Plaintiff", "Defendant", "Judge"), or generic words
- Return [] if none found`

type OllamaEntity = { type: string; value: string }

type OllamaChunk = {
  message?: { content?: string }
  done?: boolean
  done_reason?: string
  error?: string
  prompt_eval_count?: number
  eval_count?: number
  eval_duration?: number
}

const entityKey = (e: OllamaEntity) => `${e.type}:${e.value.toLowerCase()}`

function extractEntities(content: string): OllamaEntity[] {
  const entities: OllamaEntity[] = []
  for (const match of content.matchAll(/\{[^{}]*\}/g)) {
    try {
      const e = JSON.parse(match[0])
      if (typeof e?.type === 'string' && typeof e?.value === 'string' && e.value.trim().length >= 2) {
        entities.push({ type: e.type, value: e.value.trim() })
      }
    } catch {
      continue
    }
  }
  return entities
}

function findRepeatLoop(entities: OllamaEntity[]): string | null {
  const totals = new Map<string, number>()
  let prev = ''
  let streak = 0
  for (const e of entities) {
    const key = entityKey(e)
    streak = key === prev ? streak + 1 : 1
    prev = key
    const total = (totals.get(key) ?? 0) + 1
    totals.set(key, total)
    if (streak >= MAX_CONSECUTIVE_REPEATS || total >= MAX_TOTAL_REPEATS) return key
  }
  return null
}

function dedupeEntities(entities: OllamaEntity[]): OllamaEntity[] {
  const seen = new Set<string>()
  return entities.filter((e) => {
    const key = entityKey(e)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const MAX_VALUE_WORDS = 6
const MAX_VALUE_CHARS = 60

function appearsInText(value: string, text: string): boolean {
  const body = value
    .split(/\s+/)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+')
  return new RegExp(`(?<![\\p{L}\\p{N}_])${body}(?![\\p{L}\\p{N}_])`, 'iu').test(text)
}

function rejectReason(e: OllamaEntity, text: string, orgValues: string[]): string | null {
  const words = e.value.split(/\s+/)
  if (words.length > MAX_VALUE_WORDS || e.value.length > MAX_VALUE_CHARS) return 'too long'
  if (!appearsInText(e.value, text)) return 'not found in page text'
  if (e.type === 'Miscellaneous') return null
  if (!/\p{L}/u.test(e.value)) return 'no letters'
  if (e.value === e.value.toLowerCase()) return 'all lowercase'
  if (e.type === 'Person') {
    if (words.length > 4) return 'person longer than 4 words'
    if (words.length === 1 && e.value.length < 3) return 'single-word person too short'
    if (/\d/.test(e.value)) return 'person contains digits'
    const lower = e.value.toLowerCase()
    if (orgValues.some((org) => org.includes(lower))) return 'part of an organization name'
  }
  return null
}

function filterEntities(entities: OllamaEntity[], text: string): OllamaEntity[] {
  const orgValues = entities.filter((e) => e.type === 'Organization').map((e) => e.value.toLowerCase())
  const kept: OllamaEntity[] = []
  const dropped: { type: string; value: string; reason: string }[] = []
  for (const e of entities) {
    const reason = rejectReason(e, text, orgValues)
    if (reason) dropped.push({ ...e, reason })
    else kept.push(e)
  }
  if (dropped.length > 0) console.log(`[Ollama] filtered out ${dropped.length} entities:`, dropped)
  return kept
}

async function runOllamaPage(model: string, text: string, signal?: AbortSignal): Promise<OllamaEntity[]> {
  if (text.length > MAX_PAGE_CHARS) {
    console.warn(`[Ollama] page too long (${text.length} chars), using regex only`)
    return []
  }

  const loopStop = new AbortController()
  const combined = AbortSignal.any([loopStop.signal, AbortSignal.timeout(PAGE_TIMEOUT_MS), ...(signal ? [signal] : [])])
  const startedAt = performance.now()
  const elapsed = () => ((performance.now() - startedAt) / 1000).toFixed(1)
  console.log(`[Ollama] sending page: ${text.length} chars`)

  let content = ''
  let stopReason = 'unknown'
  let finalChunk: OllamaChunk | null = null

  try {
    const res = await fetch(`${getOllamaUrl()}/api/chat`, {
      signal: combined,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: PROMPT_TEMPLATE },
          { role: 'user', content: text },
        ],
        format: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['Person', 'Organization', 'Location', 'Miscellaneous'] },
              value: { type: 'string' },
            },
            required: ['type', 'value'],
          },
        },
        stream: true,
        think: model.startsWith('gpt-oss') ? 'low' : false,
        options: MODEL_OPTIONS,
      }),
    })
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    read: while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += value
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        const chunk: OllamaChunk = JSON.parse(line)
        if (chunk.error) throw new Error(chunk.error)
        content += chunk.message?.content ?? ''
        if (chunk.done) {
          finalChunk = chunk
          stopReason = chunk.done_reason ?? 'stop'
          break read
        }
      }
      const loopKey = findRepeatLoop(extractEntities(content))
      if (loopKey) {
        stopReason = `repeat loop on "${loopKey}"`
        console.warn(`[Ollama] repeat loop detected on "${loopKey}" after ${elapsed()}s, stopping generation`)
        loopStop.abort()
        break
      }
    }
  } catch (err) {
    if (signal?.aborted) throw err
    stopReason = err instanceof DOMException && err.name === 'TimeoutError' ? 'timeout' : `error: ${err}`
  }

  const returned = extractEntities(content)
  const unique = dedupeEntities(returned)
  const entities = filterEntities(unique, text)
  const tokensPerSec =
    finalChunk?.eval_count && finalChunk.eval_duration
      ? (finalChunk.eval_count / (finalChunk.eval_duration / 1e9)).toFixed(1)
      : null

  console.log('[Ollama] page done:', {
    stopReason,
    sec: elapsed(),
    promptTokens: finalChunk?.prompt_eval_count ?? null,
    outputTokens: finalChunk?.eval_count ?? null,
    tokensPerSec,
    itemsReturned: returned.length,
    unique: unique.length,
    keptAfterFilter: entities.length,
  })
  if (stopReason !== 'stop') {
    console.warn(`[Ollama] page stopped early (${stopReason}), salvaged ${unique.length} entities`)
  }
  console.log('[Ollama] entities:', entities)

  return entities
}

export async function detectPiiWithOllama(
  pageTexts: string[],
  model: string,
  { signal, onProgress }: Pick<DetectPiiOptions, 'signal' | 'onProgress'> = {}
): Promise<Redaction[]> {
  const total = pageTexts.length
  onProgress?.({ stage: 'scanning', done: 0, total, parallel: true })

  const pageResults: { pageNum: number; text: string; entities: OllamaEntity[]; regex: ReturnType<typeof extractRegexEntities> }[] = []
  for (let pageIdx = 0; pageIdx < total; pageIdx++) {
    signal?.throwIfAborted()
    const text = pageTexts[pageIdx]
    const entities = await runOllamaPage(model, text, signal)
    pageResults.push({ pageNum: pageIdx + 1, text, entities, regex: extractRegexEntities(text) })
    onProgress?.({ stage: 'scanning', done: pageIdx + 1, total, parallel: true })
  }

  const seen = new Set<string>()
  const redactions: Redaction[] = []

  for (const { pageNum, text, entities, regex } of pageResults) {
    for (const { type, value } of regex.entities) {
      const key = valueKey(value)
      if (seen.has(key)) continue
      seen.add(key)
      redactions.push({ id: crypto.randomUUID(), type, value, page: pageNum, approved: true })
    }

    for (const e of entities) {
      const type = ENTITY_LABELS[e.type] ?? e.type
      const value = e.value.trim()
      if (!value || isClaimed(value, text, regex.claimed)) continue
      const key = valueKey(value)
      if (seen.has(key)) continue
      seen.add(key)
      redactions.push({ id: crypto.randomUUID(), type, value, page: pageNum, approved: type !== 'Miscellaneous' })
    }
  }

  return redactions
}
