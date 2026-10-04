export function testModel(): string {
  return process.env.VITE_MODEL?.trim() || 'pii-redactor-small'
}

export function isOllamaTest(): boolean {
  return testModel().startsWith('ollama:')
}

export function testModelStorage(): { name: string; value: string }[] {
  const model = testModel()
  return isOllamaTest()
    ? [{ name: 'cloak:ollama:model', value: model.slice('ollama:'.length) }]
    : [{ name: 'cloak:ner:model', value: model }]
}

export function testSet(): string {
  return process.env.VITE_TEST_SET?.trim() || '1'
}
