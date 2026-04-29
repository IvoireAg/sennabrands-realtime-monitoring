import { ga4, PROPERTY_PATH } from './ga4'
import type {
  TrafficDailyRow,
  DemographicsDailyRow,
  AcquisitionDailyRow,
  PagesDailyRow,
} from '@/types/ga4'

type DateRange = { startDate: string; endDate: string }

const num = (v: string | undefined | null) => Number(v ?? 0)

export async function extractTrafficDaily(range: DateRange): Promise<TrafficDailyRow[]> {
  const [resp] = await ga4().runReport({
    property: PROPERTY_PATH,
    dateRanges: [range],
    dimensions: [
      { name: 'date' },
      { name: 'sessionDefaultChannelGroup' },
      { name: 'sessionSource' },
      { name: 'sessionMedium' },
      { name: 'deviceCategory' },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'conversions' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
    ],
    limit: 100000,
  })
  return (resp.rows ?? []).map((r) => {
    const d = r.dimensionValues?.map((x) => x.value ?? '') ?? []
    const m = r.metricValues?.map((x) => x.value ?? '0') ?? []
    return {
      date: `${d[0].slice(0, 4)}-${d[0].slice(4, 6)}-${d[0].slice(6, 8)}`,
      channel: d[1] || '(other)',
      source: d[2] || '(direct)',
      medium: d[3] || '(none)',
      device: d[4] || 'desktop',
      sessions: num(m[0]),
      users: num(m[1]),
      new_users: num(m[2]),
      pageviews: num(m[3]),
      conversions: num(m[4]),
      bounce_rate: num(m[5]),
      avg_session_duration: num(m[6]),
    }
  })
}

export async function extractDemographicsDaily(range: DateRange): Promise<DemographicsDailyRow[]> {
  const [resp] = await ga4().runReport({
    property: PROPERTY_PATH,
    dateRanges: [range],
    dimensions: [
      { name: 'date' },
      { name: 'country' },
      { name: 'city' },
      { name: 'language' },
      { name: 'userAgeBracket' },
      { name: 'userGender' },
      { name: 'deviceCategory' },
    ],
    metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
    limit: 100000,
  })
  return (resp.rows ?? []).map((r) => {
    const d = r.dimensionValues?.map((x) => x.value ?? '') ?? []
    const m = r.metricValues?.map((x) => x.value ?? '0') ?? []
    return {
      date: `${d[0].slice(0, 4)}-${d[0].slice(4, 6)}-${d[0].slice(6, 8)}`,
      country: d[1] || '__unknown__',
      city: d[2] || '__unknown__',
      language: d[3] || '__unknown__',
      age_bracket: d[4] || 'unknown',
      gender: d[5] || 'unknown',
      device: d[6] || 'desktop',
      users: num(m[0]),
      sessions: num(m[1]),
    }
  })
}

export async function extractAcquisitionDaily(range: DateRange): Promise<AcquisitionDailyRow[]> {
  const [resp] = await ga4().runReport({
    property: PROPERTY_PATH,
    dateRanges: [range],
    dimensions: [
      { name: 'date' },
      { name: 'sessionDefaultChannelGroup' },
      { name: 'sessionSource' },
      { name: 'sessionMedium' },
      { name: 'sessionCampaignName' },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'conversions' },
    ],
    limit: 100000,
  })
  return (resp.rows ?? []).map((r) => {
    const d = r.dimensionValues?.map((x) => x.value ?? '') ?? []
    const m = r.metricValues?.map((x) => x.value ?? '0') ?? []
    return {
      date: `${d[0].slice(0, 4)}-${d[0].slice(4, 6)}-${d[0].slice(6, 8)}`,
      channel: d[1] || '(other)',
      source: d[2] || '(direct)',
      medium: d[3] || '(none)',
      campaign: d[4] || '(not set)',
      sessions: num(m[0]),
      users: num(m[1]),
      new_users: num(m[2]),
      conversions: num(m[3]),
    }
  })
}

export async function extractPagesDaily(range: DateRange): Promise<PagesDailyRow[]> {
  const [resp] = await ga4().runReport({
    property: PROPERTY_PATH,
    dateRanges: [range],
    dimensions: [{ name: 'date' }, { name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'totalUsers' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
      { name: 'sessions' },
    ],
    limit: 100000,
  })

  // GA4 pode retornar múltiplas linhas com mesmo (date, pagePath) quando o
  // pageTitle variou no mesmo dia (mudança de <title>, redirects, etc).
  // A PK do Supabase é (date, page_path), então deduplica por essa chave.
  //
  // Importante: averageSessionDuration e bounceRate são métricas POR SESSÃO,
  // então a ponderação correta ao agregar é por `sessions` — ponderar por
  // `pageviews` distorce páginas com muitas views/sessão.
  type DedupRow = PagesDailyRow & { _topTitlePV: number; _sessions: number }
  const dedup = new Map<string, DedupRow>()

  for (const r of resp.rows ?? []) {
    const d = r.dimensionValues?.map((x) => x.value ?? '') ?? []
    const m = r.metricValues?.map((x) => x.value ?? '0') ?? []
    const date = `${d[0].slice(0, 4)}-${d[0].slice(4, 6)}-${d[0].slice(6, 8)}`
    const page_path = d[1] || '/'
    const page_title = d[2] || null
    const pageviews = num(m[0])
    const unique_pageviews = num(m[1])
    const avg_time = num(m[2])
    const bounce = num(m[3])
    const sessions = num(m[4])

    const key = `${date}|${page_path}`
    const prev = dedup.get(key)
    if (!prev) {
      dedup.set(key, {
        date,
        page_path,
        page_title,
        pageviews,
        unique_pageviews,
        avg_time_on_page: avg_time,
        exit_rate: 0,
        bounce_rate: bounce,
        _topTitlePV: pageviews,
        _sessions: sessions,
      })
      continue
    }

    const totalSessions = prev._sessions + sessions
    prev.avg_time_on_page = totalSessions
      ? (prev.avg_time_on_page * prev._sessions + avg_time * sessions) / totalSessions
      : 0
    prev.bounce_rate = totalSessions
      ? (prev.bounce_rate * prev._sessions + bounce * sessions) / totalSessions
      : 0
    prev.pageviews += pageviews
    prev.unique_pageviews += unique_pageviews
    prev._sessions = totalSessions

    // Preserva o título da variante mais pesada (mais pageviews) — útil
    // quando o mesmo path teve mudança de <title> e queremos o predominante.
    if (pageviews > prev._topTitlePV) {
      prev.page_title = page_title
      prev._topTitlePV = pageviews
    }
  }

  return [...dedup.values()].map((row) => {
    const { _topTitlePV: _t, _sessions: _s, ...clean } = row
    void _t
    void _s
    return clean
  })
}

export async function extractEventsDaily(range: DateRange) {
  const [resp] = await ga4().runReport({
    property: PROPERTY_PATH,
    dateRanges: [range],
    dimensions: [{ name: 'date' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
    limit: 100000,
  })
  return (resp.rows ?? []).map((r) => {
    const d = r.dimensionValues?.map((x) => x.value ?? '') ?? []
    const m = r.metricValues?.map((x) => x.value ?? '0') ?? []
    return {
      date: `${d[0].slice(0, 4)}-${d[0].slice(4, 6)}-${d[0].slice(6, 8)}`,
      event_name: d[1] || 'unknown',
      event_count: num(m[0]),
      users: num(m[1]),
    }
  })
}

export async function extractRealtime() {
  const [resp] = await ga4().runRealtimeReport({
    property: PROPERTY_PATH,
    dimensions: [
      { name: 'minutesAgo' },
      { name: 'country' },
      { name: 'deviceCategory' },
      { name: 'unifiedScreenName' },
    ],
    metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
    limit: 10000,
  })
  return resp.rows ?? []
}
