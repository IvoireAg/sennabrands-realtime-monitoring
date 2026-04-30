'use client'

import { useState } from 'react'
import { Camera } from 'lucide-react'

export function SnapshotButton() {
  const [busy, setBusy] = useState(false)

  async function snap() {
    if (busy) return
    setBusy(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const target = document.getElementById('dashboard-snapshot-root') ?? document.body
      const canvas = await html2canvas(target, {
        backgroundColor: '#1C1C1C',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      const today = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
      link.href = dataUrl
      link.download = `senna-dashboard-${today}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error('[snapshot] failed:', e)
      alert('erro ao gerar snapshot — veja console do navegador')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={snap}
      disabled={busy}
      className="inline-flex items-center gap-2 px-3 py-2 border border-ivo-graphite text-ivo-stone-300 hover:text-ivo-yellow hover:border-ivo-yellow transition-colors text-xs font-title rounded-sm disabled:opacity-50"
      title="Capturar PNG do dashboard"
    >
      <Camera size={14} strokeWidth={1.5} />
      <span className="hidden md:inline">{busy ? 'gerando…' : 'snapshot'}</span>
    </button>
  )
}
