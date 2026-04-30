'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type PresentationContextValue = {
  isPresenting: boolean
  toggle: () => void
}

const PresentationContext = createContext<PresentationContextValue | null>(null)

export function PresentationProvider({ children }: { children: ReactNode }) {
  const [isPresenting, setIsPresenting] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.presenting = isPresenting ? 'true' : 'false'
    return () => {
      document.documentElement.dataset.presenting = 'false'
    }
  }, [isPresenting])

  // Tecla F (sem modificadores) toggles, ESC sai
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const editable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true
      if (editable) return
      if (e.key === 'f' || e.key === 'F') {
        if (e.metaKey || e.ctrlKey || e.altKey) return
        e.preventDefault()
        setIsPresenting((v) => !v)
      } else if (e.key === 'Escape' && isPresenting) {
        setIsPresenting(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPresenting])

  const toggle = () => setIsPresenting((v) => !v)

  return (
    <PresentationContext.Provider value={{ isPresenting, toggle }}>
      {children}
    </PresentationContext.Provider>
  )
}

export function usePresentation() {
  const ctx = useContext(PresentationContext)
  if (!ctx) throw new Error('usePresentation must be used within PresentationProvider')
  return ctx
}
