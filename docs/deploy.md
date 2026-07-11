# Deploy em produção — runbook

> **Contexto:** o MVP usa **SQLite** em desenvolvimento por escolha deliberada
> (container remoto efêmero, zero dependência externa — ver `DECISIONS.md` D3/D5).
> SQLite **não funciona** em produção na Vercel: o sistema de arquivos das
> Serverless Functions é **somente-leitura e efêmero**, então qualquer *escrita*
> no banco (criar conta, lançar show, etc.) lança uma exceção — a tela mostra
> "Application error: a server-side exception has occurred".
>
> **Produção exige um banco Postgres gerenciado.** Este runbook descreve a
> migração mínima `SQLite → Postgres`, já prevista no schema
> (`prisma/schema.prisma` é mantido portável) e no "A revisar" da D3.

## Sintoma que este runbook resolve

- `/register` (ou qualquer ação que grava no banco) retorna
  `Application error: a server-side exception has occurred` na Vercel.
- Causa: `DATABASE_URL="file:./dev.db"` (SQLite) em produção, e/ou o `provider`
  do Prisma ainda em `sqlite`.

## Pré-requisitos

- Acesso ao projeto na **Vercel** (Settings → Environment Variables).
- Uma conta em um provedor de **Postgres gerenciado**. Opções comuns:
  - **Vercel Postgres** (integra direto com o projeto; já entrega URL *pooled*).
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

## Passo 2 — Ajustar o schema do Prisma (mudança de código, coordenada)

Esta é a única alteração de código e precisa ser **coordenada** com o deploy,
porque dev/CI continuam em SQLite. Em `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")   // usado só pelas migrations
}
```

> Trocar o `provider` quebra o CI e o ambiente de dev atuais (ambos SQLite). Ao
> promover produção para Postgres, alinhar também o CI para subir um Postgres de
> serviço (`services: postgres` no workflow) ou manter dois schemas. Registrar a
> decisão em `DECISIONS.md` antes de mesclar a troca de `provider`.

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

Localmente, apontando para o banco novo (use a URL **direta**):

```bash
DATABASE_URL="<direct-url>" npx prisma migrate deploy
```

Se ainda não houver migrations versionadas (o MVP evoluiu via `db push` em dev),
gere a baseline uma vez antes:

```bash
DATABASE_URL="<direct-url>" npx prisma migrate dev --name init
```

## Passo 5 — Redeploy e verificação

1. Faça um novo deploy na Vercel (push na `main` ou "Redeploy").
2. Smoke test em produção:
   - `GET /register` → renderiza o formulário (200), sem exceção.
   - Criar uma conta de teste → redireciona para `/dashboard`.
   - `GET /login` → 200; login funciona.

## Rollback

Se algo falhar, reverta a troca do `provider` no `prisma.schema` e o deploy
anterior continua servindo (embora as *escritas* sigam quebradas em SQLite). O
caminho correto é sempre concluir a migração para Postgres — SQLite em serverless
não tem correção viável.

## Notas

- O `build` (`prisma generate && next build`) roda `prisma generate`, que apenas
  gera o client a partir do schema — não precisa de banco acessível no build.
- Conexões: prefira a URL *pooled* no runtime; a *direct* só nas migrations.
- Backups: habilite os backups automáticos do provedor gerenciado.
