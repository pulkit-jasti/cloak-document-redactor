import type { Document as MupdfDocument, PDFDocument, PDFPage } from 'mupdf'
import type { PageStats } from '@/types'

// Use dynamic import to avoid top-level await blocking onmessage registration.
// Chrome drops messages sent to module workers before top-level awaits resolve.
let mupdfPromise: Promise<typeof import('mupdf')> | null = null
function getMupdf() {
  if (!mupdfPromise) mupdfPromise = import('mupdf')
  return mupdfPromise
}

type LoadMsg         = { id: number; type: 'load';        bytes: Uint8Array }
type RenderMsg       = { id: number; type: 'render';      pageIndex: number; scale: number }
type SearchPageMsg   = { id: number; type: 'searchPage';  pageIndex: number; values: string[] }
type RedactMsg       = { id: number; type: 'redact';      bytes: Uint8Array; entities: string[] }
type ExtractTextMsg  = { id: number; type: 'extractText'; bytes: Uint8Array }
type CountPagesMsg   = { id: number; type: 'countPages';  bytes: Uint8Array }
type WorkerInMsg     = LoadMsg | RenderMsg | SearchPageMsg | RedactMsg | ExtractTextMsg | CountPagesMsg

let doc: MupdfDocument | null = null

const MIN_TEXT_CHARS = 20

type StextBlock = {
  type: string
  bbox?: { x: number; y: number; w: number; h: number }
  lines?: Array<{ x: number; y: number; text: string }>
}

function readPage(page: ReturnType<MupdfDocument['loadPage']>): { text: string; stats: PageStats } {
  const [px0, py0, px1, py1] = page.getBounds()
  const pageArea = Math.max((px1 - px0) * (py1 - py0), 1)
  const json = page.toStructuredText('preserve-whitespace,preserve-images').asJSON(1)
  const { blocks } = JSON.parse(json) as { blocks: StextBlock[] }

  let imageArea = 0
  for (const block of blocks) {
    if (block.type !== 'image' || !block.bbox) continue
    const { x, y, w, h } = block.bbox
    const cw = Math.max(0, Math.min(x + w, px1) - Math.max(x, px0))
    const ch = Math.max(0, Math.min(y + h, py1) - Math.max(y, py0))
    imageArea += cw * ch
  }

  const text = spatialTextFromJson(json)
  const charCount = text.match(/[\p{L}\p{N}]/gu)?.length ?? 0
  return {
    text,
    stats: {
      charCount,
      imageCoverage: Math.min(imageArea / pageArea, 1),
      hasText: charCount >= MIN_TEXT_CHARS,
    },
  }
}

// Reconstruct page text by grouping mupdf line items that share the same
// Y coordinate (i.e. the same visual row), then sorting rows top-to-bottom
// and items within a row left-to-right. Matches the spatial logic pdfjs used.
function spatialTextFromJson(jsonStr: string): string {
  const { blocks } = JSON.parse(jsonStr) as {
    blocks: Array<{
      type: string
      lines?: Array<{ x: number; y: number; text: string }>
    }>
  }

  type LineItem = { x: number; y: number; text: string }
  const items: LineItem[] = []
  for (const block of blocks) {
    if (block.type !== 'text' || !block.lines) continue
    for (const line of block.lines) {
      const clean = line.text.replace(/�+/g, '').trim()
      if (clean) items.push({ x: line.x, y: line.y, text: clean })
    }
  }

  const ROW_TOLERANCE = 4
  const rows = new Map<number, LineItem[]>()
  for (const item of items) {
    const key = [...rows.keys()].find((k) => Math.abs(k - item.y) <= ROW_TOLERANCE) ?? item.y
    const row = rows.get(key) ?? []
    row.push(item)
    rows.set(key, row)
  }

  return [...rows.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, row]) => row.sort((a, b) => a.x - b.x).map((t) => t.text).join(' '))
    .join('\n')
}

self.onmessage = async (e: MessageEvent<WorkerInMsg>) => {
  const mupdf = await getMupdf()
  const msg = e.data
  try {
    if (msg.type === 'load') {
      doc?.destroy()
      doc = mupdf.Document.openDocument(msg.bytes, 'application/pdf')
      const pageCount = doc.countPages()
      const pageSizes: Array<[number, number]> = []
      const pageStats: PageStats[] = []
      for (let i = 0; i < pageCount; i++) {
        const page = doc.loadPage(i)
        const [x0, y0, x1, y1] = page.getBounds()
        pageSizes.push([x1 - x0, y1 - y0])
        pageStats.push(readPage(page).stats)
        page.destroy()
      }
      self.postMessage({ id: msg.id, type: 'loaded', pageCount, pageSizes, pageStats })

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
        const hits = page.search(value, null) as number[][][]
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
          const hits = (page as PDFPage).search(entity, null)
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
          (page as PDFPage).applyRedactions(true, mupdf.PDFPage.REDACT_IMAGE_PIXELS)
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

    } else if (msg.type === 'countPages') {
      const countDoc = mupdf.Document.openDocument(msg.bytes, 'application/pdf')
      const pageCount = countDoc.countPages()
      countDoc.destroy()
      self.postMessage({ id: msg.id, type: 'pagesCounted', pageCount })

    } else if (msg.type === 'extractText') {
      const extractDoc = mupdf.Document.openDocument(msg.bytes, 'application/pdf')
      const pageCount = extractDoc.countPages()
      const pageTexts: string[] = []
      const pageStats: PageStats[] = []
      for (let i = 0; i < pageCount; i++) {
        const page = extractDoc.loadPage(i)
        const { text, stats } = readPage(page)
        pageTexts.push(text)
        pageStats.push(stats)
        page.destroy()
      }
      extractDoc.destroy()
      self.postMessage({ id: msg.id, type: 'textExtracted', pageTexts, pageStats })
    }
  } catch (err) {
    self.postMessage({ id: msg.id, type: 'error', message: String(err) })
  }
}
