import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/Navbar'
import PdfViewer from '@/components/PdfViewer'
import { useCloak } from '@/context/CloakContext'

export default function PreviewPage() {
  const navigate = useNavigate()
  const { pdfBytes, redactedBytes, entities } = useCloak()

  const handleDownload = () => {
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
      <Navbar />

      <div className='flex-1 overflow-y-auto min-h-0 bg-neutral-50 dark:bg-neutral-900'>
        <div className='max-w-2xl mx-auto px-4 py-8'>
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
              No PII detected. Document appears clean.
            </p>
          )}
          <Button
            size='lg'
            className='w-full'
            onClick={handleDownload}
            disabled={!redactedBytes}
          >
            Download PDF
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
