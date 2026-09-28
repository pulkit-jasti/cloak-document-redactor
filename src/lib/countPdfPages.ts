export async function countPdfPages(bytes: Uint8Array): Promise<number> {
  const worker = new Worker(
    new URL('../workers/mupdf.worker.ts', import.meta.url),
    { type: 'module' },
  )
  try {
    return await new Promise<number>((resolve, reject) => {
      const handler = (e: MessageEvent) => {
        worker.removeEventListener('message', handler)
        if (e.data.type === 'pagesCounted') resolve(e.data.pageCount as number)
        else reject(new Error(e.data.message ?? 'countPages failed'))
      }
      worker.addEventListener('message', handler)
      worker.onerror = reject
      worker.postMessage({ id: 0, type: 'countPages', bytes })
    })
  } finally {
    worker.terminate()
  }
}
