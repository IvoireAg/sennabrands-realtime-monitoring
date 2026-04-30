'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardBody,
  CardEyebrow,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { fmtInt, fmtRelativeTime } from '@/lib/format'
import { rechartsTooltipStyle } from '@/lib/chart-theme'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAnnotations } from '@/components/annotations/AnnotationsContext'
import { usePollingPace } from '@/hooks/usePollingPace'

type Point = {
  dateHour: string
  sessions: number
  users: number
  pageviews: number
}
type Response = { points: Point[]; fetchedAt: string }

const POLL_ACTIVE_MS = 30_000
const POLL_IDLE_MS = 90_000
const RATE_LIMIT_FALLBACK_MS = 60_000

function formatHourLabel(dateHour: string): string {
  if (dateHour.length < 10) return dateHour
  return `${dateHour.slice(8, 10)}h`
}

export function RecentFlowChart() {
  const [data, setData] = useState<Response | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())
  const [nextPollAt, setNextPollAt] = useState<number | null>(null)
  const { annotations } = useAnnotations()
  const { getNextDelay, onVisible } = usePollingPace({
    activeMs: POLL_ACTIVE_MS,
    idleMs: POLL_IDLE_MS,
  })

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let backoff = POLL_ACTIVE_MS

    function scheduleNext(fallbackMs: number) {
      const delay = getNextDelay()
      if (delay === null) {
        setNextPollAt(null)
        return
      }
      const realDelay = delay > 0 ? delay : fallbackMs
      setNextPollAt(Date.now() + realDelay)
      timer = setTimeout(fetchOnce, realDelay)
    }

    async function fetchOnce() {
      try {
        const res = await fetch('/api/recent-flow', {
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
          setLoading(false)
          backoff = POLL_ACTIVE_MS
          timer = setTimeout(fetchOnce, wait)
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as Response
        if (cancelled) return
        setData(json)
        setError(null)
        setRetryAt(null)
        setLoading(false)
        backoff = POLL_ACTIVE_MS
        scheduleNext(POLL_ACTIVE_MS)
      } catch (e) {
        if (cancelled) return
        if (e instanceof DOMException && e.name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'erro desconhecido')
        setLoading(false)
        backoff = Math.min(backoff * 2, 90_000)
        scheduleNext(backoff)
      }
    }
    fetchOnce()
    const unsubVis = onVisible(() => {
      if (cancelled) return
      if (timer) clearTimeout(timer)
      fetchOnce()
    })
    return () => {
      cancelled = true
      controller.abort()
      if (timer) clearTimeout(timer)
      unsubVis()
    }
  }, [getNextDelay, onVisible])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const series = (data?.points ?? []).map((p) => ({
    ...p,
    label: formatHourLabel(p.dateHour),
  }))
  const total = series.reduce((s, p) => s + p.sessions, 0)
  const peak = series.reduce((m, p) => Math.max(m, p.sessions), 0)
  const empty = series.length === 0

  // Annotations que caem dentro da janela mostrada (últimas 12h)
  const visibleHours = new Set(series.map((p) => p.label))
  const visibleAnnotations = annotations.filter((a) => {
    const label = `${String(a.hour).padStart(2, '0')}h`
    return visibleHours.has(label)
  })

  const secondsToNext = nextPollAt
    ? Math.max(0, Math.ceil((nextPollAt - now) / 1000))
    : null
  const retryIn = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0

  return (
    <Card>
      {retryAt && data && (
        <div className="px-4 py-2 border-b border-ivo-yellow/40 bg-ivo-coal text-xs font-title flex items-center justify-between gap-3">
          <span className="t-eyebrow text-ivo-yellow">limite GA4 — modo cacheado</span>
          <span className="text-ivo-stone-300">
            mostrando última leitura · próxima em{' '}
            <span className="t-numeric text-ivo-ivory">{retryIn}s</span>
          </span>
        </div>
      )}
      <CardHeader>
        <div>
          <CardEyebrow>Últimas 12 horas · 1h por ponto</CardEyebrow>
          <CardTitle className="mt-1">Fluxo de usuários</CardTitle>
        </div>
        <div className="text-right">
          <div className="t-eyebrow text-ivo-stone-300">pico no período</div>
          <div className="t-numeric text-ivo-yellow text-lg">{fmtInt(peak)}</div>
        </div>
      </CardHeader>
      <CardBody>
        {loading && !data && (
          <p className="text-ivo-stone-300 text-sm font-title text-center py-12">
            Carregando últimas 12h…
          </p>
        )}
        {error && !data && (
          <p className="text-ivo-yellow text-sm font-title py-8">erro: {error}</p>
        )}
        {retryAt && !data && (
          <div className="py-8">
            <div className="t-eyebrow text-ivo-yellow mb-1">limite GA4 atingido</div>
            <p className="font-body text-ivo-stone-300 text-sm">
              Próxima tentativa em{' '}
              <span className="t-numeric text-ivo-ivory">{retryIn}s</span>.
            </p>
          </div>
        )}
        {data && !empty && (
          <div className="h-56 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="recentFlowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFF02" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#FFFF02" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#3E3E3E" strokeDasharray="0" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#999999"
                  tick={{ fill: '#999999', fontSize: 11, fontFamily: 'var(--ivo-font-title)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#999999"
                  tick={{ fill: '#999999', fontSize: 11, fontFamily: 'var(--ivo-font-title)' }}
                  tickFormatter={(v: number) => fmtInt(v)}
                  width={56}
                />
                <Tooltip
                  contentStyle={rechartsTooltipStyle}
                  formatter={(value, name) => [fmtInt(Number(value)), String(name ?? '')]}
                  labelFormatter={(label) => `hora: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  name="Sessões"
                  stroke="#FFFF02"
                  strokeWidth={2}
                  fill="url(#recentFlowGrad)"
                  isAnimationActive={false}
                />
                {visibleAnnotations.map((a) => {
                  const xLabel = `${String(a.hour).padStart(2, '0')}h`
                  return (
                    <ReferenceLine
                      key={a.id}
                      x={xLabel}
                      stroke="#FFFF02"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      label={{
                        value: a.label,
                        position: 'top',
                        fill: '#FFFF02',
                        fontSize: 10,
                        fontFamily: 'var(--ivo-font-title)',
                      }}
                    />
                  )
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {data && empty && (
          <p className="text-ivo-stone-500 text-sm font-title py-8 text-center">
            Nenhum dado nas últimas 12h. Aguardando GA4.
          </p>
        )}
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4 flex-wrap">
        <span>
          fonte: GA4 · dateHour · cache 30s · poll adaptativo
          {visibleAnnotations.length > 0 && ` · ${visibleAnnotations.length} marcador(es)`}
        </span>
        <span className="flex items-center gap-3">
          {data && <span>total {fmtInt(total)} sessões</span>}
          {data && <span>sync {fmtRelativeTime(data.fetchedAt)}</span>}
          {secondsToNext !== null ? (
            <span>próx. em {secondsToNext}s</span>
          ) : (
            <span className="text-ivo-stone-500">aba oculta</span>
          )}
        </span>
      </CardFooter>
    </Card>
  )
}
