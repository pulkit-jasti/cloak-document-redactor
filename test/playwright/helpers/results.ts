import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { testModel } from './model'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface PdfResult {
  source: string
  fixture_count: number
  redacted: string[]
  missed: string[]
  catch_rate: number
  errors: string[]
  duration_ms: number
}

export interface RunResult {
  totals: {
    fixture_items: number
    redacted: number
    missed: number
    catch_rate: number
    duration_ms: number
  }
  model: { id: string }
  regex_enabled?: boolean
  model_enabled?: boolean
  timestamp: string
  pdfs: PdfResult[]
}


export function writeResults(result: RunResult): void {
  const regexEnabled = process.env.VITE_REGEX_ENABLED !== 'false'
  const modelEnabled = process.env.VITE_MODEL_ENABLED !== 'false'
  const data: RunResult = { ...result, regex_enabled: regexEnabled, model_enabled: modelEnabled }
  const resultsDir = path.resolve(__dirname, '../../results')
  const runsDir = path.join(resultsDir, 'runs')

  fs.mkdirSync(resultsDir, { recursive: true })
  fs.writeFileSync(path.join(resultsDir, 'latest.json'), JSON.stringify(data, null, 2))

  fs.mkdirSync(runsDir, { recursive: true })
  const modelSlug = data.model.id.replace(/[^a-zA-Z0-9]/g, '-')
  const ts = data.timestamp.replace(/[:.]/g, '-').replace('T', 'T').slice(0, 19)
  const filename = `${ts}_${modelSlug}${regexEnabled ? '' : '_no-regex'}${modelEnabled ? '' : '_no-model'}.json`
  fs.writeFileSync(path.join(runsDir, filename), JSON.stringify(data, null, 2))
}

export function readModelId(): string {
  return testModel()
}
