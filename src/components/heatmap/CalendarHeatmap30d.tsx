'use client'

import { Card, CardBody, CardEyebrow, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtInt } from '@/lib/format'
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { rechartsTooltipStyle } from '@/lib/chart-theme'

type DayData = { date: string; sessions: number }

type Props = {
  data: DayData[]
}

const WEEKDAY_PT_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function intensityClass(value: number, max: number): string {
  if (max === 0) return 'bg-ivo-ink/30'
  const ratio = value / max
  if (ratio === 0) return 'bg-ivo-ink/40'
  if (ratio < 0.2) return 'bg-ivo-yellow/20'
  if (ratio < 0.4) return 'bg-ivo-yellow/40'
  if (ratio < 0.6) return 'bg-ivo-yellow/60'
  if (ratio < 0.8) return 'bg-ivo-yellow/80'
  return 'bg-ivo-yellow'
}

function textColorForIntensity(value: number, max: number): string {
  const ratio = max > 0 ? value / max : 0
  return ratio >= 0.6 ? 'text-ivo-ink' : 'text-ivo-stone-300'
}

export function CalendarHeatmap30d({ data }: Props) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
  const max = sorted.reduce((m, d) => Math.max(m, d.sessions), 0)
  const total = sorted.reduce((s, d) => s + d.sessions, 0)
  const empty = total === 0

  return (
    <Card>
      <CardHeader>
        <div>
          <CardEyebrow>Últimos 30 dias</CardEyebrow>
          <CardTitle className="mt-1 text-base">Padrão de tráfego — mês</CardTitle>
        </div>
        <div className="text-right">
          <div className="t-eyebrow text-ivo-stone-300">total</div>
          <div className="t-numeric text-ivo-yellow text-lg">{fmtInt(total)}</div>
        </div>
      </CardHeader>
      <CardBody>
        {empty ? (
          <p className="text-ivo-stone-500 text-sm font-title py-4">aguardando dados</p>
        ) : (
          <>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: 'repeat(30, minmax(0, 1fr))' }}
            >
              {sorted.map((d) => {
                const dt = new Date(d.date + 'T12:00:00')
                const weekday = WEEKDAY_PT_SHORT[dt.getDay()]
                const dayNum = dt.getDate()
                const txt = textColorForIntensity(d.sessions, max)
                return (
                  <div
                    key={d.date}
                    className={`${intensityClass(d.sessions, max)} aspect-square rounded-sm flex flex-col items-center justify-center cursor-help transition-colors`}
                    title={`${d.date} (${weekday}): ${fmtInt(d.sessions)} sessões`}
                  >
                    <span className={`text-[9px] font-title ${txt} opacity-70 leading-none`}>{weekday}</span>
                    <span className={`t-numeric text-[11px] ${txt} leading-none mt-0.5`}>{dayNum}</span>
                  </div>
                )
              })}
            </div>
            <div className="h-14 mt-3 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sorted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <YAxis hide domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={rechartsTooltipStyle}
                    formatter={(value) => [fmtInt(Number(value)), 'sessões']}
                    labelFormatter={(_, payload) => {
                      const d = payload?.[0]?.payload?.date as string | undefined
                      return d ? `data: ${d}` : ''
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke="#FFFF02"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardBody>
      <CardFooter className="flex items-center justify-between">
        <span>30 quadros = 30 dias · sparkline mostra tendência</span>
        <span>fonte: GA4 · sessões por dia</span>
      </CardFooter>
    </Card>
  )
}
