import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  getTrafficDaily,
  getAcquisitionDaily,
  getDemographicsDaily,
  getEventsDaily,
  getPagesDaily,
} from '@/lib/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

const MODEL = 'claude-sonnet-4-6'
const CACHE_TTL_MS = 5 * 60_000 // 5 minutos

export type InsightsResponse = {
  markdown: string
  generatedAt: string
  model: string
  tokensUsed: { input: number; output: number }
}

type CacheState = { data: InsightsResponse; expiresAt: number }
const g = globalThis as typeof globalThis & { __insightsCache?: CacheState | null }

function buildContext(traffic7: unknown, traffic30: unknown, acq7: unknown, demo7: unknown, ev7: unknown, pages7: unknown): string {
  return [
    '## Tráfego diário (últimos 7d)',
    JSON.stringify(traffic7, null, 0),
    '',
    '## Tráfego diário (últimos 30d, sumário por dia)',
    JSON.stringify(summarize30d(traffic30 as Array<{ date: string; sessions: number; users: number }>), null, 0),
    '',
    '## Aquisição (últimos 7d)',
    JSON.stringify(acq7, null, 0),
    '',
    '## Demografia (últimos 7d, top 30)',
    JSON.stringify((demo7 as Array<unknown>).slice(0, 30), null, 0),
    '',
    '## Eventos disparados (últimos 7d)',
    JSON.stringify(ev7, null, 0),
    '',
    '## Top páginas (últimos 7d)',
    JSON.stringify((pages7 as Array<unknown>).slice(0, 15), null, 0),
  ].join('\n')
}

function summarize30d(rows: Array<{ date: string; sessions: number; users: number }>) {
  const m = new Map<string, { sessions: number; users: number }>()
  for (const r of rows) {
    const cur = m.get(r.date) ?? { sessions: 0, users: 0 }
    cur.sessions += Number(r.sessions || 0)
    cur.users += Number(r.users || 0)
    m.set(r.date, cur)
  }
  return Array.from(m.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, ...v }))
}

const SYSTEM_PROMPT = `Você é um analista sênior de marketing digital trabalhando junto com a agência Ivoire na conta Senna Brands (site ayrtonsenna.com.br). Seu papel é gerar análises estratégicas, táticas e acionáveis a partir de dados do GA4 num evento ao vivo monitorado pelo time.

Estruture sua resposta em 4 camadas, cada uma como seção H2 em markdown:

# 1. Descritivo
O que aconteceu? Volumes, tendências, magnitudes. Cite números específicos.

# 2. Diagnóstico
Por que aconteceu? Correlações, anomalias, padrões observados. Hipóteses claramente marcadas como tal.

# 3. Preditivo
O que provavelmente vai acontecer nas próximas horas/dias se a tendência continuar? Magnitude esperada.

# 4. Prescritivo
O que o time Marketing Digital da Ivoire deveria fazer agora? Ações concretas, priorizadas, com critério de sucesso.

Regras:
- Cite os dados de forma específica (ex: "1.234 sessões via google/organic em 2026-04-30")
- Marque inferências com (inferência) e dados diretos com (dado)
- Seja crítico: aponte limitações dos dados (volumes pequenos, sampling, privacy thresholding GA4)
- Use português do Brasil, tom profissional sem jargão excessivo
- Foque em acionabilidade — análise sem recomendação não vale ser escrita
- Markdown limpo, sem emojis decorativos`

export async function GET() {
  const cached = g.__insightsCache ?? null
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'HIT' } })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'ANTHROPIC_API_KEY não configurada',
        hint: 'Adicione a variável ANTHROPIC_API_KEY em https://vercel.com/roberto-barbosa/senna-brands-monitoring/settings/environment-variables',
      },
      { status: 503 },
    )
  }

  try {
    const [traffic7, traffic30, acq7, demo7, ev7, pages7] = await Promise.all([
      getTrafficDaily(7),
      getTrafficDaily(30),
      getAcquisitionDaily(7),
      getDemographicsDaily(7),
      getEventsDaily(7),
      getPagesDaily(7),
    ])

    const context = buildContext(traffic7, traffic30, acq7, demo7, ev7, pages7)

    const client = new Anthropic({ apiKey })

    const completion = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Analise os dados abaixo do site ayrtonsenna.com.br e gere a análise estratégica em 4 camadas.

Hoje é ${new Date().toLocaleDateString('pt-BR')}. Há um evento Senna Brands sendo monitorado.

DADOS BRUTOS:

${context}`,
        },
      ],
    })

    const markdown = completion.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n')

    const data: InsightsResponse = {
      markdown,
      generatedAt: new Date().toISOString(),
      model: MODEL,
      tokensUsed: {
        input: completion.usage.input_tokens,
        output: completion.usage.output_tokens,
      },
    }

    g.__insightsCache = { data, expiresAt: Date.now() + CACHE_TTL_MS }
    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } })
  } catch (e) {
    console.error('[insights] failed:', e)
    const err = e as Error
    return NextResponse.json({ error: err.message ?? 'unknown' }, { status: 500 })
  }
}
