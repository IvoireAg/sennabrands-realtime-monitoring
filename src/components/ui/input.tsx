import { cn } from '@/lib/utils'

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      'w-full bg-ivo-coal border border-ivo-graphite text-ivo-ivory placeholder:text-ivo-stone-500',
      'rounded-sm px-3 py-2 text-sm font-title',
      'focus:outline-none focus:border-ivo-yellow',
      'disabled:opacity-50',
      className,
    )}
    {...props}
  />
)
