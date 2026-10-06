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
type WorkerInMsg     = LoadMsg | RenderMsg | SearchPageMsg | RedactMsg | ExtractTextMsg

let doc: MupdfDocument | null = null

function flattenForms(mupdf: typeof import('mupdf'), pdfDoc: MupdfDocument) {
  if (!(pdfDoc instanceof mupdf.PDFDocument)) return
  pdfDoc.bake(false, true)
  const pageCount = pdfDoc.countPages()
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.loadPage(i)
    for (const annot of page.getAnnotations()) page.deleteAnnotation(annot)
    page.destroy()
  }
  pdfDoc.getTrailer().get('Root').delete('AcroForm')
}

function stripMetadata(pdfDoc: PDFDocument) {
  const trailer = pdfDoc.getTrailer()
  trailer.delete('Info')
  const root = trailer.get('Root')
  root.delete('Metadata')
  root.delete('Outlines')
}

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

type Box = [number, number, number, number]
type PageGlyphs = { text: string; unitToGlyph: number[]; quads: (number[] | null)[] }

function readGlyphs(page: ReturnType<MupdfDocument['loadPage']>): PageGlyphs {
  const stext = page.toStructuredText('preserve-whitespace')
  let text = ''
  const unitToGlyph: number[] = []
  const quads: (number[] | null)[] = []
  const push = (c: string, quad: number[] | null) => {
    quads.push(quad)
    for (let i = 0; i < c.length; i++) unitToGlyph.push(quads.length - 1)
    text += c
  }
  stext.walk({
    onChar: (c, _origin, _font, _size, quad) => push(c, [...quad]),
    endLine: () => push(' ', null),
  })
  stext.destroy()
  return { text, unitToGlyph, quads }
}

function wordPattern(value: string): RegExp | null {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null
  const body = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+')
  return new RegExp(`(?<![\\p{L}\\p{N}_])${body}(?![\\p{L}\\p{N}_])`, 'giu')
}

function findWholeWord(glyphs: PageGlyphs, value: string): Box[][] {
  const pattern = wordPattern(value)
  if (!pattern) return []
  const matches: Box[][] = []
  for (const m of glyphs.text.matchAll(pattern)) {
    const first = glyphs.unitToGlyph[m.index]
    const last = glyphs.unitToGlyph[m.index + m[0].length - 1]
    const boxes: Box[] = []
    let current: Box | null = null
    for (let g = first; g <= last; g++) {
      const q = glyphs.quads[g]
      if (!q) {
        if (current) boxes.push(current)
        current = null
        continue
      }
      const x0 = Math.min(q[0], q[2], q[4], q[6])
      const y0 = Math.min(q[1], q[3], q[5], q[7])
      const x1 = Math.max(q[0], q[2], q[4], q[6])
      const y1 = Math.max(q[1], q[3], q[5], q[7])
      current = current
        ? [Math.min(current[0], x0), Math.min(current[1], y0), Math.max(current[2], x1), Math.max(current[3], y1)]
        : [x0, y0, x1, y1]
    }
    if (current) boxes.push(current)
    if (boxes.length > 0) matches.push(boxes)
  }
  return matches
}

self.onmessage = async (e: MessageEvent<WorkerInMsg>) => {
  const mupdf = await getMupdf()
  const msg = e.data
  try {
    if (msg.type === 'load') {
      doc?.destroy()
      doc = mupdf.Document.openDocument(msg.bytes, 'application/pdf')
      flattenForms(mupdf, doc)
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
      const glyphs = readGlyphs(page)
      const results: Record<string, { rects: Box[]; count: number }> = {}
      for (const value of msg.values) {
        const matches = findWholeWord(glyphs, value)
        if (matches.length > 0) results[value] = { rects: matches.flat(), count: matches.length }
      }
      page.destroy()
      self.postMessage({ id: msg.id, type: 'searchResult', pageIndex: msg.pageIndex, results })

    } else if (msg.type === 'redact') {
      // Open a fresh copy of the document so we don't mutate the viewer's doc
      const pdfDoc = mupdf.Document.openDocument(msg.bytes, 'application/pdf') as PDFDocument
      flattenForms(mupdf, pdfDoc)
      const pageCount = pdfDoc.countPages()

      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.loadPage(i)
        let hasAnnotation = false

        const glyphs = readGlyphs(page)
        for (const entity of msg.entities) {
          for (const box of findWholeWord(glyphs, entity).flat()) {
            const annot = (page as PDFPage).createAnnotation('Redact')
            annot.setRect(box)
            hasAnnotation = true
          }
        }

        if (hasAnnotation) {
          (page as PDFPage).applyRedactions(true, mupdf.PDFPage.REDACT_IMAGE_PIXELS)
        }
        page.destroy()
      }

      stripMetadata(pdfDoc)
      const buffer = pdfDoc.saveToBuffer('garbage=compact,regenerate-id')
      const output = buffer.asUint8Array().slice() // copy before destroy
      buffer.destroy()
      pdfDoc.destroy()

      self.postMessage(
        { id: msg.id, type: 'redacted', bytes: output },
        { transfer: [output.buffer as ArrayBuffer] },
      )

    } else if (msg.type === 'extractText') {
      const extractDoc = mupdf.Document.openDocument(msg.bytes, 'application/pdf')
      flattenForms(mupdf, extractDoc)
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
