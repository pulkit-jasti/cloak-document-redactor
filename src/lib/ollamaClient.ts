import type { Redaction } from '@/types'
import { extractRegexEntities } from '@/lib/pdfPipeline'

const OLLAMA_BASE = 'http://localhost:11434'
const PROBE_TIMEOUT_MS = 2000

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
    const res = await fetch(`${OLLAMA_BASE}/api/show`, {
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
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
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
      await fetch(`${OLLAMA_BASE}/api/tags`, {
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
  await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'hi' }],
      stream: false,
      options: { temperature: 0, num_predict: 1 },
    }),
  })
}

const ENTITY_LABELS: Record<string, string> = {
  Person: 'Person',
  Organization: 'Organization',
  Location: 'Location',
  Miscellaneous: 'Miscellaneous',
}

const PROMPT_TEMPLATE = `You are a privacy redaction assistant. Extract all PII from the text below.

Return ONLY a JSON array. Each element: { "type": one of "Person"|"Organization"|"Location"|"Miscellaneous", "value": the PII value only }

- Person: full names, first names referring to a specific individual
- Organization: companies, institutions, agencies
- Location: addresses, cities, countries, landmarks
- Miscellaneous: account numbers, IDs, dates of birth, license plates

Rules:
- "value" must be the PII itself only, never include the label or field name (e.g. for "Name: John Smith" return "John Smith", not "Name: John Smith")
- No generic words/job titles
- No dates unless DOB
- Return [] if none found

Text:
`

type OllamaEntity = { type: string; value: string }

async function runOllamaPage(model: string, text: string): Promise<OllamaEntity[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: PROMPT_TEMPLATE + text }],
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
      stream: false,
      think: false,
      options: { temperature: 0 },
    }),
  })
  const json = await res.json()
  console.log('[Ollama] raw response:', json)
  try {
    const raw = (json.message?.content ?? '[]').replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    console.log('[Ollama] raw content after strip:', raw)
    const parsed = JSON.parse(raw || '[]')
    console.log('[Ollama] parsed entities:', parsed)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e: unknown) =>
        e !== null &&
        typeof e === 'object' &&
        'type' in e &&
        'value' in e &&
        typeof (e as OllamaEntity).value === 'string' &&
        (e as OllamaEntity).value.length >= 2
    )
  } catch (err) {
    console.error('[Ollama] parse error:', err)
    return []
  }
}

export async function detectPiiWithOllama(
  pageTexts: string[],
  model: string
): Promise<Redaction[]> {
  const pageResults = await Promise.all(
    pageTexts.map((text, pageIdx) =>
      Promise.all([
        runOllamaPage(model, text),
        Promise.resolve(extractRegexEntities(text)),
      ]).then(([entities, regexEntities]) => ({ pageNum: pageIdx + 1, text, entities, regexEntities }))
    )
  )

  const seen = new Set<string>()
  const redactions: Redaction[] = []

  for (const { pageNum, entities, regexEntities } of pageResults) {
    for (const e of entities) {
      const type = ENTITY_LABELS[e.type] ?? e.type
      const value = e.value.trim()
      if (!value) continue
      const key = `${type}:${value.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      redactions.push({ id: crypto.randomUUID(), type, value, page: pageNum, approved: true })
    }

    for (const { type, value } of regexEntities) {
      const key = `${type}:${value.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      redactions.push({ id: crypto.randomUUID(), type, value, page: pageNum, approved: true })
    }
  }

  return redactions
}
