import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, WifiOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000
const OFFLINE_READY_DURATION = 6000

// Reloading here would throw away the document the user is working on.
const NO_RELOAD_PATHS = ['/edit', '/preview']

// Checks for a new version every hour, so tabs left open for a long time still find updates.
function scheduleUpdateChecks(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
  if (!registration) return
  setInterval(async () => {
    if (registration.installing || !navigator.onLine) return
    const res = await fetch(swUrl, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } }).catch(() => null)
    if (res?.status === 200) await registration.update()
  }, UPDATE_CHECK_INTERVAL)
}

function Toast({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-xl border bg-background py-2.5 pl-4 pr-2.5 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      {children}
    </div>
  )
}

export default function PwaToast() {
  const { pathname } = useLocation()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({ onRegisteredSW: scheduleUpdateChecks })

  useEffect(() => {
    if (!offlineReady) return
    const t = setTimeout(() => setOfflineReady(false), OFFLINE_READY_DURATION)
    return () => clearTimeout(t)
  }, [offlineReady, setOfflineReady])

  // A waiting update stays hidden on /edit and /preview and shows once the user is back elsewhere.
  if (needRefresh && !NO_RELOAD_PATHS.includes(pathname)) {
    return (
      <Toast icon={<RefreshCw className="size-4" aria-hidden />}>
        <span>A new version of Cloak is available.</span>
        <Button size="sm" onClick={() => updateServiceWorker(true)}>
          Reload
        </Button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </Toast>
    )
  }

  if (offlineReady) {
    return (
      <Toast icon={<WifiOff className="size-4" aria-hidden />}>
        <span>Cloak is ready to work offline.</span>
        <Button size="sm" variant="ghost" onClick={() => setOfflineReady(false)}>
          OK
        </Button>
      </Toast>
    )
  }

  return null
}
