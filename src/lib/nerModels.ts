export type NerModel = {
  id: string
  repo: string
  name: string
  summary: string
  size: string
  badge?: string
  device: 'wasm'
  dtype: 'q8' | 'fp32'
  minScore?: Record<string, number>
}

export const NER_MODELS: NerModel[] = [
  {
    id: 'pii-redactor-small',
    repo: 'Horizon-Labs/pii-redactor-small',
    name: 'PII Redactor',
    summary: '29 PII types',
    size: '~290 MB',
    badge: 'Recommended',
    device: 'wasm',
    dtype: 'q8',
    minScore: { Person: 0.5, Organization: 0.9, Location: 0.9, default: 0.4 },
  },
  {
    id: 'gravitee-pii-small',
    repo: 'gravitee-io/bert-small-pii-detection',
    name: 'Gravitee PII Small',
    summary: '26 PII types',
    size: '~29 MB',
    device: 'wasm',
    dtype: 'q8',
    minScore: { Person: 0.5, Organization: 0.75, Location: 0.75, default: 0.4 },
  },
]

export const DEFAULT_NER_MODEL_ID = 'pii-redactor-small'

export const NER_TASK = 'token-classification'

const STORAGE_KEY = 'cloak:ner:model'

export function getNerModel(id: string): NerModel {
  return NER_MODELS.find((m) => m.id === id) ?? NER_MODELS.find((m) => m.id === DEFAULT_NER_MODEL_ID)!
}

export function nerLoadOptions(id: string) {
  const { device, dtype } = getNerModel(id)
  return { device, dtype }
}

export function getSavedNerModelId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && NER_MODELS.some((m) => m.id === saved)) return saved
  } catch {
    return DEFAULT_NER_MODEL_ID
  }
  return DEFAULT_NER_MODEL_ID
}

export function saveNerModelId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    return
  }
}
