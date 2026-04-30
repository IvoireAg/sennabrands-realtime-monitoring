'use client'

import { PresentationToggle } from '@/components/presentation/PresentationToggle'
import { SnapshotButton } from '@/components/snapshot/SnapshotButton'
import { ExportCSVButton } from '@/components/export/ExportCSVButton'

export function Toolbar() {
  return (
    <div className="flex items-center gap-2">
      <PresentationToggle />
      <SnapshotButton />
      <ExportCSVButton />
    </div>
  )
}
