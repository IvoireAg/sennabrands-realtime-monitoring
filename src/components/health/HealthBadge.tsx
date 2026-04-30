import { cn } from '@/lib/utils'
import { fmtRelativeTime } from '@/lib/format'

type Props = {
  lastSyncedAt?: string | null
}

export function HealthBadge({ lastSyncedAt }: Props) {
  if (!lastSyncedAt) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <div className="t-eyebrow text-ivo-yellow">sem sync</div>
        <div className="font-title text-xs text-ivo-stone-300">aguardando 1ª ingestão</div>
      </div>
    )
  }
  const dt = new Date(lastSyncedAt)
  const diffMin = Math.floor((Date.now() - dt.getTime()) / 60_000)
  const stale = diffMin > 90
  const veryStale = diffMin > 180

  return (
    <div className={cn('flex flex-col items-end gap-0.5', veryStale && 'animate-pulse')}>
      <div className={cn('t-eyebrow', stale ? 'text-ivo-yellow' : 'text-ivo-stone-300')}>
        última sincronização
      </div>
      <div
        className={cn(
          'font-title text-sm',
          stale ? 'text-ivo-yellow font-bold' : 'text-ivo-ivory',
        )}
      >
        {fmtRelativeTime(dt)}
        {stale && ' · atrasado'}
      </div>
      <div className="text-[10px] text-ivo-stone-500">{dt.toLocaleString('pt-BR')}</div>
    </div>
  )
}
