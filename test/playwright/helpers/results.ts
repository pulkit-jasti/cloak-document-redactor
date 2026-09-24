import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface PdfResult {
  source: string
  fixture_count: number
  redacted: string[]
  missed: string[]
  catch_rate: number
  errors: string[]
}

export interface RunResult {
  timestamp: string
  mode: 'smoke' | 'full'
  model: { id: string }
  pdfs: PdfResult[]
  totals: {
    fixture_items: number
    redacted: number
    missed: number
    catch_rate: number
  }
}

export function writeResults(data: RunResult, mode: 'smoke' | 'full'): void {
  const resultsDir = path.resolve(__dirname, '../../results')
  const runsDir = path.join(resultsDir, 'runs')

  fs.mkdirSync(resultsDir, { recursive: true })
  fs.writeFileSync(path.join(resultsDir, 'latest.json'), JSON.stringify(data, null, 2))

  if (mode === 'full') {
    fs.mkdirSync(runsDir, { recursive: true })
    const modelSlug = data.model.id.replace(/[^a-zA-Z0-9]/g, '-')
    const ts = data.timestamp.replace(/[:.]/g, '-').replace('T', 'T').slice(0, 19)
    const filename = `${ts}_${modelSlug}.json`
    fs.writeFileSync(path.join(runsDir, filename), JSON.stringify(data, null, 2))
  }
}

export function readModelId(): string {
  try {
    const envPath = path.resolve(__dirname, '../../../.env')
    const content = fs.readFileSync(envPath, 'utf-8')
    const match = content.match(/^VITE_MODEL_ID=(.+)$/m)
    return match?.[1]?.trim() ?? 'unknown'
  } catch {
    return 'unknown'
  }
}
