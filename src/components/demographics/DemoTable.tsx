import { Card, CardBody, CardEyebrow, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtInt, fmtPct } from '@/lib/format'

type Props = {
  title: string
  rows: { label: string; users: number }[]
  totalUsers: number
  eyebrow: string
  limit?: number
}

export function DemoTable({ title, rows, totalUsers, eyebrow, limit = 8 }: Props) {
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
            {rows.slice(0, limit).map((r) => (
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
