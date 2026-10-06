import { useNavigate } from 'react-router-dom'
import { Download, PenLine, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CtaButton from '@/components/CtaButton'
import Navbar from '@/components/Navbar'
import PdfViewer from '@/components/PdfViewer'
import { useCloak } from '@/context/CloakContext'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'

export default function PreviewPage() {
  const navigate = useNavigate()
  const { pdfBytes, fileName, redactedBytes, entities, cloakStats, reset } = useCloak()
  const allowLeave = useLeaveGuard((next) =>
    next.pathname === '/edit' ? null : 'Leave this page? Your redacted document will be lost.',
  )

  const handleDownload = () => {
    const bytes = redactedBytes
    if (!bytes) return
    const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'redacted-document.pdf'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleStartOver = () => {
    allowLeave()
    reset()
    navigate('/')
  }

  const previewBytes = redactedBytes ?? pdfBytes

  return (
    <div className='h-screen flex flex-col'>
      <Navbar title={fileName} />

      <main className='flex-1 flex flex-col min-h-0'>
        <div className='relative flex-1 min-h-0'>
          <div className='h-full overflow-y-auto bg-neutral-50 dark:bg-neutral-900'>
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
          {cloakStats && (
            <p className='pointer-events-none absolute bottom-4 left-5 text-xs text-muted-foreground tabular-nums'>
              Cloaked {cloakStats.pages} {cloakStats.pages === 1 ? 'page' : 'pages'} in {cloakStats.seconds.toFixed(1)} seconds
            </p>
          )}
        </div>

        <div className='shrink-0 border-t px-4 pt-5 pb-6'>
          <div className='max-w-2xl mx-auto flex flex-col gap-4'>
            {entities?.length === 0 && (
              <p className='text-xs text-muted-foreground text-center'>
                Nothing personal found. This document looks clean.
              </p>
            )}
            <div className='flex gap-3'>
              <Button
                variant='outline'
                size='lg'
                className='h-12 flex-1 gap-2'
                onClick={() => navigate('/edit')}
              >
                <PenLine className='size-4' aria-hidden />
                Edit redactions
              </Button>
              <CtaButton
                fullWidth
                wrapperClassName='flex-[1.4]'
                onClick={handleDownload}
                disabled={!redactedBytes}
              >
                <Download className='size-4.5' aria-hidden />
                Download PDF
              </CtaButton>
            </div>
            <button
              onClick={handleStartOver}
              className='mx-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors'
            >
              <RotateCcw className='size-3.5' aria-hidden />
              Redact another PDF
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
