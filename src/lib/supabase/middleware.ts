import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/auth/callback', '/auth/error']
const SET_PASSWORD_PATH = '/set-password'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p))
  const isSetPassword = path.startsWith(SET_PASSWORD_PATH)
  const passwordSet = user?.user_metadata?.password_set === true

  // Não autenticado tentando acessar área protegida → /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Autenticado em /login → manda pra dashboard (ou /set-password se ainda não definiu)
  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = passwordSet ? '/' : SET_PASSWORD_PATH
    return NextResponse.redirect(url)
  }

  // Autenticado mas SEM senha definida → força /set-password
  if (user && !passwordSet && !isSetPassword && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = SET_PASSWORD_PATH
    return NextResponse.redirect(url)
  }

  // Autenticado COM senha tentando voltar pra /set-password → manda pra dashboard
  if (user && passwordSet && isSetPassword) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}
