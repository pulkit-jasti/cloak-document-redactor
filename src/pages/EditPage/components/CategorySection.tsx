import { ChevronDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

interface Props {
  title: string
  count: number
  checked: boolean | 'indeterminate'
  onToggleAll: () => void
  ariaLabel: string
  isOpen: boolean
  onToggleOpen: () => void
  children: React.ReactNode
}

export default function CategorySection({ title, count, checked, onToggleAll, ariaLabel, isOpen, onToggleOpen, children }: Props) {
  return (
    <div className='border-b'>
      <div className='flex items-center gap-3 px-1'>
        <Checkbox className='rounded-[4px]' checked={checked} onCheckedChange={onToggleAll} aria-label={ariaLabel} />
        <button
          type='button'
          aria-expanded={isOpen}
          onClick={onToggleOpen}
          className='group flex flex-1 items-center justify-between py-3.5 text-sm font-medium'
        >
          <span>
            {title} <span className='text-muted-foreground tabular-nums'>({count})</span>
          </span>
          <ChevronDown
            className={`size-4 shrink-0 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:text-foreground ${
              isOpen ? 'rotate-180 text-foreground' : 'text-muted-foreground'
            }`}
            aria-hidden
          />
        </button>
      </div>
      <div
        inert={!isOpen}
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className='min-h-0 overflow-hidden'>
          <div
            className={`space-y-2 pb-4 transition-[opacity,translate] ease-out motion-reduce:transition-none ${
              isOpen ? 'translate-y-0 opacity-100 delay-100 duration-400' : '-translate-y-1 opacity-0 duration-200'
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
