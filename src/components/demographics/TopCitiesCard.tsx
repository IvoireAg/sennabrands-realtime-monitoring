import type { DemographicsDailyRow } from '@/types/ga4'
import { DemoTable } from './DemoTable'

type Props = {
  rows: DemographicsDailyRow[]
  limit?: number
}

export function TopCitiesCard({ rows, limit = 5 }: Props) {
  const totalUsers = rows.reduce((a, r) => a + Number(r.users || 0), 0)
  const m = new Map<string, number>()
  for (const r of rows) {
    const k = r.city
    const label = k && k !== '__unknown__' && k !== 'unknown' ? k : '(não informado)'
    m.set(label, (m.get(label) ?? 0) + Number(r.users || 0))
  }
  const cities = Array.from(m.entries())
    .map(([label, users]) => ({ label, users }))
    .sort((a, b) => b.users - a.users)

  return <DemoTable title="Top cidades" rows={cities} totalUsers={totalUsers} eyebrow="geografia" limit={limit} />
}
