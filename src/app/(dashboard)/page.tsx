import { PageHeader } from '@/components/shell/PageHeader'
import { RealtimePanel } from '@/components/realtime/RealtimePanel'
import { KPICard } from '@/components/kpi/KPICard'
import { HealthBadge } from '@/components/health/HealthBadge'
import { PulseStrip } from '@/components/pulse/PulseStrip'
import { RecentFlowChart } from '@/components/flow/RecentFlowChart'
import { WeekHeatmap2D } from '@/components/heatmap/WeekHeatmap2D'
import { CalendarHeatmap30d } from '@/components/heatmap/CalendarHeatmap30d'
import { TopSourceMediumCard } from '@/components/acquisition/TopSourceMediumCard'
import { TopCitiesCard } from '@/components/demographics/TopCitiesCard'
import { EventFunnel } from '@/components/funnel/EventFunnel'
import { EventVsBaselineCard } from '@/components/comparison/EventVsBaselineCard'
import { AnnotationsManager } from '@/components/annotations/AnnotationsManager'
import {
  getTrafficDaily,
  getTrafficHourly,
  getAcquisitionDaily,
  getDemographicsDaily,
  getEventsDaily,
  getLastIngestion,
} from '@/lib/queries'
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
  const [
    last7Traffic,
    last30Traffic,
    last7Hourly,
    acquisition7,
    demographics7,
    events7,
    lastIngestion,
  ] = await Promise.all([
    getTrafficDaily(7),
    getTrafficDaily(30),
    getTrafficHourly(7),
    getAcquisitionDaily(7),
    getDemographicsDaily(7),
    getEventsDaily(7),
    getLastIngestion(),
  ])

  const a7 = aggregate(last7Traffic)
  const a30 = aggregate(last30Traffic)
  const prev7 = a30.sessions - a7.sessions
  const deltaSessions = prev7 > 0 ? (a7.sessions - prev7) / prev7 : null

  const noData = a30.sessions === 0

  // Traffic30 já agregado por dia para o EventVsBaselineCard e CalendarHeatmap30d
  const dailyAggregated = (() => {
    const m = new Map<string, { sessions: number; users: number; pageviews: number }>()
    for (const r of last30Traffic) {
      const cur = m.get(r.date) ?? { sessions: 0, users: 0, pageviews: 0 }
      cur.sessions += Number(r.sessions || 0)
      cur.users += Number(r.users || 0)
      cur.pageviews += Number(r.pageviews || 0)
      m.set(r.date, cur)
    }
    return Array.from(m.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))
  })()

  return (
    <>
      <PageHeader
        eyebrow="Resumo geral"
        title="Monitoramento em tempo real"
        display="o que está acontecendo agora"
        description="Painel master do site ayrtonsenna.com.br. Tráfego ao vivo + leitura dos últimos 7 e 30 dias."
        actions={<HealthBadge lastSyncedAt={lastIngestion?.finished_at ?? null} />}
      />

      {/* Bloco 1 — Realtime: usuários ativos agora + top países + top páginas etc. */}
      <section className="mb-8">
        <RealtimePanel />
      </section>

      {/* Bloco 2 — Fluxo últimas 12h (com anotações) */}
      <section className="mb-8">
        <RecentFlowChart />
      </section>

      {/* Bloco 3 — Pulse: hora atual vs ontem mesma hora */}
      <section className="mb-8">
        <PulseStrip />
      </section>

      {/* Bloco 4 — KPIs 7d */}
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="t-eyebrow">Últimos 7 dias</div>
            <h2 className="font-title font-bold text-2xl text-ivo-ivory">Acumulado da semana</h2>
          </div>
          {noData && <span className="t-eyebrow text-ivo-yellow">aguardando 1ª sincronização</span>}
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

      {/* Bloco 5 — Heatmap semanal 7×4 (28 células reais) */}
      <section className="mb-8">
        <WeekHeatmap2D rows={last7Hourly} />
      </section>

      {/* Bloco 6 — Comparativo evento vs baseline 30d */}
      <section className="mb-8">
        <EventVsBaselineCard traffic30={dailyAggregated} />
      </section>

      {/* Bloco 7 — Top source/medium + Top cidades (lado a lado) */}
      <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopSourceMediumCard rows={acquisition7} limit={5} />
        <TopCitiesCard rows={demographics7} limit={5} />
      </section>

      {/* Bloco 8 — Funil de eventos + Anotações (lado a lado) */}
      <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EventFunnel events={events7} />
        <AnnotationsManager />
      </section>

      {/* Bloco 9 — KPIs 30d */}
      <section className="mb-8">
        <div className="t-eyebrow mb-2">Últimos 30 dias</div>
        <h2 className="font-title font-bold text-2xl text-ivo-ivory mb-4">Visão mensal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Sessões"
            value={fmtInt(a30.sessions)}
            source="GA4 Reporting API"
            lastSyncedAt={lastIngestion?.finished_at}
          />
          <KPICard
            label="Usuários"
            value={fmtInt(a30.users)}
            source="GA4 Reporting API"
            lastSyncedAt={lastIngestion?.finished_at}
          />
          <KPICard
            label="Pageviews"
            value={fmtInt(a30.pageviews)}
            source="GA4 Reporting API"
            lastSyncedAt={lastIngestion?.finished_at}
          />
          <KPICard
            label="Duração média"
            value={a30.sessions ? fmtDuration(a30.durationWeighted / a30.sessions) : '—'}
            source="GA4 Reporting API"
            lastSyncedAt={lastIngestion?.finished_at}
          />
        </div>
      </section>

      {/* Bloco 10 — Calendar heatmap 30d + sparkline */}
      <section>
        <CalendarHeatmap30d data={dailyAggregated} />
      </section>
    </>
  )
}
