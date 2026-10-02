import { createContext, useContext, useRef, useState } from "react"
import type { Redaction } from "@/types"

export type { Redaction }

interface CloakContextValue {
  pdfUrl: string | null
  pdfBytes: Uint8Array | null
  fileName: string | null
  redactedBytes: Uint8Array | null
  entities: Redaction[] | null
  setPdf: (url: string, bytes: Uint8Array, fileName: string) => void
  setEntities: (entities: Redaction[]) => void
  setRedactedBytes: (bytes: Uint8Array | null) => void
  reset: () => void
}

const CloakContext = createContext<CloakContextValue | null>(null)

export function CloakProvider({ children }: { children: React.ReactNode }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [redactedBytes, setRedactedBytes] = useState<Uint8Array | null>(null)
  const [entities, setEntities] = useState<Redaction[] | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const setPdf = (url: string, bytes: Uint8Array, name: string) => {
    blobUrlRef.current = url
    setPdfUrl(url)
    setPdfBytes(bytes)
    setFileName(name)
    setRedactedBytes(null)
  }

  const reset = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setPdfUrl(null)
    setPdfBytes(null)
    setFileName(null)
    setRedactedBytes(null)
    setEntities(null)
  }

  return (
    <CloakContext.Provider value={{ pdfUrl, pdfBytes, fileName, redactedBytes, entities, setPdf, setEntities, setRedactedBytes, reset }}>
      {children}
    </CloakContext.Provider>
  )
}

export function useCloak() {
  const ctx = useContext(CloakContext)
  if (!ctx) throw new Error("useCloak must be used inside CloakProvider")
  return ctx
}
