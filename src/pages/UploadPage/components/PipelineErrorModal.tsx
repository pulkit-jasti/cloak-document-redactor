import Modal from "@/components/Modal"

interface PipelineErrorModalProps {
  open: boolean
  onRetry: () => void
  onClose: () => void
}

export default function PipelineErrorModal({ open, onRetry, onClose }: PipelineErrorModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Something went wrong">
      <div className="flex flex-col gap-5 p-6">
        <p className="text-sm text-muted-foreground">
          Cloak couldn't finish redacting this file. Nothing was saved or uploaded.
        </p>
        <div className="mt-1 flex flex-col gap-2">
          <button
            onClick={onRetry}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            Choose another file
          </button>
        </div>
      </div>
    </Modal>
  )
}
