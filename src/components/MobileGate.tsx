import Logo from '@/assets/logo-main.svg?react';

export default function MobileGate() {
	return (
		<main className='min-h-screen flex flex-col items-center justify-center px-8 text-center gap-6'>
			<Logo role='img' aria-label='Cloak' className='h-6 w-auto' />
			<div className='flex flex-col gap-2 max-w-xs'>
				<h1 className='text-xl font-semibold tracking-tight'>Desktop only</h1>
				<p className='text-sm text-muted-foreground'>
					Cloak processes documents locally using AI models that require a desktop browser. Please open this on a laptop or desktop.
				</p>
			</div>
		</main>
	);
}
