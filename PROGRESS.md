# PROGRESS — Plataforma de Gestão de Carreira para Músicos

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 em andamento — scaffold + dados + lógica de negócio CONCLUÍDOS.**
O projeto **builda** (`npm run build`) e **testa verde** (`npm test`, 27 testes).
Ainda **não há UI das features** (F1–F5) nem autenticação — é o próximo passo.

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/market-analysis.md`, `docs/personas-and-needs.md`, `docs/business-plan.md`,
  `docs/mvp-scope.md` — estratégia. `DECISIONS.md` D1–D3.

### Sessão 2 — 2026-06-16 (Fase 1 — fundação)
- **Scaffold**: Next.js 15 (App Router) + TypeScript + Tailwind 3 + Prisma 6 + Vitest.
  - `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`,
    `tailwind.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`.
  - `package-lock.json` commitado (CI usa `npm ci`).
- **Modelo de dados** (`prisma/schema.prisma`): `User`, `Show`, `Transaction`, `Contact`
  e junção N:N `ShowContact`. Dinheiro em **centavos (Int)** — ver DECISIONS D4.
  - `prisma/seed.ts` — artista demo com shows, transações e despesas vinculadas.
- **Lógica de negócio + testes (ANTES da UI)**:
  - `src/lib/domain.ts` — uniões de domínio, helpers de dinheiro (`toCents`/`fromCents`/
    `formatMoney`) e validação Zod (`showInputSchema`, `transactionInputSchema`,
    `contactInputSchema`).
  - `src/lib/finance.ts` — `showProfitAndLoss` (F4), `financialSummary`, `monthlySummary`,
    `categoryBreakdown`, `accountsReceivable` (F3). Funções **puras**.
  - `src/lib/domain.test.ts` + `src/lib/finance.test.ts` — **27 testes, todos verdes**.
- **App shell** que builda: `src/app/layout.tsx`, `page.tsx` (landing), `globals.css`;
  `src/lib/prisma.ts` (singleton).
- **CI**: `.github/workflows/ci.yml` — install + prisma generate + test + build (Node 22).
- **DECISIONS.md**: D4 (dinheiro em centavos), D5 (P&L headline = cachê), D6 (fragmentação
  de branches — pedir consolidação humana).

## Próximos passos (priorizados para a próxima sessão)
1. **F1 — Autenticação.** Decidir Auth.js (recomendado) vs. solução própria simples
   (sessão por cookie + hash com bcrypt/argon2). Implementar signup/login, proteger rotas,
   substituir `passwordHash` placeholder do seed. Rotas `/login`, `/signup` já linkadas na
   landing (ainda inexistentes). Registrar a escolha em DECISIONS.md.
2. **Camada de dados por usuário (services).** Funções `getShows`, `createShow`, etc.,
   sempre escopadas por `userId`. Reaproveitar os schemas Zod de `domain.ts`.
3. **F2 — Agenda de shows.** CRUD + lista; calendário pode vir depois. Server Actions.
4. **F3 — Finanças.** CRUD de transações; dashboard com `financialSummary`/`monthlySummary`/
   `categoryBreakdown`/`accountsReceivable` (já prontos e testados).
5. **F4 — Rentabilidade.** Tela do show exibindo `showProfitAndLoss`; agregado no dashboard.
6. **F5 — Contatos.** CRUD + vínculo a shows (via `ShowContact`).
7. Polimento responsivo. Manter `npm test` e `npm run build` verdes a cada unidade.

## Bloqueios / dúvidas (para validação humana)
- ⚠️ **BLOQUEANTE — fragmentação (DECISIONS D6):** há **13 PRs abertas (#1–#13)** + esta (#14),
  todas implementando a Fase 1 em paralelo sobre a base de Fase 0; o repo **não tem `main`**.
  Várias já entregam o MVP completo. Um humano precisa escolher uma base canônica, promovê-la a
  `main`, fechar as demais e fazer as execuções futuras partirem de `main`. **Enquanto isso não
  acontecer, cada execução agendada produz uma PR redundante — inclusive esta.**
- Necessidades marcadas como **hipótese** em `personas-and-needs.md` (CRM, multiusuário)
  ainda precisam de entrevistas com músicos reais.
- Foco **pt-BR/LATAM** e faixas de preço (`business-plan.md`) seguem como hipóteses.
- Escolha de Auth (item 1) será decidida na próxima sessão e registrada em DECISIONS.md.
