import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Redaction } from '@/constants/mockData'
import PdfViewer from '@/components/PdfViewer'
import { useCloak } from '@/context/CloakContext'
import EntityPanel from './components/EntityPanel'

export default function EditPage() {
  const navigate = useNavigate()
  const { pdfBytes, redactedBytes, entities, setEntities, reset } = useCloak()

  const [redactions, setRedactions] = useState<Redaction[]>(entities ?? [])

  const toggleRedaction = (id: string) => {
    setRedactions((prev) => prev.map((r) => (r.id === id ? { ...r, approved: !r.approved } : r)))
  }

  const handleSave = () => {
    setEntities(redactions)
    navigate('/preview')
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
          className='text-sm font-semibold tracking-tight ml-auto hover:opacity-60 transition-opacity'
        >
          Cloak
        </button>
      </div>

      <div className='flex-1 flex overflow-hidden min-h-0'>
        <div className='flex-1 overflow-y-auto border-r'>
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
        />
      </div>
    </div>
  )
}
