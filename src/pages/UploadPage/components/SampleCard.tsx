import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import PdfFileIcon from "@/assets/pdf-file.svg?react"

const SAMPLE_URL = "/samples/cloak-sample-lease-agreement.pdf"

export default function SampleCard() {
  return (
    <div className="pointer-events-auto absolute -top-48 right-full mr-36 hidden xl:block">
      <div className="sample-card flex w-48 -rotate-3 flex-col items-center rounded-2xl px-5 pt-6 pb-5 text-center">
        <PdfFileIcon className="size-14" aria-hidden />
        <p className="mt-4 text-sm font-medium">Try a sample</p>
        <Button variant="outline" size="sm" className="mt-4 w-full gap-1.5" asChild>
          <a href={SAMPLE_URL} download>
            <Download className="size-3.5" aria-hidden />
            Download
          </a>
        </Button>
      </div>

      <svg
        aria-hidden
        viewBox="0 0 240 126"
        fill="none"
        className="absolute top-full left-1/2 mt-3 w-60 text-muted-foreground"
      >
        <path
          d="M6 4 C 2 66, 36 108, 110 108 S 196 100, 232 100"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M220 91 L 233 100 L 220 109"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
