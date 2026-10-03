import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import NERPipeline, { ModelStatus } from '@/lib/nerPipeline'
import { DEFAULT_NER_MODEL_ID, NER_MODELS, getSavedNerModelId, saveNerModelId } from '@/lib/nerModels'

export type NerDownloadState =
  | { status: 'checking' }
  | { status: 'missing' }
  | { status: 'downloading'; progress: number }
  | { status: 'removing' }
  | { status: 'ready' }

interface NerModelContextValue {
  selectedId: string
  setSelectedId: (id: string) => void
  states: Record<string, NerDownloadState>
  download: (id: string) => void
  remove: (id: string) => Promise<void>
}

const NerModelContext = createContext<NerModelContextValue | null>(null)

const selectionListeners = new Set<() => void>()

const subscribeSelection = (listener: () => void) => {
  selectionListeners.add(listener)
  return () => {
    selectionListeners.delete(listener)
  }
}

const initialStates = (): Record<string, NerDownloadState> =>
  Object.fromEntries(NER_MODELS.map((m) => [m.id, { status: 'checking' }]))

export function NerModelProvider({ children }: { children: React.ReactNode }) {
  const selectedId = useSyncExternalStore(subscribeSelection, getSavedNerModelId, () => DEFAULT_NER_MODEL_ID)
  const [states, setStates] = useState(initialStates)

  const setState = useCallback((id: string, state: NerDownloadState) => {
    setStates((prev) => ({ ...prev, [id]: state }))
  }, [])

  useEffect(() => {
    const unsubscribe = NERPipeline.subscribe((id, event) => {
      if (event.status === ModelStatus.Loading && event.total && event.progress != null) {
        setState(id, { status: 'downloading', progress: event.progress })
      } else if (event.status === ModelStatus.Ready) {
        setState(id, { status: 'ready' })
      } else if (event.status === ModelStatus.Error) {
        setState(id, { status: 'missing' })
      }
    })

    for (const { id } of NER_MODELS) {
      NERPipeline.isCached(id)
        .then((cached) => {
          setStates((prev) => (prev[id]?.status === 'checking' ? { ...prev, [id]: { status: cached ? 'ready' : 'missing' } } : prev))
        })
        .catch(() => setState(id, { status: 'missing' }))
    }

    return unsubscribe
  }, [setState])

  const setSelectedId = useCallback((id: string) => {
    saveNerModelId(id)
    for (const listener of selectionListeners) listener()
  }, [])

  const download = useCallback((id: string) => {
    setState(id, { status: 'downloading', progress: 0 })
    NERPipeline.getInstance(id).catch((err) => console.error(`[Cloak] failed to download ${id}:`, err))
  }, [setState])

  const remove = useCallback(async (id: string) => {
    setState(id, { status: 'removing' })
    try {
      await NERPipeline.remove(id)
      setState(id, { status: 'missing' })
    } catch (err) {
      console.error(`[Cloak] failed to remove ${id}:`, err)
      const cached = await NERPipeline.isCached(id).catch(() => false)
      setState(id, { status: cached ? 'ready' : 'missing' })
    }
  }, [setState])

  return (
    <NerModelContext.Provider value={{ selectedId, setSelectedId, states, download, remove }}>
      {children}
    </NerModelContext.Provider>
  )
}

export function useNerModel(): NerModelContextValue {
  const ctx = useContext(NerModelContext)
  if (!ctx) throw new Error('useNerModel must be used inside NerModelProvider')
  return ctx
}
