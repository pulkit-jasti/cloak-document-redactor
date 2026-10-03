import http from 'http'
import { isOllamaTest, testModel } from './helpers/model'

function checkServer(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    http.get(url, () => resolve(true)).on('error', () => resolve(false))
  })
}

export default async function globalSetup() {
  const isOllama = isOllamaTest()

  const checks: Promise<boolean>[] = [
    checkServer('http://localhost:5173'),
    isOllama ? Promise.resolve(true) : checkServer('http://localhost:8080'),
  ]

  if (isOllama) {
    checks.push(checkServer('http://localhost:11434'))
  }

  const [appUp, modelServerUp, ollamaUp] = await Promise.all(checks)

  if (!appUp) {
    console.error('Dev server not running. Start it with: npm run dev')
    process.exit(1)
  }
  if (!isOllama && !modelServerUp) {
    console.error('Model server not running. Start it with: npm run models')
    process.exit(1)
  }
  if (isOllama && !ollamaUp) {
    const model = testModel().slice('ollama:'.length)
    console.error(`Ollama not running. Start it with: OLLAMA_ORIGINS=${process.env.npm_lifecycle_script ?? '<app-origin>'} ollama serve`)
    console.error(`Make sure model "${model}" is pulled: ollama pull ${model}`)
    process.exit(1)
  }
}
