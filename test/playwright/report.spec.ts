import { test } from '@playwright/test'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { extractText } from './helpers/extractText'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures')
const PDFS_DIR = path.resolve(__dirname, '../pdfs')

const fixtureFiles = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.json'))

interface FixtureItem {
  value: string
  type: string
}

interface Fixture {
  source: string
  pii: FixtureItem[]
}

test.describe('PII detection report', () => {
  test.describe.configure({ mode: 'parallel' })

  for (const fixtureFile of fixtureFiles) {
    test(fixtureFile.replace('.json', ''), async ({ page }, testInfo) => {
      const fixture: Fixture = JSON.parse(
        fs.readFileSync(path.join(FIXTURES_DIR, fixtureFile), 'utf-8')
      )
      const pdfPath = path.join(PDFS_DIR, fixture.source)
      const jsErrors: string[] = []
      page.on('pageerror', (err) => jsErrors.push(err.message))

      await page.goto('/')
      await page.locator('#file-input').setInputFiles(pdfPath)
      await page.getByText('Cloak it').click()
      await page.waitForURL('**/preview', { timeout: 240_000 })

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByText('Download PDF').click(),
      ])

      const tmpPath = path.join(os.tmpdir(), `cloak-report-${Date.now()}-${process.pid}.pdf`)
      await download.saveAs(tmpPath)

      let extractedText: string
      try {
        extractedText = await extractText(tmpPath)
      } finally {
        fs.unlinkSync(tmpPath)
      }

      const normalised = extractedText.toLowerCase()
      const redacted: string[] = []
      const missed: string[] = []

      for (const item of fixture.pii) {
        if (normalised.includes(item.value.toLowerCase())) {
          missed.push(item.value)
        } else {
          redacted.push(item.value)
        }
      }

      const catch_rate = fixture.pii.length > 0 ? redacted.length / fixture.pii.length : 0

      await testInfo.attach('pii-result', {
        contentType: 'application/json',
        body: Buffer.from(
          JSON.stringify({
            source: fixture.source,
            fixture_count: fixture.pii.length,
            redacted,
            missed,
            catch_rate,
            errors: jsErrors,
          })
        ),
      })
    })
  }
})
