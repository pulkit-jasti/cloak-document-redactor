import { useEffect } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import PwaToast from '@/components/PwaToast';
import { CloakProvider } from '@/context/CloakContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { OllamaProvider } from '@/context/OllamaContext';
import { NerModelProvider } from '@/context/NerModelContext';
import UploadPage from '@/pages/UploadPage';
import PreviewPage from '@/pages/PreviewPage';
import EditPage from '@/pages/EditPage';
import VerifyPage from '@/pages/VerifyPage';
import PrivacyPage from '@/pages/PrivacyPage';
import { useCloak } from '@/context/CloakContext';

function RequirePdf({ children }: { children: React.ReactNode }) {
	const { pdfUrl } = useCloak();
	if (!pdfUrl) return <Navigate to='/' replace />;
	return <>{children}</>;
}

function UnknownRoute() {
	const { reset } = useCloak();
	useEffect(() => {
		reset();
	}, [reset]);
	return <Navigate to='/' replace />;
}

// Shared by every page: the offline and update notifications sit on top of the current page.
function RootLayout() {
	return (
		<>
			<Outlet />
			<PwaToast />
		</>
	);
}

const router = createBrowserRouter([
	{
		element: <RootLayout />,
		children: [
			{ path: '/', element: <UploadPage /> },
			{ path: '/verify', element: <VerifyPage /> },
			{ path: '/privacy', element: <PrivacyPage /> },
			{ path: '/preview', element: <RequirePdf><PreviewPage /></RequirePdf> },
			{ path: '/edit', element: <RequirePdf><EditPage /></RequirePdf> },
			{ path: '*', element: <UnknownRoute /> },
		],
	},
]);

export default function App() {
	return (
		<ThemeProvider>
			<OllamaProvider>
			<NerModelProvider>
			<CloakProvider>
				<RouterProvider router={router} />
			</CloakProvider>
			</NerModelProvider>
			</OllamaProvider>
		</ThemeProvider>
	);
}
