import { NextResponse } from 'next/server'
import { ga4, PROPERTY_PATH } from '@/lib/ga4'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CACHE_TTL_MS = 30_000
const RATE_LIMIT_COOLDOWN_MS = 60_000
const HOURS_BACK = 12

export type RecentFlowPoint = {
  dateHour: string // 'YYYYMMDDHH'
  sessions: number
  users: number
  pageviews: number
}

export type RecentFlowResponse = {
  points: RecentFlowPoint[]
  fetchedAt: string
}

type CacheState =
  | { kind: 'snapshot'; data: RecentFlowResponse; expiresAt: number }
  | { kind: 'cooldown'; until: number; retryAfterMs: number }

const g = globalThis as typeof globalThis & {
  __recentFlowCache?: CacheState | null
}

function getCache(): CacheState | null {
  const c = g.__recentFlowCache ?? null
  if (!c) return null
  const now = Date.now()
  if (c.kind === 'snapshot' && c.expiresAt > now) return c
  if (c.kind === 'cooldown' && c.until > now) return c
  return null
}

function setCache(state: CacheState | null): void {
  g.__recentFlowCache = state
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

  // Pegamos hoje + ontem (cobre janela de 12h cruzando meia-noite local)
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60_000)

  try {
    const [resp] = await ga4().runReport({
      property: PROPERTY_PATH,
      dateRanges: [{ startDate: ymd(yesterday), endDate: ymd(now) }],
      dimensions: [{ name: 'dateHour' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
      ],
      orderBys: [{ dimension: { dimensionName: 'dateHour' } }],
      limit: 100,
    })

    const allPoints: RecentFlowPoint[] = (resp.rows ?? []).map((r) => ({
      dateHour: r.dimensionValues?.[0]?.value ?? '',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      users: Number(r.metricValues?.[1]?.value ?? 0),
      pageviews: Number(r.metricValues?.[2]?.value ?? 0),
    }))

    // Pegamos os últimos HOURS_BACK pontos (já ordenados ascending pelo orderBys).
    // Robusto a timezone: GA4 retorna no fuso do property; usar últimos N evita
    // mismatch com clock UTC do Vercel.
    const points = allPoints.slice(-HOURS_BACK)

    const data: RecentFlowResponse = {
      points,
      fetchedAt: new Date().toISOString(),
    }

    setCache({ kind: 'snapshot', data, expiresAt: Date.now() + CACHE_TTL_MS })
    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } })
  } catch (e) {
    console.error('[recent-flow] failed:', e)
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
