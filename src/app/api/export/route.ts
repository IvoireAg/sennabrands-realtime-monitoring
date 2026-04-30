import { NextResponse, type NextRequest } from 'next/server'
import {
  getTrafficDaily,
  getAcquisitionDaily,
  getDemographicsDaily,
  getEventsDaily,
  getPagesDaily,
} from '@/lib/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DATASETS = ['traffic', 'acquisition', 'demographics', 'events', 'pages'] as const
type Dataset = (typeof DATASETS)[number]

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Array.from(
    rows.reduce((acc, r) => {
      Object.keys(r).forEach((k) => acc.add(k))
      return acc
    }, new Set<string>()),
  )
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r[h])).join(','))
  }
  return lines.join('\n')
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const dataset = url.searchParams.get('dataset') as Dataset | null
  const days = Number(url.searchParams.get('days') ?? '30')

  if (!dataset || !DATASETS.includes(dataset)) {
    return NextResponse.json(
      { error: `dataset inválido. opções: ${DATASETS.join(', ')}` },
      { status: 400 },
    )
  }

  let rows: Record<string, unknown>[] = []
  try {
    switch (dataset) {
      case 'traffic':
        rows = (await getTrafficDaily(days)) as unknown as Record<string, unknown>[]
        break
      case 'acquisition':
        rows = (await getAcquisitionDaily(days)) as unknown as Record<string, unknown>[]
        break
      case 'demographics':
        rows = (await getDemographicsDaily(days)) as unknown as Record<string, unknown>[]
        break
      case 'events':
        rows = (await getEventsDaily(days)) as unknown as Record<string, unknown>[]
        break
      case 'pages':
        rows = (await getPagesDaily(days)) as unknown as Record<string, unknown>[]
        break
    }
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  const csv = toCSV(rows)
  const today = new Date().toISOString().slice(0, 10)
  const filename = `senna-${dataset}-${days}d-${today}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
