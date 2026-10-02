import CtaButton from '@/components/CtaButton'
import type { MatchSummary } from '@/components/PdfViewer'
import type { EntityGroup } from '../groupRedactions'
import EntityCard from './EntityCard'

interface Props {
  groups: EntityGroup[]
  matches: MatchSummary
  matchesComplete: boolean
  onToggle: (key: string) => void
  onSave: () => void
  isSaving?: boolean
}

export default function EntityPanel({ groups, matches, matchesComplete, onToggle, onSave, isSaving }: Props) {
  const found = groups
    .filter((g) => (matches[g.value]?.count ?? 0) > 0)
    .sort((a, b) => matches[a.value].pages[0] - matches[b.value].pages[0])

  return (
    <div className='w-96 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto p-4 min-h-0'>
        {groups.length > 0 && !matchesComplete ? (
          <p className='px-1 py-12 text-center text-sm text-muted-foreground'>Finding matches in your document…</p>
        ) : found.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full gap-2 text-center px-4 py-12'>
            <p className='text-sm font-medium'>Nothing personal found</p>
            <p className='text-xs text-muted-foreground'>
              This document looks clean.
            </p>
          </div>
        ) : (
          <div className='space-y-2'>
            {found.map((g) => (
              <EntityCard key={g.key} group={g} match={matches[g.value]} onToggle={onToggle} />
            ))}
          </div>
        )}
      </div>

      <div className='shrink-0 border-t px-4 pt-4 pb-7'>
        <CtaButton fullWidth onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Applying changes…' : 'Apply changes'}
        </CtaButton>
      </div>
    </div>
  )
}
