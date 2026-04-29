/**
 * Formatadores PT-BR — separador de milhar com ponto, decimal com vírgula.
 */
const nfBR = new Intl.NumberFormat('pt-BR')
const nfBRDec = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const nfBRPct = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const fmtInt = (n: number | string | null | undefined) => {
  if (n === null || n === undefined || n === '') return '—'
  const v = typeof n === 'string' ? Number(n) : n
  return Number.isFinite(v) ? nfBR.format(v) : '—'
}

export const fmtDecimal = (n: number | string | null | undefined) => {
  if (n === null || n === undefined || n === '') return '—'
  const v = typeof n === 'string' ? Number(n) : n
  return Number.isFinite(v) ? nfBRDec.format(v) : '—'
}

export const fmtPct = (ratio01: number | string | null | undefined) => {
  if (ratio01 === null || ratio01 === undefined || ratio01 === '') return '—'
  const v = typeof ratio01 === 'string' ? Number(ratio01) : ratio01
  return Number.isFinite(v) ? nfBRPct.format(v) : '—'
}

export const fmtDuration = (seconds: number | string | null | undefined) => {
  if (seconds === null || seconds === undefined || seconds === '') return '—'
  const v = typeof seconds === 'string' ? Number(seconds) : seconds
  if (!Number.isFinite(v)) return '—'
  const m = Math.floor(v / 60)
  const s = Math.round(v % 60)
  return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`
}

export const fmtRelativeTime = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin}min`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `há ${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  return `há ${diffDay}d`
}
