import { FileText, X } from "lucide-react"

interface FilePreviewProps {
  file: File
  onRemove: () => void
}

export default function FilePreview({ file, onRemove }: FilePreviewProps) {
  return (
    <div className="w-full flex items-center gap-3 border rounded-2xl px-4 py-3 bg-card">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
        <FileText className="size-4" aria-hidden />
      </span>
      <span className="flex-1 text-sm font-medium truncate text-left">{file.name}</span>
      <button
        onClick={onRemove}
        className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Remove file"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
