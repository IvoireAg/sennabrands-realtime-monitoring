import { Card, CardBody, CardEyebrow, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtInt } from '@/lib/format'

type HourBucket = { date_hour: string; sessions: number }

type Props = {
  rows: HourBucket[]
}

const WEEKDAY_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const PERIODS: { label: string; emoji: string; hours: [number, number] }[] = [
  { label: 'madrugada', emoji: '🌙', hours: [0, 5] },
  { label: 'manhã', emoji: '☀️', hours: [6, 11] },
  { label: 'tarde', emoji: '🌤️', hours: [12, 17] },
  { label: 'noite', emoji: '🌆', hours: [18, 23] },
]

function intensityClass(value: number, max: number): string {
  if (max === 0) return 'bg-ivo-ink/30'
  const ratio = value / max
  if (ratio === 0) return 'bg-ivo-ink/40'
  if (ratio < 0.2) return 'bg-ivo-yellow/20'
  if (ratio < 0.4) return 'bg-ivo-yellow/35'
  if (ratio < 0.6) return 'bg-ivo-yellow/55'
  if (ratio < 0.8) return 'bg-ivo-yellow/75'
  return 'bg-ivo-yellow'
}

function textColorForIntensity(value: number, max: number): string {
  const ratio = max > 0 ? value / max : 0
  return ratio >= 0.6 ? 'text-ivo-ink' : 'text-ivo-ivory'
}

export function WeekHeatmap2D({ rows }: Props) {
  // Build matrix: 7 days × 4 buckets, sessions sum
  // Days are aligned to today and 6 days back
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days: { date: Date; key: string; sessions: number[] }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    days.push({
      date: d,
      key: `${yyyy}-${mm}-${dd}`,
      sessions: [0, 0, 0, 0],
    })
  }

  for (const r of rows) {
    const dh = new Date(r.date_hour)
    if (Number.isNaN(dh.getTime())) continue
    const yyyy = dh.getFullYear()
    const mm = String(dh.getMonth() + 1).padStart(2, '0')
    const dd = String(dh.getDate()).padStart(2, '0')
    const dayKey = `${yyyy}-${mm}-${dd}`
    const day = days.find((x) => x.key === dayKey)
    if (!day) continue
    const hour = dh.getHours()
    const periodIdx = PERIODS.findIndex((p) => hour >= p.hours[0] && hour <= p.hours[1])
    if (periodIdx < 0) continue
    day.sessions[periodIdx] += Number(r.sessions || 0)
  }

  const allValues = days.flatMap((d) => d.sessions)
  const max = allValues.reduce((m, v) => Math.max(m, v), 0)
  const total = allValues.reduce((s, v) => s + v, 0)
  const empty = total === 0

  return (
    <Card>
      <CardHeader>
        <div>
          <CardEyebrow>Últimos 7 dias · 6h por bucket</CardEyebrow>
          <CardTitle className="mt-1 text-base">Distribuição de tráfego — semana × período</CardTitle>
        </div>
        <div className="text-right">
          <div className="t-eyebrow text-ivo-stone-300">total</div>
          <div className="t-numeric text-ivo-yellow text-lg">{fmtInt(total)}</div>
        </div>
      </CardHeader>
      <CardBody>
        {empty ? (
          <p className="text-ivo-stone-500 text-sm font-title py-2">
            aguardando dados horários — rode <code className="text-ivo-stone-300">/api/cron/ingest?token=…&amp;days=14</code> com pipeline horário ativo
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left t-eyebrow text-ivo-stone-300 pb-2 pr-3">período</th>
                  {days.map((d) => {
                    const wd = WEEKDAY_PT[d.date.getDay()]
                    const dn = d.date.getDate()
                    return (
                      <th key={d.key} className="text-center t-eyebrow text-ivo-stone-300 pb-2 px-1">
                        <div>{wd}</div>
                        <div className="t-numeric text-base text-ivo-ivory">{dn}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((p, pIdx) => (
                  <tr key={p.label}>
                    <td className="text-right pr-3 py-1 align-middle">
                      <div className="text-xs font-title text-ivo-stone-300">{p.emoji} {p.label}</div>
                      <div className="text-[10px] text-ivo-stone-500 font-mono">
                        {String(p.hours[0]).padStart(2, '0')}–{String(p.hours[1]).padStart(2, '0')}h
                      </div>
                    </td>
                    {days.map((d) => {
                      const v = d.sessions[pIdx]
                      const txt = textColorForIntensity(v, max)
                      return (
                        <td key={d.key + p.label} className="px-1 py-1">
                          <div
                            className={`${intensityClass(v, max)} aspect-square rounded-sm flex items-center justify-center transition-colors min-h-[44px]`}
                            title={`${d.key} ${p.label}: ${fmtInt(v)} sessões`}
                          >
                            <span className={`t-numeric text-sm ${txt}`}>{fmtInt(v)}</span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
      <CardFooter className="flex items-center justify-between">
        <span>amarelo escuro = mais tráfego · células = sessões</span>
        <span>fonte: GA4 · traffic_hourly</span>
      </CardFooter>
    </Card>
  )
}
