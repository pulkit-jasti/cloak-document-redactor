import { useState } from 'react'
import { ScanText } from 'lucide-react'
import CtaButton from '@/components/CtaButton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PdfImage, PdfLink } from '@/types'
import type { MatchSummary } from '@/components/PdfViewer'
import type { EntityGroup } from '../groupRedactions'
import EntityCard from './EntityCard'
import CustomRedactInput from './CustomRedactInput'
import ImagesTab from './ImagesTab'
import CategorySection from './CategorySection'
import EmptyState from './EmptyState'
import LinkCard from './LinkCard'

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
  links: PdfLink[] | null
  keptLinkUrls: string[]
  onSetLinksKept: (urls: string[], kept: boolean) => void
  onPreviewCustom: (value: string) => void
  onAddCustom: (value: string) => void
  onRemoveCustom: (key: string) => void
}

export const CUSTOM_TYPE = 'Custom'

export default function EntityPanel({ groups, matches, matchesComplete, onSetApproved, onSave, isSaving, images, removedImageIds, onSetImagesRemoved, links, keptLinkUrls, onSetLinksKept, onPreviewCustom, onAddCustom, onRemoveCustom }: Props) {
  const found = groups
    .filter((g) => (matches[g.value]?.count ?? 0) > 0)
    .sort((a, b) => matches[a.value].pages[0] - matches[b.value].pages[0])

  const categories = new Map<string, EntityGroup[]>()
  if (found.some((g) => g.type === CUSTOM_TYPE)) categories.set(CUSTOM_TYPE, [])
  for (const g of found) categories.set(g.type, [...(categories.get(g.type) ?? []), g])
  const misc = categories.get('Miscellaneous')
  if (misc) {
    categories.delete('Miscellaneous')
    categories.set('Miscellaneous', misc)
  }
  const hasLinks = (links?.length ?? 0) > 0
  const LINKS_KEY = 'Links'
  const types = [...categories.keys(), ...(hasLinks ? [LINKS_KEY] : [])]
  const linkUrls = (links ?? []).map((l) => l.url)
  const keptSet = new Set(keptLinkUrls)
  const removedLinkCount = linkUrls.filter((u) => !keptSet.has(u)).length
  const linksChecked =
    removedLinkCount === linkUrls.length ? true : removedLinkCount === 0 ? false : 'indeterminate'

  const [open, setOpen] = useState<string[] | null>(null)
  const openTypes = open ?? types
  const allOpen = types.every((t) => openTypes.includes(t))
  const toggle = (t: string) => setOpen(openTypes.includes(t) ? openTypes.filter((x) => x !== t) : [...openTypes, t])

  return (
    <div className='w-[26rem] flex flex-col overflow-hidden'>
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
        <CustomRedactInput
          matches={matches}
          onPreview={onPreviewCustom}
          onAdd={onAddCustom}
          onApprove={(key) => onSetApproved([key], true)}
          findListed={(value) => groups.find((g) => g.key === value.toLowerCase())}
        />
        {groups.length > 0 && !matchesComplete ? (
          <p className='px-1 py-12 text-center text-sm text-muted-foreground'>Finding matches in your document…</p>
        ) : found.length === 0 && !hasLinks ? (
          <EmptyState
            icon={ScanText}
            title='No personal details found'
            description="Cloak didn't find any personal info in this document's text."
          />
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
                const approvedCount = items.filter((g) => g.approved).length
                const checked =
                  approvedCount === items.length ? true : approvedCount === 0 ? false : 'indeterminate'
                return (
                  <CategorySection
                    key={type}
                    title={type}
                    count={items.length}
                    checked={checked}
                    onToggleAll={() => onSetApproved(items.map((g) => g.key), checked !== true)}
                    ariaLabel={`Redact all ${type}`}
                    isOpen={openTypes.includes(type)}
                    onToggleOpen={() => toggle(type)}
                  >
                    {items.map((g) => (
                      <EntityCard
                        key={g.key}
                        group={g}
                        match={matches[g.value]}
                        onSetApproved={onSetApproved}
                        onRemove={type === CUSTOM_TYPE ? onRemoveCustom : undefined}
                      />
                    ))}
                  </CategorySection>
                )
              })}
              {hasLinks && links && (
                <CategorySection
                  title={LINKS_KEY}
                  count={links.length}
                  checked={linksChecked}
                  onToggleAll={() => onSetLinksKept(linkUrls, linksChecked === true)}
                  ariaLabel='Remove all links'
                  isOpen={openTypes.includes(LINKS_KEY)}
                  onToggleOpen={() => toggle(LINKS_KEY)}
                >
                  <p className='px-1 pb-1 text-xs text-muted-foreground'>
                    Links can hide email addresses or names in their targets. Uncheck any you want to keep. Links that jump
                    within the document are always kept.
                  </p>
                  {links.map((link) => (
                    <LinkCard
                      key={link.url}
                      link={link}
                      removed={!keptSet.has(link.url)}
                      onChange={(removed) => onSetLinksKept([link.url], !removed)}
                    />
                  ))}
                </CategorySection>
              )}
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
