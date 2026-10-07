import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { testModel, testSet } from './model'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface PdfResult {
  source: string
  fixture_count: number
  redacted: string[]
  missed: string[]
  catch_rate: number
  detected_count: number
  false_positives: string[]
  false_positive_rate: number
  model_used?: string | null
  fell_back?: boolean
  incomplete_pages?: number
  errors: string[]
  duration_ms: number
}

export interface RunResult {
  totals: {
    fixture_items: number
    redacted: number
    missed: number
    catch_rate: number
    detected: number
    false_positives: number
    false_positive_rate: number
    duration_ms: number
  }
  model: { id: string }
  set?: string
  regex_enabled?: boolean
  model_enabled?: boolean
  timestamp: string
  pdfs: PdfResult[]
}


export function writeResults(result: RunResult): void {
  const regexEnabled = process.env.VITE_REGEX_ENABLED !== 'false'
  const modelEnabled = process.env.VITE_MODEL_ENABLED !== 'false'
  const set = testSet()
  const data: RunResult = { ...result, set, regex_enabled: regexEnabled, model_enabled: modelEnabled }
  const resultsDir = path.resolve(__dirname, '../../results')
  const runsDir = path.join(resultsDir, 'runs')

  fs.mkdirSync(resultsDir, { recursive: true })
  fs.writeFileSync(path.join(resultsDir, 'latest.json'), JSON.stringify(data, null, 2))

  fs.mkdirSync(runsDir, { recursive: true })
  const modelSlug = data.model.id.replace(/[^a-zA-Z0-9]/g, '-')
  const ts = new Date(data.timestamp)
    .toLocaleString('en-US', { timeZone: 'America/Phoenix', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    .replace(/[/:]/g, '-').replace(/,\s/, 'T').replace(/\s/g, '')
  const filename = `${ts}_${modelSlug}_set${set}${modelEnabled && !regexEnabled ? '_no-regex' : ''}.json`
  fs.writeFileSync(path.join(runsDir, filename), JSON.stringify(data, null, 2))
}

export function readModelId(): string {
  if (process.env.VITE_MODEL_ENABLED === 'false') return 'regex-only'
  return testModel()
}
