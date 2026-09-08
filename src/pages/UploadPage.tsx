import { useState, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import CloakingOverlay from "@/components/CloakingOverlay"

export default function UploadPage() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isCloaking, setIsCloaking] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const pdfUrlRef = useRef<string | null>(null)

  const handleFileChange = (file: File | null) => {
    if (file && file.type === "application/pdf") setSelectedFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileChange(e.dataTransfer.files[0] ?? null)
  }, [])

  const handleCloak = () => {
    if (!selectedFile) return
    pdfUrlRef.current = URL.createObjectURL(selectedFile)
    setIsCloaking(true)
  }

  return (
    <>
      {isCloaking && (
        <CloakingOverlay
          onComplete={() => navigate("/preview", { state: { pdfUrl: pdfUrlRef.current } })}
        />
      )}

      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="absolute top-6 left-6 text-sm font-semibold tracking-tight">
          Cloak
        </div>

        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
          <Badge variant="outline" className="text-xs px-3 py-1">
            🔒 100% local — your document never leaves your device
          </Badge>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Cloak your document before sharing with AI
            </h1>
            <p className="text-muted-foreground text-sm">
              PII is detected and redacted locally. No uploads, no servers, no cloud.
            </p>
          </div>

          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => document.getElementById("file-input")?.click()}
              className={`w-full border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors flex flex-col items-center gap-3
                ${isDragging ? "border-primary bg-muted" : "border-border hover:border-primary hover:bg-muted/50"}`}
            >
              <span className="text-3xl">📄</span>
              <p className="text-sm text-muted-foreground">
                Drop your PDF here or <span className="text-foreground underline">click to browse</span>
              </p>
              <p className="text-xs text-muted-foreground/60">PDF only</p>
              <input
                id="file-input"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </div>
          ) : (
            <div className="w-full flex flex-col gap-4">
              <div className="flex items-center gap-3 border rounded-xl px-4 py-3 bg-card">
                <span className="text-2xl">📄</span>
                <span className="flex-1 text-sm font-medium truncate text-left">
                  {selectedFile.name}
                </span>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-muted-foreground hover:text-foreground text-lg leading-none"
                  aria-label="Remove file"
                >
                  ×
                </button>
              </div>

              <Button
                size="lg"
                className="w-full gap-2 shadow-[0_0_20px_hsl(var(--primary)/0.35)]"
                onClick={handleCloak}
              >
                ✦ Cloak it
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
