// Use dynamic import to avoid top-level await blocking onmessage registration.
// Chrome drops messages sent to module workers before top-level awaits resolve.
let mupdfPromise: Promise<typeof import('mupdf')> | null = null
function getMupdf() {
  if (!mupdfPromise) mupdfPromise = import('mupdf')
  return mupdfPromise
}

type LoadMsg = { id: number; type: 'load'; bytes: Uint8Array }
type RenderMsg = { id: number; type: 'render'; pageIndex: number; scale: number }
type WorkerInMsg = LoadMsg | RenderMsg

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let doc: any = null

self.onmessage = async (e: MessageEvent<WorkerInMsg>) => {
  const mupdf = await getMupdf()
  const msg = e.data
  try {
    if (msg.type === 'load') {
      doc?.destroy()
      doc = mupdf.Document.openDocument(msg.bytes, 'application/pdf')
      const pageCount = doc.countPages()
      const pageSizes: Array<[number, number]> = []
      for (let i = 0; i < pageCount; i++) {
        const page = doc.loadPage(i)
        const [x0, y0, x1, y1] = page.getBounds()
        pageSizes.push([x1 - x0, y1 - y0])
        page.destroy()
      }
      self.postMessage({ id: msg.id, type: 'loaded', pageCount, pageSizes })
    } else if (msg.type === 'render') {
      if (!doc) throw new Error('No document loaded')
      const page = doc.loadPage(msg.pageIndex)
      const pixmap = page.toPixmap(
        [msg.scale, 0, 0, msg.scale, 0, 0],
        mupdf.ColorSpace.DeviceRGB,
        false,
        true,
      )
      const png = pixmap.asPNG()
      pixmap.destroy()
      page.destroy()
      self.postMessage(
        { id: msg.id, type: 'rendered', pageIndex: msg.pageIndex, png },
        [png.buffer as ArrayBuffer],
      )
    }
  } catch (err) {
    self.postMessage({ id: msg.id, type: 'error', message: String(err) })
  }
}
