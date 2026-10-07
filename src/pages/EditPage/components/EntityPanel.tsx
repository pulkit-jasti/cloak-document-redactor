import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import CtaButton from '@/components/CtaButton'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PdfImage } from '@/types'
import type { MatchSummary } from '@/components/PdfViewer'
import type { EntityGroup } from '../groupRedactions'
import EntityCard from './EntityCard'
import ImagesTab from './ImagesTab'

interface Props {
  groups: EntityGroup[]
  matches: MatchSummary
  matchesComplete: boolean
  onSetApproved: (keys: string[], approved: boolean) => void
  onSave: () => void
  isSaving?: boolean
  images: PdfImage[] | null
  removedImageIds: string[]
  onSetImagesRemoved: (ids: string[], removed: boolean) => void
}

export default function EntityPanel({ groups, matches, matchesComplete, onSetApproved, onSave, isSaving, images, removedImageIds, onSetImagesRemoved }: Props) {
  const found = groups
    .filter((g) => (matches[g.value]?.count ?? 0) > 0)
    .sort((a, b) => matches[a.value].pages[0] - matches[b.value].pages[0])

  const categories = new Map<string, EntityGroup[]>()
  for (const g of found) categories.set(g.type, [...(categories.get(g.type) ?? []), g])
  const misc = categories.get('Miscellaneous')
  if (misc) {
    categories.delete('Miscellaneous')
    categories.set('Miscellaneous', misc)
  }
  const types = [...categories.keys()]

  const [open, setOpen] = useState<string[] | null>(null)
  const openTypes = open ?? types
  const allOpen = types.every((t) => openTypes.includes(t))
  const toggle = (t: string) => setOpen(openTypes.includes(t) ? openTypes.filter((x) => x !== t) : [...openTypes, t])

  return (
    <div className='w-96 flex flex-col overflow-hidden'>
      <Tabs defaultValue='text' className='flex-1 min-h-0 gap-0'>
      <div className='shrink-0 px-4 pt-4'>
        <TabsList className='w-full'>
          <TabsTrigger value='text'>Text</TabsTrigger>
          <TabsTrigger value='images'>
            Images{images && images.length > 0 ? ` (${images.length})` : ''}
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value='text' className='overflow-y-auto p-4 min-h-0'>
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
          <>
            <div className='mb-3 flex justify-end'>
              <button
                onClick={() => setOpen(allOpen ? [] : types)}
                className='text-xs text-muted-foreground hover:text-foreground'
              >
                {allOpen ? 'Collapse all' : 'Expand all'}
              </button>
            </div>
            <div className='border-t'>
              {[...categories].map(([type, items]) => {
                const isOpen = openTypes.includes(type)
                const approvedCount = items.filter((g) => g.approved).length
                const checked =
                  approvedCount === items.length ? true : approvedCount === 0 ? false : 'indeterminate'
                return (
                  <div key={type} className='border-b'>
                    <div className='flex items-center gap-3 px-1'>
                      <Checkbox
                        className='rounded-[4px]'
                        checked={checked}
                        onCheckedChange={() => onSetApproved(items.map((g) => g.key), checked !== true)}
                        aria-label={`Redact all ${type}`}
                      />
                      <button
                        type='button'
                        aria-expanded={isOpen}
                        onClick={() => toggle(type)}
                        className='group flex flex-1 items-center justify-between py-3.5 text-sm font-medium'
                      >
                        <span>
                          {type} <span className='text-muted-foreground tabular-nums'>({items.length})</span>
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
                          {items.map((g) => (
                            <EntityCard key={g.key} group={g} match={matches[g.value]} onSetApproved={onSetApproved} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </TabsContent>
      <TabsContent value='images' className='overflow-y-auto p-4 min-h-0'>
        <ImagesTab images={images} removedIds={removedImageIds} onSetRemoved={onSetImagesRemoved} />
      </TabsContent>
      </Tabs>

      <div className='shrink-0 border-t px-4 pt-4 pb-7'>
        <CtaButton fullWidth onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Applying changes…' : 'Apply changes'}
        </CtaButton>
      </div>
    </div>
  )
}
