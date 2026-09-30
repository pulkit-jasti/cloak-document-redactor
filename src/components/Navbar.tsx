import { Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GithubIcon } from '@/components/BrandIcons';
import { useCloak } from '@/context/CloakContext';
import { Theme, useTheme } from '@/context/ThemeContext';
import { LINKS } from '@/lib/links';
import Logo from '@/assets/logo-main.svg?react';

type Props = {
	children?: React.ReactNode;
	overHero?: boolean;
};

export default function Navbar({ children, overHero = false }: Props) {
	const { reset } = useCloak();
	const { theme, toggleTheme } = useTheme();

	return (
		<div
			className={`sticky top-0 z-40 shrink-0 flex items-center gap-4 px-6 py-4 border-b transition-colors duration-300 ${
				overHero ? 'border-transparent' : 'bg-background/80 backdrop-blur-md'
			}`}
		>
			<Link
				to='/'
				onClick={() => reset()}
				aria-label='Cloak home'
				aria-hidden={overHero || undefined}
				tabIndex={overHero ? -1 : undefined}
				className={`transition-all duration-300 hover:opacity-60 ${
					overHero ? 'opacity-0 -translate-y-1 pointer-events-none' : 'opacity-100'
				}`}
			>
				<Logo className='h-5 w-auto' />
			</Link>
			{children}
			<div className='flex-1' />
			<Button variant='ghost' size='icon' asChild>
				<a href={LINKS.repo} target='_blank' rel='noopener noreferrer' aria-label='Cloak on GitHub'>
					<GithubIcon className='size-4' />
				</a>
			</Button>
			<Button variant='ghost' size='icon' onClick={toggleTheme} aria-label='Toggle theme'>
				{theme === Theme.Dark ? <Sun className='size-4' /> : <Moon className='size-4' />}
			</Button>
		</div>
	);
}
