import { Card, CardBody, CardEyebrow, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtInt } from '@/lib/format'

type DayData = { date: string; sessions: number }

type Props = {
  data: DayData[]
}

const WEEKDAY_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

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

export function WeekHeatmapStrip({ data }: Props) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date)).slice(-7)
  const max = sorted.reduce((m, d) => Math.max(m, d.sessions), 0)
  const total = sorted.reduce((s, d) => s + d.sessions, 0)
  const empty = total === 0

  return (
    <Card>
      <CardHeader>
        <div>
          <CardEyebrow>Últimos 7 dias</CardEyebrow>
          <CardTitle className="mt-1 text-base">Distribuição de tráfego — semana</CardTitle>
        </div>
        <div className="text-right">
          <div className="t-eyebrow text-ivo-stone-300">total</div>
          <div className="t-numeric text-ivo-yellow text-lg">{fmtInt(total)}</div>
        </div>
      </CardHeader>
      <CardBody>
        {empty ? (
          <p className="text-ivo-stone-500 text-sm font-title py-2">aguardando dados</p>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {sorted.map((d) => {
              const dt = new Date(d.date + 'T12:00:00')
              const weekday = WEEKDAY_PT[dt.getDay()]
              const dayNum = dt.getDate()
              const txt = textColorForIntensity(d.sessions, max)
              return (
                <div
                  key={d.date}
                  className={`${intensityClass(d.sessions, max)} aspect-square rounded-sm flex flex-col items-center justify-center gap-0.5 transition-colors`}
                  title={`${d.date}: ${fmtInt(d.sessions)} sessões`}
                >
                  <div className={`text-[11px] font-title ${txt} opacity-80`}>{weekday}</div>
                  <div className={`t-numeric text-2xl ${txt} leading-none`}>{dayNum}</div>
                  <div className={`text-[10px] t-numeric ${txt} opacity-80 leading-none`}>
                    {fmtInt(d.sessions)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardBody>
      <CardFooter className="flex items-center justify-between">
        <span>amarelo escuro = mais tráfego</span>
        <span>fonte: GA4 · sessões por dia</span>
      </CardFooter>
    </Card>
  )
}
