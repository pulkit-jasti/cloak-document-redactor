import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import type { PageStats } from '@/types'
import { formatPageList, imageOnlyPages } from '@/lib/pageStats'

type PageSize = { width: number; height: number }

export type PdfHighlight = {
  value: string
  approved: boolean
  page: number // 1-indexed
}

function PdfPage({
  pageIndex,
  size,
  containerWidth,
  src,
  onVisible,
  onRatioChange,
  rects,
  highlights,
  imageOnly,
}: {
  pageIndex: number
  size: PageSize
  containerWidth: number
  src: string | null
  onVisible: (pageIndex: number) => void
  onRatioChange: (pageIndex: number, ratio: number) => void
  rects: Record<string, [number, number, number, number][]>
  highlights: PdfHighlight[]
  imageOnly: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const triggeredRef = useRef(false)
  const cssHeight = (containerWidth / size.width) * size.height

  // Trigger render once when page scrolls into view
  useEffect(() => {
    const el = ref.current
    if (!el) return
    triggeredRef.current = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggeredRef.current) {
          triggeredRef.current = true
          observer.disconnect()
          onVisible(pageIndex)
        }
      },
      { rootMargin: '600px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [pageIndex, onVisible])

  // Track intersection ratio for page indicator
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => onRatioChange(pageIndex, entry.intersectionRatio),
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [pageIndex, onRatioChange])

  // Draw highlight boxes on the canvas overlay
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = containerWidth * dpr
    canvas.height = cssHeight * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, containerWidth, cssHeight)
    if (!src || highlights.length === 0) return

    const scale = containerWidth / size.width
    ctx.lineWidth = 2

    for (const h of highlights) {
      const entityRects = rects[h.value]
      if (!entityRects) continue
      ctx.strokeStyle = h.approved ? 'rgba(22, 163, 74, 0.85)' : 'rgba(220, 38, 38, 0.85)'
      for (const [x0, y0, x1, y1] of entityRects) {
        ctx.strokeRect(x0 * scale, y0 * scale, (x1 - x0) * scale, (y1 - y0) * scale)
      }
    }
  }, [src, rects, highlights, containerWidth, size, cssHeight])

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: containerWidth,
        height: cssHeight,
        background: 'white',
        borderRadius: 4,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {src && (
        <img
          src={src}
          width={containerWidth}
          height={cssHeight}
          style={{ display: 'block', width: '100%', height: '100%' }}
          alt={`Page ${pageIndex + 1}`}
          draggable={false}
        />
      )}
      {imageOnly && (
        <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-medium text-black shadow">
          <TriangleAlert className="size-3.5" aria-hidden />
          Image only, not scanned
        </span>
      )}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

export default function PdfViewer({
  pdfBytes,
  highlights,
}: {
  pdfBytes: Uint8Array | null
  highlights?: PdfHighlight[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const msgIdRef = useRef(0)
  const blobUrlsRef = useRef<string[]>([])
  const ratiosRef = useRef<number[]>([])
  const highlightsRef = useRef(highlights)
  useLayoutEffect(() => {
    highlightsRef.current = highlights
  })

  const [containerWidth, setContainerWidth] = useState(0)
  const [pageSizes, setPageSizes] = useState<PageSize[]>([])
  const [pageSrcs, setPageSrcs] = useState<(string | null)[]>([])
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [imageOnly, setImageOnly] = useState<number[]>([])
  // pageIndex -> { value -> rects[] }
  const [pageRects, setPageRects] = useState<Map<number, Record<string, [number, number, number, number][]>>>(
    new Map(),
  )

  // Track container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth))
    ro.observe(el)
    setContainerWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const triggerSearch = useCallback((pageCount: number) => {
    const hs = highlightsRef.current
    if (!hs || hs.length === 0 || !workerRef.current) return
    const byPage = new Map<number, string[]>()
    for (const h of hs) {
      const idx = h.page - 1
      if (idx < 0 || idx >= pageCount) continue
      const vals = byPage.get(idx) ?? []
      if (!vals.includes(h.value)) vals.push(h.value)
      byPage.set(idx, vals)
    }
    for (const [pageIdx, values] of byPage) {
      const id = msgIdRef.current++
      workerRef.current.postMessage({ id, type: 'searchPage', pageIndex: pageIdx, values })
    }
  }, [])

  // Create worker once
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/mupdf.worker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    worker.onmessage = (e) => {
      const msg = e.data
      if (msg.type === 'loaded') {
        const sizes: PageSize[] = (msg.pageSizes as [number, number][]).map(([w, h]) => ({
          width: w,
          height: h,
        }))
        setPageSizes(sizes)
        setImageOnly(imageOnlyPages(msg.pageStats as PageStats[]))
        setPageSrcs(new Array(msg.pageCount as number).fill(null))
        ratiosRef.current = new Array(msg.pageCount as number).fill(0)
        setCurrentPage(1)
        setPageRects(new Map())
        triggerSearch(msg.pageCount as number)
      } else if (msg.type === 'rendered') {
        const blob = new Blob([msg.png as Uint8Array<ArrayBuffer>], { type: 'image/png' })
        const url = URL.createObjectURL(blob)
        blobUrlsRef.current.push(url)
        setPageSrcs((prev) => {
          const next = [...prev]
          next[msg.pageIndex as number] = url
          return next
        })
      } else if (msg.type === 'searchResult') {
        const pageIdx = msg.pageIndex as number
        const results = msg.results as Record<string, [number, number, number, number][]>
        setPageRects((prev) => new Map(prev).set(pageIdx, results))
      } else if (msg.type === 'error') {
        console.error('[MuPDF Worker]', msg.message)
        setError(msg.message as string)
      }
    }

    worker.onerror = (e) => {
      console.error('[MuPDF Worker] uncaught error', e)
      setError('PDF renderer failed to load.')
    }

    return () => {
      worker.terminate()
      workerRef.current = null
      blobUrlsRef.current.forEach(URL.revokeObjectURL)
      blobUrlsRef.current = []
    }
  }, [triggerSearch])

  // Re-trigger search whenever highlights change (or document finishes loading)
  useEffect(() => {
    if (!highlights || highlights.length === 0 || pageSizes.length === 0) return
    triggerSearch(pageSizes.length)
  }, [highlights, pageSizes.length, triggerSearch])

  // Load document when bytes change
  useEffect(() => {
    if (!pdfBytes || !workerRef.current) return
    setPageSizes([])
    setImageOnly([])
    setPageSrcs([])
    setError(null)
    setPageRects(new Map())
    blobUrlsRef.current.forEach(URL.revokeObjectURL)
    blobUrlsRef.current = []
    const id = msgIdRef.current++
    workerRef.current.postMessage({ id, type: 'load', bytes: pdfBytes })
  }, [pdfBytes])

  const handlePageVisible = useCallback(
    (pageIndex: number) => {
      const worker = workerRef.current
      if (!worker || containerWidth === 0) return
      const size = pageSizes[pageIndex]
      if (!size) return
      const dpr = window.devicePixelRatio || 1
      const scale = (containerWidth / size.width) * dpr * 1.5
      const id = msgIdRef.current++
      worker.postMessage({ id, type: 'render', pageIndex, scale })
    },
    [containerWidth, pageSizes],
  )

  const handleRatioChange = useCallback((pageIndex: number, ratio: number) => {
    ratiosRef.current[pageIndex] = ratio
    const best = ratiosRef.current.reduce(
      (max, r, i) => (r > ratiosRef.current[max] ? i : max),
      0,
    )
    setCurrentPage(best + 1)
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-destructive">
        {error}
      </div>
    )
  }

  const totalPages = pageSizes.length

  return (
    <div className="w-full flex flex-col relative">
      {totalPages > 1 && (
        <div className="sticky top-4 z-10 flex justify-center pointer-events-none">
          <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full tabular-nums">
            {currentPage} of {totalPages}
          </span>
        </div>
      )}
      {imageOnly.length > 0 && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <p>
            <span className="font-medium">
              {formatPageList(imageOnly)} {imageOnly.length === 1 ? 'is an image' : 'are images'}, so Cloak couldn't scan{' '}
              {imageOnly.length === 1 ? 'it' : 'them'} for personal info.
            </span>{' '}
            <span className="text-muted-foreground">Check {imageOnly.length === 1 ? 'it' : 'them'} yourself before sharing.</span>
          </p>
        </div>
      )}
      <div ref={containerRef} className="w-full flex flex-col gap-20">
        {pageSizes.length > 0 && containerWidth > 0 ? (
          pageSizes.map((size, i) => (
            <PdfPage
              key={i}
              pageIndex={i}
              size={size}
              containerWidth={containerWidth}
              src={pageSrcs[i] ?? null}
              onVisible={handlePageVisible}
              onRatioChange={handleRatioChange}
              rects={pageRects.get(i) ?? {}}
              highlights={highlights?.filter((h) => h.page === i + 1) ?? []}
              imageOnly={imageOnly.includes(i + 1)}
            />
          ))
        ) : (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">
              {pdfBytes ? 'Rendering PDF…' : 'No document loaded.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
