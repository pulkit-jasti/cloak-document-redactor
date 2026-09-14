import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import PdfViewer from '@/components/PdfViewer'
import { useCloak } from '@/context/CloakContext'

export default function PreviewPage() {
  const navigate = useNavigate()
  const { pdfBytes, entities, redactedBytes, setRedactedBytes, reset } = useCloak()
  const workerRef = useRef<Worker | null>(null)
  const msgIdRef = useRef(0)
  const [isPreviewing, setIsPreviewing] = useState(false)

  const getWorker = () => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/mupdf.worker.ts', import.meta.url),
        { type: 'module' },
      )
    }
    return workerRef.current
  }

  const runRedaction = async (bytes: Uint8Array, approvedEntities: string[]) => {
    const worker = getWorker()
    const id = msgIdRef.current++
    return new Promise<Uint8Array>((resolve, reject) => {
      const handler = (e: MessageEvent) => {
        if (e.data.id !== id) return
        worker.removeEventListener('message', handler)
        if (e.data.type === 'redacted') resolve(e.data.bytes as Uint8Array)
        else reject(new Error(e.data.message ?? 'Redaction failed'))
      }
      worker.addEventListener('message', handler)
      worker.onerror = (err) => reject(err)
      worker.postMessage({ id, type: 'redact', bytes, entities: approvedEntities })
    })
  }

  // Re-run redaction whenever pdfBytes or entities change so the preview stays live
  useEffect(() => {
    if (!pdfBytes) return
    const approvedEntities = (entities ?? []).filter((r) => r.approved).map((r) => r.value)
    setIsPreviewing(true)
    setRedactedBytes(null)
    runRedaction(pdfBytes, approvedEntities)
      .then(setRedactedBytes)
      .catch((err) => console.error('[PreviewPage] preview redaction error:', err))
      .finally(() => setIsPreviewing(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfBytes, entities])

  const handleDownload = async () => {
    const bytes = redactedBytes
    if (!bytes) return
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'redacted.pdf'
    a.click()
    URL.revokeObjectURL(url)
  }

  const previewBytes = redactedBytes ?? pdfBytes

  return (
    <div className='h-screen flex flex-col'>
      <div className='shrink-0 flex items-center justify-between px-6 py-4 border-b'>
        <button
          onClick={() => { reset(); navigate('/') }}
          className='text-sm font-semibold tracking-tight hover:opacity-60 transition-opacity'
        >
          Cloak
        </button>
      </div>

      <div className='flex-1 overflow-y-auto min-h-0'>
        <div className='max-w-2xl mx-auto px-4 py-8'>
          {isPreviewing && (
            <p className='text-xs text-muted-foreground text-center mb-4'>Applying redactions…</p>
          )}
          {previewBytes ? (
            <PdfViewer pdfBytes={previewBytes} />
          ) : (
            <div className='rounded-xl bg-muted flex items-center justify-center min-h-120'>
              <p className='text-sm text-muted-foreground'>No document loaded.</p>
            </div>
          )}
        </div>
      </div>

      <div className='shrink-0 border-t px-4 py-4'>
        <div className='max-w-2xl mx-auto flex flex-col gap-3'>
          {entities?.length === 0 && (
            <p className='text-xs text-muted-foreground text-center'>
              No PII detected — document appears clean.
            </p>
          )}
          <Button
            size='lg'
            className='w-full'
            onClick={handleDownload}
            disabled={isPreviewing || !redactedBytes}
          >
            {isPreviewing ? 'Applying redactions…' : 'Download PDF'}
          </Button>
          <button
            onClick={() => navigate('/edit')}
            className='text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground text-center'
          >
            Edit redactions
          </button>
        </div>
      </div>
    </div>
  )
}
