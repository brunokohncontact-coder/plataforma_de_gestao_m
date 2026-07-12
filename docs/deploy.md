# Deploy em produção — runbook

> **Contexto:** a aplicação usa **PostgreSQL** em dev, CI e produção (ver
> `DECISIONS.md` D3/D294/D305). Antes disso, o dev rodava em SQLite — que
> **não funciona** em produção na Vercel: o sistema de arquivos das Serverless
> Functions é **somente-leitura e efêmero**, então qualquer *escrita* no banco
> (criar conta, lançar show, etc.) lançava uma exceção — a tela mostrava
> "Application error: a server-side exception has occurred". A troca de
> `provider` já foi feita no código (D305); este runbook cobre o que falta,
> que é **humano**: provisionar o banco de produção e configurar os segredos
> na Vercel.

## Sintoma que este runbook resolve

- `/register` (ou qualquer ação que grava no banco) retorna
  `Application error: a server-side exception has occurred` na Vercel.
- Causa: falta um Postgres de produção provisionado e/ou as variáveis
  `DATABASE_URL`/`DIRECT_URL`/`AUTH_SECRET` configuradas no projeto na Vercel.

## Pré-requisitos

- Acesso ao projeto na **Vercel** (Settings → Environment Variables).
- Uma conta em um provedor de **Postgres gerenciado**. Opções comuns:
  - **Vercel Postgres** (integração nativa via Neon; já entrega URL *pooled*
    e *direct*). No dashboard do projeto: **Storage → Create Database →
    Postgres**.
  - **Neon** ou **Supabase** (plano gratuito serve para começar).

> ⚠️ **Sempre use a connection string *pooled*** (com PgBouncer / `-pooler` no
> host) para runtime serverless — sem pool, cada invocação abre uma conexão nova
> e o banco esgota o limite. Guarde também a URL *direct* (sem pooler) para rodar
> as migrations.

## Passo 1 — Provisionar o Postgres

1. Crie um banco no provedor escolhido.
2. Copie **duas** strings de conexão:
   - `DATABASE_URL` → a **pooled** (runtime).
   - `DIRECT_URL` → a **direta** (migrations). Em alguns provedores é a mesma.

## Passo 2 — Schema do Prisma (já feito no código, D305)

`prisma/schema.prisma` já aponta para Postgres:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")   // usado só pelas migrations
}
```

Dev, CI e produção usam o mesmo `provider` — nada a mudar aqui neste runbook.

## Passo 3 — Configurar as variáveis na Vercel

Em **Settings → Environment Variables** (ambiente *Production*):

| Variável       | Valor                                                        |
| -------------- | ------------------------------------------------------------ |
| `DATABASE_URL` | a connection string **pooled** do Passo 1                    |
| `DIRECT_URL`   | a connection string **direta** do Passo 1                    |
| `AUTH_SECRET`  | um segredo **longo e aleatório** (ex.: `openssl rand -base64 48`) |

> Nunca reutilize o `AUTH_SECRET` de desenvolvimento em produção — ele assina os
> cookies de sessão (JWT). Trocá-lo invalida todas as sessões emitidas antes.

## Passo 4 — Aplicar as migrations no Postgres

As migrations já estão versionadas em `prisma/migrations/` (baseline `init`,
D305). O próprio `build` do projeto (`prisma migrate deploy` — ver
`package.json`) já as aplica a cada deploy na Vercel, então normalmente **não
há nada manual a fazer aqui**: basta a `DATABASE_URL`/`DIRECT_URL` estarem
configuradas (Passo 3) antes do primeiro deploy.

Só rode manualmente se precisar aplicar as migrations fora de um deploy (ex.:
para inspecionar o banco antes de configurar a Vercel), apontando para a URL
**direta**:

```bash
DATABASE_URL="<direct-url>" npx prisma migrate deploy
```

## Passo 5 — Redeploy e verificação

1. Faça um novo deploy na Vercel (push na `main` ou "Redeploy").
2. Smoke test em produção:
   - `GET /register` → renderiza o formulário (200), sem exceção.
   - Criar uma conta de teste → redireciona para `/dashboard`.
   - `GET /login` → 200; login funciona.

## Rollback

Se o deploy falhar por falta de banco/variáveis, corrija o Passo 1/3 (banco
provisionado + env vars corretas na Vercel) e faça "Redeploy" — não há nada a
reverter no código: `provider = "postgresql"` já é o estado permanente do
schema (D305).

## Notas

- O `build` (`prisma generate && prisma migrate deploy && next build`) precisa
  de `DATABASE_URL`/`DIRECT_URL` acessíveis **no momento do build** (a Vercel
  expõe env vars de Production também ao processo de build, não só ao
  runtime) — sem isso, `prisma migrate deploy` falha e o deploy não completa.
- Conexões: prefira a URL *pooled* no runtime; a *direct* só nas migrations.
- Backups: habilite os backups automáticos do provedor gerenciado.
