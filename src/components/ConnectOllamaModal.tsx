import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useOllama } from '@/context/OllamaContext'
import { getOllamaUrl, isLocalOllamaUrl, setOllamaUrl } from '@/lib/ollamaClient'
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
      className="shrink-0 text-xs px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors"
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
  const [address, setAddress] = useState(getOllamaUrl)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setAdvancedOpen(false)
      setError(null)
      setAddress(getOllamaUrl())
    }
  }

  const isLocal = isLocalOllamaUrl(address)

  const handleConnect = async () => {
    setError(null)
    setOllamaUrl(address)
    const status = await recheck()
    if (status === 'available') {
      onConnected()
    } else {
      setError("Couldn't connect to Ollama. Make sure the command above is running and the address is correct.")
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Connect Ollama">
      <div className="flex flex-col gap-5 p-6 text-left">
        <p className="text-sm text-muted-foreground">
          Run this command in your terminal to start Ollama with access to this app:
        </p>

        <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
          <code className="flex-1 text-xs font-mono">{COMMAND}</code>
          <CopyButton text={COMMAND} />
        </div>

        <p className="text-sm text-muted-foreground">
          If Ollama is already running, stop it first then run the command above.
          Once running, click below to verify the connection.
        </p>

        <div>
          <button
            type="button"
            aria-expanded={advancedOpen}
            aria-controls="ollama-advanced"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={`size-4 transition-transform duration-300 ease-out ${advancedOpen ? '' : '-rotate-90'}`}
              aria-hidden
            />
            Advanced settings
          </button>
          <div
            id="ollama-advanced"
            inert={!advancedOpen}
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
              advancedOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-col gap-2 pt-3">
                <label htmlFor="ollama-address" className="text-sm font-medium">
                  Ollama address
                </label>
                <input
                  id="ollama-address"
                  type="url"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  spellCheck={false}
                  className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs outline-none transition-colors focus-visible:border-foreground/40"
                />
                {!isLocal && (
                  <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    This address points to another machine. Your document text will be sent there, so only use a server you
                    trust. It also needs to use https, or your browser will block it.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-1">
          {error && (
            <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <button
            onClick={handleConnect}
            disabled={isChecking}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? 'Connecting...' : 'Connect now'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
