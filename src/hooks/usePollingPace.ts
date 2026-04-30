'use client'

import { useCallback, useEffect, useRef } from 'react'

type Options = {
  activeMs: number
  idleMs: number
  idleThresholdMs?: number
}

type Pace = {
  getNextDelay: () => number | null
  onVisible: (cb: () => void) => () => void
}

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'scroll', 'touchstart'] as const

export function usePollingPace({
  activeMs,
  idleMs,
  idleThresholdMs = 60_000,
}: Options): Pace {
  const visibleRef = useRef<boolean>(true)
  const lastActivityRef = useRef<number>(0)
  const subsRef = useRef<Set<() => void>>(new Set())

  useEffect(() => {
    visibleRef.current =
      typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
    lastActivityRef.current = Date.now()

    function onVis() {
      const now = document.visibilityState === 'visible'
      const becomingVisible = !visibleRef.current && now
      visibleRef.current = now
      if (becomingVisible) {
        lastActivityRef.current = Date.now()
        subsRef.current.forEach((cb) => cb())
      }
    }
    function bump() {
      lastActivityRef.current = Date.now()
    }

    document.addEventListener('visibilitychange', onVis)
    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, bump, { passive: true } as AddEventListenerOptions),
    )

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, bump))
    }
  }, [])

  const getNextDelay = useCallback((): number | null => {
    if (!visibleRef.current) return null
    const idle = Date.now() - lastActivityRef.current > idleThresholdMs
    return idle ? idleMs : activeMs
  }, [activeMs, idleMs, idleThresholdMs])

  const onVisible = useCallback((cb: () => void) => {
    subsRef.current.add(cb)
    return () => {
      subsRef.current.delete(cb)
    }
  }, [])

  return { getNextDelay, onVisible }
}
