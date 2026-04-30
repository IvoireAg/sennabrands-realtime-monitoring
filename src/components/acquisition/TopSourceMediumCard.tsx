import { Card, CardBody, CardEyebrow, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtInt } from '@/lib/format'
import type { AcquisitionDailyRow } from '@/types/ga4'

type Props = {
  rows: AcquisitionDailyRow[]
  limit?: number
  title?: string
}

export function TopSourceMediumCard({ rows, limit = 5, title = 'Top source/medium' }: Props) {
  const bySource = new Map<string, { sessions: number; conversions: number }>()
  for (const r of rows) {
    const key = `${r.source} / ${r.medium}`
    const cur = bySource.get(key) ?? { sessions: 0, conversions: 0 }
    cur.sessions += Number(r.sessions || 0)
    cur.conversions += Number(r.conversions || 0)
    bySource.set(key, cur)
  }
  const top = Array.from(bySource.entries())
    .sort((a, b) => b[1].sessions - a[1].sessions)
    .slice(0, limit)

  return (
    <Card>
      <CardHeader>
        <div>
          <CardEyebrow>Origem / Mídia</CardEyebrow>
          <CardTitle className="mt-1 text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        {top.length === 0 ? (
          <p className="text-ivo-stone-500 text-sm font-title py-2">aguardando dados</p>
        ) : (
          <table className="w-full text-sm font-title">
            <thead>
              <tr className="text-left text-ivo-stone-300 t-eyebrow">
                <th className="pb-2">Source / Medium</th>
                <th className="pb-2 text-right">Sessões</th>
                <th className="pb-2 text-right">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {top.map(([key, v]) => (
                <tr key={key} className="border-t border-ivo-graphite">
                  <td className="py-2 text-ivo-ivory truncate max-w-xs">{key}</td>
                  <td className="py-2 text-right t-numeric text-ivo-yellow">{fmtInt(v.sessions)}</td>
                  <td className="py-2 text-right t-numeric text-ivo-stone-300">{fmtInt(v.conversions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardBody>
      <CardFooter>fonte: GA4 · sessionSource × sessionMedium</CardFooter>
    </Card>
  )
}
