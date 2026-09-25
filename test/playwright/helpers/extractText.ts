import fs from 'fs'
import * as mupdf from 'mupdf'

type LineItem = { x: number; y: number; text: string }

function spatialTextFromJson(jsonStr: string): string {
  const { blocks } = JSON.parse(jsonStr) as {
    blocks: Array<{
      type: string
      lines: Array<{ x: number; y: number; text: string }>
    }>
  }

  const items: LineItem[] = []
  for (const block of blocks) {
    if (block.type !== 'text') continue
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

export async function extractText(pdfPath: string): Promise<string> {
  const buffer = fs.readFileSync(pdfPath)
  const doc = mupdf.Document.openDocument(new Uint8Array(buffer), 'application/pdf')
  const pageCount = doc.countPages()
  let text = ''
  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i)
    const struct = page.toStructuredText('preserve-whitespace')
    text += spatialTextFromJson(struct.asJSON(1))
    page.destroy()
  }
  doc.destroy()
  return text
}
