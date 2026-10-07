import { useId } from 'react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import type { PdfLink } from '@/types'

interface Props {
  link: PdfLink
  removed: boolean
  onChange: (removed: boolean) => void
}

export default function LinkCard({ link, removed, onChange }: Props) {
  const checkboxId = useId()
  return (
    <label
      htmlFor={checkboxId}
      className='flex cursor-pointer items-stretch gap-3 rounded-lg border px-3 py-2.5 bg-card transition-colors hover:bg-muted/40'
    >
      <div className={`flex-1 min-w-0 transition-opacity ${removed ? '' : 'opacity-50'}`}>
        <p className='line-clamp-2 break-all text-sm font-medium'>{link.url}</p>
        <div className='mt-1.5 flex flex-wrap items-center gap-1'>
          <span className='mr-0.5 text-xs text-muted-foreground'>{link.pages.length === 1 ? 'Page' : 'Pages'}</span>
          {link.pages.map((page) => (
            <Badge key={page} variant='outline' className='h-5 min-w-5 rounded-md px-1.5 tabular-nums'>
              {page}
            </Badge>
          ))}
        </div>
      </div>
      <div className='flex shrink-0 flex-col items-end justify-between gap-2'>
        <span className='flex items-center gap-2 text-xs font-medium'>
          Remove
          <Checkbox id={checkboxId} checked={removed} onCheckedChange={(c) => onChange(c === true)} />
        </span>
        {link.count > 1 && (
          <Badge variant='secondary' className='h-5 px-2 tabular-nums'>
            {link.count} links
          </Badge>
        )}
      </div>
    </label>
  )
}
