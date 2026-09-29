import type { Redaction } from '@/types'

interface Props {
  redaction: Redaction
  onToggle: (id: string) => void
}

export default function EntityCard({ redaction: r, onToggle }: Props) {
  return (
    <div className='flex items-center gap-2 rounded-lg border px-3 py-2 bg-card'>
      <div className='flex-1 min-w-0'>
        <span className='text-xs text-muted-foreground'>{r.type}</span>
        <p className='text-sm font-medium truncate'>{r.value}</p>
      </div>
      <button
        onClick={() => onToggle(r.id)}
        className={`shrink-0 text-xs px-2 py-1 rounded-md border font-medium transition-colors ${
          r.approved
            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/50'
            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/50'
        }`}
      >
        {r.approved ? 'Redact' : 'Dismiss'}
      </button>
    </div>
  )
}
