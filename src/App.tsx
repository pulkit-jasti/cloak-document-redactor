import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CloakProvider } from '@/context/CloakContext';
import { ThemeProvider } from '@/context/ThemeContext';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isMobile = (navigator as any).userAgentData?.mobile
	?? /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);

function RequirePdf({ children }: { children: React.ReactNode }) {
	const { pdfUrl } = useCloak();
	if (!pdfUrl) return <Navigate to='/' replace />;
	return <>{children}</>;
}

export default function App() {
	const [modelStatus, setModelStatus] = useState<ModelStatus>(ModelStatus.Loading);
	const [lastEvent, setLastEvent] = useState<ProgressEvent | null>(null);

	useEffect(() => {
		if (isMobile) return;
		NERPipeline.getInstance((event) => {
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
	}, []);

	if (isMobile) return <MobileGate />;

	return (
		<ThemeProvider>
			<BrowserRouter>
				<CloakProvider>
					<ModelLoadingIndicator status={modelStatus} lastEvent={lastEvent} />
					<Routes>
						<Route path='/' element={<UploadPage />} />
						<Route path='/preview' element={<RequirePdf><PreviewPage /></RequirePdf>} />
						<Route path='/edit' element={<RequirePdf><EditPage /></RequirePdf>} />
					</Routes>
				</CloakProvider>
			</BrowserRouter>
		</ThemeProvider>
	);
}
