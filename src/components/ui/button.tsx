import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:   'bg-ivo-yellow text-ivo-ink hover:bg-ivo-yellow-deep disabled:bg-ivo-stone-500 disabled:text-ivo-stone-300',
  secondary: 'bg-ivo-coal text-ivo-ivory border border-ivo-graphite hover:border-ivo-yellow hover:text-ivo-yellow',
  ghost:     'bg-transparent text-ivo-stone-300 hover:text-ivo-ivory',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

export function Button({ className, variant = 'primary', size = 'md', ...props }: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-sm font-title font-semibold transition-colors disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
