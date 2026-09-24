import { test, expect } from '@playwright/test'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { extractText } from './helpers/extractText'
import { writeResults } from './helpers/results'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PDF_PATH = path.resolve(__dirname, '../test_basic.pdf')

test('smoke: pipeline runs end-to-end without errors', async ({ page }) => {
  const jsErrors: string[] = []
  page.on('pageerror', (err) => jsErrors.push(err.message))

  await page.goto('/')

  await page.locator('#file-input').setInputFiles(PDF_PATH)
  await page.getByText('Cloak it').click()

  await page.waitForURL('**/preview', { timeout: 240_000 })

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByText('Download PDF').click(),
  ])

  const tmpPath = path.join(os.tmpdir(), `cloak-smoke-${Date.now()}.pdf`)
  await download.saveAs(tmpPath)

  const text = await extractText(tmpPath)
  fs.unlinkSync(tmpPath)

  expect(jsErrors, `JS errors: ${jsErrors.join(', ')}`).toHaveLength(0)
  expect(text.length, 'Redacted PDF should contain extractable text').toBeGreaterThan(0)

  writeResults({
    timestamp: new Date().toISOString(),
    mode: 'smoke',
    model: { id: 'unknown' },
    pdfs: [{
      source: 'test_basic.pdf',
      fixture_count: 0,
      redacted: [],
      missed: [],
      catch_rate: 0,
      errors: jsErrors,
    }],
    totals: { fixture_items: 0, redacted: 0, missed: 0, catch_rate: 0 },
  }, 'smoke')
})
