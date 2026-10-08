import { useOllama } from '@/context/OllamaContext'
import { warmUpModel, type OllamaModel } from '@/lib/ollamaClient'
import Modal from '@/components/Modal'
import { ModelRow } from '@/components/ModelSelectorModal'

interface AiReviewModalProps {
  open: boolean
  onClose: () => void
}

export function AiReviewModal({ open, onClose }: AiReviewModalProps) {
  const { models, selectedModel, setSelectedModel } = useOllama()

  const select = (model: string | null) => {
    setSelectedModel(model)
    if (model) warmUpModel(model).catch(() => {})
    onClose()
  }

  const subtitle = (m: OllamaModel) => [m.parameterSize, m.quantization, m.family].filter(Boolean).join(' · ')

  return (
    <Modal open={open} onClose={onClose} title="AI review">
      <div className="flex flex-col gap-4 p-4 overflow-y-auto max-h-[65vh]">
        <p className="px-3 text-sm text-muted-foreground text-pretty">
          A local AI model double-checks what Cloak finds and follows your custom instructions. It runs through Ollama on
          your own computer.
        </p>
        <div className="flex flex-col gap-1.5">
          <ModelRow name="Off" subtitle="Use the detection model only" selected={selectedModel === null} onClick={() => select(null)} />
          {models.map((m) => (
            <ModelRow
              key={m.name}
              name={m.name}
              subtitle={subtitle(m)}
              selected={selectedModel === m.name}
              onClick={() => select(m.name)}
            />
          ))}
        </div>
      </div>
    </Modal>
  )
}
