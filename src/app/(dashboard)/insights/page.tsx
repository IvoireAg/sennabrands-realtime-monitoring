import { PageHeader } from '@/components/shell/PageHeader'
import { InsightsView } from '@/components/insights/InsightsView'

export const dynamic = 'force-dynamic'

export default function InsightsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Estratégia"
        title="Insights"
        display="análise propositiva"
        description="Análise estratégica gerada por agente Claude — descritivo, diagnóstico, preditivo e prescritivo. Cita fontes a cada inferência."
      />
      <InsightsView />
    </>
  )
}
