import { ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ClosingCta({ onChoose }: { onChoose: () => void }) {
  return (
    <section aria-labelledby="closing-cta" className="border-t">
      <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center md:py-32">
        <h2 id="closing-cta" className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          Share the document, not the details
        </h2>
        <p className="mt-4 max-w-md text-base text-muted-foreground text-pretty">
          Clean up your PDF in seconds, right in your browser. Free, private and open source.
        </p>
        <Button size="lg" className="mt-10 gap-2" onClick={onChoose}>
          Choose a PDF
          <ArrowUp className="size-4" aria-hidden />
        </Button>
      </div>
    </section>
  )
}
