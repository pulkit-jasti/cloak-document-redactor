import {
  pipeline,
  env,
  ModelRegistry,
  type TokenClassificationPipeline,
  type ProgressInfo,
} from '@huggingface/transformers'
import { NER_TASK, getNerModel, nerLoadOptions } from '@/lib/nerModels'
import { isOpfsAvailable, opfsCache } from './opfsCache'

const MODEL_BASE_URL = (import.meta.env.VITE_MODEL_BASE_URL as string | undefined)?.trim()
const USE_LOCAL_MODELS = !!MODEL_BASE_URL

if (USE_LOCAL_MODELS) {
  env.remoteHost = MODEL_BASE_URL
  env.remotePathTemplate = '{model}/'
  env.allowLocalModels = false
}

if (isOpfsAvailable()) {
  env.useCustomCache = true
  env.customCache = opfsCache
  if (typeof caches !== 'undefined') caches.delete(env.cacheKey).catch(() => {})
}

type InMsg =
  | { type: 'load'; modelId: string }
  | { type: 'run'; id: number; modelId: string; chunks: string[] }
  | { type: 'isCached'; id: number; modelId: string }
  | { type: 'remove'; id: number; modelId: string }

export type NerEntity = { entity_group?: string; word: string; score: number }

const pipes = new Map<string, Promise<TokenClassificationPipeline>>()

function modelPath(modelId: string) {
  return USE_LOCAL_MODELS ? modelId : getNerModel(modelId).repo
}

function logDevInfo(modelId: string) {
  const { device, dtype } = nerLoadOptions(modelId)
  console.log(`[Cloak] ${modelId} ready: ${device} ${dtype}`)
}

function loadPipeline(modelId: string) {
  const existing = pipes.get(modelId)
  if (existing) return existing

  const pipePromise = pipeline(NER_TASK, modelPath(modelId), {
    ...nerLoadOptions(modelId),
    progress_callback: (event: ProgressInfo) => self.postMessage({ type: 'progress', modelId, event }),
  }) as Promise<TokenClassificationPipeline>
  pipes.set(modelId, pipePromise)

  pipePromise.then(
    () => {
      if (import.meta.env.DEV) logDevInfo(modelId)
      self.postMessage({ type: 'ready', modelId })
    },
    (err) => {
      pipes.delete(modelId)
      self.postMessage({ type: 'loadError', modelId, message: err instanceof Error ? err.message : String(err) })
    },
  )

  return pipePromise
}

async function unloadPipeline(modelId: string) {
  const pipePromise = pipes.get(modelId)
  if (!pipePromise) return
  pipes.delete(modelId)
  const pipe = await pipePromise.catch(() => null)
  await pipe?.dispose()
}

async function unloadOthers(modelId: string) {
  await Promise.all([...pipes.keys()].filter((id) => id !== modelId).map(unloadPipeline))
}

async function runNer(modelId: string, chunks: string[]) {
  const pipe = await loadPipeline(modelId)
  await unloadOthers(modelId)
  const results: NerEntity[] = []
  for (const chunk of chunks) {
    const output = await pipe(chunk, { aggregation_strategy: 'simple' })
    for (const r of Array.from(output as ArrayLike<(typeof output)[number]>)) {
      results.push({ entity_group: 'entity_group' in r ? r.entity_group : undefined, word: r.word, score: r.score })
    }
  }
  return results
}

async function removeModel(modelId: string) {
  await unloadPipeline(modelId)
  await ModelRegistry.clear_pipeline_cache(NER_TASK, modelPath(modelId), nerLoadOptions(modelId))
}

self.onmessage = async (e: MessageEvent<InMsg>) => {
  const msg = e.data

  if (msg.type === 'load') {
    loadPipeline(msg.modelId).catch(() => {})
    return
  }

  try {
    let value: unknown
    if (msg.type === 'run') value = await runNer(msg.modelId, msg.chunks)
    else if (msg.type === 'isCached') value = await ModelRegistry.is_pipeline_cached(NER_TASK, modelPath(msg.modelId), nerLoadOptions(msg.modelId))
    else await removeModel(msg.modelId)
    self.postMessage({ type: 'reply', id: msg.id, value })
  } catch (err) {
    self.postMessage({ type: 'replyError', id: msg.id, message: err instanceof Error ? err.message : String(err) })
  }
}
