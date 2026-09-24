import type { Document as MupdfDocument, PDFDocument, PDFPage } from 'mupdf'

// Use dynamic import to avoid top-level await blocking onmessage registration.
// Chrome drops messages sent to module workers before top-level awaits resolve.
let mupdfPromise: Promise<typeof import('mupdf')> | null = null
function getMupdf() {
  if (!mupdfPromise) mupdfPromise = import('mupdf')
  return mupdfPromise
}

type LoadMsg       = { id: number; type: 'load';       bytes: Uint8Array }
type RenderMsg     = { id: number; type: 'render';     pageIndex: number; scale: number }
type SearchPageMsg = { id: number; type: 'searchPage'; pageIndex: number; values: string[] }
type RedactMsg     = { id: number; type: 'redact';     bytes: Uint8Array; entities: string[] }
type WorkerInMsg   = LoadMsg | RenderMsg | SearchPageMsg | RedactMsg

let doc: MupdfDocument | null = null

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
        { transfer: [png.buffer as ArrayBuffer] },
      )

    } else if (msg.type === 'searchPage') {
      if (!doc) throw new Error('No document loaded')
      const page = doc.loadPage(msg.pageIndex)
      // Returns value -> list of bounding rects [x0, y0, x1, y1] in PDF units
      const results: Record<string, [number, number, number, number][]> = {}
      for (const value of msg.values) {
        if (!value.trim()) continue
        const hits = page.search(value) as number[][][]
        const rects: [number, number, number, number][] = []
        for (const quads of hits) {
          for (const quad of quads) {
            const x0 = Math.min(quad[0], quad[2], quad[4], quad[6])
            const y0 = Math.min(quad[1], quad[3], quad[5], quad[7])
            const x1 = Math.max(quad[0], quad[2], quad[4], quad[6])
            const y1 = Math.max(quad[1], quad[3], quad[5], quad[7])
            rects.push([x0, y0, x1, y1])
          }
        }
        if (rects.length > 0) results[value] = rects
      }
      page.destroy()
      self.postMessage({ id: msg.id, type: 'searchResult', pageIndex: msg.pageIndex, results })

    } else if (msg.type === 'redact') {
      // Open a fresh copy of the document so we don't mutate the viewer's doc
      const pdfDoc = mupdf.Document.openDocument(msg.bytes, 'application/pdf') as PDFDocument
      const pageCount = pdfDoc.countPages()

      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.loadPage(i)
        let hasAnnotation = false

        for (const entity of msg.entities) {
          if (!entity.trim()) continue
          const hits = (page as PDFPage).search(entity, 100)
          for (const quads of hits) {
            for (const quad of quads) {
              // quad is a flat 8-float array: [ul.x, ul.y, ur.x, ur.y, ll.x, ll.y, lr.x, lr.y]
              const annot = (page as PDFPage).createAnnotation('Redact')
              const x0 = Math.min(quad[0], quad[2], quad[4], quad[6])
              const y0 = Math.min(quad[1], quad[3], quad[5], quad[7])
              const x1 = Math.max(quad[0], quad[2], quad[4], quad[6])
              const y1 = Math.max(quad[1], quad[3], quad[5], quad[7])
              annot.setRect([x0, y0, x1, y1])
              hasAnnotation = true
            }
          }
        }

        if (hasAnnotation) {
          (page as PDFPage).applyRedactions()
        }
        page.destroy()
      }

      const buffer = pdfDoc.saveToBuffer('garbage=compact')
      const output = buffer.asUint8Array().slice() // copy before destroy
      buffer.destroy()
      pdfDoc.destroy()

      self.postMessage(
        { id: msg.id, type: 'redacted', bytes: output },
        { transfer: [output.buffer as ArrayBuffer] },
      )
    }
  } catch (err) {
    self.postMessage({ id: msg.id, type: 'error', message: String(err) })
  }
}
