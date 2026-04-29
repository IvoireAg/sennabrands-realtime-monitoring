export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-ivo-ink">
      <div className="hidden lg:flex bg-ivo-yellow items-center justify-center p-16 relative overflow-hidden">
        <div className="max-w-md">
          <div className="t-display-mono text-ivo-ink text-3xl mb-6">painel ivoire</div>
          <h2 className="font-title font-extrabold text-5xl text-ivo-ink leading-none tracking-tight">
            Monitoramento em tempo real para o evento Senna Brands.
          </h2>
          <p className="font-body text-ivo-ink mt-6 text-base leading-relaxed">
            Tráfego, demografia, origem e comportamento — auditável, propositivo, em uma fonte só.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">{children}</div>
    </div>
  )
}
