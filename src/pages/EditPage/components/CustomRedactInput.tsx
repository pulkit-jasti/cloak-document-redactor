import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Loader2, Plus, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { MatchSummary } from '@/components/PdfViewer'
import { useOllama } from '@/context/OllamaContext'
import { instructionCapableModels, pickInstructionModel } from '@/lib/ollamaClient'
import type { EntityGroup } from '../groupRedactions'

const MIN_LENGTH = 2
const PREVIEW_DELAY_MS = 300
const MODEL_STORAGE_KEY = 'cloak:ollama:instruction-model'

export type InstructionRun = (
  instruction: string,
  model: string,
  options: { signal: AbortSignal; onProgress: (done: number, total: number) => void },
) => Promise<number>

interface Props {
  matches: MatchSummary
  onPreview: (value: string) => void
  onAdd: (value: string) => void
  onApprove: (key: string) => void
  findListed: (value: string) => EntityGroup | undefined
  onRunInstruction: InstructionRun
  trailing?: React.ReactNode
}

function readSavedModel(): string | null {
  try {
    return localStorage.getItem(MODEL_STORAGE_KEY)
  } catch {
    return null
  }
}

function saveModel(model: string) {
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, model)
  } catch {
    return
  }
}

export default function CustomRedactInput({ matches, onPreview, onAdd, onApprove, findListed, onRunInstruction, trailing }: Props) {
  const { status: ollamaStatus, models: allModels } = useOllama()
  const models = instructionCapableModels(allModels)
  const aiAvailable = ollamaStatus === 'available' && models.length > 0
  const [modeChoice, setModeChoice] = useState<'ai' | 'exact' | null>(null)
  const ai = aiAvailable && (modeChoice ?? 'ai') === 'ai'
  const savedModel = readSavedModel()
  const [model, setModel] = useState<string | null>(null)
  const activeModel =
    (model && models.some((m) => m.name === model) && model) ||
    (savedModel && models.some((m) => m.name === savedModel) && savedModel) ||
    pickInstructionModel(models)

  const [text, setText] = useState('')
  const value = text.trim().replace(/\s+/g, ' ')
  const [preview, setPreview] = useState('')
  const [running, setRunning] = useState<{ done: number; total: number } | null>(null)
  const [aiStatus, setAiStatus] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const next = !ai && value.length >= MIN_LENGTH ? value : ''
    const timer = setTimeout(() => setPreview(next), PREVIEW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [value, ai])

  useEffect(() => {
    onPreview(preview)
  }, [preview, onPreview])

  useEffect(() => () => abortRef.current?.abort(), [])

  const match = preview && preview === value ? matches[preview] : undefined
  const listed = !ai && value.length >= MIN_LENGTH ? findListed(value) : undefined
  const canAdd = ai
    ? value.length >= MIN_LENGTH && !!activeModel && !running
    : listed
      ? !listed.approved
      : !!match?.done && match.count > 0

  const exactStatus = (() => {
    if (value.length < MIN_LENGTH) return null
    if (listed) return listed.approved ? `Already redacted in ${listed.type}` : `In ${listed.type}, not redacted. Add to redact`
    if (!match?.done) return 'Searching…'
    if (match.count === 0) return 'No matches'
    const pages = match.pages.length
    return `${match.count} ${match.count === 1 ? 'match' : 'matches'} on ${pages} ${pages === 1 ? 'page' : 'pages'}`
  })()

  const runInstruction = async () => {
    if (!activeModel) return
    const controller = new AbortController()
    abortRef.current = controller
    setAiStatus(null)
    setRunning({ done: 0, total: 0 })
    try {
      const added = await onRunInstruction(value, activeModel, {
        signal: controller.signal,
        onProgress: (done, total) => setRunning({ done, total }),
      })
      setAiStatus(added === 0 ? 'Nothing new found' : null)
      setText('')
    } catch {
      setAiStatus(controller.signal.aborted ? 'Stopped' : `Couldn't reach ${activeModel}`)
    } finally {
      abortRef.current = null
      setRunning(null)
    }
  }

  const submit = () => {
    if (!canAdd) return
    if (ai) {
      void runInstruction()
      return
    }
    if (listed) onApprove(listed.key)
    else onAdd(value)
    setText('')
  }

  const setAiMode = (on: boolean) => {
    setModeChoice(on ? 'ai' : 'exact')
    setAiStatus(null)
  }

  const status = ai
    ? running
      ? running.total > 0
        ? `Reading page ${Math.min(running.done + 1, running.total)} of ${running.total}…`
        : 'Starting…'
      : aiStatus
    : exactStatus

  return (
    <div className='mb-4'>
      <div className='flex gap-2'>
        <div className={ai ? 'ai-glow min-w-0 flex-1' : 'min-w-0 flex-1'}>
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setAiStatus(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            disabled={!!running}
            placeholder={ai ? 'Describe what to redact, e.g. all tattoos' : 'Type a word or phrase to redact everywhere'}
            aria-label={ai ? 'Describe what to redact' : 'Text to redact'}
            className='h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60'
          />
        </div>
        {running ? (
          <Button size='icon' className='size-9' onClick={() => abortRef.current?.abort()} aria-label='Stop'>
            <X className='size-4' />
          </Button>
        ) : (
          <Button size='icon' className='size-9' onClick={submit} disabled={!canAdd} aria-label={ai ? 'Find with AI' : 'Add to redactions'}>
            {ai ? <ArrowUp className='size-4' /> : <Plus className='size-4' />}
          </Button>
        )}
      </div>
      <div className='mt-2 flex h-7 items-center gap-3'>
        <div className='flex min-w-0 flex-1 items-center gap-2.5'>
          {aiAvailable && (
            <label className='flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium'>
              <Switch size='sm' checked={ai} onCheckedChange={setAiMode} disabled={!!running} />
              <Sparkles className={`size-3.5 ${ai ? 'text-foreground' : 'text-muted-foreground'}`} aria-hidden />
              AI
            </label>
          )}
          {ai && !running && !aiStatus && activeModel ? (
            <Select
              value={activeModel}
              onValueChange={(next) => {
                setModel(next)
                saveModel(next)
              }}
            >
              <SelectTrigger size='sm' className='h-7 min-w-0 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.name} value={m.name} className='text-xs'>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            (status || running) && (
              <span className='flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums'>
                {running && <Loader2 className='size-3 shrink-0 animate-spin' aria-hidden />}
                <span className='truncate'>{status}</span>
              </span>
            )
          )}
        </div>
        {trailing}
      </div>
    </div>
  )
}
