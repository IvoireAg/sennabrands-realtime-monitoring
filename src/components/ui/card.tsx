import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-ivo-coal border border-ivo-graphite rounded-sm',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pt-5 pb-3 flex items-start justify-between gap-3', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('font-title font-bold text-xl tracking-tight text-ivo-ivory', className)}
      {...props}
    />
  )
}

export function CardEyebrow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('t-eyebrow', className)} {...props} />
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pb-5', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-3 border-t border-ivo-graphite text-xs text-ivo-stone-300', className)}
      {...props}
    />
  )
}
