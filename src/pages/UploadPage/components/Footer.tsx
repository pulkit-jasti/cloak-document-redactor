import { GithubIcon } from "@/components/BrandIcons"
import { LINKS } from "@/lib/links"
import Logo from "@/assets/logo-main.svg?react"

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <Logo role="img" aria-label="Cloak" className="h-4 w-auto self-start" />
          <p className="text-sm text-muted-foreground">Private PDF redaction that runs in your browser.</p>
        </div>

        <div className="flex flex-col gap-3 text-sm md:items-end">
          <p className="text-muted-foreground">
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
          <div className="flex items-center gap-5 text-muted-foreground">
            <a
              href={LINKS.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <GithubIcon className="size-4" />
              Source code
            </a>
            <span>© {new Date().getFullYear()} Cloak</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
