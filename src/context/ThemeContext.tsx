import { createContext, useContext, useEffect, useState } from 'react';

export enum Theme {
	Light = 'light',
	Dark = 'dark',
}

type ThemeContextValue = {
	theme: Theme;
	toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
	theme: Theme.Light,
	toggleTheme: () => {},
});

function getInitialTheme(): Theme {
	if (typeof window === 'undefined') return Theme.Light;
	const stored = localStorage.getItem('theme');
	if (stored === Theme.Light || stored === Theme.Dark) return stored as Theme;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.Dark : Theme.Light;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<Theme>(getInitialTheme);

	useEffect(() => {
		document.documentElement.classList.toggle('dark', theme === Theme.Dark);
		localStorage.setItem('theme', theme);
		// Keep browser UI color in sync when the user overrides the OS theme
		document
			.querySelectorAll('meta[name="theme-color"]')
			.forEach((meta) => meta.setAttribute('content', theme === Theme.Dark ? '#0a0a0a' : '#ffffff'));
	}, [theme]);

	const toggleTheme = () => setTheme((t) => (t === Theme.Dark ? Theme.Light : Theme.Dark));

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	return useContext(ThemeContext);
}
