import { NextResponse } from 'next/server'
import { ga4, PROPERTY_PATH } from '@/lib/ga4'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CACHE_TTL_MS = 60_000
const RATE_LIMIT_COOLDOWN_MS = 60_000

export type PulseResponse = {
  hour: number // 0-23 (timezone do GA4 property)
  date: string // 'YYYYMMDD' do "agora"
  yesterdayDate: string // 'YYYYMMDD' usado como referência
  now: { sessions: number; users: number; pageviews: number }
  yesterday: { sessions: number; users: number; pageviews: number }
  delta: {
    sessions: number | null
    users: number | null
    pageviews: number | null
  }
  fetchedAt: string
}

type CacheState =
  | { kind: 'snapshot'; data: PulseResponse; expiresAt: number }
  | { kind: 'cooldown'; until: number; retryAfterMs: number }

const g = globalThis as typeof globalThis & {
  __pulseCache?: CacheState | null
}

function getCache(): CacheState | null {
  const c = g.__pulseCache ?? null
  if (!c) return null
  const now = Date.now()
  if (c.kind === 'snapshot' && c.expiresAt > now) return c
  if (c.kind === 'cooldown' && c.until > now) return c
  return null
}

function setCache(state: CacheState | null): void {
  g.__pulseCache = state
}

function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as {
    code?: number | string
    reason?: string
    status?: string
    message?: string
    details?: string
    cause?: unknown
  }
  const blob = `${e.message ?? ''} ${e.details ?? ''} ${e.reason ?? ''} ${e.status ?? ''}`
  if (
    e.code === 8 ||
    e.code === 429 ||
    e.code === 'RESOURCE_EXHAUSTED' ||
    e.status === 'RESOURCE_EXHAUSTED' ||
    e.reason === 'rateLimitExceeded' ||
    blob.includes('RESOURCE_EXHAUSTED') ||
    blob.includes('rateLimitExceeded')
  ) {
    return true
  }
  if (e.cause) return isRateLimitError(e.cause)
  return false
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function delta(a: number, b: number): number | null {
  return b > 0 ? (a - b) / b : null
}

export async function GET() {
  const cached = getCache()
  if (cached?.kind === 'snapshot') {
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'HIT' } })
  }
  if (cached?.kind === 'cooldown') {
    const wait = Math.max(1000, cached.until - Date.now())
    return NextResponse.json(
      { error: 'GA4 quota exhausted', retryable: true, retryAfterMs: wait },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(wait / 1000).toString(),
          'X-Cache': 'COOLDOWN',
        },
      },
    )
  }

  const now = new Date()
  const dayBefore = new Date(now.getTime() - 48 * 60 * 60_000)

  try {
    const [resp] = await ga4().runReport({
      property: PROPERTY_PATH,
      dateRanges: [{ startDate: ymd(dayBefore), endDate: ymd(now) }],
      dimensions: [{ name: 'date' }, { name: 'hour' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
      ],
      limit: 200,
    })

    type Point = {
      date: string
      hour: number
      sessions: number
      users: number
      pageviews: number
    }
    // GA4 às vezes retorna métricas com decimais por causa de sampling em
    // volumes baixos. Pra display consistente com cards (Math.round na UI),
    // arredondamos no parsing — evita delta tipo +87.5% calculado sobre
    // valores fracionários que aparecem no UI como inteiros.
    const points: Point[] = (resp.rows ?? []).map((r) => ({
      date: r.dimensionValues?.[0]?.value ?? '',
      hour: Number(r.dimensionValues?.[1]?.value ?? 0),
      sessions: Math.round(Number(r.metricValues?.[0]?.value ?? 0)),
      users: Math.round(Number(r.metricValues?.[1]?.value ?? 0)),
      pageviews: Math.round(Number(r.metricValues?.[2]?.value ?? 0)),
    }))

    // Heurística robusta a timezone: o "agora" é o (date, hour) máximo
    // retornado pelo GA4 (que está em timezone do property). "Ontem mesma
    // hora" é o maior date estritamente anterior + mesma hour.
    points.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return b.hour - a.hour
    })

    const todayCurrent = points[0]
    const todayDate = todayCurrent?.date ?? ''
    const currentHour = todayCurrent?.hour ?? 0

    const yesterdayDate =
      points.find((p) => p.date < todayDate)?.date ?? ''

    const ydayCurrent =
      points.find((p) => p.date === yesterdayDate && p.hour === currentHour) ??
      { sessions: 0, users: 0, pageviews: 0 }

    const fallback = { sessions: 0, users: 0, pageviews: 0 }
    const today = todayCurrent ?? fallback

    const data: PulseResponse = {
      hour: currentHour,
      date: todayDate,
      yesterdayDate,
      now: {
        sessions: today.sessions,
        users: today.users,
        pageviews: today.pageviews,
      },
      yesterday: {
        sessions: ydayCurrent.sessions,
        users: ydayCurrent.users,
        pageviews: ydayCurrent.pageviews,
      },
      delta: {
        sessions: delta(today.sessions, ydayCurrent.sessions),
        users: delta(today.users, ydayCurrent.users),
        pageviews: delta(today.pageviews, ydayCurrent.pageviews),
      },
      fetchedAt: new Date().toISOString(),
    }

    setCache({ kind: 'snapshot', data, expiresAt: Date.now() + CACHE_TTL_MS })
    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } })
  } catch (e) {
    console.error('[pulse] failed:', e)
    if (isRateLimitError(e)) {
      const wait = RATE_LIMIT_COOLDOWN_MS
      setCache({ kind: 'cooldown', until: Date.now() + wait, retryAfterMs: wait })
      return NextResponse.json(
        { error: 'rate limited', retryable: true, retryAfterMs: wait },
        {
          status: 429,
          headers: { 'Retry-After': Math.ceil(wait / 1000).toString() },
        },
      )
    }
    const err = e as Error
    return NextResponse.json(
      { error: err.message ?? 'unknown', retryable: false },
      { status: 500 },
    )
  }
}
