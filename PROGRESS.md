# PROGRESS — Plataforma de Gestão de Carreira para Músicos ("Palco")

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 (MVP) — núcleo funcional implementado.** App Next.js builda (`npm run build`),
testes passam (`npm test`, 20 testes) e seed funciona. As 5 funcionalidades do
`docs/mvp-scope.md` (F1–F5) têm fluxo CRUD ponta a ponta. Falta polimento, testes de
integração e hardening de auth.

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/` — market-analysis, personas-and-needs, business-plan, mvp-scope.
- `DECISIONS.md` — D1 (foco back-office), D2 (núcleo MVP), D3 (stack).

### Sessão 2 — 2026-06-15 (Fase 1 — scaffold + MVP F1–F5)
- **Scaffold:** Next.js 15 + React 19 + TS + Tailwind 3 + Prisma 6 + Vitest.
  `package.json`, `tsconfig`, `next.config.mjs`, `tailwind.config.ts`, `postcss`,
  `vitest.config.ts`, `.gitignore`, `.env.example`, CI em `.github/workflows/ci.yml`.
- **Modelo de dados** (`prisma/schema.prisma`): `User`, `Show`, `Transaction`, `Contact`,
  `ShowContact` (N:N). Enums de status. Valores monetários em centavos (D5).
- **Lógica de negócio pura + testes ANTES da UI:**
  - `src/lib/money.ts` (+ `money.test.ts`, 7 testes) — centavos↔reais, BRL, parse pt-BR.
  - `src/lib/finance.ts` (+ `finance.test.ts`, 13 testes) — `computeTotals`,
    `summarizeByCategory`, `summarizeByMonth`, `computeShowPnL` (F4), `totalProfit`.
- **Auth (F1):** `src/lib/auth.ts` (bcrypt + JWT/jose em cookie httpOnly), `session.ts`
  (`requireUser`), `src/app/actions/auth.ts`. Páginas `/login`, `/signup`. Decisão D4.
- **Server actions:** `src/app/actions/{shows,transactions,contacts}.ts` (CRUD + validação
  Zod em `src/lib/validation.ts`, escopados por `userId`).
- **UI (área `/app`):** layout com nav (`src/app/app/layout.tsx`), **Painel** (dashboard com
  saldo, a receber/pagar, lucro em shows, gráfico mensal, próximos shows), **Shows**
  (lista/novo/detalhe com P&L/editar), **Finanças** (lista + totais + por categoria,
  nova/editar, toggle de status), **Contatos** (lista/novo/editar, vínculo a shows).
  Componentes em `src/components/`. Landing em `src/app/page.tsx`.
- **Seed** demo (`prisma/seed.ts`): login `demo@palco.app` / `demodemo`.

## Próximos passos (priorizados para a próxima sessão)
1. **Testes de integração das server actions** (auth, P&L recalculado ao vincular
   transação, isolamento por usuário). Hoje só a lógica pura tem testes.
2. **Hardening de auth** (dívida técnica em D4): reset de senha, validação de e-mail,
   rate limiting básico no login. Avaliar mover sessão para tabela (revogação).
3. **Polir UX:** estados de loading nos forms (já há `useFormStatus`), feedback de sucesso,
   visão de calendário para shows (hoje só lista), filtros/busca em finanças e shows.
4. **Dashboard financeiro mais rico:** filtro por período, exportar CSV.
5. **Acessibilidade e responsivo:** revisar navegação mobile (menu lateral vira topo).
6. Só então considerar features de Fase 2 (multiusuário, contratos) — ver mvp-scope.

## Como rodar / verificar
- `npm install && npx prisma generate && npx prisma db push`
- `npm test` (lógica de negócio) · `npm run build` · `npm run dev` · `npm run db:seed`

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** (CRM, multiusuário) — validar com 5–10 músicos.
- Foco **português/LATAM** e faixas de preço (`business-plan.md`) — hipóteses de GTM.
- Auth do MVP é mínima (D4): **não usar em produção sem hardening**.
- Produção exigirá trocar o `provider` do Prisma para PostgreSQL (D3) + migrations.
