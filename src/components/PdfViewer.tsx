import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFPageProxy } from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

function PdfPage({ page, containerWidth }: { page: PDFPageProxy; containerWidth: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Prevents StrictMode's double-invocation from cancelling an in-progress render.
  const renderStartedRef = useRef(false)

  const dpr = window.devicePixelRatio || 1
  const baseViewport = page.getViewport({ scale: 1 })
  const cssHeight = (containerWidth / baseViewport.width) * baseViewport.height

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || renderStartedRef.current) return

    let observing = true
    let renderTask: pdfjsLib.RenderTask | null = null

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || !observing || renderStartedRef.current) return
        observer.disconnect()
        renderStartedRef.current = true

        const scale = (containerWidth / baseViewport.width) * dpr
        const viewport = page.getViewport({ scale })
        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext('2d')!
        renderTask = page.render({ canvasContext: ctx, viewport })
        renderTask.promise.catch((e) => {
          if (e?.name !== 'RenderingCancelledException') console.error('[PdfPage]', e)
        })
      },
      { rootMargin: '500px' }
    )

    observer.observe(canvas)

    return () => {
      observing = false
      observer.disconnect()
      if (!renderStartedRef.current) renderTask?.cancel()
    }
  }, [page, containerWidth, baseViewport.width, dpr])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: `${containerWidth}px`,
        height: `${cssHeight}px`,
        background: 'white',
        borderRadius: 4,
      }}
    />
  )
}

export default function PdfViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<PDFPageProxy[]>([])
  const [containerWidth, setContainerWidth] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth))
    ro.observe(el)
    setContainerWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!url) return
    let cancelled = false
    setPages([])
    setError(null)

    pdfjsLib
      .getDocument({ url })
      .promise.then(async (pdf) => {
        const loaded: PDFPageProxy[] = []
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return
          loaded.push(await pdf.getPage(i))
        }
        if (!cancelled) setPages(loaded)
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('[PdfViewer]', e)
          setError('Failed to load PDF.')
        }
      })

    return () => { cancelled = true }
  }, [url])

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full flex flex-col gap-3">
      {pages.length > 0 && containerWidth > 0 ? (
        pages.map((page, i) => (
          <PdfPage key={i} page={page} containerWidth={containerWidth} />
        ))
      ) : (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading PDF...</p>
        </div>
      )}
    </div>
  )
}
