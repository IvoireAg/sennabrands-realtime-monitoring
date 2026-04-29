import { PageHeader } from '@/components/shell/PageHeader'
import { RealtimePanel } from '@/components/realtime/RealtimePanel'
import { KPICard } from '@/components/kpi/KPICard'
import { getTrafficDaily, getLastIngestion } from '@/lib/queries'
import { fmtInt, fmtPct, fmtDuration } from '@/lib/format'

export const dynamic = 'force-dynamic'

function aggregate(rows: Awaited<ReturnType<typeof getTrafficDaily>>) {
  return rows.reduce(
    (acc, r) => {
      acc.sessions += Number(r.sessions || 0)
      acc.users += Number(r.users || 0)
      acc.pageviews += Number(r.pageviews || 0)
      acc.bounceWeighted += Number(r.bounce_rate || 0) * Number(r.sessions || 0)
      acc.durationWeighted += Number(r.avg_session_duration || 0) * Number(r.sessions || 0)
      return acc
    },
    { sessions: 0, users: 0, pageviews: 0, bounceWeighted: 0, durationWeighted: 0 },
  )
}

export default async function ResumoGeralPage() {
  const [last7, last30, lastIngestion] = await Promise.all([
    getTrafficDaily(7),
    getTrafficDaily(30),
    getLastIngestion(),
  ])

  const a7 = aggregate(last7)
  const a30 = aggregate(last30)
  const prev7 = a30.sessions - a7.sessions
  const deltaSessions = prev7 > 0 ? (a7.sessions - prev7) / prev7 : null

  const noData = a30.sessions === 0

  return (
    <>
      <PageHeader
        eyebrow="Resumo geral"
        title="Monitoramento em tempo real"
        display="o que está acontecendo agora"
        description="Painel master do site ayrtonsenna.com.br. Tráfego ao vivo + leitura dos últimos 7 e 30 dias."
        actions={
          lastIngestion && (
            <div className="text-right">
              <div className="t-eyebrow text-ivo-stone-300">última sincronização</div>
              <div className="font-title text-sm text-ivo-ivory">
                {new Date(lastIngestion.finished_at).toLocaleString('pt-BR')}
              </div>
            </div>
          )
        }
      />

      {/* Bloco realtime */}
      <section className="mb-10">
        <RealtimePanel />
      </section>

      {/* Bloco últimos 7 dias */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="t-eyebrow">Últimos 7 dias</div>
            <h2 className="font-title font-bold text-2xl text-ivo-ivory">Acumulado da semana</h2>
          </div>
          {noData && (
            <span className="t-eyebrow text-ivo-yellow">aguardando 1ª sincronização</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Sessões"
            value={fmtInt(a7.sessions)}
            delta={deltaSessions}
            deltaLabel="vs 7d anteriores"
            source="GA4 Reporting API"
            lastSyncedAt={lastIngestion?.finished_at}
          />
          <KPICard
            label="Usuários"
            value={fmtInt(a7.users)}
            source="GA4 Reporting API"
            lastSyncedAt={lastIngestion?.finished_at}
          />
          <KPICard
            label="Pageviews"
            value={fmtInt(a7.pageviews)}
            source="GA4 Reporting API"
            lastSyncedAt={lastIngestion?.finished_at}
          />
          <KPICard
            label="Tx. de rejeição"
            value={a7.sessions ? fmtPct(a7.bounceWeighted / a7.sessions) : '—'}
            source="GA4 Reporting API"
            lastSyncedAt={lastIngestion?.finished_at}
          />
        </div>
      </section>

      {/* Bloco últimos 30 dias */}
      <section>
        <div className="t-eyebrow mb-2">Últimos 30 dias</div>
        <h2 className="font-title font-bold text-2xl text-ivo-ivory mb-4">Visão mensal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Sessões" value={fmtInt(a30.sessions)} source="GA4 Reporting API" lastSyncedAt={lastIngestion?.finished_at} />
          <KPICard label="Usuários" value={fmtInt(a30.users)} source="GA4 Reporting API" lastSyncedAt={lastIngestion?.finished_at} />
          <KPICard label="Pageviews" value={fmtInt(a30.pageviews)} source="GA4 Reporting API" lastSyncedAt={lastIngestion?.finished_at} />
          <KPICard
            label="Duração média"
            value={a30.sessions ? fmtDuration(a30.durationWeighted / a30.sessions) : '—'}
            source="GA4 Reporting API"
            lastSyncedAt={lastIngestion?.finished_at}
          />
        </div>
      </section>
    </>
  )
}
