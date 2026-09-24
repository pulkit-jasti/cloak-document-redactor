import http from 'http'

function checkServer(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    http.get(url, () => resolve(true)).on('error', () => resolve(false))
  })
}

export default async function globalSetup() {
  const [appUp, modelServerUp] = await Promise.all([
    checkServer('http://localhost:5173'),
    checkServer('http://localhost:8080'),
  ])

  if (!appUp) {
    console.error('Dev server not running. Start it with: npm run dev')
    process.exit(1)
  }
  if (!modelServerUp) {
    console.error('Model server not running. Start it with: npm run models')
    process.exit(1)
  }
}
