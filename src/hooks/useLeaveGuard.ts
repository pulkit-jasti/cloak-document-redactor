import { useCallback, useEffect, useRef } from 'react'
import { useBlocker, type Location } from 'react-router-dom'

export function useLeaveGuard(getMessage: (next: Location) => string | null) {
  const bypassRef = useRef(false)
  const getMessageRef = useRef(getMessage)

  useEffect(() => {
    getMessageRef.current = getMessage
  })

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !bypassRef.current &&
      currentLocation.pathname !== nextLocation.pathname &&
      getMessageRef.current(nextLocation) !== null,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    const message = getMessageRef.current(blocker.location)
    if (!message || window.confirm(message)) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return useCallback(() => {
    bypassRef.current = true
  }, [])
}
