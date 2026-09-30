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
}
