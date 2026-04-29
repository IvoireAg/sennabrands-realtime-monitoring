import { cn } from '@/lib/utils'
import { Card, CardBody, CardFooter } from '@/components/ui/card'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { fmtPct } from '@/lib/format'

type Props = {
  label: string
  value: string
  delta?: number | null            // ratio: 0.12 = +12%
  deltaLabel?: string              // ex: "vs período anterior"
  source?: string                  // ex: "GA4 Realtime API"
  lastSyncedAt?: string | Date
  emphasis?: boolean               // KPI master destacado em amarelo
  className?: string
}

export function KPICard({ label, value, delta, deltaLabel, source, lastSyncedAt, emphasis, className }: Props) {
  const positive = delta !== null && delta !== undefined && delta > 0
  const negative = delta !== null && delta !== undefined && delta < 0
  const Icon = positive ? ArrowUp : negative ? ArrowDown : Minus

  return (
    <Card
      className={cn(
        emphasis && 'bg-ivo-yellow border-ivo-yellow text-ivo-ink',
        className,
      )}
    >
      <CardBody className="pt-5 flex flex-col gap-2">
        <div className={cn('t-eyebrow', emphasis && 'text-ivo-ink')}>{label}</div>
        <div
          className={cn(
            't-numeric text-5xl leading-none',
            emphasis ? 'text-ivo-ink' : 'text-ivo-ivory',
          )}
        >
          {value}
        </div>
        {delta !== null && delta !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-title font-semibold',
              emphasis
                ? 'text-ivo-ink'
                : positive
                  ? 'text-ivo-success'
                  : negative
                    ? 'text-ivo-ivory'
                    : 'text-ivo-stone-300',
            )}
          >
            <Icon size={14} strokeWidth={1.5} />
            {fmtPct(Math.abs(delta))}
            {deltaLabel && (
              <span className={cn('font-normal', emphasis ? 'text-ivo-ink/70' : 'text-ivo-stone-300')}>
                {deltaLabel}
              </span>
            )}
          </div>
        )}
      </CardBody>
      {(source || lastSyncedAt) && (
        <CardFooter className={cn('flex items-center justify-between', emphasis && 'border-ivo-ink/20 text-ivo-ink/60')}>
          {source && <span>fonte: {source}</span>}
          {lastSyncedAt && (
            <span>
              sync:{' '}
              {typeof lastSyncedAt === 'string'
                ? new Date(lastSyncedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : lastSyncedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
