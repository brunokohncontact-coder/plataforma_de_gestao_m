# PROGRESS — Palco (Plataforma de Gestão de Carreira para Músicos)

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 em andamento — fundação do MVP construída e funcional.** O app builda
(`npm run build` ✓), os testes passam (`npm test` — 19/19 ✓) e o servidor sobe com as
features F1–F5 navegáveis. Stack: Next.js 15 (App Router) + TS + Prisma (SQLite) + Tailwind.

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/` — market-analysis, personas-and-needs, business-plan, mvp-scope.
- `DECISIONS.md` — D1 (back-office), D2 (núcleo MVP), D3 (stack).

### Sessão 2 — 2026-06-15 (Fase 1 — scaffold + fundação + UI MVP)
- **Scaffold**: `package.json`, `tsconfig.json`, `next.config.mjs`, Tailwind
  (`tailwind.config.ts`, `postcss.config.mjs`, `src/app/globals.css`), Vitest
  (`vitest.config.ts`), `.gitignore`, `.env.example`. `npm run build` e `npm test` verdes.
- **Modelo de dados** (`prisma/schema.prisma`): `User`, `Show`, `Transaction`, `Contact`
  com enums (ShowStatus, TransactionType, ContactRole). Migration `init` aplicada.
  Seed idempotente (`prisma/seed.ts`) — usuário demo `demo@palco.app` / `demo1234`.
- **Lógica de negócio pura + testes ANTES da UI** (foco do protocolo):
  - `src/lib/money.ts` — dinheiro em centavos (`toCents`/`formatMoney`), parsing pt-BR/en.
  - `src/lib/finance.ts` — `computeShowPnL` (F4), `summarize`, `aggregateByMonth`,
    `aggregateByCategory`. Tudo puro, sem Prisma.
  - `src/lib/finance.test.ts` + `src/lib/money.test.ts` — **19 testes, todos passando**.
- **Auth (F1)**: `src/lib/auth.ts` (bcrypt + JWT/jose em cookie httpOnly), `src/lib/session.ts`,
  páginas `(auth)/login` e `(auth)/signup` com Server Actions, guarda em `app/app/layout.tsx`.
  Decisão registrada em DECISIONS.md **D5** (auth própria vs Auth.js) e **D4** (centavos).
- **UI das features** (Server Actions para mutações):
  - **F2 Shows**: lista, criar (`shows/new`), detalhe (`shows/[id]`) com troca de status e exclusão.
  - **F3 Finanças**: lista com resumo + maiores despesas, criar (`finances/new`),
    alternar pago/pendente, excluir.
  - **F4 Rentabilidade**: P&L por show na tela de detalhe + ranking no painel.
  - **F5 Contatos**: lista + form de criação + exclusão, contagem de shows vinculados.
  - **Painel** (`app/page.tsx`): saldos, fluxo por mês, rentabilidade por show, próximos shows.
- Smoke test do servidor de produção: `/` 200, `/login` 200, `/app` → 307 (guarda OK).

## Próximos passos (priorizados para a próxima sessão)
1. **Edição** de shows e transações (hoje só há criar/excluir/troca de status). Reaproveitar
   `ShowForm`/`TransactionForm` para modo "editar" (passar valores default + action de update).
2. **Testes de integração das Server Actions** (validação/ownership): hoje os testes cobrem só
   a lógica pura. Adicionar testes que exercitem `createShow`/`createTransaction` com um DB
   SQLite de teste (ou mocks do Prisma) — cobrir vínculo de despesa a show e cálculo end-to-end.
3. **Vista de calendário** para shows (F2 pede lista E calendário; só há lista).
4. **Filtros** em Finanças (por mês, tipo, show) e em Shows (por status/período).
5. **Polish responsivo/mobile** e estados vazios; revisar navegação em telas pequenas
   (o header com nav pode quebrar — considerar menu compacto).
6. **CI** (GitHub Actions): rodar `npm ci`, `npm run build`, `npm test` em cada push.
7. Detalhe/edição de **contato** com histórico de shows vinculados (hoje só conta).

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** em `personas-and-needs.md` (CRM, multiusuário)
  precisam de 5–10 entrevistas com músicos reais antes de investimento pesado.
- Foco **português/LATAM** e faixas de preço (`business-plan.md`) são hipóteses — validar.
- **Auth própria (D5)** não cobre reset de senha nem verificação de e-mail — aceitável para
  protótipo; migrar para Auth.js antes de abrir cadastro ao público / multiusuário.
- Produção exigirá trocar o `provider` do Prisma para `postgresql` + `DATABASE_URL` real.

## Como retomar rápido
```bash
npm install && npm run db:migrate && npm run db:seed && npm run dev
npm test            # 19/19 verdes
```
