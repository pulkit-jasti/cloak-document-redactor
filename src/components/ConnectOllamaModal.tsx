import { useState } from 'react'
import { useOllama } from '@/context/OllamaContext'
import Modal from '@/components/Modal'

const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Win')
const origin = typeof window !== 'undefined' ? window.location.origin : ''
const COMMAND = isWindows
  ? `$env:OLLAMA_ORIGINS="${origin}"; ollama serve`
  : `OLLAMA_ORIGINS=${origin} ollama serve`

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="shrink-0 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

interface ConnectOllamaModalProps {
  open: boolean
  onClose: () => void
  onConnected: () => void
}

export function ConnectOllamaModal({ open, onClose, onConnected }: ConnectOllamaModalProps) {
  const { recheck, isChecking } = useOllama()
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setError(null)
    const status = await recheck()
    if (status === 'available') {
      onConnected()
    } else {
      setError("Couldn't connect. Make sure the command is running in your terminal.")
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Connect Ollama">
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">
          Run this command in your terminal to start Ollama with access to this app:
        </p>

        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2.5">
          <code className="flex-1 text-xs font-mono">{COMMAND}</code>
          <CopyButton text={COMMAND} />
        </div>

        <p className="text-xs text-muted-foreground">
          If Ollama is already running, stop it first then run the command above.
          Once running, click below to verify the connection.
        </p>

        <div className="flex flex-col gap-2">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={handleConnect}
            disabled={isChecking}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? 'Connecting...' : 'Connect now'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
