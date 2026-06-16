# PROGRESS — Plataforma de Gestão de Carreira para Músicos

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 iniciada — scaffold + modelo de dados + lógica de negócio testada CONCLUÍDOS.**
O projeto **builda** (`npm run build`), **passa nos testes** (`npm test`, 17 testes),
**typecheck** e **lint** limpos. Ainda **não há UI das features** nem auth de sessão —
a próxima sessão começa pela F1 (autenticação) e telas de CRUD.

Comandos úteis: `npm run dev` (rodar), `npm test`, `npm run typecheck`, `npm run build`,
`npm run db:seed` (dados demo: `demo@palco.app` / `demo12345`).

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/market-analysis.md`, `docs/personas-and-needs.md`, `docs/business-plan.md`,
  `docs/mvp-scope.md` — estratégia e escopo do MVP (F1–F5).
- `DECISIONS.md` — D1 (foco back-office), D2 (núcleo MVP), D3 (stack).

### Sessão 2 — 2026-06-16 (Fase 1 — scaffold + dados + lógica)
- **Scaffold Next.js 14 (App Router) + TS + Tailwind 3**: `package.json`, `tsconfig.json`,
  `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `.eslintrc.json`,
  `.gitignore`, `.env.example`.
- **Modelo de dados (Prisma + SQLite)**: `prisma/schema.prisma` com `User`, `Show`,
  `Transaction`, `Contact` (relações + índices). Migration inicial em
  `prisma/migrations/20260616121921_init/`. Singleton em `src/lib/prisma.ts`.
- **Lógica de negócio (pura, testada ANTES da UI)** — `src/lib/finance.ts`:
  `showProfit` (P&L cachê − despesas vinculadas), `summarize` (receita/despesa/recebido/
  a receber), `monthlyTotals`, `totalsByCategory`, `round2`, `monthKey`.
  Testes: `src/lib/finance.test.ts` (9), `src/lib/validation.test.ts` (5),
  `src/lib/password.test.ts` (3) — **17 passando**.
- **Domínio e validação**: `src/lib/domain.ts` (status/tipos/papéis + labels PT-BR e
  categorias sugeridas), `src/lib/validation.ts` (schemas Zod de signup/login/show/
  transaction/contact).
- **Auth — base**: `src/lib/password.ts` (hash scrypt via stdlib do Node, testado).
  Sessão (cookies/JWT) ainda não feita.
- **App shell**: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
  (landing page responsiva).
- **Seed**: `prisma/seed.ts` (artista demo com 2 shows, 5 transações, 2 contatos).
- `DECISIONS.md` — D4 (definição de P&L por show), D5 (hash scrypt; sessão em aberto).

## Próximos passos (priorizados para a próxima sessão)
1. **F1 — Autenticação de sessão.** Decidir Auth.js (Credentials) vs. solução própria com
   cookie httpOnly + JWT. Recomendação atual: **solução própria leve** (cookie de sessão
   assinado) para evitar peso do Auth.js no MVP — reaproveita `verifyPassword`. Registrar em
   DECISIONS. Implementar: rotas/`server actions` de signup/login/logout, middleware que
   protege `/app/*`, helper `getCurrentUser()`. Escrever testes da lógica de sessão.
2. **Layout autenticado** (`/app`): shell com navegação (Dashboard, Shows, Finanças, Contatos).
3. **F2 — Shows (CRUD)**: lista + formulário (usar `showSchema`), página de detalhe.
4. **F3 — Finanças (CRUD)**: lista de transações + formulário, vínculo opcional a show e status.
5. **F4 — Rentabilidade**: na página do show, exibir `showProfit`; no dashboard, usar
   `summarize`/`monthlyTotals`/`totalsByCategory`.
6. **F5 — Contatos (CRUD)** + vínculo a shows.
7. Polir responsivo e dashboard. Considerar e2e leve depois.

## Bloqueios / dúvidas (para validação humana)
- Necessidades **hipótese** em `personas-and-needs.md` (CRM, multiusuário) precisam de
  entrevistas com músicos reais antes de investimento pesado.
- Go-to-market PT/LATAM, disposição a pagar e faixas de preço: ainda hipóteses (ver docs).
- Decisão de sessão/auth (passo 1 acima) será tomada na próxima execução e registrada.
- `npm audit` reporta vulnerabilidades em deps transitivas do Next 14.2.15 — reavaliar ao
  fixar versões/atualizar Next; não bloqueante para o MVP.
