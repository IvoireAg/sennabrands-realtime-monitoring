import { PageHeader } from '@/components/shell/PageHeader'
import { Card, CardBody, CardEyebrow, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { KPICard } from '@/components/kpi/KPICard'
import { getTrafficDaily, getLastIngestion } from '@/lib/queries'
import { fmtInt, fmtPct, fmtDuration } from '@/lib/format'
import { TrafficChart } from './TrafficChart'

export const dynamic = 'force-dynamic'

export default async function TrafficPage() {
  const [rows, lastIngestion] = await Promise.all([getTrafficDaily(30), getLastIngestion()])

  const byDate = new Map<string, { sessions: number; users: number; pageviews: number }>()
  for (const r of rows) {
    const cur = byDate.get(r.date) ?? { sessions: 0, users: 0, pageviews: 0 }
    cur.sessions += Number(r.sessions || 0)
    cur.users += Number(r.users || 0)
    cur.pageviews += Number(r.pageviews || 0)
    byDate.set(r.date, cur)
  }
  const series = Array.from(byDate.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const totals = rows.reduce(
    (acc, r) => {
      acc.sessions += Number(r.sessions || 0)
      acc.users += Number(r.users || 0)
      acc.pageviews += Number(r.pageviews || 0)
      acc.durW += Number(r.avg_session_duration || 0) * Number(r.sessions || 0)
      acc.bounceW += Number(r.bounce_rate || 0) * Number(r.sessions || 0)
      return acc
    },
    { sessions: 0, users: 0, pageviews: 0, durW: 0, bounceW: 0 },
  )

  const byDevice = new Map<string, number>()
  for (const r of rows) {
    byDevice.set(r.device, (byDevice.get(r.device) ?? 0) + Number(r.sessions || 0))
  }

  return (
    <>
      <PageHeader
        eyebrow="Análise"
        title="Tráfego"
        description="Volume de sessões, usuários e pageviews ao longo do tempo. Última atualização do banco abaixo."
        actions={
          lastIngestion && (
            <div className="text-right">
              <div className="t-eyebrow text-ivo-stone-300">sync</div>
              <div className="font-title text-sm text-ivo-ivory">
                {new Date(lastIngestion.finished_at).toLocaleString('pt-BR')}
              </div>
            </div>
          )
        }
      />

      <section className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Sessões (30d)" value={fmtInt(totals.sessions)} source="GA4" lastSyncedAt={lastIngestion?.finished_at} />
        <KPICard label="Usuários (30d)" value={fmtInt(totals.users)} source="GA4" lastSyncedAt={lastIngestion?.finished_at} />
        <KPICard label="Pageviews (30d)" value={fmtInt(totals.pageviews)} source="GA4" lastSyncedAt={lastIngestion?.finished_at} />
        <KPICard
          label="Duração média"
          value={totals.sessions ? fmtDuration(totals.durW / totals.sessions) : '—'}
          source="GA4"
          lastSyncedAt={lastIngestion?.finished_at}
        />
      </section>

      <section className="mb-8">
        <Card>
          <CardHeader>
            <div>
              <CardEyebrow>Tendência diária</CardEyebrow>
              <CardTitle className="mt-1">Sessões e usuários por dia</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            {series.length === 0 ? (
              <p className="text-ivo-stone-500 text-sm font-title py-12 text-center">
                Aguardando primeira sincronização. Rode `/api/cron/ingest?token=...&days=90` para popular.
              </p>
            ) : (
              <TrafficChart data={series} />
            )}
          </CardBody>
          <CardFooter>fonte: GA4 Reporting API · 30 dias</CardFooter>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Por dispositivo</CardTitle>
          </CardHeader>
          <CardBody>
            <table className="w-full text-sm font-title">
              <thead>
                <tr className="text-left text-ivo-stone-300 t-eyebrow">
                  <th className="pb-2">Dispositivo</th>
                  <th className="pb-2 text-right">Sessões</th>
                  <th className="pb-2 text-right">Participação</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(byDevice.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([device, sessions]) => (
                    <tr key={device} className="border-t border-ivo-graphite">
                      <td className="py-2 text-ivo-ivory capitalize">{device}</td>
                      <td className="py-2 text-right t-numeric text-ivo-yellow">{fmtInt(sessions)}</td>
                      <td className="py-2 text-right t-numeric text-ivo-stone-300">
                        {totals.sessions ? fmtPct(sessions / totals.sessions) : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </section>
    </>
  )
}
