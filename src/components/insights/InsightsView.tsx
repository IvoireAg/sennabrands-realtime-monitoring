'use client'

import { useEffect, useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Card, CardBody, CardEyebrow, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

type Response = {
  markdown: string
  generatedAt: string
  model: string
  tokensUsed: { input: number; output: number }
}
type ErrorBody = { error: string; hint?: string }

function renderMarkdown(md: string): string {
  // Renderização SIMPLES sem dependência: # H1, ## H2, ### H3, **bold**, *italic*, `code`, listas
  let html = md
    .replace(/^# (.+)$/gm, '<h1 class="font-title font-extrabold text-2xl text-ivo-ivory mt-8 mb-3">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="font-title font-bold text-xl text-ivo-yellow mt-6 mb-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="font-title font-bold text-base text-ivo-ivory mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-ivo-ivory">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="text-ivo-yellow font-mono text-xs bg-ivo-ink/60 px-1.5 py-0.5 rounded">$1</code>')

  // Listas
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-ivo-stone-100">$1</li>')
  html = html.replace(/(<li[^>]*>.*?<\/li>(\s*<li[^>]*>.*?<\/li>)*)/g, '<ul class="my-2 space-y-1">$1</ul>')

  // Parágrafos: linhas separadas por \n\n viram <p>
  const paragraphs = html.split(/\n\n+/).map((para) => {
    if (/^<(h1|h2|h3|ul)/.test(para.trim())) return para
    if (!para.trim()) return ''
    return `<p class="text-ivo-stone-100 my-2 leading-relaxed">${para.replace(/\n/g, '<br>')}</p>`
  })

  return paragraphs.join('\n')
}

export function InsightsView() {
  const [data, setData] = useState<Response | null>(null)
  const [error, setError] = useState<ErrorBody | null>(null)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/insights', { cache: 'no-store' })
      const body = await res.json()
      if (!res.ok) {
        setError(body as ErrorBody)
        setData(null)
      } else {
        setData(body as Response)
      }
    } catch (e) {
      setError({ error: e instanceof Error ? e.message : 'erro desconhecido' })
    } finally {
      setLoading(false)
    }
  }

  // Carrega cache existente se houver no mount (chamada GET retorna cache)
  useEffect(() => {
    let cancelled = false
    async function probe() {
      try {
        const res = await fetch('/api/insights', { cache: 'no-store' })
        if (cancelled) return
        if (res.ok) {
          const body = await res.json()
          if (body.markdown) setData(body as Response)
        }
      } catch {
        // silently
      }
    }
    probe()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <div>
          <CardEyebrow>Análise estratégica · Claude</CardEyebrow>
          <CardTitle className="mt-1">Insights agênticos</CardTitle>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 bg-ivo-yellow text-ivo-ink text-sm font-title font-bold rounded-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <RefreshCw size={14} strokeWidth={2} className="animate-spin" />
              gerando…
            </>
          ) : (
            <>
              <Sparkles size={14} strokeWidth={2} />
              {data ? 'gerar nova análise' : 'gerar análise'}
            </>
          )}
        </button>
      </CardHeader>
      <CardBody>
        {!data && !error && !loading && (
          <p className="text-ivo-stone-300 font-body text-sm py-4">
            Clique em <span className="t-eyebrow text-ivo-yellow">gerar análise</span> para que o Claude (Anthropic) leia os dados de tráfego, demografia, aquisição e eventos dos últimos 7-30 dias e produza uma análise estratégica em 4 camadas: descritivo, diagnóstico, preditivo, prescritivo.
          </p>
        )}

        {loading && !data && (
          <div className="py-8 text-center">
            <RefreshCw size={24} strokeWidth={1.5} className="animate-spin text-ivo-yellow mx-auto mb-3" />
            <p className="text-ivo-stone-300 font-body text-sm">
              consultando GA4 · enviando contexto pro Claude · gerando markdown
              <br />
              <span className="text-ivo-stone-500 text-xs">pode levar 30-60 segundos</span>
            </p>
          </div>
        )}

        {error && (
          <div className="py-4">
            <div className="t-eyebrow text-ivo-yellow mb-2">erro</div>
            <p className="text-ivo-stone-100 text-sm font-body">{error.error}</p>
            {error.hint && (
              <p className="text-ivo-stone-300 text-xs font-body mt-3 border-t border-ivo-graphite pt-3">
                {error.hint}
              </p>
            )}
          </div>
        )}

        {data && (
          <div
            className="font-body text-sm"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(data.markdown) }}
          />
        )}
      </CardBody>
      {data && (
        <CardFooter className="flex items-center justify-between flex-wrap gap-2">
          <span>modelo: {data.model} · {data.tokensUsed.input} in / {data.tokensUsed.output} out tokens</span>
          <span>gerado: {new Date(data.generatedAt).toLocaleString('pt-BR')}</span>
        </CardFooter>
      )}
    </Card>
  )
}
