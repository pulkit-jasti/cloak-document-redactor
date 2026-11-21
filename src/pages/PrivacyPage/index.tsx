import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Footer from '@/pages/UploadPage/components/Footer'
import { PRIVACY_EMAIL, PRIVACY_LINKS as L, PRIVACY_TITLE, PRIVACY_UPDATED } from './content'

const linkClass = 'text-foreground underline underline-offset-4 hover:opacity-70'

function Out({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
    </a>
  )
}

function Section({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t py-10">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {n}. {title}
      </h2>
      <div className="mt-4 flex flex-col gap-4 text-base leading-relaxed text-muted-foreground [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  )
}

export default function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
    const previous = document.title
    document.title = PRIVACY_TITLE
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 pb-16 md:pb-24">
          <header className="pt-12 pb-10 md:pt-20">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Privacy Policy</h1>
            <p className="mt-4 text-sm text-muted-foreground">Last updated: {PRIVACY_UPDATED}</p>
          </header>

          <div className="mb-10 rounded-xl border bg-muted/40 p-6">
            <h2 className="text-base font-semibold">Summary</h2>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Your documents never leave your device. Reading, detection and redaction all happen in your browser.</li>
              <li>There are no accounts, analytics, ads or tracking cookies.</li>
              <li>We do not collect, sell or share personal information.</li>
              <li>
                Like every website, our hosting provider and the content delivery networks we use receive basic
                technical data, such as your IP address, when your browser downloads files from them.
              </li>
            </ul>
          </div>

          <Section id="who-we-are" n={1} title="Who we are">
            <p>
              Cloak (&ldquo;Cloak&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a free, open source PDF redaction tool
              available at cloakdoc.app. It is built and run by Pulkit Jasti as an individual. This policy explains what
              information is and isn&apos;t handled when you use Cloak. It applies to cloakdoc.app and cdn.cloakdoc.app.
            </p>
          </Section>

          <Section id="your-documents" n={2} title="Your documents">
            <ul>
              <li>
                PDFs you open in Cloak are processed entirely in your browser. Text extraction, detection of personal
                information and redaction all run on your device.
              </li>
              <li>
                Your files, their text and the redacted results are never uploaded to us or to anyone else. The only
                exception is the optional Ollama feature described in section 6, which sends text to a server you choose.
              </li>
              <li>
                Documents are held in your browser&apos;s memory only while you work on them, and are discarded when you
                reload or leave the page. We never store them.
              </li>
            </ul>
            <p>
              You can check this yourself by following the steps on our{' '}
              <Link to={L.verify} className={linkClass}>
                verify page
              </Link>
              .
            </p>
          </Section>

          <Section id="information-we-collect" n={3} title="Information we collect">
            <p>
              We do not collect personal information. Cloak has no sign-up, no forms, no analytics, no advertising, no
              session recording and no fingerprinting.
            </p>
          </Section>

          <Section id="service-providers" n={4} title="Information handled by service providers">
            <p>
              When your browser loads Cloak, it downloads files from the services below. Like any web server, they
              automatically receive standard technical information: your IP address, browser and operating system (user
              agent), the file requested, the date and time, and the referring page. This never includes your documents.
            </p>
            <ul>
              <li>
                <strong>Cloudflare</strong> hosts cloakdoc.app and serves the detection model files from cdn.cloakdoc.app.{' '}
                <Out href={L.cloudflare}>Cloudflare Privacy Policy</Out>.
              </li>
              <li>
                <strong>jsDelivr</strong> serves ONNX Runtime, the open source engine that runs the detection model.{' '}
                <Out href={L.jsdelivr}>jsDelivr Privacy Policy</Out>.
              </li>
            </ul>
            <p>
              We do not use this information to identify you, and we do not combine it with any other data. These
              providers may keep logs for a limited time for security, abuse prevention and performance, under their own
              policies.
            </p>
          </Section>

          <Section id="stored-on-your-device" n={5} title="Information stored on your device">
            <p>
              Cloak saves some data in your browser so it starts faster and works offline. This data stays on your device
              and we cannot access it.
            </p>
            <ul>
              <li>
                <strong>Settings</strong> (in local storage): your theme, the selected detection model, and the Ollama
                server address and selected Ollama models.
              </li>
              <li>
                <strong>App files</strong>, saved by a service worker so Cloak works without an internet connection.
              </li>
              <li>
                <strong>Detection model files</strong>, saved in your browser&apos;s private storage (the Origin Private
                File System) so later runs start in seconds.
              </li>
            </ul>
            <p>You can delete all of it at any time by clearing the site data for cloakdoc.app in your browser settings.</p>
          </Section>

          <Section id="ollama" n={6} title="Optional: Ollama">
            <p>
              Ollama is off by default. If you choose to connect it, Cloak sends the text of your document to the Ollama
              server address you enter, which is your own computer (http://localhost:11434) by default. That server is
              controlled by you, not by us. If you enter the address of another machine, the text is sent to that
              machine.
            </p>
          </Section>

          <Section id="cookies" n={7} title="Cookies and tracking">
            <p>
              Cloak does not set cookies or use any tracking technology. Our hosting provider may set a strictly
              necessary security cookie if it needs to check for automated or malicious traffic. Because we do not track
              you, Do Not Track and Global Privacy Control signals have nothing to turn off, but we respect them.
            </p>
          </Section>

          <Section id="third-party-links" n={8} title="Third-party links">
            <p>
              Cloak links to other websites, such as GitHub. If you open an issue or a security report there,{' '}
              <Out href={L.github}>GitHub&apos;s Privacy Statement</Out> applies to the information you share.
            </p>
          </Section>

          <Section id="legal-basis" n={9} title="Legal basis for processing (EEA and UK)">
            <p>
              We do not process personal data ourselves. For the technical data handled by the providers in section 4,
              the legal basis is our legitimate interest in delivering a secure, working website (Article 6(1)(f) GDPR).
            </p>
          </Section>

          <Section id="retention" n={10} title="Data retention">
            <p>
              We keep no personal data. Provider logs are kept according to each provider&apos;s policy. Data stored on
              your device stays there until you clear it.
            </p>
          </Section>

          <Section id="international-transfers" n={11} title="International transfers">
            <p>
              Our providers operate worldwide, so the technical data in section 4 may be processed in countries other
              than your own, including the United States. The providers protect these transfers with their own
              safeguards, such as Standard Contractual Clauses.
            </p>
          </Section>

          <Section id="your-rights" n={12} title="Your privacy rights">
            <p>
              Depending on where you live, laws such as the GDPR, the UK GDPR and the California Consumer Privacy Act
              (CCPA/CPRA) may give you the right to access, correct, delete or move your personal data, to object to or
              restrict its processing, and to opt out of its sale or sharing.
            </p>
            <p>
              Because we hold no personal data about you, there is normally nothing for us to access or delete.{' '}
              <strong>We do not sell or share personal information.</strong> For data held by the providers in section 4,
              please contact them directly. You also have the right to complain to your local data protection authority.
            </p>
          </Section>

          <Section id="children" n={13} title="Children's privacy">
            <p>
              Cloak is not directed at children under 13 (or under 16 in the EEA), and we do not knowingly collect
              information from children. Since Cloak collects no personal information, none is collected from children
              either.
            </p>
          </Section>

          <Section id="security" n={14} title="Security">
            <p>
              Because your documents are processed on your device, they are never exposed to a server breach. The site is
              served only over HTTPS, and all of its <Out href={L.repo}>source code</Out> is public so anyone can review
              it. If you find a security issue, please <Out href={L.security}>report it privately</Out>.
            </p>
          </Section>

          <Section id="changes" n={15} title="Changes to this policy">
            <p>
              We may update this policy as Cloak changes. The &ldquo;Last updated&rdquo; date at the top shows when it was
              last changed. Because this policy is part of Cloak&apos;s open source code, its{' '}
              <Out href={L.history}>full change history</Out> is public.
            </p>
          </Section>

          <Section id="contact" n={16} title="Contact">
            <p>
              For questions about this policy or your privacy rights, email{' '}
              <a href={`mailto:${PRIVACY_EMAIL}`} className={linkClass}>
                {PRIVACY_EMAIL}
              </a>{' '}
              or <Out href={L.issues}>open an issue on GitHub</Out>. For security issues, use the{' '}
              <Out href={L.security}>private vulnerability report</Out> instead.
            </p>
          </Section>
        </article>
      </main>

      <Footer />
    </div>
  )
}
