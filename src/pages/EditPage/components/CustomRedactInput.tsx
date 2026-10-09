import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MatchSummary } from '@/components/PdfViewer'
import type { EntityGroup } from '../groupRedactions'

const MIN_LENGTH = 2
const PREVIEW_DELAY_MS = 300

interface Props {
  matches: MatchSummary
  onPreview: (value: string) => void
  onAdd: (value: string) => void
  onApprove: (key: string) => void
  findListed: (value: string) => EntityGroup | undefined
}

export default function CustomRedactInput({ matches, onPreview, onAdd, onApprove, findListed }: Props) {
  const [text, setText] = useState('')
  const value = text.trim().replace(/\s+/g, ' ')
  const [preview, setPreview] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setPreview(value.length >= MIN_LENGTH ? value : ''), PREVIEW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [value])

  useEffect(() => {
    onPreview(preview)
  }, [preview, onPreview])

  const match = preview && preview === value ? matches[preview] : undefined
  const listed = value.length >= MIN_LENGTH ? findListed(value) : undefined
  const canAdd = listed ? !listed.approved : !!match?.done && match.count > 0

  const status = (() => {
    if (value.length < MIN_LENGTH) return null
    if (listed) return listed.approved ? `Already redacted under ${listed.type}` : `Listed under ${listed.type} but not redacted. Add to redact it.`
    if (!match?.done) return 'Searching…'
    if (match.count === 0) return 'No matches'
    const pages = match.pages.length
    return `${match.count} ${match.count === 1 ? 'match' : 'matches'} on ${pages} ${pages === 1 ? 'page' : 'pages'}`
  })()

  const submit = () => {
    if (!canAdd) return
    if (listed) onApprove(listed.key)
    else onAdd(value)
    setText('')
  }

  return (
    <div className='mb-4'>
      <div className='flex gap-2'>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          placeholder='Type a word or phrase to redact everywhere'
          aria-label='Text to redact'
          className='h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
        />
        <Button size='icon' className='size-9' onClick={submit} disabled={!canAdd} aria-label='Add to redactions'>
          <Plus className='size-4' />
        </Button>
      </div>
      {status && <p className='mt-1.5 px-1 text-xs text-muted-foreground tabular-nums'>{status}</p>}
    </div>
  )
}
