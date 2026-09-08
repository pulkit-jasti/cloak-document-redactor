import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import PdfViewer from "@/components/PdfViewer"

export default function PreviewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const pdfUrl: string | undefined = location.state?.pdfUrl

  return (
    <div className="h-screen flex flex-col">
      {/* Fixed navbar */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b">
        <span className="text-sm font-semibold tracking-tight">Cloak</span>
        <p className="text-xs text-muted-foreground">
          🔒 Your document never left your browser
        </p>
      </div>

      {/* Scrollable PDF area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {pdfUrl ? (
            <PdfViewer url={pdfUrl} />
          ) : (
            <div className="rounded-xl bg-muted flex items-center justify-center min-h-[480px]">
              <p className="text-sm text-muted-foreground">No document loaded.</p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div className="shrink-0 border-t px-4 py-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <Button size="lg" className="w-full">
            Download PDF
          </Button>
          <button
            onClick={() => navigate("/edit", { state: { pdfUrl } })}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground text-center"
          >
            Edit redactions
          </button>
        </div>
      </div>
    </div>
  )
}
