import { ArrowUpRight } from "lucide-react"
import SectionHeader from "./SectionHeader"
import { FEATURES } from "../content"

export default function PrivacySection() {
  return (
    <section aria-labelledby="private-by-design" className="border-t">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <SectionHeader
          id="private-by-design"
          eyebrow="Private by design"
          title="Your files stay on your computer"
          intro="Most online redaction tools ask you to upload your document first. Cloak does all the work in your browser, so there is nothing to upload and nothing to leak."
        />

        <ul className="mt-14 grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body, href }) => {
            const inner = (
              <>
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl border">
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  {href && (
                    <ArrowUpRight
                      className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                      aria-hidden
                    />
                  )}
                </div>
                <h3 className="mt-8 text-base font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </>
            )

            return (
              <li key={title} className="bg-background">
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block h-full p-8 transition-colors hover:bg-muted/40"
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="h-full p-8">{inner}</div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
