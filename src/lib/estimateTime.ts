export const GAME_THRESHOLD_SECONDS = 15

export function estimateSeconds(
  pageCount: number,
  mode: 'bert' | 'ollama',
  hasWebGPU: boolean,
  ollamaModelSizeGB?: number,
): number {
  if (mode === 'ollama') {
    const sizeGB = ollamaModelSizeGB ?? 4
    // ~6s per page for a 4GB model, scales linearly with model size
    return pageCount * 6 * (sizeGB / 4)
  }
  // BERT: ~1.5s/page on WebGPU, ~5s/page on WASM
  return pageCount * 1.5 * (hasWebGPU ? 1.0 : 3.5)
}
