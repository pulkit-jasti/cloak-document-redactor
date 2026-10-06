import { useEffect, useState } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { CloakProvider } from '@/context/CloakContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { OllamaProvider } from '@/context/OllamaContext';
import { NerModelProvider } from '@/context/NerModelContext';
import { getSavedNerModelId } from '@/lib/nerModels';
import UploadPage from '@/pages/UploadPage';
import PreviewPage from '@/pages/PreviewPage';
import EditPage from '@/pages/EditPage';
import ModelLoadingIndicator from '@/components/ModelLoadingIndicator';
import NERPipeline, {
	ModelStatus,
	type ProgressEvent,
} from '@/lib/nerPipeline';
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

const router = createBrowserRouter([
	{ path: '/', element: <UploadPage /> },
	{ path: '/preview', element: <RequirePdf><PreviewPage /></RequirePdf> },
	{ path: '/edit', element: <RequirePdf><EditPage /></RequirePdf> },
	{ path: '*', element: <UnknownRoute /> },
]);

export default function App() {
	const [modelStatus, setModelStatus] = useState<ModelStatus>(ModelStatus.Idle);
	const [lastEvent, setLastEvent] = useState<ProgressEvent | null>(null);

	function loadModel() {
		if (modelStatus !== ModelStatus.Idle) return;
		setModelStatus(ModelStatus.Loading);
		NERPipeline.getInstance(getSavedNerModelId(), (event) => {
			setLastEvent(event);
			if (event.status === ModelStatus.Ready) setModelStatus(ModelStatus.Ready);
		})
			.then(() => {
				setModelStatus(ModelStatus.Ready);
			})
			.catch((err) => {
				console.error('[Cloak NER] failed to load model:', err);
				setModelStatus(ModelStatus.Error);
			});
	}

	return (
		<ThemeProvider>
			<OllamaProvider>
			<NerModelProvider>
			<CloakProvider>
				<ModelLoadingIndicator status={modelStatus} lastEvent={lastEvent} onLoad={loadModel} />
				<RouterProvider router={router} />
			</CloakProvider>
			</NerModelProvider>
			</OllamaProvider>
		</ThemeProvider>
	);
}
