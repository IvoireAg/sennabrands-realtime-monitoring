# Deploy — Senna Brands Monitoramento

Passo a passo completo para colocar em produção.

---

## 1. Coletar credenciais (5 min)

### 1.1 Supabase keys
1. Abra https://supabase.com/dashboard/project/jttmabkkkdardzfptdiu/settings/api
2. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (já é `https://jttmabkkkdardzfptdiu.supabase.co`)
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role / secret key** → `SUPABASE_SERVICE_ROLE_KEY` (TRATAR COMO SENHA)

### 1.2 GA4 Service Account JSON
- Local: `/Users/macbookair/Documents/VibeCoding/senna-brands/pacote-fernanda/credenciais/ga4-powerbi-reader-key.json`
- Para produção, vai inteiro como string em `GOOGLE_APPLICATION_CREDENTIALS_JSON`

### 1.3 CRON_SECRET
```bash
openssl rand -hex 32
```
Esse mesmo valor entra em todos os ambientes (local, Vercel).

---

## 2. Rodar local (validar antes de subir)

```bash
cp .env.example .env.local
# preencha com as keys acima
npm install
npm run dev
```

- Abra http://localhost:3000 → redireciona para /login
- Login com `seu.nome@ivoire.ag` → magic link
- Click no link no email → volta autenticado em /
- Página deve carregar com "aguardando 1ª sincronização"

### 2.1 Backfill 90 dias

```bash
curl -i "http://localhost:3000/api/cron/ingest?token=<CRON_SECRET>&days=90"
```

Espera resposta JSON com `"ok":true` e contagem de rows. Refresh / e veja KPIs populados.

---

## 3. Configurar Supabase Auth

1. Studio > Authentication > URL Configuration:
   - **Site URL**: `https://senna-brands-monitoring.vercel.app`
   - **Redirect URLs** (adicionar todas):
     - `http://localhost:3000/auth/callback` (dev)
     - `https://senna-brands-monitoring.vercel.app/auth/callback`
     - `https://*.vercel.app/auth/callback` (preview)

2. Studio > Authentication > Providers > Email:
   - **Enable Email provider**: ON
   - **Confirm email**: OFF (magic link não precisa)
   - **Secure email change**: ON

3. Studio > Authentication > Email Templates > Magic Link:
   - Customizar com a marca Ivoire (subject, html). Opcional, mas recomendado.

---

## 4. Push para GitHub

> ⚠️ A conta `Roberto-Barbosa-Freedesks` não tem push permission no repo IvoireAg.
> Opções:
>  a) Beto adiciona `Roberto-Barbosa-Freedesks` como Collaborator no repo
>  b) Beto faz o push manualmente da conta IvoireAg

```bash
cd /Users/macbookair/Documents/VibeCoding/senna-brands/sennabrands-realtime-monitoring
git add .
git commit -m "feat: scaffold dashboard + ingestão GA4 + design system Ivoire"
git push origin main
```

---

## 5. Configurar Vercel

Projeto já existe (`prj_dUOepL8gB0AIckJHdkt4zOPvECvt`). Confirme que está apontando para o repo certo.

### 5.1 Conectar repo
1. https://vercel.com/roberto-barbosa/senna-brands-monitoring/settings/git
2. Connect to repository: `IvoireAg/sennabrands-realtime-monitoring`
3. Production branch: `main`

### 5.2 Environment variables (Settings > Environment Variables)

| Nome | Valor | Ambientes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jttmabkkkdardzfptdiu.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (anon key) | All |
| `SUPABASE_SERVICE_ROLE_KEY` | (service role key) | Production, Preview |
| `GA4_PROPERTY_ID` | `343005835` | All |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | conteúdo inteiro do arquivo JSON da SA | Production, Preview |
| `CRON_SECRET` | (random hex 32) | All |
| `ALLOWED_EMAIL_DOMAINS` | `ivoire.ag,senna.com` | All |

> ⚠️ NÃO defina `GOOGLE_APPLICATION_CREDENTIALS` (caminho de arquivo) na Vercel — só funciona local.
> Use SEMPRE `GOOGLE_APPLICATION_CREDENTIALS_JSON` em produção.

### 5.3 Validar Cron

Vercel Settings > Crons. Deve listar:
```
/api/cron/ingest    0 * * * *
```

Trigger manual (botão "Trigger") na primeira vez para popular.

---

## 6. Validação final

- [ ] `https://senna-brands-monitoring.vercel.app` carrega tela de login
- [ ] Login com email autorizado funciona
- [ ] Login com email não autorizado redireciona pra /auth/error
- [ ] Página inicial mostra realtime ativo
- [ ] Páginas Tráfego/Demografia/Aquisição/Comportamento mostram dados após primeira ingestão
- [ ] Vercel Cron rodou ao menos 1x com sucesso (Logs)
- [ ] `lastSyncedAt` aparece em todas as páginas

---

## 7. Operação durante o evento

- Dashboard atualiza realtime a cada 10s automaticamente
- Histórico atualiza a cada hora
- Se precisar refresh imediato do histórico:
  ```
  curl "https://senna-brands-monitoring.vercel.app/api/cron/ingest?token=<CRON_SECRET>&days=1"
  ```
- Logs em https://vercel.com/roberto-barbosa/senna-brands-monitoring/logs

---

## 8. Pós-evento

- Considere **revogar** a chave da SA se for projeto descontinuado:
  ```bash
  gcloud iam service-accounts keys list --iam-account=ga4-powerbi-reader@senna-brands.iam.gserviceaccount.com
  gcloud iam service-accounts keys delete <KEY_ID> --iam-account=ga4-powerbi-reader@senna-brands.iam.gserviceaccount.com
  ```
- Se não revogar, ela continua válida indefinidamente.
