'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useAnnotations } from './AnnotationsContext'
import { Card, CardBody, CardEyebrow, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function AnnotationsManager() {
  const { annotations, add, remove, clear } = useAnnotations()
  const [hour, setHour] = useState('')
  const [minute, setMinute] = useState('')
  const [label, setLabel] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const h = parseInt(hour, 10)
    if (Number.isNaN(h) || h < 0 || h > 23) return
    if (!label.trim()) return
    const m = minute === '' ? undefined : parseInt(minute, 10)
    add({ hour: h, minute: m && m >= 0 && m <= 59 ? m : undefined, label: label.trim() })
    setHour('')
    setMinute('')
    setLabel('')
  }

  const sorted = [...annotations].sort((a, b) => {
    const ah = a.hour * 60 + (a.minute ?? 0)
    const bh = b.hour * 60 + (b.minute ?? 0)
    return ah - bh
  })

  return (
    <Card>
      <CardHeader>
        <div>
          <CardEyebrow>Anotações</CardEyebrow>
          <CardTitle className="mt-1 text-base">Marcadores do evento</CardTitle>
        </div>
        {annotations.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="t-eyebrow text-ivo-stone-300 hover:text-ivo-yellow transition-colors"
          >
            limpar
          </button>
        )}
      </CardHeader>
      <CardBody>
        <form onSubmit={submit} className="flex items-end gap-2 mb-4 flex-wrap">
          <div>
            <label className="t-eyebrow text-ivo-stone-300 text-[10px] block mb-1">hora (0-23)</label>
            <input
              type="number"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(e.target.value)}
              placeholder="14"
              className="bg-ivo-ink border border-ivo-graphite text-ivo-ivory text-sm font-title px-2 py-1.5 w-16 rounded-sm focus:border-ivo-yellow outline-none"
            />
          </div>
          <div>
            <label className="t-eyebrow text-ivo-stone-300 text-[10px] block mb-1">min (opc)</label>
            <input
              type="number"
              min={0}
              max={59}
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              placeholder="30"
              className="bg-ivo-ink border border-ivo-graphite text-ivo-ivory text-sm font-title px-2 py-1.5 w-16 rounded-sm focus:border-ivo-yellow outline-none"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="t-eyebrow text-ivo-stone-300 text-[10px] block mb-1">descrição</label>
            <input
              type="text"
              maxLength={60}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="atração X começou"
              className="bg-ivo-ink border border-ivo-graphite text-ivo-ivory text-sm font-title px-2 py-1.5 w-full rounded-sm focus:border-ivo-yellow outline-none"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-ivo-yellow text-ivo-ink text-sm font-title font-bold rounded-sm hover:opacity-90"
          >
            <Plus size={14} strokeWidth={2} />
            adicionar
          </button>
        </form>

        {sorted.length === 0 ? (
          <p className="text-ivo-stone-500 text-xs font-title">
            nenhum marcador. adicione horários do evento (atrações, intervalos) pra vê-los sobre o gráfico das últimas 12h.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((a) => {
              const time = `${String(a.hour).padStart(2, '0')}:${String(a.minute ?? 0).padStart(2, '0')}`
              return (
                <li key={a.id} className="flex items-center justify-between text-sm font-title gap-3 group">
                  <span className="flex items-center gap-3">
                    <span className="t-numeric text-ivo-yellow text-base">{time}</span>
                    <span className="text-ivo-ivory truncate">{a.label}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    className="text-ivo-stone-500 hover:text-ivo-yellow transition-opacity opacity-0 group-hover:opacity-100"
                    title="remover"
                  >
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
      <CardFooter>armazenado neste navegador (localStorage)</CardFooter>
    </Card>
  )
}
