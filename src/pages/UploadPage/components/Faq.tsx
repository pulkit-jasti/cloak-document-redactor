import { useState } from "react"
import { Plus } from "lucide-react"
import SectionHeader from "./SectionHeader"
import { FAQS } from "../content"
import { LINKS } from "@/lib/links"

export default function Faq() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  const toggle = (i: number) =>
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  return (
    <section aria-labelledby="faq" className="border-t">
      <div className="mx-auto grid max-w-5xl gap-12 px-6 py-24 md:grid-cols-[1fr_1.6fr] md:py-32">
        <SectionHeader
          id="faq"
          eyebrow="FAQ"
          title="Questions, answered"
          intro={
            <>
              Anything else?{" "}
              <a
                href={`${LINKS.repo}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 hover:opacity-70"
              >
                Open an issue on GitHub.
              </a>
            </>
          }
        />

        <div className="border-t">
          {FAQS.map(({ q, a }, i) => {
            const isOpen = openItems.has(i)
            const answerId = `faq-answer-${i}`
            return (
              <div key={q} className="border-b">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() => toggle(i)}
                    className="group flex w-full items-center justify-between gap-6 py-5 text-left text-base font-medium"
                  >
                    {q}
                    <Plus
                      className={`size-4 shrink-0 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:text-foreground ${
                        isOpen ? "rotate-45 text-foreground" : "text-muted-foreground"
                      }`}
                      aria-hidden
                    />
                  </button>
                </h3>
                <div
                  id={answerId}
                  role="region"
                  aria-label={q}
                  inert={!isOpen}
                  className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p
                      className={`pb-5 pr-10 text-sm leading-relaxed text-muted-foreground transition-[opacity,translate] ease-out motion-reduce:transition-none ${
                        isOpen ? "translate-y-0 opacity-100 delay-100 duration-400" : "-translate-y-1 opacity-0 duration-200"
                      }`}
                    >
                      {a}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
