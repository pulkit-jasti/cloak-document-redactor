import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { useOllama } from '@/context/OllamaContext'
import { OLLAMA_HOST, getOllamaPort, parseOllamaPort, setOllamaPort } from '@/lib/ollamaClient'
import Modal from '@/components/Modal'

const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Win')
const origin = typeof window !== 'undefined' ? window.location.origin : ''
const COMMAND = isWindows
  ? `$env:OLLAMA_ORIGINS="${origin}"; ollama serve`
  : `OLLAMA_ORIGINS=${origin} ollama serve`

export function CopyButton({ text }: { text: string }) {
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
  const [portInput, setPortInput] = useState(() => String(getOllamaPort()))
  const portInputRef = useRef<HTMLInputElement>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setAdvancedOpen(false)
      setError(null)
      setPortInput(String(getOllamaPort()))
    }
  }

  const port = parseOllamaPort(portInput)
  const portError =
    port !== null ? null : portInput === '' ? 'Enter a port number.' : 'Port must be between 1 and 65535.'

  const handlePortChange = (value: string) => {
    // Digits only, without leading zeros ("080" becomes "80").
    setPortInput(value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))
    setError(null)
  }

  const handleConnect = async () => {
    setError(null)
    if (port === null) {
      // The port field may be collapsed; open it so the problem is visible.
      setAdvancedOpen(true)
      // Wait a frame: the field can't take focus until the panel is no longer inert.
      requestAnimationFrame(() => portInputRef.current?.focus())
      return
    }
    setOllamaPort(port)
    const status = await recheck()
    if (status === 'available') {
      onConnected()
    } else {
      setError("Couldn't connect to Ollama. Make sure the command above is running and the port is correct.")
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Connect Ollama">
      <div className="flex flex-col gap-5 p-6 text-left">
        <Link
          to="/ollama"
          onClick={onClose}
          className="group flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:bg-muted"
        >
          <span>
            <span className="font-medium">New to Ollama?</span>{' '}
            <span className="text-muted-foreground">Read the setup guide</span>
          </span>
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>

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
                <label htmlFor="ollama-port" className="text-sm font-medium">
                  Ollama address
                </label>
                <div
                  className={`flex w-fit items-center rounded-lg border bg-background font-mono text-xs transition-colors ${
                    portError ? 'border-red-500/60' : 'focus-within:border-foreground/40'
                  }`}
                >
                  <span className="select-none py-2 pl-3 text-muted-foreground">{OLLAMA_HOST}:</span>
                  <input
                    ref={portInputRef}
                    id="ollama-port"
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    aria-label="Port"
                    aria-invalid={portError !== null}
                    aria-describedby={portError ? 'ollama-port-error' : undefined}
                    value={portInput}
                    onChange={(e) => handlePortChange(e.target.value)}
                    spellCheck={false}
                    className="w-[7.5ch] bg-transparent py-2 pr-3 outline-none"
                  />
                </div>
                {portError && (
                  <p id="ollama-port-error" className="text-xs text-red-700 dark:text-red-400">
                    {portError}
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
