export const OLLAMA_TITLE = 'Ollama Setup | Use a Local AI with Cloak'
export const OLLAMA_DESCRIPTION =
  'Connect Ollama to Cloak and describe what to redact in plain English. Step by step setup for Mac, Windows and Linux. The AI runs on your own computer.'

// The origin Ollama must allow. Pre-rendered pages use the live site; the page swaps in
// the current origin in the browser so the commands also work on localhost.
export const SITE_ORIGIN = 'https://cloakdoc.app'

// Update this when a newer model is tested and works better.
export const RECOMMENDED_MODEL = {
  name: 'gpt-oss:20b',
  download: 'about 14 GB',
  memory: '16 GB of memory (RAM)',
}

export const OLLAMA_LINKS = {
  download: 'https://ollama.com/download',
  faq: 'https://docs.ollama.com/faq',
}

export const startCommands = (origin: string) => ({
  unix: `OLLAMA_ORIGINS=${origin} ollama serve`,
  windows: `$env:OLLAMA_ORIGINS="${origin}"; ollama serve`,
})

export const SSH_COMMAND = 'ssh -L 11435:localhost:11434 you@other-computer'

export const TROUBLESHOOTING: { q: string; a: string }[] = [
  {
    q: '"Couldn\'t connect to Ollama"',
    a: 'Ollama is not running, it is on a different port, or it was started without the OLLAMA_ORIGINS setting. The most common cause is the Ollama app still running in the menu bar or system tray. Quit it there, then run the start command again. To check that Ollama is running at all, open http://localhost:11434 in a new tab. It should say "Ollama is running".',
  },
  {
    q: 'The AI switch doesn\'t show up',
    a: 'Plain-English instructions need a model with at least 8 billion parameters. Smaller models are skipped. Pull the recommended model, then reconnect Ollama.',
  },
]
