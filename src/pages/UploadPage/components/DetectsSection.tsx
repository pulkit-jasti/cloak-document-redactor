import { useRef, useState } from "react"
import { FileText, Sparkles } from "lucide-react"
import { useInView } from "@/hooks/useInView"
import SectionHeader from "./SectionHeader"
import { DETECTIONS } from "../content"

type Role = "org" | "doctor" | "patient" | "id" | "contact"

const LETTER = [
  "[Riverside Medical Group|org]",
  "Dear Dr. [Emily Chen|doctor],",
  "I am referring my patient, [Marcus Hale|patient], for a follow-up consultation. His Social Security number is [123-45-6789|id] and his insurer is Northwind Health.",
  "Please contact him at [(503) 555-0187|contact] or [marcus.hale@example.com|contact]. He lives in [Portland, Oregon|contact] and is available most weekdays.",
  "Sincerely,",
  "[Dr. Priya Raman|doctor]",
]

const ALL_ROLES: Role[] = ["org", "doctor", "patient", "id", "contact"]

const INSTRUCTIONS: { label: string; hides: Role[] }[] = [
  { label: "Keep the doctors' names", hides: ["org", "patient", "id", "contact"] },
  { label: "Hide only the patient's name", hides: ["patient"] },
  { label: "Hide contact details only", hides: ["contact"] },
]

type Mode = "original" | "all" | number

const STAGGER_MS = 160
const START_MS = 250
const TOKEN_COUNT = LETTER.join("").split("[").length - 1
const SCAN_MS = START_MS + TOKEN_COUNT * STAGGER_MS + 300

function renderLetter(hidden: Role[]) {
  let order = 0
  return LETTER.map((line, i) => {
    const parts = line.split(/(\[[^\]]+\])/g).filter(Boolean)
    const content = parts.map((part, j) => {
      if (!part.startsWith("[")) return part
      const [text, role] = part.slice(1, -1).split("|") as [string, Role]
      const on = hidden.includes(role)
      const delay = on ? START_MS + order++ * STAGGER_MS : 0
      return (
        <span key={j} data-redacted={on}>
          <span className="redact" style={{ "--redact-delay": `${delay}ms` } as React.CSSProperties}>
            {text}
          </span>
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
  const [choice, setChoice] = useState<Mode | null>(null)
  const mode: Mode = choice ?? (inView ? "all" : "original")
  const hidden = mode === "original" ? [] : mode === "all" ? ALL_ROLES : INSTRUCTIONS[mode].hides
  const instruction = typeof mode === "number" ? INSTRUCTIONS[mode].label : null

  return (
    <section aria-labelledby="what-it-detects" className="border-t">
      <div className="mx-auto grid max-w-5xl items-center gap-14 px-6 py-24 md:grid-cols-[1fr_1.15fr] md:py-32">
        <div>
          <SectionHeader
            id="what-it-detects"
            eyebrow="What it detects"
            title="Finds the details you'd rather not share"
            intro="Cloak pairs an on-device AI model with pattern matching to spot personally identifiable information (PII) in your documents. You review everything, then share a clean copy with ChatGPT, Claude or anyone else."
          />
          <ul className="mt-10 grid grid-cols-2 gap-3">
            {DETECTIONS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex gap-3 rounded-xl border px-4 py-3.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground text-pretty">
              <span className="font-medium text-foreground">Or tell it what to hide.</span> Connect a local AI through Ollama
              and describe what to redact in plain English. It still never leaves your device.
            </p>
          </div>
        </div>

        <div ref={docRef} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b px-5 py-3">
            <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <FileText className="size-4 shrink-0" aria-hidden />
              <span className="truncate">referral-letter.pdf</span>
            </span>
            <div role="group" aria-label="Demo view" className="flex shrink-0 rounded-lg border p-0.5 text-xs">
              {(
                [
                  { label: "Original", value: "original" },
                  { label: "Redacted", value: "all" },
                ] as const
              ).map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setChoice(value)}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    mode === value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative px-7 py-8 font-serif text-sm leading-7 md:px-9">
            {mode !== "original" && (
              <div
                key={String(mode)}
                aria-hidden
                className="scan-line pointer-events-none absolute inset-x-0"
                style={{ "--scan-duration": `${SCAN_MS}ms` } as React.CSSProperties}
              />
            )}
            {renderLetter(hidden)}
          </div>

          <div className="border-t px-5 py-4">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className={instruction ? "" : "text-muted-foreground"}>{instruction ?? "Tell Cloak what to hide…"}</span>
            </div>
            <div role="group" aria-label="Example instructions" className="mt-3 flex flex-wrap gap-2">
              {INSTRUCTIONS.map(({ label }, i) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={mode === i}
                  onClick={() => setChoice(i)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    mode === i ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
