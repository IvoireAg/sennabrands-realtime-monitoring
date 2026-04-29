import Link from 'next/link'
import { Button } from '@/components/ui/button'

const reasons: Record<string, { title: string; message: string }> = {
  domain_not_allowed: {
    title: 'Domínio não autorizado',
    message:
      'Este painel é restrito a e-mails @ivoire.ag e @senna.com. Se você acredita que deveria ter acesso, fale com o administrador.',
  },
  exchange_failed: {
    title: 'Link inválido ou expirado',
    message: 'O link mágico expirou ou já foi usado. Solicite um novo no login.',
  },
  missing_code: {
    title: 'Sessão inválida',
    message: 'Não foi possível completar o login. Tente novamente.',
  },
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  const r = reason && reasons[reason] ? reasons[reason] : reasons.missing_code

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivo-ink px-8">
      <div className="max-w-md text-center">
        <div className="t-display-mono text-ivo-yellow text-3xl mb-6">acesso negado</div>
        <h1 className="font-title font-extrabold text-3xl text-ivo-ivory mb-3">{r.title}</h1>
        <p className="font-body text-ivo-stone-300 mb-8">{r.message}</p>
        <Link href="/login">
          <Button variant="secondary">Voltar ao login</Button>
        </Link>
      </div>
    </div>
  )
}
