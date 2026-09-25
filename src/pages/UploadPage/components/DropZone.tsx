import { useState, useCallback } from "react"

interface DropZoneProps {
  onFileSelect: (file: File | null) => void
}

export default function DropZone({ onFileSelect }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    onFileSelect(e.dataTransfer.files[0] ?? null)
  }, [onFileSelect])

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => document.getElementById("file-input")?.click()}
      className={`w-full border-2 border-dashed rounded-xl p-16 cursor-pointer transition-colors flex flex-col items-center gap-4
        ${isDragging ? "border-primary bg-muted" : "border-border hover:border-primary hover:bg-muted/50"}`}
    >
      <span className="text-3xl">📄</span>
      <p className="text-sm text-muted-foreground">
        Drop your PDF here or <span className="text-foreground underline">click to browse</span>
      </p>
      <input
        id="file-input"
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
