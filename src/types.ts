export type Redaction = {
  id: string
  type: string
  value: string
  page: number
  approved: boolean
}

export type PageStats = {
  charCount: number
  imageCoverage: number
  hasText: boolean
  scanned: boolean
}

export type PdfImage = {
  id: string
  page: number
  index: number
  fullPage: boolean
  thumbUrl: string | null
}

export type PdfLink = {
  url: string
  pages: number[]
  count: number
}
