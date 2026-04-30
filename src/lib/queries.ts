import { createSupabaseServerClient } from './supabase/server'

const fmt = (d: Date) => d.toISOString().slice(0, 10)

export function dateRangeBack(days: number) {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  return { startDate: fmt(start), endDate: fmt(end) }
}

export async function getTrafficDaily(daysBack = 30) {
  const supabase = await createSupabaseServerClient()
  const { startDate, endDate } = dateRangeBack(daysBack)
  const { data, error } = await supabase
    .from('traffic_daily')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getTrafficHourly(daysBack = 7) {
  const supabase = await createSupabaseServerClient()
  const since = new Date()
  since.setDate(since.getDate() - daysBack)
  const { data, error } = await supabase
    .from('traffic_hourly')
    .select('*')
    .gte('date_hour', since.toISOString())
    .order('date_hour', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getAcquisitionDaily(daysBack = 30) {
  const supabase = await createSupabaseServerClient()
  const { startDate, endDate } = dateRangeBack(daysBack)
  const { data, error } = await supabase
    .from('acquisition_daily')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('sessions', { ascending: false })
    .limit(500)
  if (error) throw error
  return data ?? []
}

export async function getDemographicsDaily(daysBack = 30) {
  const supabase = await createSupabaseServerClient()
  const { startDate, endDate } = dateRangeBack(daysBack)
  const { data, error } = await supabase
    .from('demographics_daily')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('users', { ascending: false })
    .limit(2000)
  if (error) throw error
  return data ?? []
}

export async function getPagesDaily(daysBack = 30) {
  const supabase = await createSupabaseServerClient()
  const { startDate, endDate } = dateRangeBack(daysBack)
  const { data, error } = await supabase
    .from('pages_daily')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('pageviews', { ascending: false })
    .limit(50)
  if (error) throw error
  return data ?? []
}

export async function getEventsDaily(daysBack = 30) {
  const supabase = await createSupabaseServerClient()
  const { startDate, endDate } = dateRangeBack(daysBack)
  const { data, error } = await supabase
    .from('events_daily')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('event_count', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getLastIngestion() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('ingestion_log')
    .select('*')
    .eq('status', 'success')
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}
