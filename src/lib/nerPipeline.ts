import type { ProgressInfo } from '@huggingface/transformers';
import {
	ModelStatus,
	type ProgressEvent,
} from '@/components/ModelLoadingIndicator';
import type { NerEntity } from '@/workers/ner.worker';

export { ModelStatus, type ProgressEvent, type NerEntity };

type ProgressCallback = (event: ProgressEvent) => void;

type Pending = { resolve: (results: NerEntity[]) => void; reject: (err: Error) => void };

class NERPipeline {
	private static worker: Worker | null = null;
	private static ready: Promise<void> | null = null;
	private static resolveReady: (() => void) | null = null;
	private static rejectReady: ((err: Error) => void) | null = null;
	private static listeners = new Set<ProgressCallback>();
	private static pending = new Map<number, Pending>();
	private static nextId = 0;

	private static emit(event: ProgressEvent) {
		for (const listener of NERPipeline.listeners) listener(event);
	}

	private static handleProgress(event: ProgressInfo) {
		if (event.status === 'progress') {
			NERPipeline.emit({ status: ModelStatus.Loading, file: event.file, progress: Math.round(event.progress) });
		} else if (event.status === 'progress_total') {
			NERPipeline.emit({ status: ModelStatus.Loading, progress: Math.round(event.progress), total: true });
		}
	}

	private static failAll(err: Error) {
		NERPipeline.rejectReady?.(err);
		NERPipeline.ready = null;
		for (const { reject } of NERPipeline.pending.values()) reject(err);
		NERPipeline.pending.clear();
	}

	private static getWorker(): Worker {
		if (NERPipeline.worker) return NERPipeline.worker;

		const worker = new Worker(new URL('../workers/ner.worker.ts', import.meta.url), { type: 'module' });
		worker.onmessage = (e: MessageEvent) => {
			const msg = e.data;
			if (msg.type === 'progress') {
				NERPipeline.handleProgress(msg.event as ProgressInfo);
			} else if (msg.type === 'ready') {
				NERPipeline.emit({ status: ModelStatus.Ready });
				NERPipeline.resolveReady?.();
			} else if (msg.type === 'loadError') {
				NERPipeline.rejectReady?.(new Error(msg.message));
				NERPipeline.ready = null;
			} else if (msg.type === 'result' || msg.type === 'runError') {
				const pending = NERPipeline.pending.get(msg.id);
				if (!pending) return;
				NERPipeline.pending.delete(msg.id);
				if (msg.type === 'result') pending.resolve(msg.results as NerEntity[]);
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

	static getInstance(onProgress?: ProgressCallback): Promise<void> {
		const worker = NERPipeline.getWorker();

		if (!NERPipeline.ready) {
			NERPipeline.ready = new Promise<void>((resolve, reject) => {
				NERPipeline.resolveReady = resolve;
				NERPipeline.rejectReady = reject;
			});
			worker.postMessage({ type: 'load' });
		}

		const ready = NERPipeline.ready;
		if (onProgress) {
			NERPipeline.listeners.add(onProgress);
			const remove = () => NERPipeline.listeners.delete(onProgress);
			ready.then(remove, remove);
		}

		return ready;
	}

	static run(chunks: string[]): Promise<NerEntity[]> {
		const worker = NERPipeline.getWorker();
		const id = NERPipeline.nextId++;
		return new Promise<NerEntity[]>((resolve, reject) => {
			NERPipeline.pending.set(id, { resolve, reject });
			worker.postMessage({ type: 'run', id, chunks });
		});
	}
}

export default NERPipeline;
