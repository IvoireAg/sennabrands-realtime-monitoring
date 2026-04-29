import { PageHeader } from '@/components/shell/PageHeader'
import { Card, CardBody, CardEyebrow, CardHeader, CardTitle } from '@/components/ui/card'
import { getDemographicsDaily } from '@/lib/queries'
import { fmtInt, fmtPct } from '@/lib/format'

export const dynamic = 'force-dynamic'

function aggregate<K extends string>(
  rows: Awaited<ReturnType<typeof getDemographicsDaily>>,
  key: K,
): { label: string; users: number }[] {
  const m = new Map<string, number>()
  for (const r of rows) {
    const k = (r as Record<string, unknown>)[key] as string
    const label = k && k !== '__unknown__' && k !== 'unknown' ? k : '(não informado)'
    m.set(label, (m.get(label) ?? 0) + Number(r.users || 0))
  }
  return Array.from(m.entries())
    .map(([label, users]) => ({ label, users }))
    .sort((a, b) => b.users - a.users)
}

export default async function DemographicsPage() {
  const rows = await getDemographicsDaily(30)
  const totalUsers = rows.reduce((a, r) => a + Number(r.users || 0), 0)

  const byCountry = aggregate(rows, 'country').slice(0, 10)
  const byCity = aggregate(rows, 'city').slice(0, 10)
  const byAge = aggregate(rows, 'age_bracket')
  const byGender = aggregate(rows, 'gender')
  const byDevice = aggregate(rows, 'device')

  const empty = totalUsers === 0

  return (
    <>
      <PageHeader
        eyebrow="Análise"
        title="Demografia"
        description="Quem é o público que acessou o site nos últimos 30 dias — geografia, idade, gênero, dispositivo."
      />

      {empty && (
        <Card className="mb-6">
          <CardBody className="py-8 text-center">
            <div className="t-eyebrow text-ivo-yellow mb-2">aguardando dados</div>
            <p className="font-body text-ivo-stone-300 text-sm">
              Ainda não há dados de demografia. Rode a ingestão (90d backfill) para popular.
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <DemoTable title="Top países" rows={byCountry} totalUsers={totalUsers} eyebrow="geografia" />
        <DemoTable title="Top cidades" rows={byCity} totalUsers={totalUsers} eyebrow="geografia" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DemoTable title="Idade" rows={byAge} totalUsers={totalUsers} eyebrow="perfil" />
        <DemoTable title="Gênero" rows={byGender} totalUsers={totalUsers} eyebrow="perfil" />
        <DemoTable title="Dispositivo" rows={byDevice} totalUsers={totalUsers} eyebrow="perfil" />
      </div>
    </>
  )
}

function DemoTable({
  title,
  rows,
  totalUsers,
  eyebrow,
}: {
  title: string
  rows: { label: string; users: number }[]
  totalUsers: number
  eyebrow: string
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardEyebrow>{eyebrow}</CardEyebrow>
          <CardTitle className="mt-1 text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        {rows.length === 0 ? (
          <p className="text-ivo-stone-500 text-sm font-title">—</p>
        ) : (
          <ul className="space-y-1.5">
            {rows.slice(0, 8).map((r) => (
              <li key={r.label} className="flex items-center justify-between text-sm font-title">
                <span className="text-ivo-ivory truncate capitalize">{r.label}</span>
                <span className="flex items-center gap-2">
                  <span className="t-numeric text-ivo-yellow">{fmtInt(r.users)}</span>
                  <span className="text-xs text-ivo-stone-500 w-12 text-right">
                    {totalUsers ? fmtPct(r.users / totalUsers) : '—'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
