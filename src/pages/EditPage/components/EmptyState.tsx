import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  description: string
}

export default function EmptyState({ icon: Icon, title, description }: Props) {
  return (
    <div className='flex h-full min-h-72 flex-col items-center justify-center gap-6 px-6 text-center'>
      <Icon className='size-12 text-muted-foreground' strokeWidth={1.25} aria-hidden />
      <div className='space-y-1.5'>
        <p className='text-base font-medium'>{title}</p>
        <p className='text-sm text-balance text-muted-foreground'>{description}</p>
      </div>
    </div>
  )
}
