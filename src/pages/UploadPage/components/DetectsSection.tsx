import { useRef, useState } from "react"
import { FileText } from "lucide-react"
import { useInView } from "@/hooks/useInView"
import SectionHeader from "./SectionHeader"
import { DETECTIONS } from "../content"

const LETTER = [
  "[Riverside Medical Group]",
  "Dear Dr. [Emily Chen],",
  "I am referring my patient, [Marcus Hale], for a follow-up consultation. His Social Security number is [123-45-6789] and his insurer is Northwind Health.",
  "Please contact him at [(503) 555-0187] or [marcus.hale@example.com]. He lives in [Portland, Oregon] and is available most weekdays.",
  "Sincerely,",
  "[Dr. Priya Raman]",
]

const STAGGER_MS = 160
const START_MS = 250
const TOKEN_COUNT = LETTER.join("").split("[").length - 1
const SCAN_MS = START_MS + TOKEN_COUNT * STAGGER_MS + 300

function renderLetter() {
  let token = 0
  return LETTER.map((line, i) => {
    const parts = line.split(/(\[[^\]]+\])/g).filter(Boolean)
    const content = parts.map((part, j) => {
      if (!part.startsWith("[")) return part
      const delay = START_MS + token++ * STAGGER_MS
      return (
        <span key={j} className="redact" style={{ "--redact-delay": `${delay}ms` } as React.CSSProperties}>
          {part.slice(1, -1)}
        </span>
      )
    })
    const isHeading = i === 0
    return (
      <p key={i} className={isHeading ? "mb-6 text-base font-semibold" : "mb-4 last:mb-0"}>
        {content}
      </p>
    )
  })
}

export default function DetectsSection() {
  const docRef = useRef<HTMLDivElement>(null)
  const inView = useInView(docRef, { once: true, threshold: 0.5 })
  const [choice, setChoice] = useState<boolean | null>(null)
  const redacted = choice ?? inView

  return (
    <section aria-labelledby="what-it-detects" className="border-t">
      <div className="mx-auto grid max-w-5xl items-center gap-14 px-6 py-24 md:grid-cols-[1fr_1.15fr] md:py-32">
        <div>
          <SectionHeader
            id="what-it-detects"
            eyebrow="What it detects"
            title="Finds the details you'd rather not share"
            intro="Cloak pairs an on-device AI model with pattern matching to spot personally identifiable information (PII) in your documents. You always get the final say."
          />
          <ul className="mt-10 grid grid-cols-2 gap-3">
            {DETECTIONS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div ref={docRef} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b px-5 py-3">
            <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <FileText className="size-4 shrink-0" aria-hidden />
              <span className="truncate">referral-letter.pdf</span>
            </span>
            <div role="group" aria-label="Demo view" className="flex shrink-0 rounded-lg border p-0.5 text-xs">
              {[
                { label: "Original", value: false },
                { label: "Redacted", value: true },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={redacted === value}
                  onClick={() => setChoice(value)}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    redacted === value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div data-redacted={redacted} className="relative px-7 py-8 font-serif text-sm leading-7 md:px-9">
            {redacted && (
              <div
                aria-hidden
                className="scan-line pointer-events-none absolute inset-x-0"
                style={{ "--scan-duration": `${SCAN_MS}ms` } as React.CSSProperties}
              />
            )}
            {renderLetter()}
          </div>
        </div>
      </div>
    </section>
  )
}
