'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type Annotation = {
  id: string
  hour: number // 0-23
  minute?: number // 0-59 (opcional)
  label: string
  createdAt: string
}

type Ctx = {
  annotations: Annotation[]
  add: (a: Omit<Annotation, 'id' | 'createdAt'>) => void
  remove: (id: string) => void
  clear: () => void
}

const AnnotationsContext = createContext<Ctx | null>(null)
const STORAGE_KEY = 'senna-annotations-v1'

function loadFromStorage(): Annotation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Annotation[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveToStorage(annotations: Annotation[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations))
  } catch {
    // ignore quota
  }
}

export function AnnotationsProvider({ children }: { children: ReactNode }) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setAnnotations(loadFromStorage())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveToStorage(annotations)
  }, [annotations, hydrated])

  const add = useCallback((a: Omit<Annotation, 'id' | 'createdAt'>) => {
    setAnnotations((prev) => [
      ...prev,
      {
        ...a,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      },
    ])
  }, [])

  const remove = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const clear = useCallback(() => setAnnotations([]), [])

  return (
    <AnnotationsContext.Provider value={{ annotations, add, remove, clear }}>
      {children}
    </AnnotationsContext.Provider>
  )
}

export function useAnnotations(): Ctx {
  const ctx = useContext(AnnotationsContext)
  if (!ctx) throw new Error('useAnnotations must be used within AnnotationsProvider')
  return ctx
}
