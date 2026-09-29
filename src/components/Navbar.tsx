import { Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCloak } from '@/context/CloakContext';
import { Theme, useTheme } from '@/context/ThemeContext';
import Logo from '@/assets/logo-main.svg?react';

type Props = {
	children?: React.ReactNode;
};

export default function Navbar({ children }: Props) {
	const navigate = useNavigate();
	const { reset } = useCloak();
	const { theme, toggleTheme } = useTheme();

	const handleLogoClick = () => {
		reset();
		navigate('/');
	};

	return (
		<div className='shrink-0 flex items-center gap-4 px-6 py-4 border-b'>
			<button
				onClick={handleLogoClick}
				className='hover:opacity-60 transition-opacity cursor-pointer'
				aria-label='Go to home'
			>
				<Logo className='h-5 w-auto' />
			</button>
			{children}
			<div className='flex-1' />
			<Button variant='ghost' size='icon' onClick={toggleTheme} aria-label='Toggle theme'>
				{theme === Theme.Dark ? <Sun className='size-4' /> : <Moon className='size-4' />}
			</Button>
		</div>
	);
}
