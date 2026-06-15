# Palco — Gestão de Carreira para Músicos

Plataforma web para músicos gerirem a carreira: **agenda de shows, finanças,
rentabilidade por show e contatos da indústria** — substituindo planilhas e apps avulsos.

> 🛠️ **Status:** v1 (MVP) em desenvolvimento. Fundação completa: auth, modelo de dados,
> lógica financeira testada e UI das features F1–F5. Veja `PROGRESS.md`.

## Como rodar (desenvolvimento)

Requer Node 20+.

```bash
npm install                 # instala deps e gera o Prisma Client
cp .env.example .env        # configure DATABASE_URL e AUTH_SECRET
npm run db:migrate          # cria o banco SQLite (prisma/dev.db)
npm run db:seed             # dados de exemplo + usuário demo
npm run dev                 # http://localhost:3000
```

Conta demo (após o seed): `demo@palco.app` / `demo1234`.

### Scripts úteis
- `npm run build` — build de produção (gera Prisma Client + Next).
- `npm test` — testes da lógica de negócio (Vitest).
- `npm run db:migrate` / `db:seed` / `db:push` — Prisma.

## Stack
Next.js (App Router) + TypeScript + Prisma + Tailwind CSS. **SQLite** em
desenvolvimento, portável para **PostgreSQL** em produção. Autenticação própria
(cookie httpOnly assinado com JWT + bcrypt). Justificativas em `DECISIONS.md`.

## Arquitetura
- `src/lib/finance.ts`, `src/lib/money.ts` — **lógica de negócio pura** (P&L por show,
  agregações financeiras, dinheiro em centavos). Sem dependência de DB, 100% testada.
- `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/session.ts` — infraestrutura.
- `src/app/**` — App Router: rotas públicas, `(auth)` e área protegida `/app`.
  Mutações via **Server Actions** (`*/actions.ts`).
- `prisma/schema.prisma` — modelos `User`, `Show`, `Transaction`, `Contact`.

## Funcionalidades (MVP — `docs/mvp-scope.md`)
- **F1** Autenticação e workspace do artista.
- **F2** Agenda de shows (CRUD, status, cachê).
- **F3** Finanças (receitas/despesas, pago/pendente, categorias).
- **F4** Rentabilidade por show (cachê − despesas vinculadas).
- **F5** CRM básico de contatos.

## Documentação de estratégia (`docs/`)
- [`market-analysis.md`](docs/market-analysis.md) · [`personas-and-needs.md`](docs/personas-and-needs.md) ·
  [`business-plan.md`](docs/business-plan.md) · [`mvp-scope.md`](docs/mvp-scope.md)

Decisões autônomas para revisão humana em [`DECISIONS.md`](DECISIONS.md).
