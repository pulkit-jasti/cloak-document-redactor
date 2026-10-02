import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Redaction } from '@/types';
import Navbar from '@/components/Navbar';
import PdfViewer, { type MatchSummary } from '@/components/PdfViewer';
import { useCloak } from '@/context/CloakContext';
import { redactPdf } from '@/lib/redactPdf';
import EntityPanel from './components/EntityPanel';
import { groupRedactions, groupKey } from './groupRedactions';

export default function EditPage() {
	const navigate = useNavigate();
	const { pdfBytes, fileName, entities, setEntities, setRedactedBytes } =
		useCloak();

	const [redactions, setRedactions] = useState<Redaction[]>(entities ?? []);
	const [isSaving, setIsSaving] = useState(false);
	const [matches, setMatches] = useState<{ summary: MatchSummary; complete: boolean }>({
		summary: {},
		complete: false,
	});

	const groups = useMemo(() => groupRedactions(redactions), [redactions]);
	const highlights = useMemo(
		() => groups.map(({ value, approved }) => ({ value, approved })),
		[groups],
	);

	const handleMatches = useCallback(
		(summary: MatchSummary, complete: boolean) => setMatches({ summary, complete }),
		[],
	);

	const toggleGroup = (key: string) => {
		const target = !groups.find((g) => g.key === key)?.approved;
		setRedactions((prev) =>
			prev.map((r) => (groupKey(r.value) === key ? { ...r, approved: target } : r)),
		);
	};

	const handleSave = async () => {
		if (!pdfBytes) return;
		setIsSaving(true);
		try {
			setEntities(redactions);
			const approvedEntities = groups.filter((g) => g.approved).map((g) => g.value);
			const redacted = await redactPdf(pdfBytes, approvedEntities);
			setRedactedBytes(redacted);
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
							<PdfViewer pdfBytes={pdfBytes} highlights={highlights} onMatches={handleMatches} />
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
					onToggle={toggleGroup}
					onSave={handleSave}
					isSaving={isSaving}
				/>
			</main>
		</div>
	);
}
