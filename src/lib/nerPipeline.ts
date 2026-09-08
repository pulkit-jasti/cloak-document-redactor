import {
	pipeline,
	env,
	type TokenClassificationPipeline,
	type ProgressInfo,
} from '@huggingface/transformers';
import {
	ModelStatus,
	type ProgressEvent,
} from '@/components/ModelLoadingIndicator';

export { ModelStatus, type ProgressEvent };

const MODEL_BASE_URL = import.meta.env.VITE_MODEL_BASE_URL as string;
const MODEL_ID = import.meta.env.VITE_MODEL_ID as string;
const IS_DEV = import.meta.env.VITE_ENV === 'development';

type ProgressCallback = (event: ProgressEvent) => void;

async function logDevInfo() {
	const adapter = await navigator.gpu?.requestAdapter().catch(() => null);
	console.log(`[Cloak] model ready — ${adapter ? 'webgpu' : 'wasm (cpu fallback)'}`);
	if (adapter?.info) console.log('[Cloak] GPU info', adapter.info);
}

class NERPipeline {
	private static instance: Promise<TokenClassificationPipeline> | null = null;

	static async getInstance(
		onProgress?: ProgressCallback,
	): Promise<TokenClassificationPipeline> {
		if (this.instance) return this.instance;

		if (IS_DEV) {
			env.remoteHost = MODEL_BASE_URL;
			env.remotePathTemplate = '{model}/';
			env.allowLocalModels = false;
		}

		this.instance = pipeline('token-classification', MODEL_ID, {
			progress_callback: (event: ProgressInfo) => {
				if (event.status === 'progress') {
					onProgress?.({
						status: ModelStatus.Loading,
						file: event.file,
						progress: Math.round(event.progress),
					});
				} else if (event.status === 'ready') {
					logDevInfo();
					onProgress?.({ status: ModelStatus.Ready });
				}
			},
		}) as Promise<TokenClassificationPipeline>;

		return this.instance;
	}
}

export default NERPipeline;
