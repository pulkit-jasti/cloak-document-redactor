import { Button } from "@/components/ui/button"

interface FilePreviewProps {
  file: File
  isCloaking: boolean
  onRemove: () => void
  onCloak: () => void
}

export default function FilePreview({ file, isCloaking, onRemove, onCloak }: FilePreviewProps) {
  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-3 border rounded-xl px-4 py-3 bg-card">
        <span className="text-2xl">📄</span>
        <span className="flex-1 text-sm font-medium truncate text-left">{file.name}</span>
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground text-lg leading-none"
          aria-label="Remove file"
        >
          ×
        </button>
      </div>

      <Button
        size="lg"
        className="w-full gap-2 shadow-[0_0_20px_hsl(var(--primary)/0.35)]"
        onClick={onCloak}
        disabled={isCloaking}
      >
        ✦ Cloak it
      </Button>
    </div>
  )
}
