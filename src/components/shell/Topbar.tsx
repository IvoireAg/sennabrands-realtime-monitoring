import { createSupabaseServerClient } from '@/lib/supabase/server'
import { TopbarUser } from './TopbarUser'
import { Toolbar } from './Toolbar'

export async function Topbar() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <header className="ivo-topbar h-16 shrink-0 border-b border-ivo-graphite px-8 flex items-center justify-between gap-4 bg-ivo-ink">
      <div className="shrink-0">
        <div className="t-eyebrow text-ivo-stone-300">Cliente</div>
        <div className="font-title text-sm font-semibold text-ivo-ivory">Senna Brands · ayrtonsenna.com.br</div>
      </div>
      <div className="flex items-center gap-4">
        <Toolbar />
        <TopbarUser email={user?.email ?? ''} />
      </div>
    </header>
  )
}
