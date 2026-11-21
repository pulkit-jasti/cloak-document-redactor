import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check, WifiOff } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/pages/UploadPage/components/Footer'
import {
  LINKS_OUT,
  NETWORK_STEPS,
  OFFLINE_STEPS,
  REDACTION_CHECKS,
  REQUESTS,
  STORED,
  VERIFY_TITLE,
} from './content'

const linkClass = 'text-foreground underline underline-offset-4 hover:opacity-70'

// Top-level sections get an h2 and a divider; `sub` sections sit inside "Technical details" with an h3.
function Section({ id, title, intro, sub = false, children }: {
  id: string
  title: string
  intro?: React.ReactNode
  sub?: boolean
  children: React.ReactNode
}) {
  const Heading = sub ? 'h3' : 'h2'
  return (
    <section aria-labelledby={id} className={sub ? 'mt-14' : 'border-t py-16 md:py-20'}>
      <Heading
        id={id}
        className={`font-semibold tracking-tight text-balance ${sub ? 'text-xl' : 'text-2xl md:text-3xl'}`}
      >
        {title}
      </Heading>
      {intro && <p className="mt-4 max-w-2xl text-base text-muted-foreground text-pretty">{intro}</p>}
      <div className={sub ? 'mt-8' : 'mt-10'}>{children}</div>
    </section>
  )
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col gap-5">
      {steps.map((step, i) => (
        <li key={step} className="flex gap-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums">
            {i + 1}
          </span>
          <p className="pt-0.5 text-sm leading-relaxed text-muted-foreground">{step}</p>
        </li>
      ))}
    </ol>
  )
}

export default function VerifyPage() {
  useEffect(() => {
    // Links can point to a section (e.g. /verify#redaction-check); otherwise start at the top.
    const target = window.location.hash && document.getElementById(window.location.hash.slice(1))
    if (target) target.scrollIntoView()
    else window.scrollTo(0, 0)
    const previous = document.title
    document.title = VERIFY_TITLE
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
              Verify that your files stay private
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
              Don&apos;t take our word for it. Here is how to check, in a few minutes, that redacted text is really
              gone and that your document never leaves your device.
            </p>
          </header>

          <Section
            id="redaction-check"
            title="Check the redaction itself"
            intro="Some tools only draw black boxes over text that is still in the file. Cloak removes it. Here's how to make sure."
          >
            <ul className="flex flex-col gap-6">
              {REDACTION_CHECKS.map(({ title, body }) => (
                <li key={title} className="flex gap-4">
                  <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <div>
                    <h3 className="text-base font-medium">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            id="offline-test"
            title="Turn off your internet"
            intro="Once Cloak has loaded, it works without an internet connection, like an app installed on your computer. If it needed a server, it would stop working."
          >
            <Steps steps={OFFLINE_STEPS} />
            <p className="mt-8 flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
              <WifiOff className="size-4 shrink-0" aria-hidden />
              Cloak continues to work without a connection, which confirms that your document is never sent to a
              server.
            </p>
          </Section>

          <Section id="open-source" title="Nothing is hidden">
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">
              All of Cloak&apos;s code is{' '}
              <a href={LINKS_OUT.repo} target="_blank" rel="noopener noreferrer" className={linkClass}>
                public on GitHub
              </a>
              , so anyone can read it, check it or run their own copy. Every open source package and model it uses
              is listed with its license in the{' '}
              <a href={LINKS_OUT.licenses} target="_blank" rel="noopener noreferrer" className={linkClass}>
                third-party licenses
              </a>
              . Everything on this page is also written down in our{' '}
              <Link to={LINKS_OUT.privacy} className={linkClass}>
                privacy policy
              </Link>
              .
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">
              Found a way your data could leak, or redacted text that can still be recovered? Please{' '}
              <a href={LINKS_OUT.security} target="_blank" rel="noopener noreferrer" className={linkClass}>
                report it privately
              </a>{' '}
              instead of opening a public issue.
            </p>
          </Section>

          <section aria-labelledby="technical-details" className="border-t py-16 md:py-20">
            <h2 id="technical-details" className="text-2xl font-semibold tracking-tight md:text-3xl">
              Technical details
            </h2>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground text-pretty">
              For anyone who wants to look closer. You don&apos;t need any of this to use Cloak safely.
            </p>

          <Section
            sub
            id="network-test"
            title="See every request yourself"
            intro="Your browser can show every file a page downloads or sends."
          >
            <Steps steps={NETWORK_STEPS} />
          </Section>

          <Section
            sub
            id="requests"
            title="Every request Cloak makes"
            intro="These are the only places Cloak talks to. Your PDF is never sent to any of them."
          >
            <div className="overflow-hidden rounded-2xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Address</th>
                    <th scope="col" className="px-4 py-3 font-medium">What it is</th>
                    <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {REQUESTS.map(({ host, what, when }) => (
                    <tr key={host} className="align-top">
                      <td className="px-4 py-4 font-mono text-xs whitespace-nowrap">{host}</td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {what}
                        <span className="mt-1 block text-xs md:hidden">{when}</span>
                      </td>
                      <td className="hidden px-4 py-4 text-muted-foreground md:table-cell">{when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            sub
            id="stored"
            title="What's saved on your device"
            intro="Your documents are never saved. Reloading or closing the tab throws them away."
          >
            <ul className="grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-2">
              {STORED.map(({ what, why }) => (
                <li key={what} className="bg-background p-6">
                  <h3 className="text-base font-medium">{what}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{why}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              To clear it, remove a model from the model picker, or delete this site&apos;s data in your browser&apos;s
              site settings.
            </p>
          </Section>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
