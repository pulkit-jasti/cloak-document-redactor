import { useState } from 'react'
import { ChevronDown, Cpu, Download, Loader2, Trash2, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNerModel, type NerDownloadState } from '@/context/NerModelContext'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { NER_MODELS, getNerModel, type NerModel } from '@/lib/nerModels'
import Modal from '@/components/Modal'

function CheckIcon() {
  return (
    <span className="shrink-0 text-primary">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export function ModelRow({
  name,
  subtitle,
  badge,
  selected,
  onClick,
  action,
}: {
  name: string
  subtitle: string
  badge?: string
  selected: boolean
  onClick: () => void
  action?: React.ReactNode
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg pr-2 transition-colors ${
        selected ? 'bg-primary/10 text-foreground' : 'hover:bg-muted text-foreground'
      }`}
    >
      <button onClick={onClick} className="flex flex-1 items-center justify-between gap-3 px-3 py-3 text-left min-w-0">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="truncate">{name}</span>
            {badge && <Badge variant="secondary">{badge}</Badge>}
          </span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
        {selected && <CheckIcon />}
      </button>
      {action}
    </div>
  )
}

function NerModelAction({
  model,
  state,
  onDownload,
  onRemove,
}: {
  model: NerModel
  state: NerDownloadState
  onDownload: () => void
  onRemove: () => void
}) {
  const iconButton = 'shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-background transition-colors'

  if (state.status === 'checking' || state.status === 'removing') {
    return <Loader2 className="mx-1.5 size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
  }

  if (state.status === 'downloading') {
    return (
      <span className="flex shrink-0 items-center gap-1.5 px-1.5 text-xs tabular-nums text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        {state.progress}%
      </span>
    )
  }

  if (state.status === 'ready') {
    return (
      <button onClick={onRemove} className={iconButton} aria-label={`Remove ${model.name} from this browser`} title="Remove from browser">
        <Trash2 className="size-4" aria-hidden />
      </button>
    )
  }

  return (
    <button onClick={onDownload} className={iconButton} aria-label={`Download ${model.name}`} title={`Download (${model.size})`}>
      <Download className="size-4" aria-hidden />
    </button>
  )
}

interface ModelSelectorModalProps {
  open: boolean
  onClose: () => void
}

export function ModelSelectorModal({ open, onClose }: ModelSelectorModalProps) {
  const { selectedId, setSelectedId, states, download, remove } = useNerModel()
  const online = useOnlineStatus()
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  // Offline, a removed model can't be downloaded again, so ask first.
  const handleRemove = (id: string) => {
    if (online) remove(id)
    else setConfirmRemoveId(id)
  }

  const handleSelectNer = (id: string) => {
    setSelectedId(id)
    const status = states[id]?.status
    if (status === 'missing') download(id)
    if (status !== 'missing' && status !== 'downloading') onClose()
  }

  const nerSubtitle = (m: NerModel) => {
    const state = states[m.id]
    const where = state?.status === 'ready' ? 'downloaded' : 'runs in browser'
    return `${m.tradeoff} · ${m.size} · ${where}`
  }

  return (
    <Modal open={open} onClose={onClose} title="Choose detection model">
      <div className="flex flex-col gap-6 p-4 overflow-y-auto max-h-[65vh]">
        <div className="flex flex-col gap-1.5">
          {NER_MODELS.map((m) => (
            <div key={m.id} className="flex flex-col gap-1.5">
              <ModelRow
                name={m.name}
                subtitle={nerSubtitle(m)}
                badge={m.badge}
                selected={selectedId === m.id}
                onClick={() => handleSelectNer(m.id)}
                action={
                  <NerModelAction
                    model={m}
                    state={states[m.id] ?? { status: 'checking' }}
                    onDownload={() => download(m.id)}
                    onRemove={() => handleRemove(m.id)}
                  />
                }
              />
              {confirmRemoveId === m.id && (
                <div role="alert" className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="flex gap-2 text-muted-foreground">
                    <WifiOff className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
                    <span>
                      You&apos;re offline. If you remove {m.name}, you won&apos;t be able to download it again until
                      you&apos;re back online.
                    </span>
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setConfirmRemoveId(null)}>
                      Keep it
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setConfirmRemoveId(null)
                        remove(m.id)
                      }}
                    >
                      Remove anyway
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </Modal>
  )
}

export function ModelSelectorTrigger({ onClick }: { onClick: () => void }) {
  const { selectedId } = useNerModel()

  return (
    <Button
      variant="outline"
      onClick={onClick}
      aria-haspopup="dialog"
      className="h-9 gap-2 rounded-full px-4 font-normal"
    >
      <Cpu className="size-4 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">Model:</span>
      <span className="max-w-40 truncate font-medium">{getNerModel(selectedId).name}</span>
      <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
    </Button>
  )
}
