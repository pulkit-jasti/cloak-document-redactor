import { useEffect, useState } from "react"

const STATUS_PHRASES = [
  "Scanning for names…",
  "Finding phone numbers…",
  "Detecting email addresses…",
  "Looking for SSNs and ID numbers…",
  "Applying redactions…",
]

const PHRASE_DURATION_MS = 1200

interface CloakingOverlayProps {
  onComplete: () => void
}

export default function CloakingOverlay({ onComplete }: CloakingOverlayProps) {
  const [phraseIndex, setPhraseIndex] = useState(0)

  useEffect(() => {
    if (phraseIndex >= STATUS_PHRASES.length - 1) {
      const done = setTimeout(onComplete, PHRASE_DURATION_MS)
      return () => clearTimeout(done)
    }

    const timer = setInterval(() => {
      setPhraseIndex((i) => i + 1)
    }, PHRASE_DURATION_MS)

    return () => clearInterval(timer)
  }, [phraseIndex, onComplete])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <h1 className="text-2xl font-semibold tracking-tight mb-4">
        Cloaking your document…
      </h1>
      <p className="text-muted-foreground text-sm">{STATUS_PHRASES[phraseIndex]}</p>
    </div>
  )
}
