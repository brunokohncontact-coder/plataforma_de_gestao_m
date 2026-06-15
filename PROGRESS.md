# PROGRESS — Plataforma de Gestão de Carreira para Músicos ("Palco")

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 em andamento — MVP funcional ponta a ponta.** As 5 features do escopo (F1–F5)
estão implementadas e o app **builda, roda, passa nos testes e no lint**. Próximo foco:
ampliar cobertura de testes, polir UX e adicionar visão de calendário/relatórios.

Comandos verificados nesta sessão (todos verdes):
`npm run build` ✓ · `npm test` (10 testes) ✓ · `npm run lint` ✓ · smoke test HTTP ✓.

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/market-analysis.md`, `docs/personas-and-needs.md`, `docs/business-plan.md`,
  `docs/mvp-scope.md` — estratégia. `DECISIONS.md` D1–D3.

### Sessão 2 — 2026-06-15 (Fase 1 — scaffold + MVP)
- **Scaffold**: Next.js 14 (App Router) + TS + Tailwind + Prisma + Vitest. Configs:
  `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`,
  `next.config.mjs`, `vitest.config.ts`, `.eslintrc.json`, `.gitignore`, `.env.example`.
- **Modelo de dados** (`prisma/schema.prisma`): `User`, `Show`, `Transaction`, `Contact`.
  Enums viraram `String` (SQLite não suporta enum — ver DECISIONS D3.1). `prisma/seed.ts`
  com dados demo (login `demo@palco.app` / `demo12345`).
- **Lógica de negócio PURA + testes** (escrita ANTES da UI):
  - `src/lib/domain/finance.ts` — `computeShowPnL` (F4), `summarizeTransactions`,
    `groupByMonth`, `groupByCategory`. `src/lib/domain/money.ts` (arredondamento p/ centavos,
    `formatBRL`). `src/lib/domain/enums.ts` (valores + rótulos PT-BR).
  - `src/lib/domain/finance.test.ts` — **10 testes** cobrindo P&L, prejuízo, margem nula,
    drift de float, recebido/pendente, agregação mensal e por categoria.
- **Infra de app**: `src/lib/db.ts` (Prisma singleton), `src/lib/auth.ts` (bcrypt + sessão
  por cookie HMAC, `requireUser`), `src/lib/validation.ts` (Zod), `src/lib/format.ts`.
- **Server Actions** (`src/app/actions/`): `auth`, `shows`, `transactions`, `contacts` —
  tudo escopado por `userId` (isolamento por workspace).
- **UI** (App Router):
  - `(auth)`: login e cadastro.
  - `(app)`: layout com nav + logout; **dashboard** (saldo, a receber, lucro em shows,
    próximos shows), **shows** (lista, novo, detalhe com P&L, editar), **finances**
    (resumo, por mês, por categoria, lançamentos, toggle recebido/pago), **contacts**
    (lista, criar, editar, excluir; contagem de shows vinculados).
  - Componentes: `ShowForm`, `TransactionForm`, `ContactForm`, `SubmitButton`,
    `ConfirmButton`, `NavLink`, `StatusBadge`.
- `README.md` reescrito (como rodar, estrutura). `DECISIONS.md` D3.1, D4, D5 adicionadas.

## Próximos passos (priorizados para a próxima sessão)
1. **Mais testes**: cobrir `validation.ts` (parsing de dinheiro BR "1.234,56", datas,
   enums) e a assinatura/verificação de sessão em `auth.ts` (HMAC, token adulterado).
   Considerar testes de integração das server actions com um SQLite de teste.
2. **F2 — visão de calendário** dos shows (hoje só lista). Filtro por status e por período.
3. **Relatórios/dashboard**: gráfico simples de receita×despesa por mês; exportar CSV das
   finanças (pedido recorrente de quem usa planilha).
4. **Polish UX**: estados de erro/loading mais ricos, máscara de moeda no input, paginação
   das listas, vazio/onboarding guiado. Acessibilidade básica.
5. **Qualidade**: configurar GitHub Actions (build + test + lint) — CI. Adicionar
   `SessionStart` hook para garantir `npm install`/`db:push` nas execuções web.
6. **Auth**: avaliar reset de senha e, se priorizado, migração para Auth.js (DECISIONS D5).

## Bloqueios / dúvidas (para validação humana)
- **D4 (cálculo de P&L)**: confirmar com músicos se o cachê deve ser campo dedicado (atual)
  ou apenas mais uma transação. Afeta UX do lançamento financeiro.
- Necessidades **hipótese** em `personas-and-needs.md` (CRM, multiusuário) seguem
  pendentes de 5–10 entrevistas antes de investimento pesado.
- Foco **português/LATAM** e faixas de preço (`business-plan.md`) seguem como hipótese.
- Em produção, decidir Postgres desde o início vs. continuar SQLite até haver tração
  (hoje schema é portável; trocar `provider` + `DATABASE_URL`).
