#!/usr/bin/env node
/**
 * Pós-mortem do evento Senna Brands de 2026-05-01.
 * Disparado autonomamente via launchd em 2026-05-02 09:07 BRT.
 * Gera relatorio-evento-2026-05-01.{xlsx,pptx} na raiz do projeto.
 *
 * Uso manual:
 *   node scripts/postmortem-2026-05-01.mjs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import * as XLSX from 'xlsx'
import pptxgen from 'pptxgenjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const EVENT_DATE = '2026-05-01'
const BASELINE_DATE = '2026-04-30'
const EVENT_START_ISO = '2026-05-01T00:00:00-03:00'
const EVENT_END_ISO = '2026-05-02T00:00:00-03:00'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

const log = (...args) => console.log(`[postmortem ${new Date().toISOString()}]`, ...args)

const sum = (rows, key) => rows.reduce((s, r) => s + Number(r[key] ?? 0), 0)
const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('pt-BR')
const fmtPct = (a, b) => {
  if (!b) return '—'
  const d = ((a - b) / b) * 100
  const sign = d >= 0 ? '+' : ''
  return `${sign}${d.toFixed(1)}%`
}

async function fetchAll(table, filterCol, op, val, opts = {}) {
  let q = supabase.from(table).select('*')
  if (filterCol) q = q[op](filterCol, val)
  if (opts.lt) q = q.lt(opts.lt[0], opts.lt[1])
  if (opts.order) q = q.order(opts.order[0], { ascending: opts.order[1] !== false })
  if (opts.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw new Error(`${table}: ${error.message}`)
  return data ?? []
}

async function analyzeCronHealth() {
  log('Análise 1: Saúde do cron de ingestão')
  const runs = await fetchAll('ingestion_log', 'started_at', 'gte', EVENT_START_ISO, {
    lt: ['started_at', EVENT_END_ISO],
    order: ['started_at', true],
  })

  const total = runs.length
  const ok = runs.filter((r) => r.status === 'success').length
  const failed = runs.filter((r) => r.status === 'error').length
  const totalRows = sum(runs, 'rows_upserted')

  let maxGapMin = 0
  for (let i = 1; i < runs.length; i++) {
    const prev = new Date(runs[i - 1].started_at).getTime()
    const cur = new Date(runs[i].started_at).getTime()
    const gapMin = (cur - prev) / 60_000
    if (gapMin > maxGapMin) maxGapMin = gapMin
  }

  return {
    total,
    expected: 96,
    ok,
    failed,
    successRate: total ? ((ok / total) * 100).toFixed(1) : '0',
    totalRows,
    maxGapMin: maxGapMin.toFixed(1),
    runs,
  }
}

async function analyzeVolume() {
  log('Análise 2: Volume de tráfego')
  const [traffic, baseline, hourly, demo, acq, pages, events] = await Promise.all([
    fetchAll('traffic_daily', 'date', 'eq', EVENT_DATE),
    fetchAll('traffic_daily', 'date', 'eq', BASELINE_DATE),
    fetchAll('traffic_hourly', 'date_hour', 'gte', EVENT_START_ISO, {
      lt: ['date_hour', EVENT_END_ISO],
      order: ['date_hour', true],
    }),
    fetchAll('demographics_daily', 'date', 'eq', EVENT_DATE),
    fetchAll('acquisition_daily', 'date', 'eq', EVENT_DATE, {
      order: ['sessions', false],
      limit: 10,
    }),
    fetchAll('pages_daily', 'date', 'eq', EVENT_DATE, {
      order: ['pageviews', false],
      limit: 10,
    }),
    fetchAll('events_daily', 'date', 'eq', EVENT_DATE, {
      order: ['event_count', false],
      limit: 10,
    }),
  ])

  const eventKpis = {
    sessions: sum(traffic, 'sessions'),
    users: sum(traffic, 'users'),
    new_users: sum(traffic, 'new_users'),
    pageviews: sum(traffic, 'pageviews'),
    conversions: sum(traffic, 'conversions'),
  }
  const baseKpis = {
    sessions: sum(baseline, 'sessions'),
    users: sum(baseline, 'users'),
    new_users: sum(baseline, 'new_users'),
    pageviews: sum(baseline, 'pageviews'),
    conversions: sum(baseline, 'conversions'),
  }

  // Pico do dia: hora com max sessions agregado por hora ISO
  const byHour = new Map()
  for (const r of hourly) {
    const hourIso = r.date_hour.slice(0, 13)
    byHour.set(hourIso, (byHour.get(hourIso) ?? 0) + Number(r.sessions ?? 0))
  }
  const hourSeries = [...byHour.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const peak = hourSeries.reduce(
    (m, [iso, s]) => (s > m.sessions ? { hour: iso, sessions: s } : m),
    { hour: '—', sessions: 0 },
  )

  return {
    eventKpis,
    baseKpis,
    peak,
    hourSeries,
    topSources: acq.slice(0, 5).map((r) => ({
      source: `${r.source} / ${r.medium}`,
      sessions: Number(r.sessions ?? 0),
      users: Number(r.users ?? 0),
    })),
    topPages: pages.slice(0, 5).map((r) => ({
      path: r.page_path,
      views: Number(r.pageviews ?? 0),
    })),
    topEvents: events.slice(0, 5).map((r) => ({
      name: r.event_name,
      count: Number(r.event_count ?? 0),
    })),
    demoRows: demo.length,
  }
}

async function analyze429() {
  log('Análise 3: Erros 429 / quota GA4')

  // Tentar Vercel CLI primeiro
  let cliErrors = []
  let cliAvailable = false
  try {
    const cmd = `cd "${PROJECT_ROOT}" && vercel logs senna-brands-monitoring --since 2026-05-01T00:00:00Z --until 2026-05-02T03:00:00Z 2>&1 | grep -E "429|RESOURCE_EXHAUSTED|quota" | head -200`
    const out = execSync(cmd, { encoding: 'utf8', timeout: 60_000 })
    cliAvailable = true
    cliErrors = out.split('\n').filter(Boolean)
  } catch (e) {
    log('Vercel CLI indisponível ou sem permissão pra esse projeto:', e.message?.slice(0, 200))
  }

  // Fallback: ingestion_log com erros
  const errorLogs = await fetchAll('ingestion_log', 'started_at', 'gte', EVENT_START_ISO, {
    lt: ['started_at', EVENT_END_ISO],
  })
  const ingestionErrors = errorLogs.filter(
    (r) =>
      r.status === 'error' ||
      (r.error &&
        (r.error.toLowerCase().includes('429') ||
          r.error.toLowerCase().includes('exhausted') ||
          r.error.toLowerCase().includes('quota'))),
  )

  return {
    cliAvailable,
    cliErrorsCount: cliErrors.length,
    cliErrorsSample: cliErrors.slice(0, 20),
    ingestionErrorsCount: ingestionErrors.length,
    ingestionErrors,
  }
}

function generateXlsx(cron, vol, errors) {
  log('Gerando XLSX')
  const wb = XLSX.utils.book_new()

  // Sheet 1 — Cron Health
  const cronRows = [
    ['Total runs', cron.total, `(esperado ~${cron.expected})`],
    ['Sucessos', cron.ok, ''],
    ['Falhas', cron.failed, ''],
    ['Taxa de sucesso', `${cron.successRate}%`, ''],
    ['Total rows upserted', cron.totalRows, ''],
    ['Maior gap entre runs (min)', cron.maxGapMin, ''],
    [],
    ['started_at', 'finished_at', 'status', 'rows_upserted', 'error'],
    ...cron.runs.map((r) => [
      r.started_at,
      r.finished_at ?? '',
      r.status,
      r.rows_upserted ?? 0,
      r.error ?? '',
    ]),
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(cronRows)
  XLSX.utils.book_append_sheet(wb, ws1, 'Cron Health')

  // Sheet 2 — Volume Evento
  const volRows = [
    ['KPI', '2026-05-01 (evento)', '2026-04-30 (baseline)', 'Δ %'],
    ['Sessões', vol.eventKpis.sessions, vol.baseKpis.sessions, fmtPct(vol.eventKpis.sessions, vol.baseKpis.sessions)],
    ['Usuários', vol.eventKpis.users, vol.baseKpis.users, fmtPct(vol.eventKpis.users, vol.baseKpis.users)],
    ['Novos usuários', vol.eventKpis.new_users, vol.baseKpis.new_users, fmtPct(vol.eventKpis.new_users, vol.baseKpis.new_users)],
    ['Pageviews', vol.eventKpis.pageviews, vol.baseKpis.pageviews, fmtPct(vol.eventKpis.pageviews, vol.baseKpis.pageviews)],
    ['Conversões', vol.eventKpis.conversions, vol.baseKpis.conversions, fmtPct(vol.eventKpis.conversions, vol.baseKpis.conversions)],
    [],
    ['Hora do pico', vol.peak.hour, '', ''],
    ['Sessões no pico', vol.peak.sessions, '', ''],
    [],
    ['Top 5 fontes/médias', '', '', ''],
    ['source/medium', 'sessions', 'users', ''],
    ...vol.topSources.map((s) => [s.source, s.sessions, s.users, '']),
    [],
    ['Top 5 páginas', '', '', ''],
    ['path', 'pageviews', '', ''],
    ...vol.topPages.map((p) => [p.path, p.views, '', '']),
    [],
    ['Top 5 eventos', '', '', ''],
    ['event_name', 'count', '', ''],
    ...vol.topEvents.map((e) => [e.name, e.count, '', '']),
    [],
    ['Curva por hora (sessões)', '', '', ''],
    ['hora', 'sessions', '', ''],
    ...vol.hourSeries.map(([h, s]) => [h, s, '', '']),
  ]
  const ws2 = XLSX.utils.aoa_to_sheet(volRows)
  XLSX.utils.book_append_sheet(wb, ws2, 'Volume Evento')

  // Sheet 3 — Erros 429
  const errRows = [
    ['Vercel CLI disponível?', errors.cliAvailable ? 'sim' : 'não'],
    ['Erros 429 detectados (CLI)', errors.cliErrorsCount],
    ['Erros de ingestão (Supabase)', errors.ingestionErrorsCount],
    [],
    ['Amostra erros CLI (top 20)'],
    ...errors.cliErrorsSample.map((line) => [line]),
    [],
    ['Erros ingestion_log'],
    ['started_at', 'job', 'status', 'error'],
    ...errors.ingestionErrors.map((r) => [r.started_at, r.job, r.status, r.error ?? '']),
  ]
  const ws3 = XLSX.utils.aoa_to_sheet(errRows)
  XLSX.utils.book_append_sheet(wb, ws3, 'Erros 429')

  const out = path.join(PROJECT_ROOT, 'relatorio-evento-2026-05-01.xlsx')
  XLSX.writeFile(wb, out)
  return out
}

async function generatePptx(cron, vol, errors) {
  log('Gerando PPTX')
  const p = new pptxgen()
  p.layout = 'LAYOUT_WIDE'
  p.title = 'Pós-mortem · Senna Brands · 2026-05-01'

  const COLOR = { yellow: 'FFFF02', ink: '282828', stone: '999999', ivory: 'F5F2E8' }

  // Slide 1 — Capa
  const s1 = p.addSlide()
  s1.background = { color: COLOR.ink }
  s1.addText('PÓS-MORTEM', {
    x: 0.5, y: 1.2, w: 12, h: 0.6,
    color: COLOR.yellow, fontSize: 24, bold: true, fontFace: 'Helvetica',
  })
  s1.addText('Evento Senna Brands · 2026-05-01', {
    x: 0.5, y: 2, w: 12, h: 1.5,
    color: COLOR.ivory, fontSize: 56, bold: true, fontFace: 'Helvetica',
  })
  s1.addText(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} · Ivoire / Senna Brands`, {
    x: 0.5, y: 6.2, w: 12, h: 0.4, color: COLOR.stone, fontSize: 14, fontFace: 'Helvetica',
  })

  // Slide 2 — KPIs
  const s2 = p.addSlide()
  s2.background = { color: COLOR.ink }
  s2.addText('KPIs do dia · vs baseline (dia anterior)', {
    x: 0.5, y: 0.3, w: 12, h: 0.5, color: COLOR.yellow, fontSize: 18, bold: true,
  })
  const kpis = [
    ['Sessões', vol.eventKpis.sessions, fmtPct(vol.eventKpis.sessions, vol.baseKpis.sessions)],
    ['Usuários', vol.eventKpis.users, fmtPct(vol.eventKpis.users, vol.baseKpis.users)],
    ['Pageviews', vol.eventKpis.pageviews, fmtPct(vol.eventKpis.pageviews, vol.baseKpis.pageviews)],
    ['Conversões', vol.eventKpis.conversions, fmtPct(vol.eventKpis.conversions, vol.baseKpis.conversions)],
  ]
  kpis.forEach(([label, value, delta], i) => {
    const x = 0.5 + (i * 3.1)
    s2.addShape(p.ShapeType.rect, { x, y: 1.2, w: 2.9, h: 4.5, fill: { color: COLOR.yellow } })
    s2.addText(label.toUpperCase(), {
      x: x + 0.2, y: 1.4, w: 2.5, h: 0.4, color: COLOR.ink, fontSize: 12, bold: true,
    })
    s2.addText(fmtInt(value), {
      x: x + 0.2, y: 2.2, w: 2.5, h: 1.8, color: COLOR.ink, fontSize: 48, bold: true,
    })
    s2.addText(`Δ ${delta} vs ${BASELINE_DATE}`, {
      x: x + 0.2, y: 4.5, w: 2.5, h: 0.4, color: COLOR.ink, fontSize: 12,
    })
  })
  s2.addText(`Pico em ${vol.peak.hour} com ${fmtInt(vol.peak.sessions)} sessões na hora`, {
    x: 0.5, y: 6.2, w: 12, h: 0.4, color: COLOR.stone, fontSize: 14,
  })

  // Slide 3 — Curva por hora
  const s3 = p.addSlide()
  s3.background = { color: COLOR.ink }
  s3.addText('Curva de sessões por hora', {
    x: 0.5, y: 0.3, w: 12, h: 0.5, color: COLOR.yellow, fontSize: 18, bold: true,
  })
  if (vol.hourSeries.length > 0) {
    const chartData = [{
      name: 'Sessões',
      labels: vol.hourSeries.map(([h]) => h.slice(11, 13) + 'h'),
      values: vol.hourSeries.map(([, s]) => s),
    }]
    s3.addChart(p.ChartType.line, chartData, {
      x: 0.5, y: 1.2, w: 12, h: 5,
      lineDataSymbol: 'circle',
      chartColors: [COLOR.yellow],
      catAxisLabelColor: COLOR.stone,
      valAxisLabelColor: COLOR.stone,
      lineSize: 3,
      showLegend: false,
    })
  } else {
    s3.addText('Sem dados horários disponíveis (cron pode não ter rodado)', {
      x: 0.5, y: 3, w: 12, h: 0.5, color: COLOR.stone, fontSize: 16, italic: true,
    })
  }

  // Slide 4 — Top fontes / páginas / eventos
  const s4 = p.addSlide()
  s4.background = { color: COLOR.ink }
  s4.addText('Top 5 — origens, páginas, eventos', {
    x: 0.5, y: 0.3, w: 12, h: 0.5, color: COLOR.yellow, fontSize: 18, bold: true,
  })
  const cols = [
    { title: 'Fontes', items: vol.topSources.map((s) => `${s.source}\n${fmtInt(s.sessions)} sessões`) },
    { title: 'Páginas', items: vol.topPages.map((pg) => `${pg.path.slice(0, 28)}\n${fmtInt(pg.views)} views`) },
    { title: 'Eventos', items: vol.topEvents.map((e) => `${e.name}\n${fmtInt(e.count)}x`) },
  ]
  cols.forEach((col, i) => {
    const x = 0.5 + (i * 4.2)
    s4.addText(col.title.toUpperCase(), {
      x, y: 1.2, w: 4, h: 0.4, color: COLOR.yellow, fontSize: 14, bold: true,
    })
    col.items.forEach((it, j) => {
      s4.addText(`${j + 1}. ${it}`, {
        x, y: 1.7 + (j * 0.85), w: 4, h: 0.8, color: COLOR.ivory, fontSize: 11,
      })
    })
    if (col.items.length === 0) {
      s4.addText('(sem dados)', {
        x, y: 1.7, w: 4, h: 0.4, color: COLOR.stone, fontSize: 11, italic: true,
      })
    }
  })

  // Slide 5 — Saúde técnica
  const s5 = p.addSlide()
  s5.background = { color: COLOR.ink }
  s5.addText('Saúde técnica do dashboard durante o evento', {
    x: 0.5, y: 0.3, w: 12, h: 0.5, color: COLOR.yellow, fontSize: 18, bold: true,
  })
  const tech = [
    ['Cron runs (esperado 96)', `${cron.total}`],
    ['Taxa de sucesso', `${cron.successRate}%`],
    ['Falhas', `${cron.failed}`],
    ['Maior gap entre runs', `${cron.maxGapMin} min`],
    ['Total linhas inseridas no Supabase', fmtInt(cron.totalRows)],
    ['Erros 429 detectados (Vercel CLI)', errors.cliAvailable ? `${errors.cliErrorsCount}` : 'CLI indisponível'],
    ['Erros de ingestão registrados', `${errors.ingestionErrorsCount}`],
  ]
  tech.forEach(([label, value], i) => {
    s5.addText(label, {
      x: 0.5, y: 1.3 + (i * 0.55), w: 7, h: 0.5, color: COLOR.ivory, fontSize: 16,
    })
    s5.addText(value, {
      x: 7.5, y: 1.3 + (i * 0.55), w: 5, h: 0.5, color: COLOR.yellow, fontSize: 18, bold: true, align: 'right',
    })
  })

  // Slide 6 — Recomendações
  const s6 = p.addSlide()
  s6.background = { color: COLOR.ink }
  s6.addText('Recomendações para o próximo evento', {
    x: 0.5, y: 0.3, w: 12, h: 0.5, color: COLOR.yellow, fontSize: 18, bold: true,
  })
  const recs = []
  if (cron.failed > 0) recs.push(`• ${cron.failed} runs do cron falharam — investigar causa raiz antes do próximo evento. Erros frequentes em ingestion_log.`)
  if (Number(cron.maxGapMin) > 30) recs.push(`• Gap de ${cron.maxGapMin}min entre runs supera o intervalo de 15min — possível timeout ou sobrecarga durante o pico.`)
  if (errors.ingestionErrorsCount > 0) recs.push(`• ${errors.ingestionErrorsCount} erros de ingestão no dia — checar correlação com hora do pico.`)
  if (vol.eventKpis.sessions > vol.baseKpis.sessions * 3) recs.push(`• Pico de tráfego ${fmtPct(vol.eventKpis.sessions, vol.baseKpis.sessions)} acima do baseline — considerar provisionar capacidade para próximos eventos.`)
  if (recs.length === 0) recs.push('• Operação rodou sem incidentes técnicos relevantes — manter setup atual.')
  recs.push('• Revisar quota GA4 Realtime (5k tokens/dia) — eventos com >8h de monitoramento podem se beneficiar de quota reservada.')
  recs.push('• Considerar adicionar alertas (Slack/email) para falhas de cron consecutivas durante eventos críticos.')

  recs.forEach((r, i) => {
    s6.addText(r, {
      x: 0.5, y: 1.3 + (i * 0.7), w: 12, h: 0.6, color: COLOR.ivory, fontSize: 16,
    })
  })

  const out = path.join(PROJECT_ROOT, 'relatorio-evento-2026-05-01.pptx')
  await p.writeFile({ fileName: out })
  return out
}

function todayBRT() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

function selfUnload() {
  const plist = `${process.env.HOME}/Library/LaunchAgents/com.senna.postmortem-2026-05-01.plist`
  try {
    execSync(`launchctl unload "${plist}"`, { stdio: 'pipe', timeout: 10_000 })
    log(`Self-unloaded launchd job: ${plist}`)
  } catch (e) {
    log(`Self-unload skipped: ${e.message?.slice(0, 120)}`)
  }
}

async function main() {
  log('Iniciando pós-mortem')
  log(`Project root: ${PROJECT_ROOT}`)
  log(`Event date: ${EVENT_DATE}, baseline: ${BASELINE_DATE}`)

  const today = todayBRT()
  const allowManual = process.argv.includes('--force')
  if (today !== '2026-05-02' && !allowManual) {
    log(`Skipping: hoje BRT é ${today}, esperado 2026-05-02. Use --force pra rodar manualmente.`)
    process.exit(0)
  }

  const cron = await analyzeCronHealth()
  log(`Cron: ${cron.ok}/${cron.total} runs OK, ${cron.failed} failed, ${cron.totalRows} rows`)

  const vol = await analyzeVolume()
  log(`Volume: ${vol.eventKpis.sessions} sessões evento vs ${vol.baseKpis.sessions} baseline`)

  const errors = await analyze429()
  log(`Errors: CLI=${errors.cliAvailable ? 'on' : 'off'}, ${errors.cliErrorsCount} 429 (CLI), ${errors.ingestionErrorsCount} ingestion errors`)

  const xlsxPath = generateXlsx(cron, vol, errors)
  const pptxPath = await generatePptx(cron, vol, errors)

  const xlsxKb = (fs.statSync(xlsxPath).size / 1024).toFixed(1)
  const pptxKb = (fs.statSync(pptxPath).size / 1024).toFixed(1)

  log('═══════════════════════════════════════════')
  log('RELATÓRIO GERADO')
  log(`  XLSX: ${xlsxPath} (${xlsxKb} KB)`)
  log(`  PPTX: ${pptxPath} (${pptxKb} KB)`)
  log('───────────────────────────────────────────')
  log(`Top findings:`)
  log(`  1. ${cron.ok}/${cron.total} runs OK (${cron.successRate}%) · ${fmtInt(cron.totalRows)} rows ingeridas`)
  log(`  2. ${fmtInt(vol.eventKpis.sessions)} sessões no evento · pico ${vol.peak.hour} com ${fmtInt(vol.peak.sessions)} · Δ ${fmtPct(vol.eventKpis.sessions, vol.baseKpis.sessions)} vs baseline`)
  log(`  3. ${errors.cliErrorsCount + errors.ingestionErrorsCount} erros relacionados a quota/cron no dia`)
  log('═══════════════════════════════════════════')

  if (today === '2026-05-02') selfUnload()
}

main().catch((e) => {
  console.error('[postmortem FATAL]', e)
  process.exit(1)
})
