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
type RedactMsg       = { id: number; type: 'redact';      bytes: Uint8Array; entities: string[]; imageIds: string[] }
type ExtractTextMsg  = { id: number; type: 'extractText'; bytes: Uint8Array }
type ListImagesMsg   = { id: number; type: 'listImages';  bytes: Uint8Array }
type WorkerInMsg     = LoadMsg | RenderMsg | SearchPageMsg | RedactMsg | ExtractTextMsg | ListImagesMsg

let doc: MupdfDocument | null = null

function flattenForms(mupdf: typeof import('mupdf'), pdfDoc: MupdfDocument) {
  if (!(pdfDoc instanceof mupdf.PDFDocument)) return
  pdfDoc.bake(false, true)
  const pageCount = pdfDoc.countPages()
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.loadPage(i)
    let remaining = page.getAnnotations().length
    while (remaining > 0) {
      page.deleteAnnotation(page.getAnnotations()[0])
      remaining--
    }
    page.destroy()
  }
  pdfDoc.getTrailer().get('Root').delete('AcroForm')
}

const MIN_IMAGE_SIZE = 40
const FULL_PAGE_COVERAGE = 0.9
const THUMB_MAX_SIZE = 160

type PageImage = {
  index: number
  bbox: [number, number, number, number]
  big: boolean
  fullPage: boolean
  coversPage: boolean
  textLayer: boolean
  thumb: Uint8Array | null
}

function renderThumb(
  mupdf: typeof import('mupdf'),
  image: import('mupdf').Image,
  transform: number[],
  bbox: number[],
): Uint8Array | null {
  const w = bbox[2] - bbox[0]
  const h = bbox[3] - bbox[1]
  if (w <= 0 || h <= 0) return null
  const scale = Math.min(THUMB_MAX_SIZE / w, THUMB_MAX_SIZE / h, 1)
  const tw = Math.max(1, Math.round(w * scale))
  const th = Math.max(1, Math.round(h * scale))
  const pixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, tw, th], false)
  pixmap.clear(255)
  const device = new mupdf.DrawDevice(mupdf.Matrix.identity, pixmap)
  const ctm = mupdf.Matrix.concat(
    mupdf.Matrix.concat(transform as import('mupdf').Matrix, [1, 0, 0, 1, -bbox[0], -bbox[1]]),
    [scale, 0, 0, scale, 0, 0],
  )
  try {
    if (image.getImageMask()) device.fillImageMask(image, ctm, mupdf.ColorSpace.DeviceGray, [0], 1)
    else device.fillImage(image, ctm, 1)
    device.close()
    return pixmap.asPNG().slice()
  } catch {
    return null
  } finally {
    device.destroy()
    pixmap.destroy()
  }
}

function collectImages(mupdf: typeof import('mupdf'), page: PDFPage, withThumbs: boolean): PageImage[] {
  const [px0, py0, px1, py1] = page.getBounds()
  const pageArea = (px1 - px0) * (py1 - py0)
  const stext = page.toStructuredText('preserve-images')
  const images: PageImage[] = []
  let chars = 0
  stext.walk({
    onChar: (c) => {
      if (c.trim()) chars++
    },
    onImageBlock: (bbox, transform, image) => {
      const box: [number, number, number, number] = [bbox[0], bbox[1], bbox[2], bbox[3]]
      const w = box[2] - box[0]
      const h = box[3] - box[1]
      const big = Math.max(w, h) >= MIN_IMAGE_SIZE
      const coversPage = pageArea > 0 && (w * h) / pageArea >= FULL_PAGE_COVERAGE
      images.push({
        index: images.length,
        bbox: box,
        big,
        fullPage: coversPage,
        coversPage,
        textLayer: false,
        thumb: withThumbs && big ? renderThumb(mupdf, image, [...transform], box) : null,
      })
    },
  })
  stext.destroy()
  for (const img of images) {
    img.textLayer = chars >= MIN_TEXT_CHARS
    img.fullPage = img.fullPage && !img.textLayer
    if (img.fullPage) img.thumb = null
  }
  return images
}

const ICC_SIGNATURE = 'ICC_PROFILE\0'

function isIccSegment(data: Uint8Array, start: number) {
  for (let i = 0; i < ICC_SIGNATURE.length; i++) {
    if (data[start + 4 + i] !== ICC_SIGNATURE.charCodeAt(i)) return false
  }
  return true
}

function stripJpegMetadata(data: Uint8Array): Uint8Array | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null
  const kept: Uint8Array[] = [data.subarray(0, 2)]
  let pos = 2
  while (pos + 4 <= data.length) {
    if (data[pos] !== 0xff) return null
    const marker = data[pos + 1]
    if (marker === 0xda) {
      kept.push(data.subarray(pos))
      const out = new Uint8Array(kept.reduce((n, part) => n + part.length, 0))
      let offset = 0
      for (const part of kept) {
        out.set(part, offset)
        offset += part.length
      }
      return out.length === data.length ? null : out
    }
    if (marker === 0xff || marker === 0x01 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd8)) return null
    const length = (data[pos + 2] << 8) | data[pos + 3]
    if (length < 2 || pos + 2 + length > data.length) return null
    const isMetadata =
      marker === 0xfe ||
      (marker >= 0xe1 && marker <= 0xef && marker !== 0xee && !(marker === 0xe2 && isIccSegment(data, pos)))
    if (!isMetadata) kept.push(data.subarray(pos, pos + 2 + length))
    pos += 2 + length
  }
  return null
}

const JP2_DROPPED_BOXES = new Set(['xml ', 'uuid', 'uinf', 'jp2i'])

function stripJp2Metadata(data: Uint8Array): Uint8Array | null {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  if (data.length < 12 || view.getUint32(0) !== 12 || view.getUint32(4) !== 0x6a502020) return null
  const kept: Uint8Array[] = []
  let pos = 0
  while (pos + 8 <= data.length) {
    let size = view.getUint32(pos)
    let header = 8
    if (size === 1) {
      if (pos + 16 > data.length) return null
      size = Number(view.getBigUint64(pos + 8))
      header = 16
    } else if (size === 0) {
      size = data.length - pos
    }
    if (size < header || pos + size > data.length) return null
    const type = String.fromCharCode(data[pos + 4], data[pos + 5], data[pos + 6], data[pos + 7])
    if (!JP2_DROPPED_BOXES.has(type)) kept.push(data.subarray(pos, pos + size))
    pos += size
  }
  const out = new Uint8Array(kept.reduce((n, part) => n + part.length, 0))
  let offset = 0
  for (const part of kept) {
    out.set(part, offset)
    offset += part.length
  }
  return out.length === data.length ? null : out
}

function singleFilter(image: import('mupdf').PDFObject) {
  const filter = image.get('Filter')
  if (filter.isName()) return filter.asName()
  if (filter.isArray() && filter.length === 1) return filter.get(0).asName()
  return null
}

function stripImageMetadata(pdfDoc: PDFDocument) {
  const count = pdfDoc.countObjects()
  for (let i = 1; i < count; i++) {
    try {
      const obj = pdfDoc.newIndirect(i)
      if (!obj.isStream()) continue
      const subtype = obj.get('Subtype')
      if (subtype.isNull() || subtype.asName() !== 'Image') continue
      obj.delete('Metadata')
      const filter = singleFilter(obj)
      const strip = filter === 'DCTDecode' ? stripJpegMetadata : filter === 'JPXDecode' ? stripJp2Metadata : null
      if (!strip) continue
      const raw = obj.readRawStream()
      const stripped = strip(raw.asUint8Array())
      raw.destroy()
      if (stripped) obj.writeRawStream(stripped)
    } catch {
      continue
    }
  }
}

const HIDDEN_DATA_KEYS = ['Alt', 'ActualText', 'Thumb', 'PieceInfo', 'Metadata']

function stripHiddenObjectData(pdfDoc: PDFDocument) {
  const count = pdfDoc.countObjects()
  for (let i = 1; i < count; i++) {
    try {
      const obj = pdfDoc.newIndirect(i)
      for (const key of HIDDEN_DATA_KEYS) {
        if (!obj.get(key).isNull()) obj.delete(key)
      }
    } catch {
      continue
    }
  }
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
  let largestImage = 0
  for (const block of blocks) {
    if (block.type !== 'image' || !block.bbox) continue
    const { x, y, w, h } = block.bbox
    const cw = Math.max(0, Math.min(x + w, px1) - Math.max(x, px0))
    const ch = Math.max(0, Math.min(y + h, py1) - Math.max(y, py0))
    imageArea += cw * ch
    largestImage = Math.max(largestImage, cw * ch)
  }

  const text = spatialTextFromJson(json)
  const charCount = text.match(/[\p{L}\p{N}]/gu)?.length ?? 0
  return {
    text,
    stats: {
      charCount,
      imageCoverage: Math.min(imageArea / pageArea, 1),
      hasText: charCount >= MIN_TEXT_CHARS,
      scanned: charCount >= MIN_TEXT_CHARS && largestImage / pageArea >= FULL_PAGE_COVERAGE,
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

    } else if (msg.type === 'listImages') {
      const imgDoc = mupdf.Document.openDocument(msg.bytes, 'application/pdf')
      flattenForms(mupdf, imgDoc)
      const pageCount = imgDoc.countPages()
      const images: Array<{ page: number; index: number; fullPage: boolean; thumb: Uint8Array | null }> = []
      for (let i = 0; i < pageCount; i++) {
        const page = imgDoc.loadPage(i) as PDFPage
        const found = collectImages(mupdf, page, true)
        const scannedPage = found.some((img) => img.coversPage && img.textLayer)
        for (const img of found) {
          if (!img.big || scannedPage) continue
          images.push({ page: i + 1, index: img.index, fullPage: img.fullPage, thumb: img.thumb })
        }
        page.destroy()
      }
      imgDoc.destroy()
      const transfer = images.flatMap((img) => (img.thumb ? [img.thumb.buffer as ArrayBuffer] : []))
      self.postMessage({ id: msg.id, type: 'imagesListed', images, pageCount }, { transfer })

    } else if (msg.type === 'redact') {
      // Open a fresh copy of the document so we don't mutate the viewer's doc
      const pdfDoc = mupdf.Document.openDocument(msg.bytes, 'application/pdf') as PDFDocument
      flattenForms(mupdf, pdfDoc)
      const pageCount = pdfDoc.countPages()
      const imagesByPage = new Map<number, Set<number>>()
      for (const id of msg.imageIds) {
        const [pageNo, index] = id.split(':').map(Number)
        imagesByPage.set(pageNo - 1, (imagesByPage.get(pageNo - 1) ?? new Set()).add(index))
      }
      const pagesToDelete: number[] = []

      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.loadPage(i)
        const wanted = imagesByPage.get(i)
        const targets = wanted
          ? collectImages(mupdf, page as PDFPage, false).filter((img) => wanted.has(img.index))
          : []
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

        if (targets.some((img) => img.fullPage)) {
          pagesToDelete.push(i)
        } else if (targets.length > 0) {
          for (const img of targets) {
            const annot = (page as PDFPage).createAnnotation('Redact')
            annot.setRect([img.bbox[0] + 1, img.bbox[1] + 1, img.bbox[2] - 1, img.bbox[3] - 1])
          }
          (page as PDFPage).applyRedactions(
            false,
            mupdf.PDFPage.REDACT_IMAGE_REMOVE,
            mupdf.PDFPage.REDACT_LINE_ART_NONE,
            mupdf.PDFPage.REDACT_TEXT_NONE,
          )
        }
        page.destroy()
      }

      if (pagesToDelete.length >= pageCount) throw new Error('Cannot remove every page')
      for (const i of pagesToDelete.sort((a, b) => b - a)) pdfDoc.deletePage(i)

      stripMetadata(pdfDoc)
      stripImageMetadata(pdfDoc)
      stripHiddenObjectData(pdfDoc)
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
