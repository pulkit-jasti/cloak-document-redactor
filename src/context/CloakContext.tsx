import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import type { Redaction } from "@/types"

export type { Redaction }

export type CloakStats = { seconds: number; pages: number }

interface CloakContextValue {
  pdfUrl: string | null
  pdfBytes: Uint8Array | null
  fileName: string | null
  redactedBytes: Uint8Array | null
  entities: Redaction[] | null
  removedImageIds: string[]
  keptLinkUrls: string[]
  cloakStats: CloakStats | null
  setCloakStats: (stats: CloakStats) => void
  setPdf: (url: string, bytes: Uint8Array, fileName: string) => void
  setEntities: (entities: Redaction[]) => void
  setRemovedImageIds: (ids: string[]) => void
  setKeptLinkUrls: (urls: string[]) => void
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
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([])
  const [keptLinkUrls, setKeptLinkUrls] = useState<string[]>([])
  const [cloakStats, setCloakStats] = useState<CloakStats | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (import.meta.env.DEV) (window as Window & { __cloakEntities?: Redaction[] | null }).__cloakEntities = entities
  }, [entities])

  const setPdf = (url: string, bytes: Uint8Array, name: string) => {
    blobUrlRef.current = url
    setPdfUrl(url)
    setPdfBytes(bytes)
    setFileName(name)
    setRedactedBytes(null)
    setRemovedImageIds([])
    setKeptLinkUrls([])
  }

  const reset = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setPdfUrl(null)
    setPdfBytes(null)
    setFileName(null)
    setRedactedBytes(null)
    setEntities(null)
    setRemovedImageIds([])
    setKeptLinkUrls([])
    setCloakStats(null)
  }, [])

  return (
    <CloakContext.Provider value={{ pdfUrl, pdfBytes, fileName, redactedBytes, entities, removedImageIds, keptLinkUrls, cloakStats, setCloakStats, setPdf, setEntities, setRemovedImageIds, setKeptLinkUrls, setRedactedBytes, reset }}>
      {children}
    </CloakContext.Provider>
  )
}

export function useCloak() {
  const ctx = useContext(CloakContext)
  if (!ctx) throw new Error("useCloak must be used inside CloakProvider")
  return ctx
}
