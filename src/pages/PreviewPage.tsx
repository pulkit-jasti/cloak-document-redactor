import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { MOCK_REDACTIONS, type Redaction } from "@/constants/mockData"

export default function PreviewPage() {
  const navigate = useNavigate()
  const [redactions] = useState<Redaction[]>(MOCK_REDACTIONS)

  const approvedCount = redactions.filter((r) => r.approved).length

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <span className="text-sm font-semibold tracking-tight">Cloak</span>
        <p className="text-xs text-muted-foreground">
          🔒 Your document never left your browser
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 py-10 gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Your document is ready
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {approvedCount} item{approvedCount !== 1 ? "s" : ""} redacted
          </p>
        </div>

        {/* PDF placeholder */}
        <div className="w-full max-w-2xl bg-muted rounded-xl flex flex-col gap-4 p-6 min-h-[480px]">
          <div className="text-xs text-muted-foreground text-center mb-2">
            PDF preview (redacted)
          </div>
          {/* Simulate redacted text lines */}
          {redactions.filter((r) => r.approved).map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-16 shrink-0">
                {r.type}
              </span>
              <div className="h-4 bg-foreground rounded flex-1 max-w-[200px]" />
            </div>
          ))}
          <div className="mt-4 space-y-2">
            {[80, 65, 90, 50, 70].map((w, i) => (
              <div
                key={i}
                className="h-3 bg-muted-foreground/20 rounded"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 w-full max-w-2xl">
          <Button size="lg" className="w-full">
            Download PDF
          </Button>
          <button
            onClick={() => navigate("/review")}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Edit redactions
          </button>
        </div>
      </div>
    </div>
  )
}
