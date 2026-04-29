'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Activity, BarChart3, Users, Compass, MousePointerClick, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type Item = { href: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }
type Group = { heading?: string; items: Item[] }

const groups: Group[] = [
  { items: [{ href: '/', label: 'Resumo geral', icon: Activity }] },
  {
    heading: 'comportamento',
    items: [
      { href: '/traffic', label: 'Tráfego', icon: BarChart3 },
      { href: '/demographics', label: 'Demografia', icon: Users },
      { href: '/acquisition', label: 'Aquisição', icon: Compass },
      { href: '/behavior', label: 'Comportamento', icon: MousePointerClick },
    ],
  },
  {
    heading: 'estratégia',
    items: [{ href: '/insights', label: 'Insights', icon: Sparkles }],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-60 shrink-0 bg-ivo-ink border-r border-ivo-graphite flex flex-col">
      <div className="px-6 py-6 border-b border-ivo-graphite">
        <Link href="/" className="block">
          <Image
            src="/brand/logo-lockup-h-yellow.png"
            alt="Ivoire"
            width={160}
            height={32}
            priority
            className="object-contain"
            style={{ width: 'auto', height: 'auto' }}
          />
        </Link>
        <div className="t-eyebrow mt-3">Senna Brands</div>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        {groups.map((g, gi) => (
          <div key={gi} className="mb-4">
            {g.heading && (
              <div className="t-eyebrow px-6 pb-2 text-ivo-stone-500 text-[10px]">{g.heading}</div>
            )}
            <ul>
              {g.items.map((it) => {
                const active = pathname === it.href
                const Icon = it.icon
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={cn(
                        'flex items-center gap-3 px-6 py-2.5 text-sm font-title transition-colors',
                        'border-l-2',
                        active
                          ? 'border-ivo-yellow text-ivo-ivory bg-ivo-coal'
                          : 'border-transparent text-ivo-stone-300 hover:text-ivo-ivory',
                      )}
                    >
                      <Icon size={20} strokeWidth={1.5} />
                      {it.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-ivo-graphite text-[10px] text-ivo-stone-500 t-eyebrow">
        Operação Ivoire
      </div>
    </aside>
  )
}
