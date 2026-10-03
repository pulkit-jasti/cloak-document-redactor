import type { TokenClassificationPipeline } from '@huggingface/transformers'

type Tag = { prefix: 'O' | 'B' | 'I' | 'E' | 'S'; label: string }

export type Span = { entity_group: string; word: string }

function parseTag(raw: string): Tag {
  if (raw === 'O' || raw[1] !== '-') return { prefix: 'O', label: '' }
  return { prefix: raw[0] as Tag['prefix'], label: raw.slice(2) }
}

function canStart(t: Tag) {
  return t.prefix === 'O' || t.prefix === 'B' || t.prefix === 'S'
}

function canEnd(t: Tag) {
  return t.prefix === 'O' || t.prefix === 'E' || t.prefix === 'S'
}

function canFollow(prev: Tag, next: Tag) {
  if (prev.prefix === 'B' || prev.prefix === 'I') {
    return (next.prefix === 'I' || next.prefix === 'E') && next.label === prev.label
  }
  return canStart(next)
}

function logSoftmaxRow(data: Float32Array, offset: number, size: number, out: Float64Array) {
  let max = -Infinity
  for (let k = 0; k < size; k++) max = Math.max(max, data[offset + k])
  let sum = 0
  for (let k = 0; k < size; k++) sum += Math.exp(data[offset + k] - max)
  const logSum = max + Math.log(sum)
  for (let k = 0; k < size; k++) out[k] = data[offset + k] - logSum
}

export function viterbiDecode(logits: Float32Array, length: number, tags: Tag[]): number[] {
  const n = tags.length
  const allowed = tags.map((prev) => tags.map((next) => canFollow(prev, next)))
  const emission = new Float64Array(n)
  let score = new Float64Array(n)
  const back: Int32Array[] = []

  logSoftmaxRow(logits, 0, n, emission)
  for (let j = 0; j < n; j++) score[j] = canStart(tags[j]) ? emission[j] : -Infinity

  for (let t = 1; t < length; t++) {
    logSoftmaxRow(logits, t * n, n, emission)
    const next = new Float64Array(n)
    const ptr = new Int32Array(n)
    for (let j = 0; j < n; j++) {
      let best = -Infinity
      let bestI = 0
      for (let i = 0; i < n; i++) {
        if (!allowed[i][j]) continue
        const s = score[i]
        if (s > best) {
          best = s
          bestI = i
        }
      }
      next[j] = best + emission[j]
      ptr[j] = bestI
    }
    back.push(ptr)
    score = next
  }

  let last = 0
  let best = -Infinity
  for (let j = 0; j < n; j++) {
    if (canEnd(tags[j]) && score[j] > best) {
      best = score[j]
      last = j
    }
  }

  const path = new Array<number>(length)
  path[length - 1] = last
  for (let t = length - 1; t > 0; t--) path[t - 1] = back[t - 1][path[t]]
  return path
}

export async function runViterbi(pipe: TokenClassificationPipeline, text: string): Promise<Span[]> {
  const inputs = pipe.tokenizer(text, { truncation: true })
  const { logits } = await pipe.model(inputs)
  const id2label = (pipe.model.config as unknown as { id2label: Record<string, string> }).id2label
  const tags = Object.keys(id2label).sort((a, b) => +a - +b).map((k) => parseTag(id2label[k]))
  const ids = (inputs.input_ids.tolist() as bigint[][])[0].map(Number)
  const data = (await logits.getData?.() ?? logits.data) as Float32Array
  const path = viterbiDecode(data, ids.length, tags)

  const spans: Span[] = []
  let current: { label: string; ids: number[] } | null = null
  const flush = () => {
    if (!current) return
    const word = pipe.tokenizer.decode(current.ids, { skip_special_tokens: true })
    if (word.trim()) spans.push({ entity_group: current.label, word })
    current = null
  }
  for (let t = 0; t < ids.length; t++) {
    const tag = tags[path[t]]
    if (tag.prefix === 'O') {
      flush()
      continue
    }
    if (tag.prefix === 'B' || tag.prefix === 'S' || !current) {
      flush()
      current = { label: tag.label, ids: [] }
    }
    current.ids.push(ids[t])
    if (tag.prefix === 'E' || tag.prefix === 'S') flush()
  }
  flush()
  return spans
}
