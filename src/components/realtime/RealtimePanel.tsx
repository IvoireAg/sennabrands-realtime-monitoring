'use client'

import { useEffect, useState } from 'react'
import { Activity, Globe, Smartphone, Monitor, Tablet } from 'lucide-react'
import { Card, CardBody, CardEyebrow, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtInt, fmtRelativeTime } from '@/lib/format'
import type { RealtimeSnapshot } from '@/types/ga4'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { rechartsTooltipStyle } from '@/lib/chart-theme'

const POLL_MS = 10_000
const RATE_LIMIT_FALLBACK_MS = 60_000

const deviceIcon: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
}

export function RealtimePanel() {
  const [data, setData] = useState<RealtimeSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    // Backoff exponencial em erro 5xx genérico: 10s → 20s → 40s → 60s.
    // Reseta para POLL_MS no primeiro sucesso.
    let errorBackoffMs = POLL_MS

    async function fetchOnce() {
      try {
        const res = await fetch('/api/realtime', {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (cancelled) return
        if (res.status === 429) {
          const body = (await res.json().catch(() => ({}))) as { retryAfterMs?: number }
          if (cancelled) return
          const wait = body.retryAfterMs ?? RATE_LIMIT_FALLBACK_MS
          setRetryAt(Date.now() + wait)
          setError(null)
          setLoading(false)
          errorBackoffMs = POLL_MS
          timer = setTimeout(fetchOnce, wait)
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as RealtimeSnapshot
        if (cancelled) return
        setData(json)
        setError(null)
        setRetryAt(null)
        setLoading(false)
        errorBackoffMs = POLL_MS
        timer = setTimeout(fetchOnce, POLL_MS)
      } catch (e) {
        if (cancelled) return
        if (e instanceof DOMException && e.name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'erro desconhecido')
        setLoading(false)
        errorBackoffMs = Math.min(errorBackoffMs * 2, 60_000)
        timer = setTimeout(fetchOnce, errorBackoffMs)
      }
    }
    fetchOnce()
    return () => {
      cancelled = true
      controller.abort()
      if (timer) clearTimeout(timer)
    }
  }, [])

  // Countdown — guarda Date.now() em state e re-calcula via setInterval.
  // Isso satisfaz duas regras do React 19: (a) Date.now() não é chamado durante
  // render, (b) setState não é chamado sincronamente no body do effect — só
  // via callback do setInterval (external system). Initializer de useState
  // é avaliado uma vez por mount.
  useEffect(() => {
    if (!retryAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [retryAt])

  const secondsLeft = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0

  if (loading && !data) {
    return (
      <Card>
        <CardBody className="py-12 text-center text-ivo-stone-300 font-title">
          Conectando ao GA4 Realtime…
        </CardBody>
      </Card>
    )
  }

  if (error && !data) {
    return (
      <Card>
        <CardBody className="py-8">
          <div className="t-eyebrow mb-2 text-ivo-yellow">erro de conexão</div>
          <p className="font-body text-ivo-stone-300 text-sm">{error}</p>
        </CardBody>
      </Card>
    )
  }

  if (retryAt && !data) {
    return (
      <Card>
        <CardBody className="py-8">
          <div className="t-eyebrow mb-2 text-ivo-yellow">limite GA4 atingido</div>
          <p className="font-body text-ivo-stone-300 text-sm">
            Cota horária de queries do GA4 foi atingida. Próxima tentativa em{' '}
            <span className="t-numeric text-ivo-ivory">{secondsLeft}s</span>.
          </p>
        </CardBody>
      </Card>
    )
  }

  if (!data) return null

  const minuteSeries = Array.from({ length: 30 }, (_, i) => {
    const minutesAgo = 29 - i
    const found = data.byMinute.find((m) => m.minutesAgo === minutesAgo)
    return { minutesAgo, users: found?.users ?? 0 }
  })

  return (
    <>
      {error && data && (
        <div className="mb-3 px-4 py-2 border border-ivo-yellow/40 bg-ivo-coal text-sm font-title flex items-center justify-between gap-4">
          <span className="t-eyebrow text-ivo-yellow">erro de leitura</span>
          <span className="text-ivo-stone-300">
            mostrando última leitura · re-tentando…
          </span>
        </div>
      )}
      {retryAt && (
        <div className="mb-3 px-4 py-2 border border-ivo-yellow/40 bg-ivo-coal text-sm font-title flex items-center justify-between gap-4">
          <span className="t-eyebrow text-ivo-yellow">limite GA4 atingido</span>
          <span className="text-ivo-stone-300">
            mostrando última leitura · próxima tentativa em{' '}
            <span className="t-numeric text-ivo-ivory">{secondsLeft}s</span>
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-ivo-yellow border-ivo-yellow text-ivo-ink relative overflow-hidden">
          <CardHeader>
            <div>
              <CardEyebrow className="text-ivo-ink">usuários ativos agora</CardEyebrow>
              <div className="t-numeric text-ivo-ink mt-2" style={{ fontSize: '6rem', lineHeight: 1 }}>
                {fmtInt(data.totalActiveUsers)}
              </div>
            </div>
            <Activity size={32} strokeWidth={1.5} className="text-ivo-ink/70" />
          </CardHeader>
          <CardBody>
            <div className="t-eyebrow text-ivo-ink/70 mb-2">últimos 30 minutos</div>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height={128} debounce={50}>
                <BarChart data={minuteSeries}>
                  <CartesianGrid stroke="#28282822" strokeDasharray="0" vertical={false} />
                  <XAxis dataKey="minutesAgo" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={rechartsTooltipStyle}
                    formatter={(value) => [fmtInt(Number(value)), 'usuários']}
                    labelFormatter={(label) => `há ${String(label)} min`}
                  />
                  <Bar dataKey="users" fill="#282828" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
          <CardFooter className="border-ivo-ink/20 text-ivo-ink/60">
            <span>fonte: GA4 Realtime API</span>
            <span>atualizado {fmtRelativeTime(data.fetchedAt)} · poll a cada 10s</span>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardEyebrow>top países</CardEyebrow>
              <CardTitle className="mt-1 text-base">Distribuição geográfica</CardTitle>
            </div>
            <Globe size={20} strokeWidth={1.5} className="text-ivo-stone-300" />
          </CardHeader>
          <CardBody>
            {data.byCountry.length === 0 ? (
              <p className="text-ivo-stone-500 text-sm font-title">Sem usuários ativos no momento.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.byCountry.slice(0, 8).map((c) => (
                  <li key={c.country} className="flex items-center justify-between text-sm font-title">
                    <span className="text-ivo-ivory truncate">{c.country || '—'}</span>
                    <span className="t-numeric text-ivo-yellow">{fmtInt(c.users)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardEyebrow>dispositivo</CardEyebrow>
          </CardHeader>
          <CardBody>
            {data.byDevice.length === 0 ? (
              <p className="text-ivo-stone-500 text-sm font-title">—</p>
            ) : (
              <ul className="space-y-2">
                {data.byDevice.map((d) => {
                  const Icon = deviceIcon[d.device] ?? Monitor
                  return (
                    <li key={d.device} className="flex items-center justify-between text-sm font-title">
                      <span className="flex items-center gap-2 text-ivo-ivory capitalize">
                        <Icon size={16} strokeWidth={1.5} className="text-ivo-stone-300" />
                        {d.device}
                      </span>
                      <span className="t-numeric text-ivo-yellow">{fmtInt(d.users)}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardEyebrow>top páginas agora</CardEyebrow>
              <CardTitle className="mt-1 text-base">Onde os usuários estão</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            {data.topPages.length === 0 ? (
              <p className="text-ivo-stone-500 text-sm font-title">Sem páginas ativas no momento.</p>
            ) : (
              <table className="w-full text-sm font-title">
                <thead>
                  <tr className="text-left text-ivo-stone-300 t-eyebrow">
                    <th className="pb-2 font-semibold">Página</th>
                    <th className="pb-2 font-semibold text-right">Usuários</th>
                    <th className="pb-2 font-semibold text-right">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPages.slice(0, 8).map((p) => (
                    <tr key={p.page} className="border-t border-ivo-graphite">
                      <td className="py-2 text-ivo-ivory truncate max-w-md">{p.page || '/'}</td>
                      <td className="py-2 text-right t-numeric text-ivo-yellow">{fmtInt(p.users)}</td>
                      <td className="py-2 text-right t-numeric text-ivo-stone-300">{fmtInt(p.views)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  )
}
