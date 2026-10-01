import { useEffect, useRef, useState } from 'react'

const ANIMATION_DURATION = 150

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const [mounted, setMounted] = useState(open)
  const [isClosing, setIsClosing] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const prevOpenRef = useRef(open)

  useEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = open

    if (open) {
      const t = setTimeout(() => { setMounted(true); setIsClosing(false) }, 0)
      return () => clearTimeout(t)
    } else if (wasOpen) {
      const t1 = setTimeout(() => setIsClosing(true), 0)
      const t2 = setTimeout(() => { setMounted(false); setIsClosing(false) }, ANIMATION_DURATION)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!mounted) return null

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm ${isClosing ? 'animate-out fade-out duration-150' : 'animate-in fade-in duration-150'}`}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={`w-full max-w-md mx-4 rounded-2xl border border-border bg-background shadow-xl flex flex-col overflow-hidden ${isClosing ? 'animate-out fade-out zoom-out-95 slide-out-to-bottom-2 duration-150' : 'animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200'}`}>
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
          <span className="text-base font-semibold">{title}</span>
          <button
            onClick={onClose}
            className="-mr-1.5 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
