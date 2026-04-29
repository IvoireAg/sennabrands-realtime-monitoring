# Senna Brands · Monitoramento

> Painel executivo de monitoramento em tempo real e análise de tráfego do site **ayrtonsenna.com.br**.
> Operação **Ivoire** para **Senna Brands** · Stack: Next.js 16 + Supabase + Vercel + GA4.

Aplica o **Ivoire Design System** (yellow + black + neutros, tema escuro institucional).

---

## ⚡ Quick start (dev local)

```bash
# 1. Instalar deps
npm install

# 2. Configurar env
cp .env.example .env.local
# preencher com:
#   - NEXT_PUBLIC_SUPABASE_URL                  (https://jttmabkkkdardzfptdiu.supabase.co)
#   - NEXT_PUBLIC_SUPABASE_ANON_KEY             (Supabase Studio > Settings > API)
#   - SUPABASE_SERVICE_ROLE_KEY                 (Supabase Studio > Settings > API)
#   - GA4_PROPERTY_ID=343005835                 (já default)
#   - GOOGLE_APPLICATION_CREDENTIALS            (caminho da chave JSON da SA — já default no .env.example)
#   - CRON_SECRET                               (gere com: openssl rand -hex 32)

# 3. Rodar
npm run dev
```

Abrir http://localhost:3000 → tela de login (magic link).

---

## 📁 Estrutura

Veja `AGENTS.md` para a constituição do projeto (regras de design, arquitetura, conventions).

```
src/
├── app/
│   ├── (auth)/login/         # magic link
│   ├── (dashboard)/          # layout com sidebar
│   │   ├── page.tsx          # Resumo geral (realtime + KPIs)
│   │   ├── traffic/
│   │   ├── demographics/
│   │   ├── acquisition/
│   │   ├── behavior/
│   │   └── insights/         # stub — Claude agentic v2
│   ├── auth/{callback,error}/
│   └── api/
│       ├── realtime/         # GA4 Realtime API on-demand
│       └── cron/ingest/      # Vercel Cron horário
├── components/
│   ├── ui/                   # Button, Card, Input
│   ├── shell/                # Sidebar, Topbar, PageHeader
│   ├── kpi/                  # KPICard
│   └── realtime/             # painel ao vivo
├── lib/
│   ├── ga4.ts                # singleton client (file ou JSON env)
│   ├── ga4-extract.ts        # queries GA4 → rows tipados
│   ├── queries.ts            # Supabase query helpers
│   ├── chart-theme.ts        # paleta Ivoire para Recharts
│   ├── format.ts             # formatadores PT-BR
│   ├── utils.ts
│   └── supabase/{server,client,middleware}.ts
├── styles/
│   ├── tokens.css            # Ivoire DS — fonte da verdade
│   └── (globals.css fica em app/)
└── types/ga4.ts

supabase/
└── migrations/20260429120000_init.sql  # 7 tabelas + RLS

public/brand/                 # logos Ivoire
```

---

## 🚀 Primeira execução / backfill

Depois de rodar `npm run dev`:

1. Faça login com `seu.nome@ivoire.ag` (link mágico vai no email)
2. Backfill 90 dias — chame uma vez:
   ```bash
   curl -i 'http://localhost:3000/api/cron/ingest?token=$CRON_SECRET&days=90'
   ```
   Vai popular as 5 tabelas analíticas (traffic, demographics, acquisition, pages, events).

Em produção, o Vercel Cron chama esse endpoint a cada hora automaticamente (com `?days=7`).

---

## 🌐 Deploy (resumo — passo a passo em `docs/DEPLOY.md`)

1. `git push origin main` (precisa de push permissions no repo IvoireAg)
2. Vercel já está conectado ao projeto — auto-deploy no push
3. Configurar env vars em Vercel Settings:
   - Todas do `.env.example`
   - **Atenção:** `GOOGLE_APPLICATION_CREDENTIALS_JSON` (não `_CREDENTIALS`) — JSON inteiro como string
4. Configurar Supabase Auth:
   - Add `https://senna-brands-monitoring.vercel.app/auth/callback` em redirect URLs
   - Email allowlist: nenhuma (o callback já filtra por domínio)
5. Validar: cron roda a cada hora (Vercel Settings > Crons)

---

## 🎨 Design System

Tokens em `src/styles/tokens.css`. Regras inegociáveis em `AGENTS.md`.
Resumo:
- Fundo: `--ivo-ink`
- Texto: `--ivo-ivory`
- Acento: `--ivo-yellow`
- Cards: `--ivo-coal` com `border-ivo-graphite`
- Sem rounded-lg+, sem gradientes, sem vermelho/azul/verde
- Fontes: Montserrat (UI), Arvo (corpo), Major Mono Display (lettering), Bebas Neue (números)

---

## 🤝 Operação

- **Ivoire** — agência operadora
- **Senna Brands** — cliente
- Acesso restrito: `@ivoire.ag` e `@senna.com`
