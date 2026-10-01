import type { Redaction } from '@/types'

export type EntityGroup = {
  key: string
  type: string
  value: string
  approved: boolean
  firstPage: number
}

export function groupKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function groupRedactions(redactions: Redaction[]): EntityGroup[] {
  const groups = new Map<string, EntityGroup>()
  for (const r of redactions) {
    const key = groupKey(r.value)
    const existing = groups.get(key)
    if (existing) {
      existing.firstPage = Math.min(existing.firstPage, r.page)
      continue
    }
    groups.set(key, { key, type: r.type, value: r.value, approved: r.approved, firstPage: r.page })
  }
  return [...groups.values()].sort((a, b) => a.firstPage - b.firstPage)
}
