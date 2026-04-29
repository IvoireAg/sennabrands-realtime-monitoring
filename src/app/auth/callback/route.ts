import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS ?? 'ivoire.ag,senna.com')
  .split(',')
  .map((d) => d.trim().toLowerCase())

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?reason=missing_code`)
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/auth/error?reason=exchange_failed`)
  }

  const domain = data.user.email.split('@')[1]?.toLowerCase()
  if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/auth/error?reason=domain_not_allowed`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
