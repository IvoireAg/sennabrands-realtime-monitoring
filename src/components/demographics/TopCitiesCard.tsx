import type { DemographicsDailyRow } from '@/types/ga4'
import { DemoTable } from './DemoTable'

type Props = {
  rows: DemographicsDailyRow[]
  limit?: number
}

/**
 * GA4 aplica privacy thresholding em cidades — em volumes baixos, só
 * a cidade dominante aparece (ou nenhuma). Quando temos < 3 cidades reais,
 * fazemos fallback pra Top países, que tem threshold mais permissivo.
 */
export function TopCitiesCard({ rows, limit = 5 }: Props) {
  const totalUsers = rows.reduce((a, r) => a + Number(r.users || 0), 0)

  const cityMap = new Map<string, number>()
  for (const r of rows) {
    const k = r.city
    if (!k || k === '__unknown__' || k === 'unknown') continue
    cityMap.set(k, (cityMap.get(k) ?? 0) + Number(r.users || 0))
  }
  const cities = Array.from(cityMap.entries())
    .map(([label, users]) => ({ label, users }))
    .sort((a, b) => b.users - a.users)

  // Fallback: se < 3 cidades reais, mostra Top países
  if (cities.length < 3) {
    const countryMap = new Map<string, number>()
    for (const r of rows) {
      const k = r.country
      const label = k && k !== '__unknown__' && k !== 'unknown' ? k : '(não informado)'
      countryMap.set(label, (countryMap.get(label) ?? 0) + Number(r.users || 0))
    }
    const countries = Array.from(countryMap.entries())
      .map(([label, users]) => ({ label, users }))
      .sort((a, b) => b.users - a.users)
    return (
      <DemoTable
        title="Top países"
        rows={countries}
        totalUsers={totalUsers}
        eyebrow="geografia · fallback de cidades"
        limit={limit}
      />
    )
  }

  return (
    <DemoTable
      title="Top cidades"
      rows={cities}
      totalUsers={totalUsers}
      eyebrow="geografia"
      limit={limit}
    />
  )
}
