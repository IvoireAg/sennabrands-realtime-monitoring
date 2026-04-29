export type RealtimeSnapshot = {
  totalActiveUsers: number
  byMinute: { minutesAgo: number; users: number }[]
  byCountry: { country: string; users: number }[]
  byDevice: { device: string; users: number }[]
  topPages: { page: string; users: number; views: number }[]
  fetchedAt: string
}

export type TrafficDailyRow = {
  date: string
  channel: string
  source: string
  medium: string
  device: string
  sessions: number
  users: number
  new_users: number
  pageviews: number
  conversions: number
  bounce_rate: number
  avg_session_duration: number
}

export type DemographicsDailyRow = {
  date: string
  country: string
  city: string
  language: string
  age_bracket: string
  gender: string
  device: string
  users: number
  sessions: number
}

export type AcquisitionDailyRow = {
  date: string
  channel: string
  source: string
  medium: string
  campaign: string
  sessions: number
  users: number
  new_users: number
  conversions: number
}

export type PagesDailyRow = {
  date: string
  page_path: string
  page_title: string | null
  pageviews: number
  unique_pageviews: number
  avg_time_on_page: number
  exit_rate: number
  bounce_rate: number
}
