import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Redaction } from '@/constants/mockData'
import PdfViewer from '@/components/PdfViewer'
import { useCloak } from '@/context/CloakContext'
import { redactPdf } from '@/lib/redactPdf'
import EntityPanel from './components/EntityPanel'

export default function EditPage() {
  const navigate = useNavigate()
  const { pdfBytes, redactedBytes, entities, setEntities, setRedactedBytes, reset } = useCloak()

  const [redactions, setRedactions] = useState<Redaction[]>(entities ?? [])
  const [isSaving, setIsSaving] = useState(false)

  const toggleRedaction = (id: string) => {
    setRedactions((prev) => prev.map((r) => (r.id === id ? { ...r, approved: !r.approved } : r)))
  }

  const handleSave = async () => {
    if (!pdfBytes) return
    setIsSaving(true)
    try {
      setEntities(redactions)
      const approvedEntities = redactions.filter((r) => r.approved).map((r) => r.value)
      const redacted = await redactPdf(pdfBytes, approvedEntities)
      setRedactedBytes(redacted)
      navigate('/preview')
    } catch (err) {
      console.error('[EditPage] redaction error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='h-screen flex flex-col'>
      <div className='shrink-0 flex items-center gap-4 px-6 py-4 border-b'>
        <button
          onClick={() => navigate('/preview')}
          className='text-sm text-muted-foreground hover:text-foreground'
        >
          ← Back to preview
        </button>
        <button
          onClick={() => { reset(); navigate('/') }}
          className='text-sm font-semibold tracking-tight ml-auto hover:opacity-60 transition-opacity cursor-pointer'
        >
          Cloak
        </button>
      </div>

      <div className='flex-1 flex overflow-hidden min-h-0'>
        <div className='flex-1 overflow-y-auto border-r bg-neutral-50 dark:bg-neutral-900'>
          <div className='max-w-2xl mx-auto px-6 py-6'>
            {(redactedBytes ?? pdfBytes) ? (
              <PdfViewer pdfBytes={redactedBytes ?? pdfBytes!} />
            ) : (
              <div className='rounded-xl bg-muted flex items-center justify-center min-h-120'>
                <p className='text-sm text-muted-foreground'>No document loaded.</p>
              </div>
            )}
          </div>
        </div>

        <EntityPanel
          redactions={redactions}
          onToggle={toggleRedaction}
          onSave={handleSave}
          isSaving={isSaving}
        />
      </div>
    </div>
  )
}
