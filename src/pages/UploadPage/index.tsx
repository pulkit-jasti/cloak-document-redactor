import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import CloakingOverlay from "@/components/CloakingOverlay"
import Navbar from "@/components/Navbar"
import { useCloak } from "@/context/CloakContext"
import { useOllama } from "@/context/OllamaContext"
import { extractPdfTextPerPage, detectPii } from "@/lib/pdfPipeline"
import { redactPdf } from "@/lib/redactPdf"
import { ModelSelectorTrigger, ModelSelectorModal } from "@/components/ModelSelectorModal"
import { ConnectOllamaModal } from "@/components/ConnectOllamaModal"
import DropZone from "./components/DropZone"
import FilePreview from "./components/FilePreview"

export default function UploadPage() {
  const navigate = useNavigate()
  const { setPdf, setEntities, setRedactedBytes } = useCloak()
  const { selectedModel } = useOllama()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isCloaking, setIsCloaking] = useState(false)
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
  const [connectOllamaOpen, setConnectOllamaOpen] = useState(false)

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
      const pageTexts = await extractPdfTextPerPage(bytes)
      const redactions = await detectPii(pageTexts, {
        mode: selectedModel ? 'ollama' : 'bert',
        ollamaModel: selectedModel ?? undefined,
      })
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

      <div className="h-screen flex flex-col">
        <Navbar />

        <div className="flex-1 flex flex-col items-center justify-center px-4">
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

            <div className="flex flex-col items-center gap-2">
              <ModelSelectorTrigger onClick={() => setModelSelectorOpen(true)} />
              <button
                onClick={() => setConnectOllamaOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
              >
                Connect Ollama
              </button>
            </div>
          </div>

        <ModelSelectorModal open={modelSelectorOpen} onClose={() => setModelSelectorOpen(false)} />
        <ConnectOllamaModal
          open={connectOllamaOpen}
          onClose={() => setConnectOllamaOpen(false)}
          onConnected={() => { setConnectOllamaOpen(false); setModelSelectorOpen(true) }}
        />
        </div>
      </div>
    </>
  )
}
