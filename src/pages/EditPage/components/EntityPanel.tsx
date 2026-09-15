import { Button } from '@/components/ui/button'
import type { Redaction } from '@/constants/mockData'
import EntityCard from './EntityCard'

interface Props {
  redactions: Redaction[]
  onToggle: (id: string) => void
  onSave: () => void
  isSaving?: boolean
}

export default function EntityPanel({ redactions, onToggle, onSave, isSaving }: Props) {
  const pages = [...new Set(redactions.map((r) => r.page))].sort((a, b) => a - b)

  return (
    <div className='w-80 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto p-4 space-y-6 min-h-0'>
        {redactions.length === 0 && (
          <div className='flex flex-col items-center justify-center h-full gap-2 text-center px-4 py-12'>
            <p className='text-sm font-medium'>No PII detected</p>
            <p className='text-xs text-muted-foreground'>
              The document appears clean. Nothing to redact.
            </p>
          </div>
        )}
        {pages.map((page) => (
          <div key={page}>
            <p className='text-xs font-medium text-muted-foreground mb-2'>Page {page}</p>
            <div className='space-y-2'>
              {redactions
                .filter((r) => r.page === page)
                .map((r) => (
                  <EntityCard key={r.id} redaction={r} onToggle={onToggle} />
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className='shrink-0 p-4 border-t'>
        <Button className='w-full' onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Applying redactions…' : 'Save & Preview'}
        </Button>
      </div>
    </div>
  )
}
