import { useId } from 'react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import type { EntityGroup } from '../groupRedactions'

interface Props {
  group: EntityGroup
  match: { pages: number[]; count: number }
  onToggle: (key: string) => void
}

export default function EntityCard({ group: g, match, onToggle }: Props) {
  const checkboxId = useId()

  return (
    <label
      htmlFor={checkboxId}
      className='flex cursor-pointer items-stretch gap-3 rounded-lg border px-3 py-2.5 bg-card transition-colors hover:bg-muted/40'
    >
      <div className={`flex-1 min-w-0 transition-opacity ${g.approved ? '' : 'opacity-50'}`}>
        <span className='text-xs text-muted-foreground'>{g.type}</span>
        <p className='text-sm font-medium truncate'>{g.value}</p>
        <div className='mt-1.5 flex flex-wrap items-center gap-1'>
          <span className='mr-0.5 text-xs text-muted-foreground'>
            {match.pages.length === 1 ? 'Page' : 'Pages'}
          </span>
          {match.pages.map((page) => (
            <Badge key={page} variant='outline' className='h-5 min-w-5 rounded-md px-1.5 tabular-nums'>
              {page}
            </Badge>
          ))}
        </div>
      </div>
      <div className='flex shrink-0 flex-col items-end justify-between gap-2'>
        <span className='flex items-center gap-2 text-xs font-medium'>
          Redact
          <Checkbox
            id={checkboxId}
            checked={g.approved}
            onCheckedChange={() => onToggle(g.key)}
          />
        </span>
        <Badge variant='secondary' className='h-5 px-2 tabular-nums'>
          {match.count} {match.count === 1 ? 'match' : 'matches'}
        </Badge>
      </div>
    </label>
  )
}
