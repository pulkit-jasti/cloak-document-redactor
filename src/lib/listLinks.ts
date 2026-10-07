import type { PdfLink } from '@/types'

export async function listLinks(bytes: Uint8Array, signal?: AbortSignal): Promise<PdfLink[]> {
  const worker = new Worker(
    new URL('../workers/mupdf.worker.ts', import.meta.url),
    { type: 'module' },
  )
  try {
    return await new Promise<PdfLink[]>((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason)
      signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
      const handler = (e: MessageEvent) => {
        worker.removeEventListener('message', handler)
        if (e.data.type === 'linksListed') resolve(e.data.links as PdfLink[])
        else reject(new Error(e.data.message ?? 'Link scan failed'))
      }
      worker.addEventListener('message', handler)
      worker.onerror = reject
      worker.postMessage({ id: 0, type: 'listLinks', bytes })
    })
  } finally {
    worker.terminate()
  }
}
