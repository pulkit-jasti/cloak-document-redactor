import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FileUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import CloakingOverlay from "@/components/CloakingOverlay"
import { ModelSelectorTrigger, ModelSelectorModal } from "@/components/ModelSelectorModal"
import { ConnectOllamaModal } from "@/components/ConnectOllamaModal"
import { useCloak } from "@/context/CloakContext"
import { useOllama } from "@/context/OllamaContext"
import { extractPdfTextPerPage, detectPii, type CloakProgress } from "@/lib/pdfPipeline"
import { redactPdf } from "@/lib/redactPdf"
import { hasAnyText } from "@/lib/pageStats"
import CtaButton from "@/components/CtaButton"
import DropZone from "./DropZone"
import FilePreview from "./FilePreview"
import NoTextModal from "./NoTextModal"
import PipelineErrorModal from "./PipelineErrorModal"
import OllamaIcon from "@/assets/ollama.svg?react"

const IS_DEV = import.meta.env.VITE_ENV === "development"
const OVERLAY_EXIT_MS = 450

export default function UploadPanel() {
  const navigate = useNavigate()
  const { setPdf, setEntities, setRedactedBytes } = useCloak()
  const { status, selectedModel } = useOllama()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<CloakProgress | null>(null)
  const [isClosingOverlay, setIsClosingOverlay] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
  const [connectOllamaOpen, setConnectOllamaOpen] = useState(false)
  const [noTextOpen, setNoTextOpen] = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ollamaConnected = status === "available"
  const isCloaking = progress !== null

  const handleFileSelect = (file: File | null) => {
    if (file && file.type === "application/pdf") setSelectedFile(file)
  }

  const openPicker = () => fileInputRef.current?.click()

  const closeOverlay = (then?: () => void) => {
    setIsClosingOverlay(true)
    setTimeout(() => {
      setProgress(null)
      setIsClosingOverlay(false)
      then?.()
    }, OVERLAY_EXIT_MS)
  }

  const handleCloak = async () => {
    if (!selectedFile) return
    const controller = new AbortController()
    abortRef.current = controller
    const { signal } = controller
    const startedAt = performance.now()
    let modelUsed = selectedModel ?? "BERT (built-in)"
    const report = (next: CloakProgress) => {
      if (next.stage === "scanning" && !next.parallel && selectedModel) {
        modelUsed = `BERT (built-in), fallback from ${selectedModel}`
      }
      if (!signal.aborted) setProgress(next)
    }

    report({ stage: "reading" })
    const url = URL.createObjectURL(selectedFile)

    try {
      const bytes = new Uint8Array(await selectedFile.arrayBuffer())
      const { pageTexts, pageStats } = await extractPdfTextPerPage(bytes, signal)
      if (!hasAnyText(pageStats)) {
        URL.revokeObjectURL(url)
        closeOverlay(() => setNoTextOpen(true))
        return
      }

      const redactions = await detectPii(pageTexts, {
        mode: selectedModel ? "ollama" : "bert",
        ollamaModel: selectedModel ?? undefined,
        signal,
        onProgress: report,
      })

      report({ stage: "redacting" })
      const approvedEntities = redactions.filter((r) => r.approved).map((r) => r.value)
      const redacted = await redactPdf(bytes, approvedEntities, signal)
      signal.throwIfAborted()

      if (IS_DEV) {
        const seconds = ((performance.now() - startedAt) / 1000).toFixed(1)
        console.log(`[Cloak] Cloaked in ${seconds}s | model: ${modelUsed} | pages: ${pageTexts.length}`)
      }

      setPdf(url, bytes, selectedFile.name)
      setEntities(redactions)
      setRedactedBytes(redacted)
      navigate("/preview")
    } catch (err) {
      URL.revokeObjectURL(url)
      if (signal.aborted) return
      console.error("[Cloak] pipeline error:", err)
      closeOverlay(() => setErrorOpen(true))
    }
  }

  const handleCancel = () => {
    abortRef.current?.abort()
    closeOverlay()
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="pointer-events-auto flex flex-col gap-4">
          {selectedFile ? (
            <FilePreview file={selectedFile} onRemove={() => setSelectedFile(null)} />
          ) : (
            <DropZone onFileSelect={handleFileSelect} onBrowse={openPicker} />
          )}

          <CtaButton
            fullWidth
            wrapperClassName="mb-6"
            onClick={selectedFile ? handleCloak : openPicker}
            disabled={isCloaking}
          >
            <span
              key={selectedFile ? "cloak" : "choose"}
              className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300"
            >
              {selectedFile ? (
                <>
                  <span className="cta-spark" aria-hidden>✦</span>
                  Cloak it
                </>
              ) : (
                <>
                  <FileUp className="size-4.5" aria-hidden />
                  Choose a PDF
                </>
              )}
            </span>
          </CtaButton>

          <input
            ref={fileInputRef}
            id="file-input"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              handleFileSelect(e.target.files?.[0] ?? null)
              e.target.value = ""
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 *:pointer-events-auto">
          <ModelSelectorTrigger onClick={() => setModelSelectorOpen(true)} />
          <Button
            variant="outline"
            onClick={() => (ollamaConnected ? setModelSelectorOpen(true) : setConnectOllamaOpen(true))}
            aria-haspopup="dialog"
            className="h-9 gap-2 rounded-full px-4 font-normal"
          >
            <span className="relative" aria-hidden>
              <OllamaIcon className="size-4" />
              {ollamaConnected && (
                <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
              )}
            </span>
            {ollamaConnected ? "Ollama connected" : "Connect Ollama"}
          </Button>
        </div>
      </div>

      <div className="pointer-events-auto">
        {progress && (
          <CloakingOverlay progress={progress} closing={isClosingOverlay} onCancel={handleCancel} />
        )}
        <NoTextModal
          open={noTextOpen}
          onClose={() => { setNoTextOpen(false); setSelectedFile(null) }}
        />
        <PipelineErrorModal
          open={errorOpen}
          onRetry={() => { setErrorOpen(false); handleCloak() }}
          onClose={() => { setErrorOpen(false); setSelectedFile(null) }}
        />
        <ModelSelectorModal open={modelSelectorOpen} onClose={() => setModelSelectorOpen(false)} />
        <ConnectOllamaModal
          open={connectOllamaOpen}
          onClose={() => setConnectOllamaOpen(false)}
          onConnected={() => { setConnectOllamaOpen(false); setModelSelectorOpen(true) }}
        />
      </div>
    </>
  )
}
