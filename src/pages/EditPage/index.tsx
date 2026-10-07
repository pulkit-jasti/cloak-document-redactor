import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PdfLink, Redaction } from '@/types';
import Navbar from '@/components/Navbar';
import PdfViewer, { type MatchSummary } from '@/components/PdfViewer';
import { useCloak } from '@/context/CloakContext';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { listImages, type ImageScan } from '@/lib/listImages';
import { listLinks } from '@/lib/listLinks';
import { redactPdf } from '@/lib/redactPdf';
import EntityPanel from './components/EntityPanel';
import { groupRedactions, groupKey } from './groupRedactions';

export default function EditPage() {
	const navigate = useNavigate();
	const { pdfBytes, fileName, entities, setEntities, setRedactedBytes, removedImageIds, setRemovedImageIds, keptLinkUrls, setKeptLinkUrls } =
		useCloak();

	const [redactions, setRedactions] = useState<Redaction[]>(entities ?? []);
	const [isSaving, setIsSaving] = useState(false);
	const [scan, setScan] = useState<ImageScan | null>(null);
	const [removedImages, setRemovedImages] = useState<string[]>(removedImageIds);
	const [links, setLinks] = useState<PdfLink[] | null>(null);
	const [keptLinks, setKeptLinks] = useState<string[]>(keptLinkUrls);
	const [matches, setMatches] = useState<{ summary: MatchSummary; complete: boolean }>({
		summary: {},
		complete: false,
	});

	const groups = useMemo(() => groupRedactions(redactions), [redactions]);
	const highlights = useMemo(
		() => groups.map(({ value, approved }) => ({ value, approved })),
		[groups],
	);

	useEffect(() => {
		if (!pdfBytes) return;
		const controller = new AbortController();
		let loaded: ImageScan | null = null;
		listImages(pdfBytes, controller.signal)
			.then((result) => {
				loaded = result;
				setScan(result);
			})
			.catch(() => {
				if (!controller.signal.aborted) setScan({ images: [], pageCount: 0 });
			});
		return () => {
			controller.abort();
			for (const img of loaded?.images ?? []) if (img.thumbUrl) URL.revokeObjectURL(img.thumbUrl);
		};
	}, [pdfBytes]);

	useEffect(() => {
		if (!pdfBytes) return;
		const controller = new AbortController();
		listLinks(pdfBytes, controller.signal)
			.then(setLinks)
			.catch(() => {
				if (!controller.signal.aborted) setLinks([]);
			});
		return () => controller.abort();
	}, [pdfBytes]);

	const imagesChanged =
		removedImages.length !== removedImageIds.length ||
		removedImages.some((id) => !removedImageIds.includes(id));
	const linksChanged =
		keptLinks.length !== keptLinkUrls.length || keptLinks.some((url) => !keptLinkUrls.includes(url));
	const hasUnappliedChanges =
		imagesChanged ||
		linksChanged || redactions.some((r, i) => r.approved !== entities?.[i]?.approved);

	const images = scan?.images ?? null;
	const dimmedPages = useMemo(
		() => (images ?? []).filter((i) => i.fullPage && removedImages.includes(i.id)).map((i) => i.page),
		[images, removedImages],
	);

	const setLinksKept = (urls: string[], kept: boolean) => {
		const set = new Set(urls);
		setKeptLinks((prev) => (kept ? [...new Set([...prev, ...urls])] : prev.filter((url) => !set.has(url))));
	};

	const setImagesRemoved = (ids: string[], removed: boolean) => {
		const set = new Set(ids);
		setRemovedImages((prev) => (removed ? [...new Set([...prev, ...ids])] : prev.filter((id) => !set.has(id))));
	};
	const allowLeave = useLeaveGuard((next) => {
		if (next.pathname === '/preview') {
			return hasUnappliedChanges ? "Discard your changes? You have changes you haven't applied yet." : null;
		}
		return 'Leave this page? Your redacted document and any changes will be lost.';
	});

	const handleMatches = useCallback(
		(summary: MatchSummary, complete: boolean) => setMatches({ summary, complete }),
		[],
	);

	const setApproved = (keys: string[], approved: boolean) => {
		const set = new Set(keys);
		setRedactions((prev) =>
			prev.map((r) => (set.has(groupKey(r.value)) ? { ...r, approved } : r)),
		);
	};

	const handleSave = async () => {
		if (!pdfBytes) return;
		setIsSaving(true);
		try {
			setEntities(redactions);
			setRemovedImageIds(removedImages);
			setKeptLinkUrls(keptLinks);
			const approvedEntities = groups.filter((g) => g.approved).map((g) => g.value);
			const redacted = await redactPdf(pdfBytes, approvedEntities, undefined, {
				imageIds: removedImages,
				keepLinks: keptLinks,
			});
			setRedactedBytes(redacted);
			allowLeave();
			navigate('/preview');
		} catch (err) {
			console.error('[EditPage] redaction error:', err);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className='h-screen flex flex-col'>
			<Navbar title={fileName}>
				<button
					onClick={() => navigate('/preview')}
					className='text-sm text-muted-foreground hover:text-foreground'
				>
					← Back to preview
				</button>
			</Navbar>

			<main className='flex-1 flex overflow-hidden min-h-0'>
				<div className='flex-1 overflow-y-auto border-r bg-neutral-50 dark:bg-neutral-900'>
					<div className='max-w-2xl mx-auto px-6 py-6'>
						{pdfBytes ? (
							<PdfViewer pdfBytes={pdfBytes} highlights={highlights} onMatches={handleMatches} dimmedPages={dimmedPages} />
						) : (
							<div className='rounded-xl bg-muted flex items-center justify-center min-h-120'>
								<p className='text-sm text-muted-foreground'>
									No document loaded.
								</p>
							</div>
						)}
					</div>
				</div>

				<EntityPanel
					groups={groups}
					matches={matches.summary}
					matchesComplete={matches.complete}
					onSetApproved={setApproved}
					onSave={handleSave}
					isSaving={isSaving}
					images={images}
					removedImageIds={removedImages}
					onSetImagesRemoved={setImagesRemoved}
					links={links}
					keptLinkUrls={keptLinks}
					onSetLinksKept={setLinksKept}
				/>
			</main>
		</div>
	);
}
