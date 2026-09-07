import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { MOCK_REDACTIONS, type Redaction } from "@/constants/mockData"

export default function ReviewPage() {
  const navigate = useNavigate()
  const [redactions, setRedactions] = useState<Redaction[]>(MOCK_REDACTIONS)

  const toggleRedaction = (id: string) => {
    setRedactions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, approved: !r.approved } : r))
    )
  }

  const pages = [...new Set(redactions.map((r) => r.page))].sort((a, b) => a - b)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b">
        <button
          onClick={() => navigate("/preview")}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to preview
        </button>
        <span className="text-sm font-semibold tracking-tight ml-auto">Cloak</span>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: PDF preview */}
        <div className="flex-1 overflow-y-auto p-6 border-r">
          <div className="max-w-2xl mx-auto bg-muted rounded-xl p-6 min-h-[600px]">
            <p className="text-xs text-muted-foreground text-center mb-4">
              PDF preview — translucent redactions
            </p>
            {redactions.map((r) => (
              <div key={r.id} className="flex items-center gap-3 mb-3">
                <span className="text-xs text-muted-foreground w-16 shrink-0">
                  {r.type}
                </span>
                <div
                  className={`h-4 rounded flex-1 max-w-[200px] transition-opacity ${
                    r.approved
                      ? "bg-foreground/40"
                      : "bg-foreground/10 border border-dashed border-muted-foreground/30"
                  }`}
                />
              </div>
            ))}
            <div className="mt-6 space-y-2">
              {[80, 65, 90, 50, 70].map((w, i) => (
                <div
                  key={i}
                  className="h-3 bg-muted-foreground/20 rounded"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Edit panel */}
        <div className="w-80 flex flex-col overflow-y-auto">
          <div className="flex-1 p-4 space-y-6">
            {pages.map((page) => (
              <div key={page}>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Page {page}
                </p>
                <div className="space-y-2">
                  {redactions
                    .filter((r) => r.page === page)
                    .map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-card"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-muted-foreground">
                            {r.type}
                          </span>
                          <p className="text-sm font-medium truncate">{r.value}</p>
                        </div>
                        <button
                          onClick={() => toggleRedaction(r.id)}
                          className={`shrink-0 text-xs px-2 py-1 rounded-md border font-medium transition-colors ${
                            r.approved
                              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                              : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                          }`}
                        >
                          {r.approved ? "Approved" : "Dismissed"}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Save CTA */}
          <div className="p-4 border-t">
            <Button className="w-full" onClick={() => navigate("/preview")}>
              Save & Preview
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
