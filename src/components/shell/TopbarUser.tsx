'use client'

import { LogOut } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function TopbarUser({ email }: { email: string }) {
  const router = useRouter()
  async function logout() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }
  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-end">
        <span className="t-eyebrow text-ivo-stone-300">Sessão</span>
        <span className="text-sm font-title text-ivo-ivory">{email || '—'}</span>
      </div>
      <button
        onClick={logout}
        title="Sair"
        className="text-ivo-stone-300 hover:text-ivo-yellow transition-colors p-2"
      >
        <LogOut size={18} strokeWidth={1.5} />
      </button>
    </div>
  )
}
