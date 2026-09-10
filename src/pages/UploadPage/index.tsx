import { useState } from "react"
import { useNavigate } from "react-router-dom"
import * as pdfjsLib from "pdfjs-dist"
import { Badge } from "@/components/ui/badge"
import CloakingOverlay from "@/components/CloakingOverlay"
import NERPipeline from "@/lib/nerPipeline"
import { useCloak } from "@/context/CloakContext"
import { MOCK_REDACTIONS } from "@/constants/mockData"
import DropZone from "./components/DropZone"
import FilePreview from "./components/FilePreview"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href

async function extractPdfText(url: string): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ url }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(
      content.items
        .map((item) => ("str" in item ? (item as { str: string }).str : ""))
        .join(" ")
    )
  }
  return pages.join("\n")
}

export default function UploadPage() {
  const navigate = useNavigate()
  const { setPdf, setEntities } = useCloak()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isCloaking, setIsCloaking] = useState(false)

  const handleFileSelect = (file: File | null) => {
    if (file && file.type === "application/pdf") setSelectedFile(file)
  }

  const handleCloak = async () => {
    if (!selectedFile) return
    const url = URL.createObjectURL(selectedFile)
    setPdf(url)
    setIsCloaking(true)

    try {
      const text = await extractPdfText(url)
      const pipe = await NERPipeline.getInstance()
      const results = await pipe(text)
      console.log("[Cloak] extracted text:", text)
      console.log("[Cloak] NER results:", results)
      setEntities(MOCK_REDACTIONS)
    } catch (err) {
      console.error("[Cloak] pipeline error:", err)
    }

    navigate("/preview")
  }

  return (
    <>
      {isCloaking && <CloakingOverlay />}

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
