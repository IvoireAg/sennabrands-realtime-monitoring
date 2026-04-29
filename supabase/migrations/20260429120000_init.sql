-- ====================================================================
-- Senna Brands Realtime Monitoring — Schema inicial
-- ====================================================================
-- Tabelas:
--   traffic_hourly      Tráfego por hora (rolling 14 dias) — eventos / curto prazo
--   traffic_daily       Tráfego por dia (90+ dias)
--   demographics_daily  Demografia por dia (idade, gênero, país, cidade, idioma)
--   acquisition_daily   Aquisição por dia (channel, source, medium, campaign)
--   pages_daily         Top pages por dia (path, pageviews, tempo, exit rate)
--   events_daily        Eventos custom por dia
--   ingestion_log       Log de execuções da ingestão
--
-- Auth: RLS gate por domínio de e-mail (@ivoire.ag, @senna.com).
--       Service role bypass para ingestão.
-- ====================================================================

-- --- Helper: usuário autenticado tem domínio permitido? -------------
create or replace function public.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (auth.jwt()->>'email') ilike '%@ivoire.ag' OR
    (auth.jwt()->>'email') ilike '%@senna.com',
    false
  );
$$;

-- --- traffic_hourly --------------------------------------------------
create table if not exists public.traffic_hourly (
  date_hour timestamptz not null,
  source text not null default '(direct)',
  medium text not null default '(none)',
  channel text not null default '(other)',
  device text not null default 'desktop',
  country text not null default '__unknown__',
  sessions int not null default 0,
  users int not null default 0,
  new_users int not null default 0,
  pageviews int not null default 0,
  avg_session_duration numeric not null default 0,
  bounce_rate numeric not null default 0,
  conversions int not null default 0,
  ingested_at timestamptz not null default now(),
  primary key (date_hour, source, medium, device, country)
);
create index if not exists traffic_hourly_date_idx on public.traffic_hourly (date_hour desc);

-- --- traffic_daily ---------------------------------------------------
create table if not exists public.traffic_daily (
  date date not null,
  channel text not null default '(other)',
  source text not null default '(direct)',
  medium text not null default '(none)',
  device text not null default 'desktop',
  sessions int not null default 0,
  users int not null default 0,
  new_users int not null default 0,
  pageviews int not null default 0,
  conversions int not null default 0,
  bounce_rate numeric not null default 0,
  avg_session_duration numeric not null default 0,
  ingested_at timestamptz not null default now(),
  primary key (date, channel, source, medium, device)
);
create index if not exists traffic_daily_date_idx on public.traffic_daily (date desc);

-- --- demographics_daily ---------------------------------------------
create table if not exists public.demographics_daily (
  date date not null,
  country text not null default '__unknown__',
  city text not null default '__unknown__',
  language text not null default '__unknown__',
  age_bracket text not null default 'unknown',
  gender text not null default 'unknown',
  device text not null default 'desktop',
  users int not null default 0,
  sessions int not null default 0,
  ingested_at timestamptz not null default now(),
  primary key (date, country, city, language, age_bracket, gender, device)
);
create index if not exists demographics_daily_date_idx on public.demographics_daily (date desc);
create index if not exists demographics_daily_country_idx on public.demographics_daily (country);

-- --- acquisition_daily ----------------------------------------------
create table if not exists public.acquisition_daily (
  date date not null,
  channel text not null,
  source text not null,
  medium text not null,
  campaign text not null default '(not set)',
  sessions int not null default 0,
  users int not null default 0,
  new_users int not null default 0,
  conversions int not null default 0,
  ingested_at timestamptz not null default now(),
  primary key (date, channel, source, medium, campaign)
);
create index if not exists acquisition_daily_date_idx on public.acquisition_daily (date desc);

-- --- pages_daily -----------------------------------------------------
create table if not exists public.pages_daily (
  date date not null,
  page_path text not null,
  page_title text,
  pageviews int not null default 0,
  unique_pageviews int not null default 0,
  avg_time_on_page numeric not null default 0,
  exit_rate numeric not null default 0,
  bounce_rate numeric not null default 0,
  ingested_at timestamptz not null default now(),
  primary key (date, page_path)
);
create index if not exists pages_daily_date_idx on public.pages_daily (date desc);

-- --- events_daily ----------------------------------------------------
create table if not exists public.events_daily (
  date date not null,
  event_name text not null,
  event_count int not null default 0,
  users int not null default 0,
  ingested_at timestamptz not null default now(),
  primary key (date, event_name)
);
create index if not exists events_daily_date_idx on public.events_daily (date desc);

-- --- ingestion_log ---------------------------------------------------
create table if not exists public.ingestion_log (
  id bigserial primary key,
  job text not null,
  status text not null,                         -- 'running' | 'success' | 'error'
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_upserted int,
  error text
);

-- ====================================================================
-- RLS — leitura apenas para usuários autenticados com domínio permitido
-- (writes só via service role, que bypassa RLS)
-- ====================================================================

alter table public.traffic_hourly      enable row level security;
alter table public.traffic_daily       enable row level security;
alter table public.demographics_daily  enable row level security;
alter table public.acquisition_daily   enable row level security;
alter table public.pages_daily         enable row level security;
alter table public.events_daily        enable row level security;
alter table public.ingestion_log       enable row level security;

create policy "allowed_users_read" on public.traffic_hourly      for select to authenticated using (public.is_allowed_user());
create policy "allowed_users_read" on public.traffic_daily       for select to authenticated using (public.is_allowed_user());
create policy "allowed_users_read" on public.demographics_daily  for select to authenticated using (public.is_allowed_user());
create policy "allowed_users_read" on public.acquisition_daily   for select to authenticated using (public.is_allowed_user());
create policy "allowed_users_read" on public.pages_daily         for select to authenticated using (public.is_allowed_user());
create policy "allowed_users_read" on public.events_daily        for select to authenticated using (public.is_allowed_user());
create policy "allowed_users_read" on public.ingestion_log       for select to authenticated using (public.is_allowed_user());
