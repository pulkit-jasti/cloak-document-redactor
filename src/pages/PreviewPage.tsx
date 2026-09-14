import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PdfViewer from '@/components/PdfViewer';
import { useCloak } from '@/context/CloakContext';

export default function PreviewPage() {
	const navigate = useNavigate();
	const { pdfBytes, entities, reset } = useCloak();

	return (
		<div className='h-screen flex flex-col'>
			<div className='shrink-0 flex items-center justify-between px-6 py-4 border-b'>
				<button
					onClick={() => {
						reset();
						navigate('/');
					}}
					className='text-sm font-semibold tracking-tight hover:opacity-60 transition-opacity'
				>
					Cloak
				</button>
			</div>

			<div className='flex-1 overflow-y-auto min-h-0'>
				<div className='max-w-2xl mx-auto px-4 py-8'>
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

			<div className='shrink-0 border-t px-4 py-4'>
				<div className='max-w-2xl mx-auto flex flex-col gap-3'>
					{entities?.length === 0 && (
						<p className='text-xs text-muted-foreground text-center'>
							No PII detected — document appears clean.
						</p>
					)}
					<Button size='lg' className='w-full'>
						Download PDF
					</Button>
					<button
						onClick={() => navigate('/edit')}
						className='text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground text-center'
					>
						Edit redactions
					</button>
				</div>
			</div>
		</div>
	);
}
