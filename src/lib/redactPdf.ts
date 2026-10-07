export type RedactResult = { bytes: Uint8Array; removed: string[]; reviewable: boolean }

export type RedactOptions = { imageIds?: string[]; keepLinks?: string[] }

export async function redactPdf(bytes: Uint8Array, entities: string[], signal?: AbortSignal, options: RedactOptions = {}): Promise<RedactResult> {
  const worker = new Worker(
    new URL('../workers/mupdf.worker.ts', import.meta.url),
    { type: 'module' },
  )
  try {
    return await new Promise<RedactResult>((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason)
      signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
      const handler = (e: MessageEvent) => {
        worker.removeEventListener('message', handler)
        if (e.data.type === 'redacted') resolve({ bytes: e.data.bytes as Uint8Array, removed: (e.data.removed as string[]) ?? [], reviewable: Boolean(e.data.reviewable) })
        else reject(new Error(e.data.message ?? 'Redaction failed'))
      }
      worker.addEventListener('message', handler)
      worker.onerror = reject
      worker.postMessage({ id: 0, type: 'redact', bytes, entities, imageIds: options.imageIds ?? [], keepLinks: options.keepLinks ?? [] })
    })
  } finally {
    worker.terminate()
  }
}
