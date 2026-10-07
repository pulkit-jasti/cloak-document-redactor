import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { probeOllama, type OllamaModel } from '@/lib/ollamaClient'

export type OllamaStatus = 'idle' | 'available' | 'unavailable' | 'cors_blocked'

interface OllamaContextValue {
  status: OllamaStatus
  models: OllamaModel[]
  selectedModel: string | null
  setSelectedModel: (m: string | null) => void
  recheck: () => Promise<OllamaStatus>
  isChecking: boolean
}

const OllamaContext = createContext<OllamaContextValue | null>(null)

const STORAGE_KEY = 'cloak:ollama:model'

export function OllamaProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<OllamaStatus>('idle')
  const [models, setModels] = useState<OllamaModel[]>([])
  const [selectedModel, setSelectedModelState] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const probe = useCallback(async (): Promise<OllamaStatus> => {
    setIsChecking(true)
    setStatus('idle')
    const result = await probeOllama()
    if (result.status === 'available') {
      setModels(result.models)
      const saved = localStorage.getItem(STORAGE_KEY)
      const stillAvailable = saved && result.models.some((m) => m.name === saved)
      setSelectedModelState(stillAvailable ? saved : null)
    } else {
      setModels([])
    }
    setStatus(result.status)
    setIsChecking(false)
    return result.status
  }, [])

  useEffect(() => { void (async () => { await probe() })() }, [probe])

  useEffect(() => {
    if (import.meta.env.DEV) (window as Window & { __cloakOllamaModel?: string | null }).__cloakOllamaModel = selectedModel
  }, [selectedModel])

  const setSelectedModel = useCallback((m: string | null) => {
    setSelectedModelState(m)
    if (m) localStorage.setItem(STORAGE_KEY, m)
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <OllamaContext.Provider value={{ status, models, selectedModel, setSelectedModel, recheck: probe, isChecking }}>
      {children}
    </OllamaContext.Provider>
  )
}

export function useOllama(): OllamaContextValue {
  const ctx = useContext(OllamaContext)
  if (!ctx) throw new Error('useOllama must be used inside OllamaProvider')
  return ctx
}
