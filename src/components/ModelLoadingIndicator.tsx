export enum ModelStatus {
	Idle = 'idle',
	Loading = 'loading',
	Ready = 'ready',
	Error = 'error',
}

export type ProgressEvent = {
	status: ModelStatus;
	file?: string;
	progress?: number; // 0-100
};

const IS_DEV = import.meta.env.VITE_ENV === 'development';

type Props = {
	status: ModelStatus;
	lastEvent: ProgressEvent | null;
};

export default function ModelLoadingIndicator({ status, lastEvent }: Props) {
	if (!IS_DEV || status === ModelStatus.Idle) return null;

	const label = {
		[ModelStatus.Loading]: 'Model loading…',
		[ModelStatus.Ready]: 'Model ready',
		[ModelStatus.Error]: 'Model error',
		[ModelStatus.Idle]: '',
	}[status];

	const dot = {
		[ModelStatus.Loading]: 'bg-yellow-400 animate-pulse',
		[ModelStatus.Ready]: 'bg-green-400',
		[ModelStatus.Error]: 'bg-red-400',
		[ModelStatus.Idle]: '',
	}[status];

	return (
		<div className='fixed top-3 right-3 z-50 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm font-mono'>
			<span className={`size-1.5 rounded-full ${dot}`} />
			<span>{label}</span>
			{status === ModelStatus.Loading && lastEvent?.progress != null && (
				<span className='text-foreground font-medium'>
					{lastEvent.progress}%
				</span>
			)}
			{status === ModelStatus.Loading && lastEvent?.file && (
				<span className='max-w-30 truncate opacity-60'>{lastEvent.file}</span>
			)}
		</div>
	);
}
