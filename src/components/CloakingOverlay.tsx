import { useEffect, useState } from "react"

const STATUS_PHRASES = [
  "Scanning for names…",
  "Finding phone numbers…",
  "Detecting email addresses…",
  "Looking for SSNs and ID numbers…",
  "Applying redactions…",
]

const PHRASE_DURATION_MS = 1200

export default function CloakingOverlay() {
  const [phraseIndex, setPhraseIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % STATUS_PHRASES.length)
    }, PHRASE_DURATION_MS)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <h1 className="text-2xl font-semibold tracking-tight mb-4">
        Cloaking your document…
      </h1>
      <p className="text-muted-foreground text-sm">{STATUS_PHRASES[phraseIndex]}</p>
    </div>
  )
}
