import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import UploadPage from '@/pages/UploadPage';
import PreviewPage from '@/pages/PreviewPage';
import EditPage from '@/pages/EditPage';
import ModelLoadingIndicator from '@/components/ModelLoadingIndicator';
import NERPipeline, {
	ModelStatus,
	type ProgressEvent,
} from '@/lib/nerPipeline';

export default function App() {
	const [modelStatus, setModelStatus] = useState<ModelStatus>(ModelStatus.Idle);
	const [lastEvent, setLastEvent] = useState<ProgressEvent | null>(null);

	useEffect(() => {
		setModelStatus(ModelStatus.Loading);

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

	return (
		<BrowserRouter>
			<ModelLoadingIndicator status={modelStatus} lastEvent={lastEvent} />
			<Routes>
				<Route path='/' element={<UploadPage />} />
				<Route path='/preview' element={<PreviewPage />} />
				<Route path='/edit' element={<EditPage />} />
			</Routes>
		</BrowserRouter>
	);
}
