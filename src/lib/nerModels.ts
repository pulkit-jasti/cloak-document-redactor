export type NerModel = {
  id: string
  repo: string
  name: string
  summary: string
  size: string
  badge?: string
  device: 'wasm' | 'webgpu'
  dtype: 'q8' | 'q4'
  decoder?: 'viterbi'
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
  },
  {
    id: 'privacy-filter',
    repo: 'openai/privacy-filter',
    name: 'Privacy Filter',
    summary: 'Most accurate, needs WebGPU',
    size: '~945 MB',
    badge: 'Max',
    device: 'webgpu',
    dtype: 'q4',
    decoder: 'viterbi',
  },
  {
    id: 'bert-base-ner',
    repo: 'Xenova/bert-base-NER',
    name: 'BERT Lite',
    summary: 'Names, orgs, places',
    size: '~110 MB',
    device: 'wasm',
    dtype: 'q8',
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
