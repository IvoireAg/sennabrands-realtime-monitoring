'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const MIN_PASSWORD = 8

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD) {
      setStatus('error')
      setError(`A senha precisa ter no mínimo ${MIN_PASSWORD} caracteres.`)
      return
    }
    if (password !== confirm) {
      setStatus('error')
      setError('As duas senhas não coincidem.')
      return
    }

    setStatus('saving')
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({
      password,
      data: { password_set: true, password_set_at: new Date().toISOString() },
    })

    if (error) {
      setStatus('error')
      setError(error.message)
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
      <div className="t-eyebrow mb-3">Primeiro acesso</div>
      <h1 className="font-title font-extrabold text-3xl tracking-tight text-ivo-ivory mb-2">
        Defina sua senha
      </h1>
      <p className="font-body text-ivo-stone-300 text-sm mb-8">
        Esta é a senha que você usará a partir de agora. Mínimo {MIN_PASSWORD} caracteres.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="password" className="t-eyebrow block mb-2">
            Nova senha
          </label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={status === 'saving'}
            minLength={MIN_PASSWORD}
          />
        </div>

        <div>
          <label htmlFor="confirm" className="t-eyebrow block mb-2">
            Confirmar senha
          </label>
          <Input
            id="confirm"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={status === 'saving'}
            minLength={MIN_PASSWORD}
          />
        </div>

        {error && (
          <div className="text-sm font-title text-ivo-ivory bg-ivo-coal border border-ivo-graphite p-3">
            {error}
          </div>
        )}

        <Button type="submit" disabled={status === 'saving' || !password || !confirm} size="lg">
          {status === 'saving' ? <Lock size={18} strokeWidth={1.5} /> : <ShieldCheck size={18} strokeWidth={1.5} />}
          {status === 'saving' ? 'Salvando…' : 'Definir senha e entrar'}
        </Button>
      </form>

      <p className="font-body text-ivo-stone-500 text-xs mt-8 leading-relaxed">
        A partir de agora, você poderá entrar diretamente com seu e-mail e essa senha. Se esquecer,
        peça um novo link mágico no login.
      </p>
    </div>
  )
}
