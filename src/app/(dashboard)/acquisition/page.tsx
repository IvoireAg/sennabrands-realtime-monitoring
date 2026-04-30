import { PageHeader } from '@/components/shell/PageHeader'
import { Card, CardBody, CardEyebrow, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { TopSourceMediumCard } from '@/components/acquisition/TopSourceMediumCard'
import { getAcquisitionDaily } from '@/lib/queries'
import { fmtInt, fmtPct } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function AcquisitionPage() {
  const rows = await getAcquisitionDaily(30)

  const totals = rows.reduce(
    (a, r) => {
      a.sessions += Number(r.sessions || 0)
      a.users += Number(r.users || 0)
      a.conversions += Number(r.conversions || 0)
      return a
    },
    { sessions: 0, users: 0, conversions: 0 },
  )

  const byChannel = new Map<string, { sessions: number; users: number; conversions: number }>()
  for (const r of rows) {
    const cur = byChannel.get(r.channel) ?? { sessions: 0, users: 0, conversions: 0 }
    cur.sessions += Number(r.sessions || 0)
    cur.users += Number(r.users || 0)
    cur.conversions += Number(r.conversions || 0)
    byChannel.set(r.channel, cur)
  }

  return (
    <>
      <PageHeader
        eyebrow="Análise"
        title="Aquisição"
        description="De onde vem o tráfego — canais, origem e mídia. Últimos 30 dias."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <div>
              <CardEyebrow>Canais</CardEyebrow>
              <CardTitle className="mt-1 text-base">Default Channel Group</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <table className="w-full text-sm font-title">
              <thead>
                <tr className="text-left text-ivo-stone-300 t-eyebrow">
                  <th className="pb-2">Canal</th>
                  <th className="pb-2 text-right">Sessões</th>
                  <th className="pb-2 text-right">Conv.</th>
                  <th className="pb-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(byChannel.entries())
                  .sort((a, b) => b[1].sessions - a[1].sessions)
                  .slice(0, 10)
                  .map(([ch, v]) => (
                    <tr key={ch} className="border-t border-ivo-graphite">
                      <td className="py-2 text-ivo-ivory">{ch}</td>
                      <td className="py-2 text-right t-numeric text-ivo-yellow">{fmtInt(v.sessions)}</td>
                      <td className="py-2 text-right t-numeric text-ivo-stone-300">{fmtInt(v.conversions)}</td>
                      <td className="py-2 text-right text-ivo-stone-500">
                        {totals.sessions ? fmtPct(v.sessions / totals.sessions) : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardBody>
          <CardFooter>fonte: GA4 · sessionDefaultChannelGroup</CardFooter>
        </Card>

        <TopSourceMediumCard rows={rows} limit={12} />
      </div>
    </>
  )
}
