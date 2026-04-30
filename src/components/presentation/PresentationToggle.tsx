'use client'

import { Maximize2, Minimize2 } from 'lucide-react'
import { usePresentation } from './PresentationProvider'

export function PresentationToggle() {
  const { isPresenting, toggle } = usePresentation()
  const Icon = isPresenting ? Minimize2 : Maximize2
  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 px-3 py-2 border border-ivo-graphite text-ivo-stone-300 hover:text-ivo-yellow hover:border-ivo-yellow transition-colors text-xs font-title rounded-sm"
      title={isPresenting ? 'Sair (ESC ou F)' : 'Modo apresentação (F)'}
    >
      <Icon size={14} strokeWidth={1.5} />
      <span className="hidden md:inline">{isPresenting ? 'sair' : 'apresentação'}</span>
      <kbd className="hidden lg:inline text-[10px] text-ivo-stone-500 font-mono">F</kbd>
    </button>
  )
}
