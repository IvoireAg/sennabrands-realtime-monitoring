'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

const DATASETS = [
  { key: 'traffic', label: 'Tráfego (diário)' },
  { key: 'traffic_30min', label: 'Tráfego (30min, live · até 7d)' },
  { key: 'acquisition', label: 'Aquisição' },
  { key: 'demographics', label: 'Demografia' },
  { key: 'events', label: 'Eventos' },
  { key: 'pages', label: 'Páginas' },
] as const

export function ExportCSVButton() {
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState(30)

  function download(dataset: string) {
    const url = `/api/export?dataset=${dataset}&days=${days}`
    window.open(url, '_blank')
    setOpen(false)
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-2 border border-ivo-graphite text-ivo-stone-300 hover:text-ivo-yellow hover:border-ivo-yellow transition-colors text-xs font-title rounded-sm"
        title="Exportar dados em CSV"
      >
        <Download size={14} strokeWidth={1.5} />
        <span className="hidden md:inline">exportar CSV</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-ivo-coal border border-ivo-graphite rounded-sm shadow-xl min-w-[220px] p-3">
          <div className="t-eyebrow text-ivo-stone-300 mb-2">janela (dias)</div>
          <div className="flex gap-1 mb-3">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-2 py-1 text-xs font-title rounded-sm border ${
                  days === d
                    ? 'bg-ivo-yellow text-ivo-ink border-ivo-yellow font-bold'
                    : 'border-ivo-graphite text-ivo-stone-300 hover:border-ivo-yellow'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <div className="t-eyebrow text-ivo-stone-300 mb-2">dataset</div>
          <ul className="space-y-1">
            {DATASETS.map((ds) => (
              <li key={ds.key}>
                <button
                  type="button"
                  onClick={() => download(ds.key)}
                  className="w-full text-left text-sm font-title text-ivo-ivory hover:text-ivo-yellow px-2 py-1 rounded-sm transition-colors"
                >
                  {ds.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
