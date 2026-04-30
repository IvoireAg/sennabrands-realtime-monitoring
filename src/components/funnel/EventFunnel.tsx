import { Card, CardBody, CardEyebrow, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtInt, fmtPct } from '@/lib/format'

type EventRow = { event_name: string; users: number; event_count: number }

const FUNNEL_STEPS = [
  { name: 'session_start', label: 'Sessão iniciada' },
  { name: 'user_engagement', label: 'Engajamento' },
  { name: 'form_start', label: 'Formulário iniciado' },
  { name: 'form_submit', label: 'Formulário enviado' },
] as const

type Props = {
  events: EventRow[]
}

export function EventFunnel({ events }: Props) {
  const byEvent = new Map<string, number>()
  for (const e of events) {
    byEvent.set(e.event_name, (byEvent.get(e.event_name) ?? 0) + Number(e.users || 0))
  }
  const steps = FUNNEL_STEPS.map((s) => ({
    ...s,
    users: byEvent.get(s.name) ?? 0,
  }))
  const top = steps[0].users
  const empty = top === 0
  const finalUsers = steps[steps.length - 1].users
  const overallCR = top > 0 ? finalUsers / top : null

  return (
    <Card>
      <CardHeader>
        <div>
          <CardEyebrow>Conversão</CardEyebrow>
          <CardTitle className="mt-1 text-base">Funil de eventos</CardTitle>
        </div>
        {!empty && (
          <div className="text-right">
            <div className="t-eyebrow text-ivo-stone-300">conversão final</div>
            <div className="t-numeric text-ivo-yellow text-lg">
              {overallCR !== null ? fmtPct(overallCR) : '—'}
            </div>
          </div>
        )}
      </CardHeader>
      <CardBody>
        {empty ? (
          <p className="text-ivo-stone-500 text-sm font-title py-4">aguardando dados</p>
        ) : (
          <div className="space-y-2">
            {steps.map((s, i) => {
              const widthPct = top ? (s.users / top) * 100 : 0
              const prevUsers = i === 0 ? null : steps[i - 1].users
              const stepCR = prevUsers && prevUsers > 0 ? s.users / prevUsers : null
              return (
                <div key={s.name} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <div className="text-xs text-ivo-stone-300 font-title">{s.label}</div>
                    <div className="text-[10px] text-ivo-stone-500 font-mono truncate">{s.name}</div>
                  </div>
                  <div className="flex-1 relative h-9 bg-ivo-ink/40 overflow-hidden rounded-sm">
                    <div
                      className="absolute inset-y-0 left-0 bg-ivo-yellow transition-all"
                      style={{ width: `${Math.max(widthPct, 8)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-3 gap-3">
                      <span className="t-numeric text-ivo-ink font-bold text-sm">{fmtInt(s.users)}</span>
                      {widthPct < 12 && s.users > 0 && (
                        <span className="text-[10px] text-ivo-stone-300 font-title">
                          {fmtPct(widthPct / 100)} do topo
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-24 shrink-0 text-right">
                    {i === 0 ? (
                      <span className="text-[10px] text-ivo-stone-500 font-title">topo</span>
                    ) : (
                      <>
                        <div className="text-xs t-numeric text-ivo-ivory">{stepCR !== null ? fmtPct(stepCR) : '—'}</div>
                        <div className="text-[10px] text-ivo-stone-500">vs etapa ant.</div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardBody>
      <CardFooter>fonte: GA4 · eventName · usuários únicos</CardFooter>
    </Card>
  )
}
