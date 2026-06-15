# Palco — Gestão de Carreira para Músicos

Plataforma web para músicos gerirem a carreira: **agenda de shows, finanças,
rentabilidade por show e contatos da indústria** — substituindo planilhas e apps avulsos.

> 🚧 **Status:** MVP (v1) em desenvolvimento. F1–F5 implementadas (auth, shows,
> finanças, rentabilidade por show, contatos). Veja `PROGRESS.md` para o estado atual.

## Stack
Next.js 14 (App Router) + TypeScript + Prisma + Tailwind CSS. **SQLite** em
desenvolvimento, schema portável para **PostgreSQL** em produção. Autenticação
própria leve (bcrypt + cookie de sessão assinado por HMAC). Testes com Vitest.
Justificativas em [`DECISIONS.md`](DECISIONS.md).

## Como rodar localmente

```bash
npm install                # instala deps e gera o Prisma Client
cp .env.example .env       # configure DATABASE_URL e AUTH_SECRET
npm run db:push            # cria o banco SQLite a partir do schema
npm run db:seed            # (opcional) popula dados de demonstração
npm run dev                # http://localhost:3000
```

Login de demonstração (após o seed): **demo@palco.app** / **senha1234**.

## Scripts
- `npm run dev` — servidor de desenvolvimento.
- `npm run build` / `npm start` — build e execução de produção.
- `npm test` — testes unitários (lógica de negócio financeira).
- `npm run db:push` — sincroniza o schema Prisma com o banco.
- `npm run db:seed` — popula dados de exemplo.

## Estrutura
- `src/lib/` — lógica de domínio: `finance.ts` (P&L por show, agregações),
  `money.ts` (centavos ↔ BRL), `auth.ts`, `validation.ts` (Zod), `enums.ts`.
- `src/app/` — rotas (App Router): páginas públicas, grupo `(app)` autenticado
  (dashboard, shows, finanças, contatos) e `actions/` (server actions).
- `src/components/` — formulários e UI compartilhada.
- `prisma/` — schema e seed.

## Funcionalidades (MVP)
- **F1** Autenticação e workspace do artista.
- **F2** Agenda de shows (CRUD, status, cachê).
- **F3** Finanças: receitas/despesas, categorias, recebido/pendente.
- **F4** Rentabilidade por show (cachê + extras − despesas vinculadas).
- **F5** CRM de contatos, vinculáveis a shows.

## Documentação de estratégia (`docs/`)
- [`market-analysis.md`](docs/market-analysis.md) — concorrentes, lacunas e posicionamento.
- [`personas-and-needs.md`](docs/personas-and-needs.md) — personas e necessidades.
- [`business-plan.md`](docs/business-plan.md) — proposta de valor, monetização.
- [`mvp-scope.md`](docs/mvp-scope.md) — escopo da v1 e ordem de implementação.
