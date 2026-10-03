import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CloakProvider } from '@/context/CloakContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { OllamaProvider } from '@/context/OllamaContext';
import { NerModelProvider } from '@/context/NerModelContext';
import { getSavedNerModelId } from '@/lib/nerModels';
import UploadPage from '@/pages/UploadPage';
import PreviewPage from '@/pages/PreviewPage';
import EditPage from '@/pages/EditPage';
import MobileGate from '@/components/MobileGate';
import ModelLoadingIndicator from '@/components/ModelLoadingIndicator';
import NERPipeline, {
	ModelStatus,
	type ProgressEvent,
} from '@/lib/nerPipeline';
import { useCloak } from '@/context/CloakContext';

const isMobile = typeof navigator !== 'undefined' && (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	((navigator as any).userAgentData?.mobile ?? /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent))
);

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

	if (isMobile) return <MobileGate />;

	return (
		<ThemeProvider>
			<OllamaProvider>
			<NerModelProvider>
			<BrowserRouter>
				<CloakProvider>
					<ModelLoadingIndicator status={modelStatus} lastEvent={lastEvent} onLoad={loadModel} />
					<Routes>
						<Route path='/' element={<UploadPage />} />
						<Route path='/preview' element={<RequirePdf><PreviewPage /></RequirePdf>} />
						<Route path='/edit' element={<RequirePdf><EditPage /></RequirePdf>} />
						<Route path='*' element={<UnknownRoute />} />
					</Routes>
				</CloakProvider>
			</BrowserRouter>
			</NerModelProvider>
			</OllamaProvider>
		</ThemeProvider>
	);
}
