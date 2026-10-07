import type { PdfImage } from '@/types'

export type ImageScan = { images: PdfImage[]; pageCount: number }

export async function listImages(bytes: Uint8Array, signal?: AbortSignal): Promise<ImageScan> {
  const worker = new Worker(
    new URL('../workers/mupdf.worker.ts', import.meta.url),
    { type: 'module' },
  )
  try {
    return await new Promise<ImageScan>((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason)
      signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
      const handler = (e: MessageEvent) => {
        worker.removeEventListener('message', handler)
        if (e.data.type !== 'imagesListed') return reject(new Error(e.data.message ?? 'Image scan failed'))
        const images = (e.data.images as Array<{ page: number; index: number; fullPage: boolean; thumb: Uint8Array | null }>).map(
          (img) => ({
            id: `${img.page}:${img.index}`,
            page: img.page,
            index: img.index,
            fullPage: img.fullPage,
            thumbUrl: img.thumb
              ? URL.createObjectURL(new Blob([img.thumb as Uint8Array<ArrayBuffer>], { type: 'image/png' }))
              : null,
          }),
        )
        resolve({ images, pageCount: e.data.pageCount as number })
      }
      worker.addEventListener('message', handler)
      worker.onerror = reject
      worker.postMessage({ id: 0, type: 'listImages', bytes })
    })
  } finally {
    worker.terminate()
  }
}
