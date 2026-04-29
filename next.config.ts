import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Trava o workspace root no diretório do projeto.
  // Sem isso, o Turbopack detecta o package-lock.json em /Users/macbookair/
  // e usa node_modules errado, quebrando o SDK do GA4.
  turbopack: {
    root: process.cwd(),
  },
}

export default nextConfig
