# PROGRESS — Plataforma de Gestão de Carreira para Músicos

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 iniciada — fundação pronta.** Scaffold Next.js + TypeScript + Tailwind + Prisma
(SQLite) funcionando. Modelo de dados completo e **lógica de negócio financeira testada**
(P&L por show, agregações). `npm run build` e `npm test` **verdes**. Ainda **sem auth nem
telas de CRUD** — a landing (`/`) é um placeholder estático.

## Como rodar
- `npm install` → instala deps.
- `cp .env.example .env` → cria `.env` (DATABASE_URL=sqlite local).
- `npx prisma migrate dev` → cria/atualiza `dev.db` (já há migration `init`).
- `npm run dev` → app em http://localhost:3000.
- `npm test` → 15 testes da lógica de negócio (Vitest).
- `npm run build` → build de produção.

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/market-analysis.md`, `docs/personas-and-needs.md`, `docs/business-plan.md`,
  `docs/mvp-scope.md` — estratégia. `DECISIONS.md` D1–D3.

### Sessão 2 — 2026-06-15 (Fase 1 — scaffold + fundação)
- **Scaffold**: `package.json`, `tsconfig.json`, `next.config.mjs`, Tailwind
  (`tailwind.config.ts`, `postcss.config.mjs`, `src/app/globals.css`), Vitest
  (`vitest.config.ts`), `.gitignore`, `.env.example`.
- **Modelo de dados** (`prisma/schema.prisma`): `User`, `Show`, `Transaction`, `Contact`,
  `ContactOnShow` (M:N show↔contato). Valores em centavos (Int). Migration inicial em
  `prisma/migrations/`. Cliente singleton em `src/lib/prisma.ts`.
- **Domínio** (`src/lib/domain.ts`): constantes/labels de status de show, tipos de
  transação, categorias e papéis de contato + type guards.
- **Dinheiro** (`src/lib/money.ts`): `parseAmountToCents` (pt-BR-first, ver D4) e
  `formatCents` (BRL).
- **Lógica financeira** (`src/lib/finance.ts`): `computeShowPnL` (cachê + receitas
  vinculadas − despesas = resultado), `summarize` (totais + a receber/a pagar),
  `totalsByCategory`, `totalsByMonth`.
- **Testes** (`src/lib/*.test.ts`): 15 testes cobrindo P&L, agregações, parsing monetário.
- **UI**: `src/app/layout.tsx` + `src/app/page.tsx` (landing placeholder).
- `DECISIONS.md`: D4 (centavos/parsing), D5 (fatiamento da Fase 1).

## Próximos passos (priorizados para a próxima sessão)
1. **F1 — Autenticação.** Decidir Auth.js (recomendado) vs. solução própria simples e
   registrar em DECISIONS.md. Implementar cadastro/login com `passwordHash` (bcrypt/argon2),
   sessão por cookie, e proteger rotas autenticadas. Seed de um usuário demo.
2. **Layout autenticado + navegação** (`/dashboard`, `/shows`, `/financas`, `/contatos`).
3. **F2 — Agenda de shows.** CRUD via Server Actions: lista + form. Usar `SHOW_STATUSES`.
   Testar as actions/validações (Zod) com a lógica de domínio.
4. **F3 — Finanças.** CRUD de transações com vínculo opcional a show; usar `summarize` e
   `totalsByMonth`/`totalsByCategory` no dashboard.
5. **F4 — Rentabilidade.** Tela do show usando `computeShowPnL`; agregar "lucro por show/mês".
6. **F5 — CRM de contatos.** CRUD + vínculo a shows (`ContactOnShow`).
7. Polimento responsivo + dashboard consolidado.

### Notas técnicas para a próxima sessão
- Lógica de negócio já é pura e testada — as Server Actions devem só orquestrar Prisma +
  chamar essas funções; mantenha cálculo fora dos componentes.
- Adicionar testes para as validações Zod e para o mapeamento Prisma→`TxInput`.
- Considerar um `seed.ts` (Prisma) para dados de demonstração.

## Bloqueios / dúvidas (para validação humana)
- Necessidades **hipótese** em `personas-and-needs.md` (CRM, EPK, multiusuário) precisam de
  5–10 entrevistas com músicos reais.
- Foco pt-BR/LATAM e faixas de preço (`business-plan.md`) são hipóteses — validar.
- Heurística de parsing monetário para `"1.500"` (ver D4) precisa de validação com usuários.
