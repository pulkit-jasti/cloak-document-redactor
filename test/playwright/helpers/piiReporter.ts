import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter'
import { writeResults, readModelId, type PdfResult } from '../helpers/results'

export default class PiiReporter implements Reporter {
  private results: PdfResult[] = []
  private modelId = readModelId()

  onTestEnd(test: TestCase, result: TestResult) {
    if (test.parent.title !== 'PII detection report') return

    const attachment = result.attachments.find((a) => a.name === 'pii-result')
    if (!attachment?.body) return

    const pdfResult: PdfResult = { ...JSON.parse(attachment.body.toString()), duration_ms: result.duration }
    this.results.push(pdfResult)
  }

  onEnd(_result: FullResult) {
    if (this.results.length === 0) return

    const totals = this.results.reduce(
      (acc, r) => ({
        fixture_items: acc.fixture_items + r.fixture_count,
        redacted: acc.redacted + r.redacted.length,
        missed: acc.missed + r.missed.length,
        catch_rate: 0,
        detected: acc.detected + r.detected_count,
        false_positives: acc.false_positives + r.false_positives.length,
        false_positive_rate: 0,
        duration_ms: acc.duration_ms + r.duration_ms,
      }),
      { fixture_items: 0, redacted: 0, missed: 0, catch_rate: 0, detected: 0, false_positives: 0, false_positive_rate: 0, duration_ms: 0 }
    )
    totals.catch_rate = totals.fixture_items > 0 ? totals.redacted / totals.fixture_items : 0
    totals.false_positive_rate = totals.detected > 0 ? totals.false_positives / totals.detected : 0

    writeResults({
      totals,
      model: { id: this.modelId },
      timestamp: new Date().toISOString(),
      pdfs: this.results,
    })
  }
}
