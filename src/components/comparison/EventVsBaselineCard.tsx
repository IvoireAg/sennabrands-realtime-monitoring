import { Card, CardBody, CardEyebrow, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtInt, fmtPct } from '@/lib/format'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

type DayRow = { date: string; sessions: number; users: number; pageviews: number }

type Props = {
  /** Linhas de traffic_daily dos últimos 30 dias */
  traffic30: DayRow[]
}

/**
 * Compara métricas do dia mais recente vs média dos 29 dias anteriores.
 * Mostra delta % com seta de tendência.
 */
export function EventVsBaselineCard({ traffic30 }: Props) {
  // Aggregate por dia (caso traffic_daily venha por (date, channel, source, ...))
  const byDate = new Map<string, { sessions: number; users: number; pageviews: number }>()
  for (const r of traffic30) {
    const cur = byDate.get(r.date) ?? { sessions: 0, users: 0, pageviews: 0 }
    cur.sessions += Number(r.sessions || 0)
    cur.users += Number(r.users || 0)
    cur.pageviews += Number(r.pageviews || 0)
    byDate.set(r.date, cur)
  }
  const days = Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, ...v }))

  if (days.length < 2) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardEyebrow>Comparativo</CardEyebrow>
            <CardTitle className="mt-1 text-base">Hoje vs baseline 30d</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-ivo-stone-500 text-sm font-title py-2">
            aguardando dados (precisa &gt;= 2 dias de histórico)
          </p>
        </CardBody>
      </Card>
    )
  }

  const today = days[days.length - 1]
  const baseline = days.slice(0, -1)
  const baselineAvg = {
    sessions: baseline.reduce((s, d) => s + d.sessions, 0) / baseline.length,
    users: baseline.reduce((s, d) => s + d.users, 0) / baseline.length,
    pageviews: baseline.reduce((s, d) => s + d.pageviews, 0) / baseline.length,
  }

  const delta = (a: number, b: number): number | null => (b > 0 ? (a - b) / b : null)

  const metrics: { label: string; current: number; avg: number; delta: number | null }[] = [
    {
      label: 'Sessões',
      current: today.sessions,
      avg: baselineAvg.sessions,
      delta: delta(today.sessions, baselineAvg.sessions),
    },
    {
      label: 'Usuários',
      current: today.users,
      avg: baselineAvg.users,
      delta: delta(today.users, baselineAvg.users),
    },
    {
      label: 'Pageviews',
      current: today.pageviews,
      avg: baselineAvg.pageviews,
      delta: delta(today.pageviews, baselineAvg.pageviews),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <div>
          <CardEyebrow>Comparativo</CardEyebrow>
          <CardTitle className="mt-1 text-base">Hoje vs baseline {baseline.length}d</CardTitle>
        </div>
        <div className="text-right">
          <div className="t-eyebrow text-ivo-stone-300">hoje</div>
          <div className="t-numeric text-ivo-yellow text-base">{today.date}</div>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {metrics.map((m) => {
            const positive = m.delta !== null && m.delta > 0
            const negative = m.delta !== null && m.delta < 0
            const Icon = positive ? ArrowUp : negative ? ArrowDown : Minus
            const color = positive
              ? 'text-ivo-yellow'
              : negative
                ? 'text-ivo-ivory'
                : 'text-ivo-stone-300'
            return (
              <div key={m.label} className="border border-ivo-graphite rounded-sm p-3">
                <div className="t-eyebrow text-ivo-stone-300 text-[10px]">{m.label}</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <div className="t-numeric text-2xl text-ivo-ivory leading-none">
                    {fmtInt(m.current)}
                  </div>
                  <div className={cn('flex items-center gap-0.5 font-title text-sm font-bold', color)}>
                    <Icon size={12} strokeWidth={2.5} />
                    {m.delta !== null ? fmtPct(Math.abs(m.delta)) : '—'}
                  </div>
                </div>
                <div className="text-[10px] text-ivo-stone-500 font-title mt-1">
                  baseline: {fmtInt(Math.round(m.avg))} / dia
                </div>
              </div>
            )
          })}
        </div>
      </CardBody>
      <CardFooter>baseline = média dos {baseline.length} dias anteriores · fonte: GA4 · traffic_daily</CardFooter>
    </Card>
  )
}
