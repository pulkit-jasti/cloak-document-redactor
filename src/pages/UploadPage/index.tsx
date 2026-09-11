import { useState } from "react"
import { useNavigate } from "react-router-dom"
import * as pdfjsLib from "pdfjs-dist"
import { Badge } from "@/components/ui/badge"
import CloakingOverlay from "@/components/CloakingOverlay"
import NERPipeline from "@/lib/nerPipeline"
import type { TokenClassificationPipeline } from "@huggingface/transformers"
import { useCloak } from "@/context/CloakContext"
import type { Redaction } from "@/constants/mockData"
import DropZone from "./components/DropZone"
import FilePreview from "./components/FilePreview"

const ENTITY_LABELS: Record<string, string> = {
  PER: "Person",
  ORG: "Organization",
  LOC: "Location",
  MISC: "Miscellaneous",
}

// BERT max is 512 tokens; chunk text into ~400 word segments with overlap
// so PII anywhere in a long document is still found.
const CHUNK_WORDS = 200
const OVERLAP_WORDS = 30

function cleanTextForNer(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      // strip URLs
      line = line.replace(/https?:\/\/\S+/g, "")
      // strip standalone timestamps like "03:44:00" or "07/10/2026 03:44:00"
      line = line.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}:\d{2}\b/g, "")
      // strip report IDs / order codes (alphanumeric with dashes/hash)
      line = line.replace(/\bL\d{6,}-\d+\b/g, "")
      line = line.replace(/#\s*\S+/g, "")
      // strip lines that are just numbers/codes with no real words
      return line
    })
    .filter((line) => /[a-zA-Z]{2,}/.test(line)) // keep only lines with actual words
    .join("\n")
}

async function runNer(text: string, pipe: TokenClassificationPipeline) {
  const cleaned = cleanTextForNer(text)
  const words = cleaned.split(/\s+/).filter(Boolean)
  const chunks: string[] = []

  for (let i = 0; i < words.length; i += CHUNK_WORDS - OVERLAP_WORDS) {
    chunks.push(words.slice(i, i + CHUNK_WORDS).join(" "))
    if (i + CHUNK_WORDS >= words.length) break
  }

  const results = await Promise.all(
    chunks.map((chunk) => pipe(chunk, { aggregation_strategy: "simple" }))
  )
  // Pipeline returns array-like objects (not true Arrays) — normalize with Array.from
  return results.flatMap((r) => Array.from(r as ArrayLike<(typeof r)[number]>))
}

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

    // Group text items into visual rows by y-position so multi-column
    // layouts read left-to-right across the row instead of column by column.
    type Item = { str: string; x: number; y: number }
    const items: Item[] = content.items.flatMap((item) => {
      if (!("str" in item) || !item.str.trim()) return []
      const [,, , , x, y] = item.transform as number[]
      return [{ str: item.str, x, y }]
    })

    const ROW_TOLERANCE = 4
    const rows = new Map<number, Item[]>()
    for (const item of items) {
      const key = [...rows.keys()].find((k) => Math.abs(k - item.y) <= ROW_TOLERANCE) ?? item.y
      const row = rows.get(key) ?? []
      row.push(item)
      rows.set(key, row)
    }

    const pageText = [...rows.entries()]
      .sort(([a], [b]) => b - a) // PDF y increases upward, so sort descending
      .map(([, row]) =>
        row.sort((a, b) => a.x - b.x).map((t) => t.str).join(" ")
      )
      .join("\n")

    pages.push(pageText)
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
      const results = await runNer(text, pipe)
      const seen = new Set<string>()
      const redactions: Redaction[] = results.flatMap((r) => {
        const group = "entity_group" in r ? r.entity_group : undefined
        if (!group) return []
        const value = r.word.trim()
        if (!value || value.startsWith("##")) return []
        const key = `${group}:${value.toLowerCase()}`
        if (seen.has(key)) return []
        seen.add(key)
        return [{
          id: crypto.randomUUID(),
          type: ENTITY_LABELS[group] ?? group,
          value,
          page: 1,
          approved: true,
        }]
      })
      setEntities(redactions)
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
