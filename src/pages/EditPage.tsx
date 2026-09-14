import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { Redaction } from '@/constants/mockData';
import PdfViewer from '@/components/PdfViewer';
import { useCloak } from '@/context/CloakContext';

export default function EditPage() {
	const navigate = useNavigate();
	const { pdfBytes, entities, reset } = useCloak();

	const [redactions, setRedactions] = useState<Redaction[]>(entities ?? []);

	const toggleRedaction = (id: string) => {
		setRedactions((prev) =>
			prev.map((r) => (r.id === id ? { ...r, approved: !r.approved } : r)),
		);
	};

	const pages = [...new Set(redactions.map((r) => r.page))].sort(
		(a, b) => a - b,
	);

	return (
		<div className='h-screen flex flex-col'>
			<div className='shrink-0 flex items-center gap-4 px-6 py-4 border-b'>
				<button
					onClick={() => navigate('/preview')}
					className='text-sm text-muted-foreground hover:text-foreground'
				>
					← Back to preview
				</button>
				<button
					onClick={() => {
						reset();
						navigate('/');
					}}
					className='text-sm font-semibold tracking-tight ml-auto hover:opacity-60 transition-opacity'
				>
					Cloak
				</button>
			</div>

			<div className='flex-1 flex overflow-hidden min-h-0'>
				<div className='flex-1 overflow-y-auto border-r'>
					<div className='max-w-2xl mx-auto px-6 py-6'>
						{pdfBytes ? (
							<PdfViewer pdfBytes={pdfBytes} />
						) : (
							<div className='rounded-xl bg-muted flex items-center justify-center min-h-120'>
								<p className='text-sm text-muted-foreground'>
									No document loaded.
								</p>
							</div>
						)}
					</div>
				</div>

				<div className='w-80 flex flex-col overflow-hidden'>
					<div className='flex-1 overflow-y-auto p-4 space-y-6 min-h-0'>
						{redactions.length === 0 && (
							<div className='flex flex-col items-center justify-center h-full gap-2 text-center px-4 py-12'>
								<p className='text-sm font-medium'>No PII detected</p>
								<p className='text-xs text-muted-foreground'>
									The document appears clean. Nothing to redact.
								</p>
							</div>
						)}
						{pages.map((page) => (
							<div key={page}>
								<p className='text-xs font-medium text-muted-foreground mb-2'>
									Page {page}
								</p>
								<div className='space-y-2'>
									{redactions
										.filter((r) => r.page === page)
										.map((r) => (
											<div
												key={r.id}
												className='flex items-center gap-2 rounded-lg border px-3 py-2 bg-card'
											>
												<div className='flex-1 min-w-0'>
													<span className='text-xs text-muted-foreground'>
														{r.type}
													</span>
													<p className='text-sm font-medium truncate'>
														{r.value}
													</p>
												</div>
												<button
													onClick={() => toggleRedaction(r.id)}
													className={`shrink-0 text-xs px-2 py-1 rounded-md border font-medium transition-colors ${
														r.approved
															? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
															: 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
													}`}
												>
													{r.approved ? 'Approved' : 'Dismissed'}
												</button>
											</div>
										))}
								</div>
							</div>
						))}
					</div>

					<div className='shrink-0 p-4 border-t'>
						<Button className='w-full' onClick={() => navigate('/preview')}>
							Save & Preview
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
