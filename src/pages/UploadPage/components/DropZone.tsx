import { useState, useCallback } from "react"
import { FileUp } from "lucide-react"

interface DropZoneProps {
  onFileSelect: (file: File | null) => void
  onBrowse: () => void
}

export default function DropZone({ onFileSelect, onBrowse }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsDragging(false)
    onFileSelect(e.dataTransfer.files[0] ?? null)
  }, [onFileSelect])

  return (
    <button
      type="button"
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onClick={onBrowse}
      className={`w-full rounded-2xl border border-dashed px-8 py-12 flex flex-col items-center gap-4 backdrop-blur-sm transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50
        ${isDragging
          ? "border-foreground bg-muted"
          : "border-foreground/20 bg-background/60 hover:border-foreground/50 hover:bg-muted/40"}`}
    >
      <FileUp className="pointer-events-none size-6 text-muted-foreground" aria-hidden />
      <span className="pointer-events-none flex flex-col gap-1">
        <span className="text-sm font-medium">
          {isDragging ? "Drop it here" : "Drop your PDF here"}
        </span>
        <span className="text-sm text-muted-foreground">
          or <span className="text-foreground underline underline-offset-4">click to browse</span>
        </span>
      </span>
    </button>
  )
}
