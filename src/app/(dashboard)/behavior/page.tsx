import { PageHeader } from '@/components/shell/PageHeader'
import { Card, CardBody, CardEyebrow, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { getPagesDaily, getEventsDaily } from '@/lib/queries'
import { fmtInt, fmtDuration, fmtPct } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function BehaviorPage() {
  const [pageRows, eventRows] = await Promise.all([
    getPagesDaily(30),
    getEventsDaily(30),
  ])

  const byPath = new Map<string, { pageviews: number; users: number; durW: number; bounceW: number; title: string | null }>()
  for (const r of pageRows) {
    const cur = byPath.get(r.page_path) ?? {
      pageviews: 0,
      users: 0,
      durW: 0,
      bounceW: 0,
      title: r.page_title,
    }
    cur.pageviews += Number(r.pageviews || 0)
    cur.users += Number(r.unique_pageviews || 0)
    cur.durW += Number(r.avg_time_on_page || 0) * Number(r.pageviews || 0)
    cur.bounceW += Number(r.bounce_rate || 0) * Number(r.pageviews || 0)
    if (!cur.title) cur.title = r.page_title
    byPath.set(r.page_path, cur)
  }

  const byEvent = new Map<string, number>()
  for (const r of eventRows) {
    byEvent.set(r.event_name, (byEvent.get(r.event_name) ?? 0) + Number(r.event_count || 0))
  }

  const topPages = Array.from(byPath.entries())
    .map(([path, v]) => ({ path, ...v }))
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 25)

  return (
    <>
      <PageHeader
        eyebrow="Análise"
        title="Comportamento"
        description="Páginas mais acessadas e eventos disparados pelos usuários nos últimos 30 dias."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardEyebrow>Conteúdo</CardEyebrow>
              <CardTitle className="mt-1">Top páginas</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            {topPages.length === 0 ? (
              <p className="text-ivo-stone-500 text-sm font-title py-8 text-center">
                Sem dados ainda. Rode a ingestão.
              </p>
            ) : (
              <table className="w-full text-sm font-title">
                <thead>
                  <tr className="text-left text-ivo-stone-300 t-eyebrow">
                    <th className="pb-2">Página</th>
                    <th className="pb-2 text-right">Pageviews</th>
                    <th className="pb-2 text-right">Tempo médio</th>
                    <th className="pb-2 text-right">Rejeição</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.map((p) => (
                    <tr key={p.path} className="border-t border-ivo-graphite">
                      <td className="py-2">
                        <div className="text-ivo-ivory truncate max-w-md">{p.path}</div>
                        {p.title && (
                          <div className="text-ivo-stone-500 text-xs truncate max-w-md">{p.title}</div>
                        )}
                      </td>
                      <td className="py-2 text-right t-numeric text-ivo-yellow">{fmtInt(p.pageviews)}</td>
                      <td className="py-2 text-right text-ivo-stone-300">
                        {p.pageviews ? fmtDuration(p.durW / p.pageviews) : '—'}
                      </td>
                      <td className="py-2 text-right text-ivo-stone-300">
                        {p.pageviews ? fmtPct(p.bounceW / p.pageviews) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
          <CardFooter>fonte: GA4 · pagePath × pageTitle</CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardEyebrow>Engajamento</CardEyebrow>
              <CardTitle className="mt-1">Eventos</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            {byEvent.size === 0 ? (
              <p className="text-ivo-stone-500 text-sm font-title">—</p>
            ) : (
              <ul className="space-y-1.5">
                {Array.from(byEvent.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 12)
                  .map(([name, count]) => (
                    <li key={name} className="flex items-center justify-between text-sm font-title">
                      <span className="text-ivo-ivory truncate font-mono text-xs">{name}</span>
                      <span className="t-numeric text-ivo-yellow">{fmtInt(count)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </CardBody>
          <CardFooter>fonte: GA4 · eventName</CardFooter>
        </Card>
      </div>
    </>
  )
}
