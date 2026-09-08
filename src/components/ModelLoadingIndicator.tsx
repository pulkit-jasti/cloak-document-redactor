import type { ModelStatus, ProgressEvent } from '@/lib/nerPipeline';

const IS_DEV = import.meta.env.VITE_ENV === 'development';

type Props = {
	status: ModelStatus;
	lastEvent: ProgressEvent | null;
};

export default function ModelLoadingIndicator({ status, lastEvent }: Props) {
	if (!IS_DEV || status === 'idle') return null;

	const label = {
		loading: 'Model loading…',
		ready: 'Model ready',
		error: 'Model error',
		idle: '',
	}[status];

	const dot = {
		loading: 'bg-yellow-400 animate-pulse',
		ready: 'bg-green-400',
		error: 'bg-red-400',
		idle: '',
	}[status];

	return (
		<div className='fixed top-3 right-3 z-50 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm font-mono'>
			<span className={`size-1.5 rounded-full ${dot}`} />
			<span>{label}</span>
			{status === 'loading' && lastEvent?.progress != null && (
				<span className='text-foreground font-medium'>
					{lastEvent.progress}%
				</span>
			)}
			{status === 'loading' && lastEvent?.file && (
				<span className='max-w-30 truncate opacity-60'>{lastEvent.file}</span>
			)}
		</div>
	);
}
