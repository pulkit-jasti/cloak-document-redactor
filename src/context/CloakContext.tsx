import { createContext, useContext, useRef, useState } from "react"
import type { Redaction } from "@/constants/mockData"

export type { Redaction }

interface CloakContextValue {
  pdfUrl: string | null
  pdfBytes: Uint8Array | null
  entities: Redaction[] | null
  setPdf: (url: string, bytes: Uint8Array) => void
  setEntities: (entities: Redaction[]) => void
  reset: () => void
}

const CloakContext = createContext<CloakContextValue | null>(null)

export function CloakProvider({ children }: { children: React.ReactNode }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [entities, setEntities] = useState<Redaction[] | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const setPdf = (url: string, bytes: Uint8Array) => {
    blobUrlRef.current = url
    setPdfUrl(url)
    setPdfBytes(bytes)
  }

  const reset = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setPdfUrl(null)
    setPdfBytes(null)
    setEntities(null)
  }

  return (
    <CloakContext.Provider value={{ pdfUrl, pdfBytes, entities, setPdf, setEntities, reset }}>
      {children}
    </CloakContext.Provider>
  )
}

export function useCloak() {
  const ctx = useContext(CloakContext)
  if (!ctx) throw new Error("useCloak must be used inside CloakProvider")
  return ctx
}
