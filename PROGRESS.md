# PROGRESS — Plataforma de Gestão de Carreira para Músicos

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 (MVP F1–F5) — funcional de ponta a ponta.** App Next.js builda, roda e tem
testes verdes. Todas as 5 funcionalidades essenciais de `docs/mvp-scope.md` estão
implementadas (auth, shows, finanças, rentabilidade por show, contatos). Falta polimento,
mais testes (server actions/integração) e refinos de UX.

### Como rodar (dev)
```bash
npm install
cp .env.example .env        # DATABASE_URL=file:./dev.db, AUTH_SECRET=...
npx prisma migrate dev      # cria o banco SQLite
npm run db:seed             # opcional: dados demo (login demo@palco.app / demo1234)
npm run dev                 # http://localhost:3000
npm test                    # 18 testes (lógica financeira + sessão)
npm run build               # produção
```

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/` — market-analysis, personas-and-needs, business-plan, mvp-scope.
- `DECISIONS.md` — D1 (foco back-office), D2 (núcleo MVP), D3 (stack).

### Sessão 2 — 2026-06-15 (Fase 1 — MVP completo)
- **Scaffold**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 3 + Prisma 5
  (SQLite em dev). `package.json`, `tsconfig`, `next.config.mjs`, `tailwind.config.ts`,
  `vitest.config.ts`, `.gitignore`, `.env.example`. (D6: subimos para Next 16 por segurança.)
- **Dados** (`prisma/schema.prisma` + migration `init`): `Workspace`, `User`, `Show`,
  `Transaction`, `Contact`. Enums como String validados em `src/lib/domain.ts`.
  Seed demo em `prisma/seed.ts`.
- **Lógica de negócio pura e testada** (`src/lib/finance.ts`, `finance.test.ts`):
  `showProfitAndLoss` (P&L por show), `monthlyFinancialSummary`, `categoryBreakdown`,
  `receivablesSummary`, `overallTotals`. 13 testes.
- **Sessão/auth** (`src/lib/session.ts` + `session.test.ts` — 5 testes; `auth.ts`,
  `validation.ts`): cookie assinado HMAC, bcrypt, Zod. (D4, D5 em DECISIONS.)
- **F1** Auth: `/login`, `/register`, logout, `requireUser` guard, workspace no cadastro.
- **F2** Shows: `dashboard/shows` (lista, `novo`, `[id]` detalhe, `[id]/editar`, excluir).
- **F3** Finanças: `dashboard/financas` (lista+totais+categorias, `nova`, `[id]/editar`, excluir).
- **F4** Rentabilidade: P&L no detalhe do show e ranking no dashboard.
- **F5** Contatos: `dashboard/contatos` (lista, `novo`, `[id]/editar`, excluir; vínculo a shows).
- **Dashboard** (`dashboard/page.tsx`): totais, a receber, próximos shows, resumo mensal.
- UI: primitivos em `src/components/ui.tsx`, `DeleteButton`, `clsx`, `money` (BRL/datas PT-BR).
  Layout responsivo com nav (`dashboard/layout.tsx`).

## Próximos passos (priorizados para a próxima sessão)
1. **Testes de integração/ações**: cobrir os server actions (create/update/delete + ownership
   por workspace) e o fluxo auth. Hoje só a lógica pura e a sessão têm testes. Avaliar
   Playwright ou testes de ação com um SQLite em memória/temporário.
2. **Validação de erros nos formulários por campo** (hoje mostramos só a 1ª mensagem) e
   estados de sucesso/toast.
3. **Visão de calendário** dos shows (mvp-scope pede lista + calendário; hoje só lista).
4. **Filtros/ordenação em Finanças** (por mês, tipo, status, show) e export CSV.
5. **Polimento UX/responsivo**: empty states, loading states, acessibilidade
   (labels/aria), 404 amigável, favicon/metadados.
6. **CI**: workflow GitHub Actions rodando `npm ci && npm test && npm run build`.
7. **Deploy/Postgres**: quando houver tração, trocar provider Prisma p/ Postgres (D3).

## Bloqueios / dúvidas (para validação humana)
- Necessidades **hipótese** em `personas-and-needs.md` (CRM, multiusuário) — validar com
  5–10 entrevistas antes de investir em features de Fase 2 (split de receita, contratos).
- Foco **PT-BR/LATAM** e faixas de preço (`business-plan.md`) seguem como hipótese.
- **Modelagem do cachê x transações**: hoje o cachê (`feeAgreed`) é o valor combinado e
  receitas lançadas como transação vinculada ao show são tratadas como ADICIONAIS (ex.: merch),
  para não duplicar no P&L. Ver comentário em `src/lib/finance.ts` e registrar feedback de uso.
- Segurança da sessão própria (HMAC) é adequada ao MVP; se crescer, migrar p/ Auth.js (D4).
