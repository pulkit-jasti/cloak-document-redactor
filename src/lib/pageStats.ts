import type { PageStats } from "@/types"

const MIN_IMAGE_COVERAGE = 0.05

export function hasAnyText(stats: PageStats[]): boolean {
  return stats.some((s) => s.hasText)
}

export function imageOnlyPages(stats: PageStats[]): number[] {
  return stats.flatMap((s, i) => (!s.hasText && s.imageCoverage >= MIN_IMAGE_COVERAGE ? [i + 1] : []))
}

export function scannedPages(stats: PageStats[]): number[] {
  return stats.flatMap((s, i) => (s.scanned ? [i + 1] : []))
}

export function formatPageList(pages: number[]): string {
  if (pages.length === 1) return `Page ${pages[0]}`
  const head = pages.slice(0, -1).join(", ")
  return `Pages ${head} and ${pages[pages.length - 1]}`
}
