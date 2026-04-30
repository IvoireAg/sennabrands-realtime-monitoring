'use client'

import type { ReactNode } from 'react'
import { PresentationProvider } from '@/components/presentation/PresentationProvider'
import { AnnotationsProvider } from '@/components/annotations/AnnotationsContext'

export function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <PresentationProvider>
      <AnnotationsProvider>{children}</AnnotationsProvider>
    </PresentationProvider>
  )
}
