import { Plus } from "lucide-react"
import SectionHeader from "./SectionHeader"
import { FAQS } from "../content"
import { LINKS } from "@/lib/links"

export default function Faq() {
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
                Open an issue on GitHub
              </a>
              .
            </>
          }
        />

        <div className="border-t">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group border-b">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-base font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <Plus
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                  aria-hidden
                />
              </summary>
              <p className="pb-5 pr-10 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
