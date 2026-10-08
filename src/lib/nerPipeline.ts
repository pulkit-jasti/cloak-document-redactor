import type { ProgressInfo } from '@huggingface/transformers';
import type { NerEntity } from '@/workers/ner.worker';

export type { NerEntity };

export enum ModelStatus {
	Idle = 'idle',
	Loading = 'loading',
	Ready = 'ready',
	Error = 'error',
}

export type ProgressEvent = {
	status: ModelStatus;
	file?: string;
	progress?: number;
	total?: boolean;
};

type ProgressCallback = (event: ProgressEvent) => void;
type ModelListener = (modelId: string, event: ProgressEvent) => void;

type Pending = { resolve: (value: unknown) => void; reject: (err: Error) => void };
type Loader = { promise: Promise<void>; resolve: () => void; reject: (err: Error) => void };

class NERPipeline {
	private static worker: Worker | null = null;
	private static loaders = new Map<string, Loader>();
	private static listeners = new Set<ModelListener>();
	private static pending = new Map<number, Pending>();
	private static nextId = 0;

	private static emit(modelId: string, event: ProgressEvent) {
		for (const listener of NERPipeline.listeners) listener(modelId, event);
	}

	private static handleProgress(modelId: string, event: ProgressInfo) {
		if (event.status === 'progress') {
			NERPipeline.emit(modelId, { status: ModelStatus.Loading, file: event.file, progress: Math.round(event.progress) });
		} else if (event.status === 'progress_total') {
			NERPipeline.emit(modelId, { status: ModelStatus.Loading, progress: Math.round(event.progress), total: true });
		}
	}

	private static failLoader(modelId: string, err: Error) {
		NERPipeline.loaders.get(modelId)?.reject(err);
		NERPipeline.loaders.delete(modelId);
		NERPipeline.emit(modelId, { status: ModelStatus.Error });
	}

	private static failAll(err: Error) {
		for (const modelId of [...NERPipeline.loaders.keys()]) NERPipeline.failLoader(modelId, err);
		for (const { reject } of NERPipeline.pending.values()) reject(err);
		NERPipeline.pending.clear();
	}

	private static getWorker(): Worker {
		if (NERPipeline.worker) return NERPipeline.worker;

		const worker = new Worker(new URL('../workers/ner.worker.ts', import.meta.url), { type: 'module' });
		worker.onmessage = (e: MessageEvent) => {
			const msg = e.data;
			if (msg.type === 'progress') {
				NERPipeline.handleProgress(msg.modelId, msg.event as ProgressInfo);
			} else if (msg.type === 'ready') {
				NERPipeline.emit(msg.modelId, { status: ModelStatus.Ready });
				NERPipeline.loaders.get(msg.modelId)?.resolve();
			} else if (msg.type === 'loadError') {
				NERPipeline.failLoader(msg.modelId, new Error(msg.message));
			} else if (msg.type === 'reply' || msg.type === 'replyError') {
				const pending = NERPipeline.pending.get(msg.id);
				if (!pending) return;
				NERPipeline.pending.delete(msg.id);
				if (msg.type === 'reply') pending.resolve(msg.value);
				else pending.reject(new Error(msg.message));
			}
		};
		worker.onerror = (e) => {
			NERPipeline.worker = null;
			worker.terminate();
			NERPipeline.failAll(new Error(e.message || 'NER worker crashed'));
		};

		NERPipeline.worker = worker;
		return worker;
	}

	private static request<T>(msg: Record<string, unknown>): Promise<T> {
		const worker = NERPipeline.getWorker();
		const id = NERPipeline.nextId++;
		return new Promise<T>((resolve, reject) => {
			NERPipeline.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
			worker.postMessage({ ...msg, id });
		});
	}

	static subscribe(listener: ModelListener): () => void {
		NERPipeline.listeners.add(listener);
		return () => NERPipeline.listeners.delete(listener);
	}

	static getInstance(modelId: string, onProgress?: ProgressCallback): Promise<void> {
		const worker = NERPipeline.getWorker();

		let loader = NERPipeline.loaders.get(modelId);
		if (!loader) {
			let resolve!: () => void;
			let reject!: (err: Error) => void;
			const promise = new Promise<void>((res, rej) => {
				resolve = res;
				reject = rej;
			});
			loader = { promise, resolve, reject };
			NERPipeline.loaders.set(modelId, loader);
			worker.postMessage({ type: 'load', modelId });
		}

		const ready = loader.promise;
		if (onProgress) {
			const unsubscribe = NERPipeline.subscribe((id, event) => {
				if (id === modelId) onProgress(event);
			});
			ready.then(unsubscribe, unsubscribe);
		}

		return ready;
	}

	static run(modelId: string, chunks: string[]): Promise<NerEntity[]> {
		return NERPipeline.request<NerEntity[]>({ type: 'run', modelId, chunks });
	}

	static isCached(modelId: string): Promise<boolean> {
		return NERPipeline.request<boolean>({ type: 'isCached', modelId });
	}

	static async remove(modelId: string): Promise<void> {
		NERPipeline.loaders.delete(modelId);
		await NERPipeline.request<void>({ type: 'remove', modelId });
	}
}

export default NERPipeline;
