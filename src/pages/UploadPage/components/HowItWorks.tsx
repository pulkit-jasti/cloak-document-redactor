import SectionHeader from "./SectionHeader"
import { STEPS } from "../content"

export default function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works" className="border-t">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <SectionHeader
          id="how-it-works"
          eyebrow="How it works"
          title="Private redaction in three steps"
          intro="No account, no upload, no waiting in a queue. Just your PDF and your browser."
        />

        <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex flex-col bg-background p-8">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl border">
                  <Icon className="size-4.5" aria-hidden />
                </span>
                <span className="text-sm tabular-nums text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-8 text-base font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
