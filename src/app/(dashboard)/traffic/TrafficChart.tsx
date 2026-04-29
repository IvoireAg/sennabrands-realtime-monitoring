'use client'

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { rechartsAxis, rechartsTooltipStyle } from '@/lib/chart-theme'
import { fmtInt } from '@/lib/format'

type Row = { date: string; sessions: number; users: number; pageviews: number }

export function TrafficChart({ data }: { data: Row[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#3E3E3E" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="date"
            stroke={rechartsAxis.stroke}
            tick={rechartsAxis.tick}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis stroke={rechartsAxis.stroke} tick={rechartsAxis.tick} tickFormatter={(v: number) => fmtInt(v)} />
          <Tooltip
            contentStyle={rechartsTooltipStyle}
            formatter={(value) => fmtInt(Number(value))}
            labelFormatter={(label) => `data: ${String(label)}`}
          />
          <Legend wrapperStyle={{ fontFamily: 'var(--ivo-font-title)', fontSize: 12, color: '#999999' }} />
          <Line type="monotone" dataKey="sessions" name="Sessões" stroke="#FFFF02" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="users" name="Usuários" stroke="#999999" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
