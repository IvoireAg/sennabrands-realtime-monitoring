import { PageHeader } from '@/components/shell/PageHeader'
import { Card, CardBody } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

export default function InsightsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Estratégia"
        title="Insights"
        display="análise propositiva"
        description="Análise estratégica gerada por agente Claude — descritivo, diagnóstico, preditivo e prescritivo. Cita fontes a cada inferência."
      />
      <Card className="bg-ivo-yellow border-ivo-yellow text-ivo-ink">
        <CardBody className="py-12 px-8 flex items-center gap-6">
          <Sparkles size={48} strokeWidth={1.5} className="text-ivo-ink shrink-0" />
          <div>
            <div className="t-eyebrow text-ivo-ink mb-2">em construção</div>
            <h3 className="font-title font-extrabold text-2xl text-ivo-ink mb-2">
              Insights agênticos chegando na v2
            </h3>
            <p className="font-body text-ivo-ink/80 text-sm max-w-2xl">
              Esta página vai trazer análise estratégica gerada via Anthropic Claude (Vercel AI SDK), com 4 camadas
              (descritivo · diagnóstico · preditivo · prescritivo) e citação obrigatória de fontes em cada inferência.
              Por enquanto, alimente o pipeline de dados pelo cron de ingestão e use as 4 páginas de análise.
            </p>
          </div>
        </CardBody>
      </Card>
    </>
  )
}
