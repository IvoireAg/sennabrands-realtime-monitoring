'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { fmtInt, fmtPct } from '@/lib/format'
import { cn } from '@/lib/utils'

type PulseResponse = {
  hour: number
  date: string
  yesterdayDate: string
  now: { sessions: number; users: number; pageviews: number }
  yesterday: { sessions: number; users: number; pageviews: number }
  delta: {
    sessions: number | null
    users: number | null
    pageviews: number | null
  }
  fetchedAt: string
}

const POLL_MS = 60_000
const RATE_LIMIT_FALLBACK_MS = 60_000

export function PulseStrip() {
  const [data, setData] = useState<PulseResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())
  const [nextPollAt, setNextPollAt] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function fetchOnce() {
      try {
        const res = await fetch('/api/pulse', {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (cancelled) return
        if (res.status === 429) {
          const body = (await res.json().catch(() => ({}))) as {
            retryAfterMs?: number
          }
          if (cancelled) return
          const wait = body.retryAfterMs ?? RATE_LIMIT_FALLBACK_MS
          setRetryAt(Date.now() + wait)
          setError(null)
          timer = setTimeout(fetchOnce, wait)
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as PulseResponse
        if (cancelled) return
        setData(json)
        setError(null)
        setRetryAt(null)
        setNextPollAt(Date.now() + POLL_MS)
        timer = setTimeout(fetchOnce, POLL_MS)
      } catch (e) {
        if (cancelled) return
        if (e instanceof DOMException && e.name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'erro desconhecido')
        timer = setTimeout(fetchOnce, POLL_MS)
      }
    }
    fetchOnce()
    return () => {
      cancelled = true
      controller.abort()
      if (timer) clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const secondsToNext = nextPollAt
    ? Math.max(0, Math.ceil((nextPollAt - now) / 1000))
    : null
  const retryIn = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0

  return (
    <div className="bg-ivo-coal border border-ivo-graphite rounded-sm px-5 py-3">
      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-baseline gap-3 shrink-0">
          <span className="t-eyebrow text-ivo-stone-300">
            pulse — hora atual vs ontem
          </span>
          {data && (
            <span className="text-xs text-ivo-stone-500 font-title">
              {String(data.hour).padStart(2, '0')}h
            </span>
          )}
        </div>

        {!data && !error && !retryAt && (
          <span className="text-xs text-ivo-stone-300 font-title">
            carregando pulse…
          </span>
        )}
        {error && !data && (
          <span className="text-xs text-ivo-yellow font-title">erro: {error}</span>
        )}
        {retryAt && !data && (
          <span className="text-xs text-ivo-yellow font-title">
            limite GA4 — próxima em {retryIn}s
          </span>
        )}

        {data && (
          <div className="flex items-center gap-6 flex-wrap">
            <PulseMetric
              label="Sessões"
              current={data.now.sessions}
              delta={data.delta.sessions}
            />
            <PulseMetric
              label="Usuários"
              current={data.now.users}
              delta={data.delta.users}
            />
            <PulseMetric
              label="Pageviews"
              current={data.now.pageviews}
              delta={data.delta.pageviews}
            />
          </div>
        )}

        <div className="text-right shrink-0 min-w-[80px]">
          {secondsToNext !== null && (
            <span className="text-[10px] text-ivo-stone-500 font-title">
              próx. em {secondsToNext}s
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function PulseMetric({
  label,
  current,
  delta,
}: {
  label: string
  current: number
  delta: number | null
}) {
  const positive = delta !== null && delta > 0
  const negative = delta !== null && delta < 0
  const Icon = positive ? ArrowUp : negative ? ArrowDown : Minus
  const colorClass = positive
    ? 'text-ivo-yellow'
    : negative
      ? 'text-ivo-ivory'
      : 'text-ivo-stone-300'
  return (
    <div className="flex items-center gap-2.5">
      <div>
        <div className="t-eyebrow text-ivo-stone-300 text-[10px]">{label}</div>
        <div className="t-numeric text-ivo-ivory text-lg leading-none mt-0.5">
          {fmtInt(current)}
        </div>
      </div>
      <div
        className={cn(
          'flex items-center gap-0.5 font-title text-sm font-bold',
          colorClass,
        )}
      >
        <Icon size={12} strokeWidth={2.5} />
        {delta !== null ? fmtPct(Math.abs(delta)) : '—'}
      </div>
    </div>
  )
}
