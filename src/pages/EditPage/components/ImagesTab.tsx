import { useId } from 'react'
import { ImageOff } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { PdfImage } from '@/types'
import EmptyState from './EmptyState'

interface Props {
  images: PdfImage[] | null
  removedIds: string[]
  onSetRemoved: (ids: string[], removed: boolean) => void
}

type CheckState = boolean | 'indeterminate'

function stateOf(ids: string[], removed: Set<string>): CheckState {
  const count = ids.filter((id) => removed.has(id)).length
  return count === ids.length ? true : count === 0 ? false : 'indeterminate'
}

function ImageCard({ image, label, checked, onChange, pageCheckboxId }: { image: PdfImage; label: string; checked: boolean; onChange?: (c: boolean) => void; pageCheckboxId: string }) {
  const checkboxId = useId()
  const content = (
    <div className={`flex flex-1 min-w-0 items-center gap-3 transition-opacity ${checked ? 'opacity-50' : ''}`}>
      <div className='flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted'>
        {image.thumbUrl && <img src={image.thumbUrl} alt={label} className='max-h-full max-w-full object-contain' />}
      </div>
      <p className='min-w-0 truncate text-sm font-medium'>{label}</p>
    </div>
  )
  if (!onChange) {
    return (
      <label
        htmlFor={pageCheckboxId}
        className='flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/40'
      >
        {content}
      </label>
    )
  }
  return (
    <label
      htmlFor={checkboxId}
      className='flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/40'
    >
      {content}
      <span className='flex shrink-0 items-center gap-2 text-xs font-medium'>
        Remove
        <Checkbox id={checkboxId} checked={checked} onCheckedChange={(c) => onChange(c === true)} />
      </span>
    </label>
  )
}

function FullPageCard({ pageCheckboxId }: { pageCheckboxId: string }) {
  return (
    <label
      htmlFor={pageCheckboxId}
      className='block cursor-pointer rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/40'
    >
      <p className='text-sm font-medium'>Entire page is an image</p>
      <p className='text-xs text-muted-foreground'>Removing it deletes the whole page.</p>
    </label>
  )
}

function PageHeader({ page, count, state, onChange, dimmed, checkboxId }: { page: number; count?: number; state: CheckState; onChange: () => void; dimmed?: boolean; checkboxId: string }) {
  return (
    <label htmlFor={checkboxId} className='flex w-fit cursor-pointer items-center gap-3 px-1'>
      <Checkbox id={checkboxId} checked={state} onCheckedChange={onChange} />
      <span className={`text-sm font-medium transition-opacity ${dimmed ? 'opacity-50' : ''}`}>
        Page {page}
        {count !== undefined && <span className='text-muted-foreground tabular-nums'> ({count})</span>}
      </span>
    </label>
  )
}

function PageSection({ page, items, removed, onSetRemoved }: { page: number; items: PdfImage[]; removed: Set<string>; onSetRemoved: Props['onSetRemoved'] }) {
  const pageCheckboxId = useId()
  const full = items.find((i) => i.fullPage)
  if (full) {
    const isRemoved = removed.has(full.id)
    return (
      <div className={`space-y-2 transition-opacity ${isRemoved ? 'opacity-50' : ''}`}>
        <PageHeader
          page={page}
          state={isRemoved}
          checkboxId={pageCheckboxId}
          onChange={() => onSetRemoved([full.id], !isRemoved)}
        />
        <FullPageCard pageCheckboxId={pageCheckboxId} />
      </div>
    )
  }
  const ids = items.map((i) => i.id)
  const pageState = stateOf(ids, removed)
  return (
    <div className='space-y-2'>
      <PageHeader
        page={page}
        count={items.length}
        state={pageState}
        dimmed={pageState === true}
        checkboxId={pageCheckboxId}
        onChange={() => onSetRemoved(ids, pageState !== true)}
      />
      {items.map((img, n) => (
        <ImageCard
          key={img.id}
          image={img}
          label={items.length === 1 ? 'Image' : `Image ${n + 1}`}
          checked={removed.has(img.id)}
          pageCheckboxId={pageCheckboxId}
          onChange={items.length === 1 ? undefined : (c) => onSetRemoved([img.id], c)}
        />
      ))}
    </div>
  )
}

export default function ImagesTab({ images, removedIds, onSetRemoved }: Props) {
  if (images === null) {
    return <p className='px-1 py-12 text-center text-sm text-muted-foreground'>Looking for images…</p>
  }
  if (images.length === 0) {
    return (
      <EmptyState
        icon={ImageOff}
        title='No images to review'
        description='This document has no photos or standalone pictures to remove.'
      />
    )
  }

  const removed = new Set(removedIds)
  const allIds = images.map((i) => i.id)
  const allState = stateOf(allIds, removed)

  const byPage = new Map<number, PdfImage[]>()
  for (const img of images) byPage.set(img.page, [...(byPage.get(img.page) ?? []), img])

  return (
    <div>
      <div className='mb-3 flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5'>
        <Checkbox
          className='rounded-[4px]'
          checked={allState}
          onCheckedChange={() => onSetRemoved(allIds, allState !== true)}
          aria-label='Remove all images'
        />
        <p className='flex-1 text-sm font-medium'>
          Remove all images <span className='text-muted-foreground tabular-nums'>({images.length})</span>
        </p>
      </div>
      <p className='mb-3 px-1 text-xs text-muted-foreground'>
        Cloak can't read text inside images. Remove any that might show personal info.
      </p>
      <div className='space-y-4'>
        {[...byPage].map(([page, items]) => (
          <PageSection key={page} page={page} items={items} removed={removed} onSetRemoved={onSetRemoved} />
        ))}
      </div>
    </div>
  )
}
