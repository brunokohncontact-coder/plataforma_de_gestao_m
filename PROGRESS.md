# PROGRESS — Plataforma de Gestão de Carreira para Músicos ("Palco")

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 — MVP funcional construído e verde.** As 5 funcionalidades (F1–F5) do
`docs/mvp-scope.md` estão implementadas e rodando. `npm run build`, `npm run typecheck`
e `npm test` passam. Servidor sobe e todas as rotas (autenticadas e públicas) respondem
200; fluxo testado com dados de seed (smoke test via cURL com cookie de sessão).

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/` — market-analysis, personas-and-needs, business-plan, mvp-scope. `DECISIONS.md` D1–D3.

### Sessão 2 — 2026-06-16 (Fase 1 — scaffold + MVP completo)
- **Scaffold**: Next.js 14 (App Router) + TS + Tailwind + Prisma + Vitest. `package.json`,
  `tsconfig`, `tailwind.config.ts`, `postcss`, `next.config.mjs`, `vitest.config.ts`,
  `.gitignore`, `.env.example`.
- **Modelo de dados** (`prisma/schema.prisma`): `User`, `Show`, `Transaction`, `Contact`,
  `ShowContact` (N:N). Banco SQLite criado via `db push`. Seed em `prisma/seed.ts`.
- **Lógica de negócio PURA + testes (antes da UI)** — `src/lib/domain/`:
  - `finance.ts`: `computeShowPnL` (resultado planejado e realizado), `computeFinancialSummary`,
    `computeCategoryBreakdown`, `computeMonthlyTimeline`, `round2`, `formatBRL`.
  - `validation.ts`: schemas Zod (show, transação, contato, signup, login).
  - `constants.ts`: status/categorias/papéis + rótulos pt-BR.
  - `auth-crypto.ts`: scrypt + HMAC de sessão. **35 testes** (`*.test.ts`) — todos passando.
- **Autenticação** (`src/lib/auth.ts`, `src/app/auth-actions.ts`): cadastro/login/logout,
  cookie de sessão httpOnly assinado, `requireUser()`/`getCurrentUser()`.
- **UI** (App Router):
  - F1: `/login`, `/signup`, landing `/`, layout autenticado `(app)/layout.tsx` com nav.
  - F2: `/shows` (lista + criar) e `/shows/[id]` (detalhe + editar/excluir).
  - F3: `/financas` (CRUD transações, resumo, por categoria, toggle recebido/pendente).
  - F4: P&L na tela do show + bloco "Rentabilidade por show" no `/dashboard`.
  - F5: `/contatos` (CRUD).
  - `/dashboard`: KPIs, timeline mensal (barras), próximos shows, rentabilidade.
  - Componentes: `Dialog` (modal via contexto), `ShowForm`, `TransactionForm`,
    `ContactForm`, `DeleteButton`, `ToggleReceived`, `NavLink`, `ui.tsx`.
- `DECISIONS.md` D4 (Float monetário), D5 (auth própria), D6 (P&L planejado vs realizado).
- `README.md` reescrito com instruções de execução.

## Próximos passos (priorizados para a próxima sessão)
1. **Vincular contatos a shows pela UI** — o modelo `ShowContact` existe e o detalhe do show
   já lista contatos, mas falta a UI para associar/desassociar (multi-select no ShowForm ou
   na tela do show). Completa o ciclo "show ↔ dinheiro ↔ pessoa" (F5).
2. **Filtros/period picker em Finanças** — filtrar transações por mês/intervalo e por show;
   hoje a lista mostra tudo. A lógica de agregação já aceita listas pré-filtradas.
3. **Visão de calendário em Shows** (mvp-scope F2 pede "lista e calendário"); hoje só lista.
4. **Testes de integração das server actions** (criar/editar/excluir com posse por usuário) —
   hoje só a lógica pura é testada. Considerar Vitest + um banco SQLite de teste.
5. **Polimento mobile** e estados de loading/erro mais ricos nos formulários.
6. **Configurar SESSION_SECRET** em produção e migração Prisma versionada (hoje usamos
   `db push`; criar `prisma migrate` quando for para Postgres).

## Como retomar rapidamente
```bash
npm install && npm run db:push && npm run db:seed
npm test && npm run build      # devem passar
npm run dev                    # demo@palco.app / demodemo123
```

## Bloqueios / dúvidas (para validação humana)
- Necessidades **hipótese** em `personas-and-needs.md` (CRM, multiusuário) — validar com
  5–10 entrevistas antes de investir pesado nas fases seguintes.
- D6: qual número é o "resultado do show" mais intuitivo (planejado vs realizado) — validar com usuários.
- Foco pt-BR/LATAM e faixas de preço seguem como hipóteses de go-to-market.
