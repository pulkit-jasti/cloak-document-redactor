import { useCallback, useEffect, useRef, useState } from 'react';

type PageSize = { width: number; height: number };

function PdfPage({
	pageIndex,
	size,
	containerWidth,
	src,
	onVisible,
	onRatioChange,
}: {
	pageIndex: number;
	size: PageSize;
	containerWidth: number;
	src: string | null;
	onVisible: (pageIndex: number) => void;
	onRatioChange: (pageIndex: number, ratio: number) => void;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const triggeredRef = useRef(false);
	const cssHeight = (containerWidth / size.width) * size.height;

	// Trigger render once when page scrolls into view
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		triggeredRef.current = false;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !triggeredRef.current) {
					triggeredRef.current = true;
					observer.disconnect();
					onVisible(pageIndex);
				}
			},
			{ rootMargin: '600px' },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [pageIndex, onVisible]);

	// Track intersection ratio for page indicator
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => onRatioChange(pageIndex, entry.intersectionRatio),
			{ threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [pageIndex, onRatioChange]);

	return (
		<div
			ref={ref}
			style={{
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
		</div>
	);
}

export default function PdfViewer({
	pdfBytes,
}: {
	pdfBytes: Uint8Array | null;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const workerRef = useRef<Worker | null>(null);
	const msgIdRef = useRef(0);
	const blobUrlsRef = useRef<string[]>([]);
	const ratiosRef = useRef<number[]>([]);

	const [containerWidth, setContainerWidth] = useState(0);
	const [pageSizes, setPageSizes] = useState<PageSize[]>([]);
	const [pageSrcs, setPageSrcs] = useState<(string | null)[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);

	// Track container width
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
		ro.observe(el);
		setContainerWidth(el.clientWidth);
		return () => ro.disconnect();
	}, []);

	// Create worker once
	useEffect(() => {
		console.log('[PdfViewer] creating worker');
		const worker = new Worker(
			new URL('../workers/mupdf.worker.ts', import.meta.url),
			{ type: 'module' },
		);
		workerRef.current = worker;

		worker.onmessage = (e) => {
			console.log('[PdfViewer] worker message:', e.data.type);
			const msg = e.data;
			if (msg.type === 'loaded') {
				const sizes: PageSize[] = (msg.pageSizes as [number, number][]).map(
					([w, h]) => ({
						width: w,
						height: h,
					}),
				);
				setPageSizes(sizes);
				setPageSrcs(new Array(msg.pageCount as number).fill(null));
				ratiosRef.current = new Array(msg.pageCount as number).fill(0);
				setCurrentPage(1);
			} else if (msg.type === 'rendered') {
				const blob = new Blob([msg.png as Uint8Array], { type: 'image/png' });
				const url = URL.createObjectURL(blob);
				blobUrlsRef.current.push(url);
				setPageSrcs((prev) => {
					const next = [...prev];
					next[msg.pageIndex as number] = url;
					return next;
				});
			} else if (msg.type === 'error') {
				console.error('[MuPDF Worker]', msg.message);
				setError(msg.message as string);
			}
		};

		worker.onerror = (e) => {
			console.error('[MuPDF Worker] uncaught error', e);
			setError('PDF renderer failed to load.');
		};

		return () => {
			worker.terminate();
			workerRef.current = null;
			blobUrlsRef.current.forEach(URL.revokeObjectURL);
			blobUrlsRef.current = [];
		};
	}, []);

	// Load document when bytes change
	useEffect(() => {
		console.log(
			'[PdfViewer] load effect: pdfBytes=',
			!!pdfBytes,
			'worker=',
			!!workerRef.current,
		);
		if (!pdfBytes || !workerRef.current) return;
		setPageSizes([]);
		setPageSrcs([]);
		setError(null);
		blobUrlsRef.current.forEach(URL.revokeObjectURL);
		blobUrlsRef.current = [];
		const id = msgIdRef.current++;
		workerRef.current.postMessage({ id, type: 'load', bytes: pdfBytes });
	}, [pdfBytes]);

	const handlePageVisible = useCallback(
		(pageIndex: number) => {
			const worker = workerRef.current;
			if (!worker || containerWidth === 0) return;
			const size = pageSizes[pageIndex];
			if (!size) return;
			const dpr = window.devicePixelRatio || 1;
			const scale = (containerWidth / size.width) * dpr;
			const id = msgIdRef.current++;
			worker.postMessage({ id, type: 'render', pageIndex, scale });
		},
		[containerWidth, pageSizes],
	);

	const handleRatioChange = useCallback((pageIndex: number, ratio: number) => {
		ratiosRef.current[pageIndex] = ratio;
		const best = ratiosRef.current.reduce(
			(max, r, i) => (r > ratiosRef.current[max] ? i : max),
			0,
		);
		setCurrentPage(best + 1);
	}, []);

	if (error) {
		return (
			<div className='flex items-center justify-center py-20 text-sm text-destructive'>
				{error}
			</div>
		);
	}

	const totalPages = pageSizes.length;

	return (
		<div className='w-full flex flex-col relative'>
			{totalPages > 1 && (
				<div className='sticky top-4 z-10 flex justify-center pointer-events-none'>
					<span className='bg-black/60 text-white text-xs px-3 py-1 rounded-full tabular-nums'>
						{currentPage} of {totalPages}
					</span>
				</div>
			)}
			<div ref={containerRef} className='w-full flex flex-col gap-20'>
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
						/>
					))
				) : (
					<div className='flex items-center justify-center py-20'>
						<p className='text-sm text-muted-foreground'>
							{pdfBytes ? 'Rendering PDF…' : 'No document loaded.'}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
