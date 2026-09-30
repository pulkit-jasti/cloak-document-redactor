import Modal from "@/components/Modal"

interface NoTextModalProps {
  open: boolean
  onClose: () => void
}

export default function NoTextModal({ open, onClose }: NoTextModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Sorry, Cloak can't redact this PDF">
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">
          This PDF looks like a scan or is made entirely of images, so there's no text for Cloak to read.
        </p>
        <p className="text-sm text-muted-foreground">
          Cloak only works with text-based PDFs for now, like ones exported from Word or Google Docs.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Choose another file
        </button>
      </div>
    </Modal>
  )
}
