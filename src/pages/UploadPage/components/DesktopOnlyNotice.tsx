import { Monitor } from "lucide-react"

export default function DesktopOnlyNotice() {
  return (
    <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-foreground/20 bg-background/60 px-6 py-10 text-center backdrop-blur-sm">
      <Monitor className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">Open Cloak on a laptop or desktop</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Cloak runs its AI model right in your browser, which needs a desktop browser. Open this page on your computer to redact a PDF.
      </p>
    </div>
  )
}
