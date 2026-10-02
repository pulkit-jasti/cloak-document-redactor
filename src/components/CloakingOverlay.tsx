import { useEffect, useState } from "react"
import { Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CloakProgress } from "@/lib/pdfPipeline"

const IS_DEV = import.meta.env.VITE_ENV === "development"

const FLAMES = [
  { color: "#9e7aff", left: "-4%", duration: "8s", delay: "0s" },
  { color: "#7ad7ff", left: "14%", duration: "9.5s", delay: "-3s" },
  { color: "#fe8bbb", left: "32%", duration: "7.5s", delay: "-1.5s" },
  { color: "#ffbd7a", left: "50%", duration: "9s", delay: "-4s" },
  { color: "#9e7aff", left: "66%", duration: "10s", delay: "-2s" },
  { color: "#fe8bbb", left: "80%", duration: "8.5s", delay: "-5s" },
]

function describe(progress: CloakProgress): { label: string; percent: number | null } {
  switch (progress.stage) {
    case "model":
      return { label: `Loading detection model… ${progress.percent}%`, percent: progress.percent }
    case "reading":
      return { label: "Reading your document…", percent: null }
    case "scanning": {
      const { done, total, parallel } = progress
      const label = parallel
        ? `Scanned ${done} of ${total} ${total === 1 ? "page" : "pages"}`
        : `Scanning page ${done + 1} of ${total}`
      return { label, percent: Math.round((done / total) * 100) }
    }
    case "redacting":
      return { label: "Applying redactions…", percent: null }
  }
}

function AuroraFlames() {
  return (
    <div aria-hidden className="cloak-aurora">
      {FLAMES.map((f, i) => (
        <span
          key={i}
          className="cloak-aurora-flame"
          style={
            {
              left: f.left,
              "--flame": f.color,
              "--flame-duration": f.duration,
              "--flame-delay": f.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

function DevStopwatch() {
  const [startedAt] = useState(() => performance.now())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setElapsed(performance.now() - startedAt), 100)
    return () => clearInterval(interval)
  }, [startedAt])

  return (
    <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 font-mono text-xs tabular-nums text-muted-foreground">
      <Timer className="size-3.5" aria-hidden />
      {(elapsed / 1000).toFixed(1)}s
    </div>
  )
}

interface Props {
  progress: CloakProgress
  closing?: boolean
  onCancel: () => void
}

export default function CloakingOverlay({ progress, closing = false, onCancel }: Props) {
  const { label, percent } = describe(progress)

  return (
    <div
      data-closing={closing || undefined}
      className="cloak-overlay fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background data-closing:pointer-events-none"
    >
      <AuroraFlames />
      {IS_DEV && <DevStopwatch />}

      <div className="cloak-overlay-content relative flex w-full max-w-sm flex-col items-center px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Cloaking your document…</h1>
        <p className="mt-3 text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {label}
        </p>

        <div
          role="progressbar"
          aria-label="Redaction progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? undefined}
          className="mt-6 h-2.5 w-full max-w-64 overflow-hidden bg-muted"
        >
          {percent === null ? (
            <div className="loader-indeterminate h-full w-1/3 bg-foreground" />
          ) : (
            <div
              className="h-full bg-foreground transition-[width] duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          )}
        </div>

        <Button variant="ghost" className="mt-8 text-muted-foreground" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
