'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Mail, Lock, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const ALLOWED_DOMAINS = ['ivoire.ag', 'senna.com']

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  function validateDomain(em: string) {
    const domain = em.split('@')[1]?.toLowerCase()
    if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
      return `Acesso restrito a e-mails ${ALLOWED_DOMAINS.map((d) => `@${d}`).join(' e ')}.`
    }
    return null
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const domainErr = validateDomain(email)
    if (domainErr) {
      setStatus('error')
      setError(domainErr)
      return
    }

    setStatus('sending')
    const supabase = createSupabaseBrowserClient()

    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        setStatus('error')
        setError(error.message)
        return
      }
      setStatus('sent')
      return
    }

    // mode === 'password'
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setStatus('error')
      setError(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos. Se for o primeiro acesso, use o link mágico abaixo.'
          : error.message,
      )
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm">
      <Image
        src="/brand/logo-lockup-h-yellow.png"
        alt="Ivoire"
        width={140}
        height={28}
        className="h-7 w-auto mb-12"
        priority
      />
      <div className="t-eyebrow mb-3">Acesso restrito</div>
      <h1 className="font-title font-extrabold text-3xl tracking-tight text-ivo-ivory mb-2">
        Entrar no painel
      </h1>
      <p className="font-body text-ivo-stone-300 text-sm mb-8">
        {mode === 'magic'
          ? 'Vamos enviar um link mágico para validar seu e-mail. Use somente no primeiro acesso ou se esquecer a senha.'
          : 'Digite seu e-mail corporativo e a senha que você definiu no primeiro acesso.'}
      </p>

      {status === 'sent' ? (
        <div className="border border-ivo-yellow bg-ivo-yellow/10 p-4">
          <div className="t-eyebrow text-ivo-yellow mb-1">link enviado</div>
          <p className="font-title text-sm text-ivo-ivory">
            Confira a caixa de entrada de <strong>{email}</strong>. Após clicar, você definirá uma
            senha.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="t-eyebrow block mb-2">
              E-mail corporativo
            </label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu.nome@ivoire.ag"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'sending'}
            />
          </div>

          {mode === 'password' && (
            <div>
              <label htmlFor="password" className="t-eyebrow block mb-2">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={status === 'sending'}
              />
            </div>
          )}

          {error && (
            <div className="text-sm font-title text-ivo-ivory bg-ivo-coal border border-ivo-graphite p-3">
              {error}
            </div>
          )}

          <Button type="submit" disabled={status === 'sending' || !email} size="lg">
            {mode === 'magic' ? <Mail size={18} strokeWidth={1.5} /> : <Lock size={18} strokeWidth={1.5} />}
            {status === 'sending'
              ? mode === 'magic' ? 'Enviando…' : 'Entrando…'
              : mode === 'magic' ? 'Receber link mágico' : 'Entrar'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === 'password' ? 'magic' : 'password'))
              setError(null)
              setStatus('idle')
            }}
            className="mt-2 text-xs font-title text-ivo-stone-300 hover:text-ivo-yellow transition-colors flex items-center justify-center gap-2"
          >
            <KeyRound size={14} strokeWidth={1.5} />
            {mode === 'password'
              ? 'Primeiro acesso ou esqueci a senha → receber link mágico'
              : 'Já tenho senha → voltar para login com senha'}
          </button>
        </form>
      )}

      <p className="t-eyebrow text-ivo-stone-500 mt-12 text-[10px]">
        operação ivoire · cliente senna brands
      </p>
    </div>
  )
}
