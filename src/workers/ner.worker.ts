import {
  pipeline,
  env,
  type TokenClassificationPipeline,
  type ProgressInfo,
} from '@huggingface/transformers'

const MODEL_BASE_URL = import.meta.env.VITE_MODEL_BASE_URL as string
const MODEL_ID = import.meta.env.VITE_MODEL_ID as string
const IS_DEV = import.meta.env.VITE_ENV === 'development'

type InMsg = { type: 'load' } | { type: 'run'; id: number; chunks: string[] }

export type NerEntity = { entity_group?: string; word: string }

let pipePromise: Promise<TokenClassificationPipeline> | null = null

async function logDevInfo() {
  const adapter = await navigator.gpu?.requestAdapter().catch(() => null)
  console.log(`[Cloak] model ready: ${adapter ? 'webgpu' : 'wasm (cpu fallback)'}`)
  if (adapter?.info) console.log('[Cloak] GPU info', adapter.info)
}

function loadPipeline() {
  if (pipePromise) return pipePromise

  if (IS_DEV) {
    env.remoteHost = MODEL_BASE_URL
    env.remotePathTemplate = '{model}/'
    env.allowLocalModels = false
  }

  pipePromise = pipeline('token-classification', MODEL_ID, {
    progress_callback: (event: ProgressInfo) => self.postMessage({ type: 'progress', event }),
  }) as Promise<TokenClassificationPipeline>

  pipePromise.then(
    () => {
      if (IS_DEV) logDevInfo()
      self.postMessage({ type: 'ready' })
    },
    (err) => {
      pipePromise = null
      self.postMessage({ type: 'loadError', message: err instanceof Error ? err.message : String(err) })
    },
  )

  return pipePromise
}

self.onmessage = async (e: MessageEvent<InMsg>) => {
  const msg = e.data

  if (msg.type === 'load') {
    loadPipeline().catch(() => {})
    return
  }

  try {
    const pipe = await loadPipeline()
    const results: NerEntity[] = []
    for (const chunk of msg.chunks) {
      const output = await pipe(chunk, { aggregation_strategy: 'simple' })
      for (const r of Array.from(output as ArrayLike<(typeof output)[number]>)) {
        results.push({ entity_group: 'entity_group' in r ? r.entity_group : undefined, word: r.word })
      }
    }
    self.postMessage({ type: 'result', id: msg.id, results })
  } catch (err) {
    self.postMessage({ type: 'runError', id: msg.id, message: err instanceof Error ? err.message : String(err) })
  }
}
