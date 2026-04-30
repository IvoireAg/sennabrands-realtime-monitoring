import { NextResponse } from 'next/server'
import { ga4, PROPERTY_PATH } from '@/lib/ga4'
import type { RealtimeSnapshot } from '@/types/ga4'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Cache em memória dual:
//   - 'snapshot': resposta válida cacheada por 8s. 1 chamada GA4 por janela,
//     independente de quantos clients abrirem o painel simultaneamente.
//   - 'cooldown': estado de rate limit cacheado pela duração do retry-after.
//     Sem isso, durante 60s todos os clients individualmente re-batem o GA4
//     mesmo já tendo recebido 429 — o que mantém quota estourada eterno.
//
// `globalThis` é usado para sobreviver ao HMR do Next dev (que re-avalia o
// módulo e zeraria `let cache`).

const CACHE_TTL_MS = 15_000
const RATE_LIMIT_COOLDOWN_MS = 60_000

type CacheState =
  | { kind: 'snapshot'; snapshot: RealtimeSnapshot; expiresAt: number }
  | { kind: 'cooldown'; until: number; retryAfterMs: number }

const g = globalThis as typeof globalThis & {
  __realtimeCache?: CacheState | null
}

function getCache(): CacheState | null {
  const c = g.__realtimeCache ?? null
  if (!c) return null
  const now = Date.now()
  if (c.kind === 'snapshot' && c.expiresAt > now) return c
  if (c.kind === 'cooldown' && c.until > now) return c
  return null
}

function setCache(state: CacheState | null): void {
  g.__realtimeCache = state
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
    blob.includes('rateLimitExceeded') ||
    blob.includes('Exhausted')
  ) {
    return true
  }
  if (e.cause) return isRateLimitError(e.cause)
  return false
}

export async function GET() {
  const cached = getCache()
  if (cached?.kind === 'snapshot') {
    return NextResponse.json(cached.snapshot, {
      headers: { 'Cache-Control': 'no-store', 'X-Cache': 'HIT' },
    })
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

  try {
    const [
      [byMinuteResp],
      [byCountryResp],
      [byDeviceResp],
      [topPagesResp],
    ] = await Promise.all([
      ga4().runRealtimeReport({
        property: PROPERTY_PATH,
        dimensions: [{ name: 'minutesAgo' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 30,
      }),
      ga4().runRealtimeReport({
        property: PROPERTY_PATH,
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      }),
      ga4().runRealtimeReport({
        property: PROPERTY_PATH,
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 10,
      }),
      ga4().runRealtimeReport({
        property: PROPERTY_PATH,
        dimensions: [{ name: 'unifiedScreenName' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      }),
    ])

    const totalActiveUsers = (byCountryResp.rows ?? []).reduce(
      (acc, r) => acc + Number(r.metricValues?.[0]?.value ?? 0),
      0,
    )

    const snapshot: RealtimeSnapshot = {
      totalActiveUsers,
      byMinute: (byMinuteResp.rows ?? []).map((r) => ({
        minutesAgo: Number(r.dimensionValues?.[0]?.value ?? 0),
        users: Number(r.metricValues?.[0]?.value ?? 0),
      })),
      byCountry: (byCountryResp.rows ?? []).map((r) => ({
        country: r.dimensionValues?.[0]?.value ?? '__unknown__',
        users: Number(r.metricValues?.[0]?.value ?? 0),
      })),
      byDevice: (byDeviceResp.rows ?? []).map((r) => ({
        device: r.dimensionValues?.[0]?.value ?? 'desktop',
        users: Number(r.metricValues?.[0]?.value ?? 0),
      })),
      topPages: (topPagesResp.rows ?? []).map((r) => ({
        page: r.dimensionValues?.[0]?.value ?? '/',
        users: Number(r.metricValues?.[0]?.value ?? 0),
        views: Number(r.metricValues?.[1]?.value ?? 0),
      })),
      fetchedAt: new Date().toISOString(),
    }

    setCache({ kind: 'snapshot', snapshot, expiresAt: Date.now() + CACHE_TTL_MS })
    return NextResponse.json(snapshot, {
      headers: { 'Cache-Control': 'no-store', 'X-Cache': 'MISS' },
    })
  } catch (e) {
    const err = e as Error & {
      code?: number | string
      details?: string
      reason?: string
      status?: string
    }
    console.error('[realtime] failed:', {
      name: err.name,
      message: err.message,
      code: err.code,
      reason: err.reason,
      status: err.status,
      details: err.details,
    })

    if (isRateLimitError(err)) {
      const wait = RATE_LIMIT_COOLDOWN_MS
      setCache({ kind: 'cooldown', until: Date.now() + wait, retryAfterMs: wait })
      return NextResponse.json(
        {
          error: err.message ?? 'rate limited',
          code: err.code,
          reason: err.reason,
          retryable: true,
          retryAfterMs: wait,
        },
        {
          status: 429,
          headers: { 'Retry-After': Math.ceil(wait / 1000).toString() },
        },
      )
    }

    return NextResponse.json(
      {
        error: err.message ?? 'unknown',
        code: err.code,
        reason: err.reason,
        retryable: false,
      },
      { status: 500 },
    )
  }
}
