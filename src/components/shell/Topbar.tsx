import { createSupabaseServerClient } from '@/lib/supabase/server'
import { TopbarUser } from './TopbarUser'

export async function Topbar() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <header className="h-16 shrink-0 border-b border-ivo-graphite px-8 flex items-center justify-between bg-ivo-ink">
      <div>
        <div className="t-eyebrow text-ivo-stone-300">Cliente</div>
        <div className="font-title text-sm font-semibold text-ivo-ivory">Senna Brands · ayrtonsenna.com.br</div>
      </div>
      <TopbarUser email={user?.email ?? ''} />
    </header>
  )
}
