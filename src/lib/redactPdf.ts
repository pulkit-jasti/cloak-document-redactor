export async function redactPdf(bytes: Uint8Array, entities: string[]): Promise<Uint8Array> {
  const worker = new Worker(
    new URL('../workers/mupdf.worker.ts', import.meta.url),
    { type: 'module' },
  )
  try {
    return await new Promise<Uint8Array>((resolve, reject) => {
      const handler = (e: MessageEvent) => {
        worker.removeEventListener('message', handler)
        if (e.data.type === 'redacted') resolve(e.data.bytes as Uint8Array)
        else reject(new Error(e.data.message ?? 'Redaction failed'))
      }
      worker.addEventListener('message', handler)
      worker.onerror = reject
      worker.postMessage({ id: 0, type: 'redact', bytes, entities })
    })
  } finally {
    worker.terminate()
  }
}
