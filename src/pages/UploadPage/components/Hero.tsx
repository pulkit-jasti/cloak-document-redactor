import type { Ref } from "react"
import { Check, Lock } from "lucide-react"
import Logo from "@/assets/logo-main.svg?react"
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern"
import { useIsClient } from "@/hooks/useIsClient"
import UploadPanel from "./UploadPanel"

const TRUST_POINTS = ["Free", "No sign-up", "Open source"]

interface HeroProps {
  logoRef: Ref<HTMLDivElement>
}

export default function Hero({ logoRef }: HeroProps) {
  const isClient = useIsClient()

  return (
    <section aria-labelledby="hero-title" className="relative">
      <div
        aria-hidden
        className="absolute inset-x-0 -top-20 bottom-0 overflow-hidden mask-[radial-gradient(ellipse_70%_90%_at_50%_0%,#000_45%,transparent_100%)]"
      >
        {isClient && (
          <InteractiveGridPattern
            width={48}
            height={48}
            squares={[60, 24]}
            className="left-1/2 w-[2880px] -translate-x-1/2 border-none animate-in fade-in duration-1000"
            squaresClassName="stroke-border hover:fill-foreground/10"
          />
        )}
      </div>

      <div className="pointer-events-none relative mx-auto flex max-w-2xl flex-col items-center px-6 pt-10 pb-24 text-center md:pt-16">
        <p className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur">
          <Lock className="size-3.5" aria-hidden />
          100% local. Your document never leaves your device.
        </p>

        <div ref={logoRef} className="mt-12 w-full max-w-lg">
          <Logo role="img" aria-label="Cloak" className="h-auto w-full" />
        </div>

        <h1 id="hero-title" className="mt-12 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          Redact PDFs before you share them with AI
        </h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground text-pretty">
          Cloak finds names, emails, phone numbers and other personal details, then blacks them out.
          All right here in your browser.
        </p>

        <div className="mt-10 w-full max-w-md">
          <UploadPanel />
        </div>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          {TRUST_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-1.5">
              <Check className="size-3.5 text-foreground" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
