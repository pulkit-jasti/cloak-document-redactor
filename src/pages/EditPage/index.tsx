import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PdfLink, Redaction } from '@/types';
import Navbar from '@/components/Navbar';
import PdfViewer, { type MatchSummary } from '@/components/PdfViewer';
import { useCloak } from '@/context/CloakContext';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { listImages, type ImageScan } from '@/lib/listImages';
import { listLinks } from '@/lib/listLinks';
import { redactPdf } from '@/lib/redactPdf';
import { extractPdfTextPerPage } from '@/lib/pdfPipeline';
import { findWithInstruction } from '@/lib/ollamaClient';
import type { InstructionRun } from './components/CustomRedactInput';
import EntityPanel, { CUSTOM_TYPE } from './components/EntityPanel';
import { groupRedactions, groupKey } from './groupRedactions';

export default function EditPage() {
	const navigate = useNavigate();
	const { pdfBytes, fileName, entities, setEntities, setRedactedBytes, setRemovedItems, setHasReviewables, removedImageIds, setRemovedImageIds, keptLinkUrls, setKeptLinkUrls } =
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

	const [customPreview, setCustomPreview] = useState('');
	const pageTextsRef = useRef<string[] | null>(null);
	const groups = useMemo(() => groupRedactions(redactions), [redactions]);
	const highlights = useMemo(() => {
		const listed = groups.map(({ value, approved }) => ({ value, approved }));
		const previewListed = groups.some((g) => g.key === groupKey(customPreview));
		return customPreview && !previewListed ? [...listed, { value: customPreview, approved: false, preview: true }] : listed;
	}, [groups, customPreview]);

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
		linksChanged ||
		redactions.length !== (entities?.length ?? 0) ||
		redactions.some((r, i) => r.approved !== entities?.[i]?.approved || r.value !== entities?.[i]?.value);

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

	const addCustom = (value: string) => {
		const page = matches.summary[value]?.pages[0] ?? 1;
		setRedactions((prev) => [...prev, { id: crypto.randomUUID(), type: CUSTOM_TYPE, value, page, approved: true }]);
		setCustomPreview('');
	};

	const runInstruction: InstructionRun = async (instruction, model, { signal, onProgress }) => {
		if (!pdfBytes) return 0;
		pageTextsRef.current ??= (await extractPdfTextPerPage(pdfBytes, signal)).pageTexts;
		const found = await findWithInstruction(pageTextsRef.current, instruction, model, { signal, onProgress });
		const byKey = new Map(groups.map((g) => [g.key, g]));
		const toApprove = new Set<string>();
		const toAdd: Redaction[] = [];
		for (const { value, page } of found) {
			const key = groupKey(value);
			const existing = byKey.get(key);
			if (existing) {
				if (!existing.approved) toApprove.add(key);
				continue;
			}
			byKey.set(key, { key, type: CUSTOM_TYPE, value, approved: true, firstPage: page, order: byKey.size, source: 'ai' });
			toAdd.push({ id: crypto.randomUUID(), type: CUSTOM_TYPE, value, page, approved: true, source: 'ai' });
		}
		setRedactions((prev) => [
			...prev.map((r) => (toApprove.has(groupKey(r.value)) ? { ...r, approved: true } : r)),
			...toAdd,
		]);
		return toAdd.length + toApprove.size;
	};

	const removeCustom = (key: string) => {
		setRedactions((prev) => prev.filter((r) => !(r.type === CUSTOM_TYPE && groupKey(r.value) === key)));
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
			setRedactedBytes(redacted.bytes);
			setRemovedItems(redacted.removed);
			setHasReviewables(redacted.reviewable);
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
					onPreviewCustom={setCustomPreview}
					onAddCustom={addCustom}
					onRemoveCustom={removeCustom}
					onRunInstruction={runInstruction}
				/>
			</main>
		</div>
	);
}
