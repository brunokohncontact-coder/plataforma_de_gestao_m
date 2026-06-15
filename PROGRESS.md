# PROGRESS — Palco (Plataforma de Gestão de Carreira para Músicos)

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 — MVP v1 FUNCIONAL.** As 5 funcionalidades do `docs/mvp-scope.md` (F1–F5) estão
implementadas. `npm run build` ✅, `npm test` (19 testes) ✅, `npm run db:seed` ✅.
Stack: Next.js 14 (App Router) + TypeScript + Prisma (SQLite dev) + Tailwind.

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- Documentos de estratégia em `docs/` (market-analysis, personas-and-needs, business-plan, mvp-scope).
- `DECISIONS.md` D1–D3 (foco, núcleo MVP, stack).

### Sessão 2 — 2026-06-15 (Fase 1 — scaffold + MVP completo)
- **Scaffold**: `package.json`, `tsconfig.json`, `next.config.mjs`, Tailwind/PostCSS,
  `.gitignore`, `.env.example`, ESLint. Vitest configurado (`vitest.config.ts`).
- **Modelo de dados** (`prisma/schema.prisma`): `User`, `Show`, `Transaction`, `Contact`,
  `ShowContact` (join N:N). Migration inicial em `prisma/migrations/`. Seed em `prisma/seed.ts`
  (login demo: `demo@palco.app` / `demo1234`).
- **Lógica de negócio + testes (antes da UI)**:
  - `src/lib/finance.ts` — `calcShowPnL` (rentabilidade por show), `summarize`,
    `aggregateByMonth`, `aggregateByCategory`, `roundMoney`. 14 testes em `finance.test.ts`.
  - `src/lib/session.ts` — assinatura/verificação HMAC de sessão (puro). 5 testes em `session.test.ts`.
  - `src/lib/validation.ts` — schemas Zod; `src/lib/enums.ts` — domínios; `src/lib/format.ts` — pt-BR.
- **Auth (F1)**: `src/lib/auth.ts` (bcrypt + cookie httpOnly), `src/app/actions/auth.ts`,
  páginas `/login`, `/register`, landing `/`, guard em `src/app/app/layout.tsx`.
- **Shows (F2)**: lista `/app/shows`, novo/editar, detalhe `/app/shows/[id]`. Actions em
  `src/app/actions/shows.ts`. Form em `src/components/ShowForm.tsx`.
- **Finanças (F3)**: `/app/financas` (lista + resumo + despesas por categoria), novo/editar,
  toggle de status (recebida/paga). Actions em `src/app/actions/transactions.ts`.
- **Rentabilidade (F4)**: P&L exibido na tela do show e no painel ("Shows mais rentáveis").
- **CRM (F5)**: `/app/contatos` (CRUD), vínculo contato↔show na tela do show
  (`ShowContactsForm` + `setShowContactsAction`).
- **Painel** `/app`: KPIs (receitas/despesas/resultado/a receber), próximos shows,
  resultado mensal, shows mais rentáveis.
- `DECISIONS.md` D4 (nome "Palco"), D5 (auth própria HMAC), D6 (modelo de P&L). README atualizado.

## Próximos passos (priorizados para a próxima sessão)
1. **Visão de calendário** dos shows (hoje só lista) — F2 pede lista + calendário.
2. **Filtros/busca** em finanças (por mês, tipo, status) e em shows (por status/período).
3. **Testes de integração** das server actions (criar show/transação, isolamento por usuário) —
   hoje os testes cobrem só a lógica pura. Avaliar vitest + DB SQLite temporário.
4. **Detalhe/edição de contato** com lista de shows vinculados na própria página do contato.
5. **Polimento UX**: erros de formulário por campo (hoje mostra 1 erro geral), loading states,
   vazios mais ricos, acessibilidade (labels/aria).
6. **Reset de senha / verificação de e-mail** (ver D5) ao sair do MVP cru.
7. **Deploy**: definir hospedagem e migrar Prisma para Postgres (provider) — ver D3.
8. **SessionStart hook** (`.claude/`) para garantir `npm install`/migrate em sessões web.

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** em `personas-and-needs.md` (CRM, multiusuário)
  precisam de 5–10 entrevistas com músicos reais.
- Nome "Palco" (D4) sem verificação de marca/domínio.
- Modelo de P&L (D6): validar se o headline deve priorizar receita realizada em shows já realizados.
- Disposição a pagar e faixas de preço (`business-plan.md`) são estimativas.

## Notas técnicas para a próxima sessão
- DB de dev é SQLite (`prisma/dev.db`, ignorado pelo git). Rodar `npm run db:migrate` e
  opcionalmente `npm run db:seed` após `npm install`.
- Rotas protegidas vivem em `src/app/app/**`; o guard está no layout que chama `getCurrentUser()`.
- Enums são `String` no schema (SQLite) validados por Zod — ao migrar p/ Postgres, dá para
  promover a enums nativos se desejado.
