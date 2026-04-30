import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import {
  extractTrafficDaily,
  extractTrafficHourly,
  extractDemographicsDaily,
  extractAcquisitionDaily,
  extractPagesDaily,
  extractEventsDaily,
} from '@/lib/ga4-extract'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300

function authorize(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${expected}`) return true
  const token = new URL(request.url).searchParams.get('token')
  return token === expected
}

function dateRange(daysBack: number) {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - daysBack)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { startDate: fmt(start), endDate: fmt(end) }
}

type StepResult =
  | { ok: true; rows: number }
  | { ok: false; error: string }

function describeError(e: unknown): string {
  if (e instanceof Error) {
    const anyE = e as Error & {
      code?: number | string
      details?: string
      reason?: string
      statusDetails?: unknown
    }
    const parts = [
      `name=${e.name}`,
      anyE.code !== undefined ? `code=${anyE.code}` : null,
      anyE.reason ? `reason=${anyE.reason}` : null,
      anyE.details ? `details=${anyE.details}` : null,
      e.message ? `message=${e.message}` : null,
    ].filter(Boolean)
    return parts.join(' | ')
  }
  if (e && typeof e === 'object') {
    try {
      return `non-error-object: ${JSON.stringify(e)}`
    } catch {
      return 'non-error-object (unserializable)'
    }
  }
  return String(e)
}

async function runStep<T>(
  name: string,
  fn: () => Promise<T[]>,
  upsert: (rows: T[]) => PromiseLike<{ error: { message: string } | null }>,
): Promise<StepResult> {
  try {
    const rows = await fn()
    if (!rows.length) return { ok: true, rows: 0 }
    const { error } = await upsert(rows)
    if (error) {
      console.error(`[ingest] upsert ${name} failed:`, error)
      return { ok: false, error: `upsert: ${error.message}` }
    }
    return { ok: true, rows: rows.length }
  } catch (e) {
    console.error(`[ingest] step ${name} failed:`, e)
    return { ok: false, error: describeError(e) }
  }
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const days = Number(new URL(request.url).searchParams.get('days') ?? '7')
  const range = dateRange(days)
  const supabase = createSupabaseAdminClient()

  const { data: log } = await supabase
    .from('ingestion_log')
    .insert({ job: `ingest_${days}d`, status: 'running' })
    .select('id')
    .single()
  const logId = log?.id

  const results: Record<string, StepResult> = {}

  results.traffic_daily = await runStep(
    'traffic_daily',
    () => extractTrafficDaily(range),
    (rows) => supabase.from('traffic_daily').upsert(rows, { onConflict: 'date,channel,source,medium,device' }),
  )

  // traffic_hourly: rolling window curto (default 14d) — sufficient pra heatmap semanal 7×4
  // e fluxo near-realtime. Ingere a cada cron run (15min) sobrescrevendo via upsert.
  const hourlyRange = dateRange(Math.min(days, 14))
  results.traffic_hourly = await runStep(
    'traffic_hourly',
    () => extractTrafficHourly(hourlyRange),
    (rows) => supabase.from('traffic_hourly').upsert(rows, { onConflict: 'date_hour,source,medium,device,country' }),
  )

  results.demographics_daily = await runStep(
    'demographics_daily',
    () => extractDemographicsDaily(range),
    (rows) =>
      supabase
        .from('demographics_daily')
        .upsert(rows, { onConflict: 'date,country,city,language,age_bracket,gender,device' }),
  )

  results.acquisition_daily = await runStep(
    'acquisition_daily',
    () => extractAcquisitionDaily(range),
    (rows) => supabase.from('acquisition_daily').upsert(rows, { onConflict: 'date,channel,source,medium,campaign' }),
  )

  results.pages_daily = await runStep(
    'pages_daily',
    () => extractPagesDaily(range),
    (rows) => supabase.from('pages_daily').upsert(rows, { onConflict: 'date,page_path' }),
  )

  results.events_daily = await runStep(
    'events_daily',
    () => extractEventsDaily(range),
    (rows) => supabase.from('events_daily').upsert(rows, { onConflict: 'date,event_name' }),
  )

  const totalRows = Object.values(results).reduce(
    (sum, r) => sum + (r.ok ? r.rows : 0),
    0,
  )
  const errored = Object.entries(results).filter(([, r]) => !r.ok).map(([k]) => k)
  const status = errored.length === 0 ? 'success' : errored.length < 6 ? 'partial' : 'error'

  if (logId) {
    await supabase
      .from('ingestion_log')
      .update({
        status: status === 'success' ? 'success' : 'error',
        finished_at: new Date().toISOString(),
        rows_upserted: totalRows,
        error: errored.length ? `Failed: ${errored.join(', ')}` : null,
      })
      .eq('id', logId)
  }

  const httpStatus = status === 'success' ? 200 : status === 'partial' ? 207 : 500
  return NextResponse.json(
    {
      ok: status !== 'error',
      status,
      range,
      total: totalRows,
      results,
    },
    { status: httpStatus },
  )
}
