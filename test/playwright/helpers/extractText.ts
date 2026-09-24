import fs from 'fs'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

export async function extractText(pdfPath: string): Promise<string> {
  const buffer = fs.readFileSync(pdfPath)
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
  let text = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
  }
  return text
}
