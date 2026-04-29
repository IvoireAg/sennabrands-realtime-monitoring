'use client'

import { useEffect } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Error Boundary global. Captura exceções não tratadas em qualquer página
// abaixo de src/app/. Layout (sidebar + topbar) continua renderizando — só
// o conteúdo da página vira esta tela. Mantém aparência Ivoire.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Console em dev; em prod considerar enviar pra Sentry/Logs (Sprint 5).
    console.error('[error.tsx]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardBody className="py-8 text-center">
          <div className="t-eyebrow mb-2 text-ivo-yellow">algo deu errado</div>
          <h2 className="font-title text-xl text-ivo-ivory mb-3">
            Não foi possível carregar este painel
          </h2>
          <p className="font-body text-ivo-stone-300 text-sm mb-6">
            Falha ao processar a leitura. Tente novamente ou recarregue a página.
            Se persistir, fale com a equipe Ivoire.
          </p>
          <Button onClick={reset}>Tentar novamente</Button>
          {error.digest && (
            <div className="mt-4 t-eyebrow text-ivo-stone-500 text-[10px]">
              ref: {error.digest}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
