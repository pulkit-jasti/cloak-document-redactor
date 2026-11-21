import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { CopyButton } from '@/components/ConnectOllamaModal'
import Footer from '@/pages/UploadPage/components/Footer'
import { useIsClient } from '@/hooks/useIsClient'
import {
  OLLAMA_LINKS,
  OLLAMA_TITLE,
  RECOMMENDED_MODEL,
  SITE_ORIGIN,
  SSH_COMMAND,
  TROUBLESHOOTING,
  startCommands,
} from './content'

const linkClass = 'text-foreground underline underline-offset-4 hover:opacity-70'

function Section({ id, title, intro, children }: {
  id: string
  title: string
  intro?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="scroll-mt-20 border-t py-16 md:py-20">
      <h2 id={id} className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
        {title}
      </h2>
      {intro && <p className="mt-4 max-w-2xl text-base text-muted-foreground text-pretty">{intro}</p>}
      <div className="mt-10">{children}</div>
    </section>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums">
        {n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <h3 className="text-base font-medium">{title}</h3>
        <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </li>
  )
}

function Command({ label, text }: { label?: string; text: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-medium text-foreground">{label}</span>}
      <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-xs text-foreground">{text}</code>
        <CopyButton text={text} />
      </div>
    </div>
  )
}

export default function OllamaPage() {
  const isClient = useIsClient()
  const origin = isClient ? window.location.origin : SITE_ORIGIN
  const start = startCommands(origin)

  useEffect(() => {
    // Links can point to a section (e.g. /ollama#remote); otherwise start at the top.
    const target = window.location.hash && document.getElementById(window.location.hash.slice(1))
    if (target) target.scrollIntoView()
    else window.scrollTo(0, 0)
    const previous = document.title
    document.title = OLLAMA_TITLE
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-6">
          <header className="pt-12 pb-16 md:pt-20 md:pb-20">
            <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              Use a local AI with Ollama
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
              Cloak works without it. Connect Ollama if you want to describe what to redact in plain English, like
              &ldquo;hide the witnesses but keep the accused&rdquo;. The AI runs on your own computer, so your document
              still never leaves it.
            </p>
          </header>

          <Section id="setup" title="Set it up" intro="About ten minutes, most of it waiting for the model to download.">
            <ol className="flex flex-col gap-10">
              <Step n={1} title="Install Ollama">
                <p>
                  Download it for Mac, Windows or Linux from{' '}
                  <a href={OLLAMA_LINKS.download} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    ollama.com
                  </a>{' '}
                  and install it like any other app.
                </p>
              </Step>

              <Step n={2} title="Download a model">
                <p>
                  We recommend <code className="font-mono text-foreground">{RECOMMENDED_MODEL.name}</code>. It is a{' '}
                  {RECOMMENDED_MODEL.download} download and runs well on a computer with {RECOMMENDED_MODEL.memory} or
                  more. Run this in your terminal:
                </p>
                <Command text={`ollama pull ${RECOMMENDED_MODEL.name}`} />
              </Step>

              <Step n={3} title="Start Ollama for Cloak">
                <p>
                  Ollama blocks websites by default. This command starts it and lets Cloak in. If the Ollama app is
                  already running, quit it first from its icon in the menu bar (Mac) or system tray (Windows).
                </p>
                <Command label="Mac and Linux" text={start.unix} />
                <Command label="Windows (PowerShell)" text={start.windows} />
                <p>
                  Keep the terminal open while you use Cloak. To skip this step next time, set{' '}
                  <code className="font-mono text-foreground">OLLAMA_ORIGINS</code> permanently as shown in{' '}
                  <a href={OLLAMA_LINKS.faq} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    Ollama&apos;s FAQ
                  </a>
                  .
                </p>
              </Step>

              <Step n={4} title="Connect in Cloak">
                <p>
                  On the{' '}
                  <Link to="/" className={linkClass}>
                    home page
                  </Link>
                  , click <span className="text-foreground">Connect Ollama</span>, then{' '}
                  <span className="text-foreground">Connect now</span>. After you open a PDF, turn on the{' '}
                  <span className="text-foreground">AI</span> switch under the &ldquo;add your own text&rdquo; box and
                  type what you want hidden.
                </p>
              </Step>
            </ol>
          </Section>

          <Section
            id="remote"
            title="Ollama on another computer"
            intro="Cloak only talks to Ollama on this computer, but you can forward another machine's Ollama to a port here. Start Ollama there with the same command as above, then run this on this computer and keep it open:"
          >
            <div className="flex flex-col gap-4">
              <Command text={SSH_COMMAND} />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Then in <span className="text-foreground">Connect Ollama</span>, open{' '}
                <span className="text-foreground">Advanced settings</span> and set the port to 11435.
              </p>
            </div>
          </Section>

          <Section id="troubleshooting" title="Troubleshooting">
            <dl className="flex flex-col gap-8">
              {TROUBLESHOOTING.map(({ q, a }) => (
                <div key={q}>
                  <dt className="text-base font-medium">{q}</dt>
                  <dd className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{a}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="privacy" title="Where your text goes">
            <div className="flex max-w-2xl flex-col gap-4 text-base leading-relaxed text-muted-foreground text-pretty">
              <p>
                Cloak sends page text only to Ollama on your own computer. If you forward the port to another machine,
                the text goes there, so only use one you trust.
              </p>
              <p className="flex gap-3 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  Avoid Ollama models with <code className="font-mono">cloud</code> in their name. Those run on
                  Ollama&apos;s servers, not on your computer.
                </span>
              </p>
            </div>
          </Section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
