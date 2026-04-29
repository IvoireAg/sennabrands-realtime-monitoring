import { cn } from '@/lib/utils'

type Props = {
  eyebrow?: string
  title: string
  description?: string
  display?: string         // lettering Major Mono em amarelo, opcional
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, description, display, actions, className }: Props) {
  return (
    <div className={cn('flex items-end justify-between gap-6 pb-6 mb-6 border-b border-ivo-graphite', className)}>
      <div>
        {eyebrow && <div className="t-eyebrow mb-2">{eyebrow}</div>}
        <h1 className="font-title font-extrabold text-4xl tracking-tight text-ivo-ivory">{title}</h1>
        {display && (
          <div className="t-display-mono text-ivo-yellow text-2xl mt-1">{display}</div>
        )}
        {description && (
          <p className="font-body text-ivo-stone-300 mt-3 max-w-2xl text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-3">{actions}</div>}
    </div>
  )
}
