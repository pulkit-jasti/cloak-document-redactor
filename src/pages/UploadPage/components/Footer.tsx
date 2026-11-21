import { Link } from "react-router-dom"
import { LINKS } from "@/lib/links"
import Logo from "@/assets/logo-main.svg?react"
import GithubIcon from "@/assets/github.svg?react"

const linkClass = "transition-colors hover:text-foreground"

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground">{title}</p>
      <ul className="flex flex-col gap-2.5 text-muted-foreground">{children}</ul>
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="flex flex-col gap-3">
            <Logo role="img" aria-label="Cloak" className="h-4 w-auto self-start" />
            <p className="text-sm text-muted-foreground">Private PDF redaction that runs in your browser.</p>
          </div>

          <div className="grid grid-cols-2 gap-x-16 gap-y-8 text-sm">
            <Column title="Trust">
              <li>
                <Link to={LINKS.verify} className={linkClass}>
                  Verify privacy
                </Link>
              </li>
              <li>
                <a
                  href={LINKS.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 ${linkClass}`}
                >
                  <GithubIcon className="size-4" aria-hidden />
                  Source code
                </a>
              </li>
            </Column>
            <Column title="Legal">
              <li>
                <a href={LINKS.license} target="_blank" rel="noopener noreferrer license" className={linkClass}>
                  AGPL-3.0 License
                </a>
              </li>
              <li>
                <a href={LINKS.thirdPartyLicenses} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  Third-party licenses
                </a>
              </li>
            </Column>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t pt-6 text-sm text-muted-foreground md:flex-row md:justify-between">
          <p>
            Designed and built by{" "}
            <a
              href={LINKS.author.github}
              target="_blank"
              rel="noopener noreferrer author"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {LINKS.author.name}
            </a>
          </p>
          <p className="whitespace-nowrap">© {new Date().getFullYear()} {LINKS.author.name}</p>
        </div>
      </div>
    </footer>
  )
}
