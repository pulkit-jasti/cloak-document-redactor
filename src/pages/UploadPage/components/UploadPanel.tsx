import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plug } from "lucide-react"
import { Button } from "@/components/ui/button"
import CloakingOverlay from "@/components/CloakingOverlay"
import { ModelSelectorTrigger, ModelSelectorModal } from "@/components/ModelSelectorModal"
import { ConnectOllamaModal } from "@/components/ConnectOllamaModal"
import { useCloak } from "@/context/CloakContext"
import { useOllama } from "@/context/OllamaContext"
import { extractPdfTextPerPage, detectPii } from "@/lib/pdfPipeline"
import { redactPdf } from "@/lib/redactPdf"
import { countPdfPages } from "@/lib/countPdfPages"
import { estimateSeconds } from "@/lib/estimateTime"
import DropZone from "./DropZone"
import FilePreview from "./FilePreview"

export default function UploadPanel() {
  const navigate = useNavigate()
  const { setPdf, setEntities, setRedactedBytes } = useCloak()
  const { status, selectedModel, models } = useOllama()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isCloaking, setIsCloaking] = useState(false)
  const [estimatedSeconds, setEstimatedSeconds] = useState(0)
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
  const [connectOllamaOpen, setConnectOllamaOpen] = useState(false)

  const ollamaConnected = status === "available"

  const handleFileSelect = (file: File | null) => {
    if (file && file.type === "application/pdf") setSelectedFile(file)
  }

  const handleCloak = async () => {
    if (!selectedFile) return
    const url = URL.createObjectURL(selectedFile)
    const bytes = new Uint8Array(await selectedFile.arrayBuffer())
    setPdf(url, bytes)

    const pageCount = await countPdfPages(bytes)
    const mode = selectedModel ? 'ollama' : 'bert'
    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator
    const ollamaModel = models.find((m) => m.name === selectedModel)
    const sizeGB = ollamaModel ? ollamaModel.size / 1e9 : 4
    setEstimatedSeconds(estimateSeconds(pageCount, mode, hasWebGPU, sizeGB))

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
      {isCloaking && <CloakingOverlay estimatedSeconds={estimatedSeconds} />}

      <div className="flex flex-col gap-5">
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

        <div className="flex flex-wrap items-center justify-center gap-2">
          <ModelSelectorTrigger onClick={() => setModelSelectorOpen(true)} />
          <Button
            variant="outline"
            onClick={() => (ollamaConnected ? setModelSelectorOpen(true) : setConnectOllamaOpen(true))}
            aria-haspopup="dialog"
            className="h-9 gap-2 rounded-full px-4 font-normal"
          >
            {ollamaConnected ? (
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
            ) : (
              <Plug className="size-4 text-muted-foreground" aria-hidden />
            )}
            {ollamaConnected ? "Ollama connected" : "Connect Ollama"}
          </Button>
        </div>
      </div>

      <ModelSelectorModal open={modelSelectorOpen} onClose={() => setModelSelectorOpen(false)} />
      <ConnectOllamaModal
        open={connectOllamaOpen}
        onClose={() => setConnectOllamaOpen(false)}
        onConnected={() => { setConnectOllamaOpen(false); setModelSelectorOpen(true) }}
      />
    </>
  )
}
