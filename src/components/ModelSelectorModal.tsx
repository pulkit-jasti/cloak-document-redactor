import { Bot, ChevronDown, Cpu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOllama } from '@/context/OllamaContext'
import { warmUpModel, type OllamaModel } from '@/lib/ollamaClient'
import Modal from '@/components/Modal'

function ModelRow({
  name,
  subtitle,
  selected,
  onClick,
}: {
  name: string
  subtitle: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
        selected ? 'bg-primary/10 text-foreground' : 'hover:bg-muted text-foreground'
      }`}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium truncate">{name}</span>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
      {selected && (
        <span className="mt-0.5 shrink-0 text-primary">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  )
}

interface ModelSelectorModalProps {
  open: boolean
  onClose: () => void
}

export function ModelSelectorModal({ open, onClose }: ModelSelectorModalProps) {
  const { status, models, selectedModel, setSelectedModel } = useOllama()

  const handleSelect = (model: string | null) => {
    setSelectedModel(model)
    if (model) warmUpModel(model).catch(() => {})
    onClose()
  }

  const modelSubtitle = (m: OllamaModel) => {
    const parts = [m.parameterSize, m.quantization, m.family].filter(Boolean)
    return parts.join(' · ')
  }

  return (
    <Modal open={open} onClose={onClose} title="Choose detection model">
      <div className="flex flex-col gap-6 p-4 overflow-y-auto max-h-[65vh]">
        <div className="flex flex-col gap-1.5">
          <span className="px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Built-in</span>
          <ModelRow
            name="BERT (built-in)"
            subtitle="Token classification · ~50MB · runs in browser"
            selected={selectedModel === null}
            onClick={() => handleSelect(null)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ollama</span>
          {status === 'available' && models.length > 0 ? (
            models.map((m) => (
              <ModelRow
                key={m.name}
                name={m.name}
                subtitle={modelSubtitle(m)}
                selected={selectedModel === m.name}
                onClick={() => handleSelect(m.name)}
              />
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Not connected. Use the Connect Ollama button to get started.
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}

export function ModelSelectorTrigger({ onClick }: { onClick: () => void }) {
  const { selectedModel } = useOllama()
  const Icon = selectedModel ? Bot : Cpu

  return (
    <Button
      variant="outline"
      onClick={onClick}
      aria-haspopup="dialog"
      className="h-9 gap-2 rounded-full px-4 font-normal"
    >
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">Model:</span>
      <span className="max-w-40 truncate font-medium">{selectedModel ?? 'BERT (built-in)'}</span>
      <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
    </Button>
  )
}
