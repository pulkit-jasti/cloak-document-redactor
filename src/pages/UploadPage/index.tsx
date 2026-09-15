import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import CloakingOverlay from "@/components/CloakingOverlay"
import { useCloak } from "@/context/CloakContext"
import { extractPdfTextPerPage, detectPii } from "@/lib/pdfPipeline"
import { redactPdf } from "@/lib/redactPdf"
import DropZone from "./components/DropZone"
import FilePreview from "./components/FilePreview"

export default function UploadPage() {
  const navigate = useNavigate()
  const { setPdf, setEntities, setRedactedBytes } = useCloak()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isCloaking, setIsCloaking] = useState(false)

  const handleFileSelect = (file: File | null) => {
    if (file && file.type === "application/pdf") setSelectedFile(file)
  }

  const handleCloak = async () => {
    if (!selectedFile) return
    const url = URL.createObjectURL(selectedFile)
    const bytes = new Uint8Array(await selectedFile.arrayBuffer())
    setPdf(url, bytes)
    setIsCloaking(true)

    try {
      const pageTexts = await extractPdfTextPerPage(url)
      const redactions = await detectPii(pageTexts)
      setEntities(redactions)

      const approvedEntities = redactions.filter((r) => r.approved).map((r) => r.value)
      const redacted = await redactPdf(bytes, approvedEntities)
      setRedactedBytes(redacted)
    } catch (err) {
      console.error("[Cloak] pipeline error:", err)
    }

    navigate("/preview")
  }

  return (
    <>
      {isCloaking && <CloakingOverlay />}

      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <button className="absolute top-6 left-6 text-sm font-semibold tracking-tight hover:opacity-60 transition-opacity cursor-pointer">
          Cloak
        </button>

        <div className="w-full max-w-md flex flex-col items-center gap-10 text-center">
          <Badge variant="outline" className="text-sm px-5 py-2">
            🔒 100% local. Your document never leaves your device.
          </Badge>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Cloak your document before sharing with AI
            </h1>
            <p className="text-muted-foreground text-sm">
              PII is detected and redacted locally. No uploads, no servers, no cloud.
            </p>
          </div>

          {selectedFile ? (
            <FilePreview
              file={selectedFile}
              isCloaking={isCloaking}
              onRemove={() => setSelectedFile(null)}
              onCloak={handleCloak}
            />
          ) : (
            <DropZone onFileSelect={handleFileSelect} />
          )}
        </div>
      </div>
    </>
  )
}
