import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Senna Brands · Monitoramento — Ivoire',
  description: 'Painel de monitoramento em tempo real e analytics do site ayrtonsenna.com.br. Operação Ivoire para Senna Brands.',
  icons: { icon: '/brand/logo-icon-yellow.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-screen bg-ivo-ink text-ivo-ivory font-body antialiased">
        {children}
      </body>
    </html>
  )
}
