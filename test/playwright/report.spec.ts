import { test } from '@playwright/test'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { extractText } from './helpers/extractText'
import { testSet } from './helpers/model'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures')
const PDFS_DIR = path.resolve(__dirname, '../pdfs')

const SETS: Record<string, string[]> = {
  '1': [
    'gov-financial-disclosure-2.json',
    'legal-personal-injury-lloyd.json',
    'medical-wcab-lemieux.json',
    'resume-collection-ucdavis.json',
    'academic-paper-arxiv.json',
    'legal-complaint-maher.json',
    'legal-complaint-alayande.json',
  ],
  '2': [
    'gov-financial-disclosure-1.json',
    'legal-echr-judgment.json',
    'medical-wcab-braaten.json',
    'medical-autopsy-floyd.json',
    'court-federal-filing.json',
    'finance-loan-application-1003.json',
    'legal-complaint-grothe.json',
    'legal-complaint-wajid.json',
  ],
}
const fixtureFiles = SETS[testSet()]

interface FixtureItem {
  value: string
  type: string
}

interface Fixture {
  source: string
  pii: FixtureItem[]
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
const overlaps = (a: string, b: string) => a.includes(b) || b.includes(a)
const hasWholeWord = (text: string, v: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}_])${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`, 'u').test(text)

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

      const entities = await page.evaluate(
        () => (window as Window & { __cloakEntities?: { value: string; approved: boolean }[] }).__cloakEntities ?? []
      )
      const originalText = norm(await extractText(pdfPath))
      const expected = fixture.pii.map((p) => norm(p.value))
      const detected = [...new Set(entities.filter((e) => e.approved).map((e) => norm(e.value)))].filter(
        (v) => hasWholeWord(originalText, v)
      )
      const false_positives = detected.filter((v) => !expected.some((p) => overlaps(v, p)))
      const false_positive_rate = detected.length > 0 ? false_positives.length / detected.length : 0

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

      const normalised = norm(extractedText)
      const redacted: string[] = []
      const missed: string[] = []

      for (const item of fixture.pii) {
        if (hasWholeWord(normalised, norm(item.value))) {
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
            detected_count: detected.length,
            false_positives,
            false_positive_rate,
            errors: jsErrors,
          })
        ),
      })
    })
  }
})
