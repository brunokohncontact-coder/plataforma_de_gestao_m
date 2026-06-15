# PROGRESS — Plataforma de Gestão de Carreira para Músicos ("Palco")

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 (Desenvolvimento) — em andamento.** Scaffold, modelo de dados (Prisma),
lógica de negócio (rentabilidade + finanças) com testes, e landing/placeholder de UI
estão prontos. `npm run build` e `npm test` **verdes** (18 testes passando).
A próxima sessão começa a UI conectada a dados, a partir de **F1 (Auth)**.

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0) — CONCLUÍDA
- `docs/market-analysis.md`, `docs/personas-and-needs.md`, `docs/business-plan.md`,
  `docs/mvp-scope.md` — estratégia. `DECISIONS.md` D1–D3.

### Sessão 2 — 2026-06-15 (Fase 1 — scaffold + núcleo)
- **Scaffold completo** Next.js 15 + React 19 + TS + Tailwind v3 + Vitest:
  `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`,
  `tailwind.config.ts`, `vitest.config.ts`, `.gitignore`, `.env`/`.env.example`.
- **Modelo de dados** `prisma/schema.prisma`: `User`, `Show`, `Transaction`, `Contact`,
  `ShowContact` (N:N), enums de status/tipo/papel. Migration inicial em
  `prisma/migrations/.../init`. Valores monetários em **centavos** (Int).
- **Lógica de negócio (antes da UI)**:
  - `src/lib/finance.ts` — `computeShowPnL` (P&L por show), `summarize`,
    `totalsByCategory`, `totalsByMonth`, `pnlByShow`. Tipos puros (desacoplados do Prisma).
  - `src/lib/money.ts` — centavos⇄unidades, `parseMoneyToCents` (pt-BR e en), `formatMoney`.
  - **Testes**: `src/lib/finance.test.ts` (11) + `src/lib/money.test.ts` (7) = **18 verdes**.
- `src/lib/prisma.ts` — singleton do Prisma Client.
- **UI inicial**: `src/app/layout.tsx`, `globals.css`, `page.tsx` (landing) e
  `dashboard/page.tsx` (placeholder). Build de produção OK.
- `prisma/seed.ts` — usuário demo com 2 shows, 5 transações e 1 contato (idempotente).
- `README.md` atualizado; `DECISIONS.md` D4–D7 (nome "Palco", centavos, regra do P&L,
  auth adiada).

## Próximos passos (priorizados para a próxima sessão)
1. **F1 — Auth/Workspace.** Decidir Auth.js vs. hashing próprio (ver D7) e registrar.
   Implementar cadastro/login, sessão, e proteção das rotas `/dashboard/*`. Atualizar o
   seed para gerar um hash real. Testes para a camada de auth/sessão se houver lógica.
2. **F2 — Agenda de shows (UI + persistência).** Listagem (lista; calendário pode vir
   depois) e formulário CRUD via Server Actions, lendo/gravando no Prisma, escopado ao
   usuário logado. Validação com Zod (criar `src/lib/validation.ts`).
3. **F3 — Finanças.** CRUD de transações com vínculo opcional a show; dashboard usando
   `summarize`/`totalsByMonth`/`totalsByCategory` (já testados).
4. **F4 — Rentabilidade.** Tela do show com `computeShowPnL`; agregado no dashboard.
5. **F5 — CRM de contatos.** CRUD + vínculo a shows (`ShowContact`).
6. Polimento responsivo.

### Notas técnicas para a próxima sessão
- O build roda `prisma generate` automaticamente (script `build`). Após editar o schema:
  `npx prisma migrate dev --name <nome>`.
- O `*.db` está no `.gitignore` (não versionar). A migration **é** versionada.
- Camada de UI deve sempre filtrar por `userId` (multi-tenant por usuário).
- Reaproveitar as funções puras de `src/lib/finance.ts` na UI — não recalcular à mão.

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** em `personas-and-needs.md` (CRM, EPK,
  multiusuário) precisam de 5–10 entrevistas com músicos reais.
- Foco **português/LATAM** e faixas de preço (`business-plan.md`) são hipóteses de GTM.
- Regra do P&L (`max(cachê, receita)` — D6): confirmar com usuários se preferem somar.
- Nome "Palco" (D4): marca/domínio não verificados.
