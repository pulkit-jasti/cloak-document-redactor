import { useEffect, useState } from "react"
import ChromeDinoGame from '@a7mddra/react-dino-game'
import '@a7mddra/react-dino-game/dist/style.css'
import { GAME_THRESHOLD_SECONDS } from "@/lib/estimateTime"

const STATUS_PHRASES = [
  "Scanning for names…",
  "Finding phone numbers…",
  "Detecting email addresses…",
  "Looking for SSNs and ID numbers…",
  "Applying redactions…",
]

const PHRASE_DURATION_MS = 1200

interface Props {
  estimatedSeconds: number
}

export default function CloakingOverlay({ estimatedSeconds }: Props) {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const showGame = estimatedSeconds >= GAME_THRESHOLD_SECONDS

  useEffect(() => {
    if (showGame) return
    const timer = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % STATUS_PHRASES.length)
    }, PHRASE_DURATION_MS)
    return () => clearInterval(timer)
  }, [showGame])

  if (showGame) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Cloaking your document…</h1>
        <p className="text-sm text-muted-foreground">Your document is being redacted. Play while you wait.</p>
        <div className="w-150">
          <ChromeDinoGame />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <h1 className="text-2xl font-semibold tracking-tight mb-4">
        Cloaking your document…
      </h1>
      <p className="text-muted-foreground text-sm">{STATUS_PHRASES[phraseIndex]}</p>
    </div>
  )
}
