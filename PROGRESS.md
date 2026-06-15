# PROGRESS — Plataforma de Gestão de Carreira para Músicos ("Palco")

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 — MVP funcional (F1–F5) implementado.** O app **builda, roda e passa nos testes**.
Próxima sessão: polimento, mais testes (server actions/integração) e melhorias de UX.

- `npm run build` ✅ · `npm test` ✅ (21 testes) · `npm start` serve `/`, `/login`, e
  protege rotas privadas (`/dashboard` → 307 para `/login`).
- Login demo (após `npm run db:seed`): **demo@palco.app / senha1234**.

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/`: market-analysis, personas-and-needs, business-plan, mvp-scope.
- `DECISIONS.md`: D1 (foco back-office), D2 (núcleo MVP), D3 (stack).

### Sessão 2 — 2026-06-15 (Fase 1 — MVP completo)
- **Scaffold**: `package.json`, `tsconfig.json`, Tailwind/PostCSS, `vitest.config.ts`,
  `next.config.mjs`, `.gitignore`, `.env.example`.
- **Dados (Prisma + SQLite)**: `prisma/schema.prisma` — `User`, `Show`, `Transaction`,
  `Contact`, `ShowContact` (N:N). `prisma/seed.ts` com dados demo.
- **Lógica de negócio + testes (antes da UI)**:
  - `src/lib/finance.ts` — P&L por show (F4), `summarize`, `totalsByCategory`,
    `totalsByMonth`, `profitByShow` (F3). `src/lib/money.ts` — centavos↔BRL.
  - `src/lib/finance.test.ts` + `src/lib/money.test.ts` — **21 testes verdes**.
- **Auth (F1)**: `src/lib/auth.ts` (bcrypt + cookie HMAC), `src/app/actions/auth.ts`,
  páginas `/login` e `/signup`, layout autenticado `(app)/layout.tsx` + `Nav`.
- **Shows (F2)**: lista (`/shows`), criar/editar, detalhe (`/shows/[id]`) com P&L.
- **Finanças (F3)**: `/financas` com resumo, por categoria, recebido/pendente toggle;
  criar/editar/excluir transações; vínculo opcional a show.
- **Rentabilidade (F4)**: P&L na tela do show e "lucro por show" no dashboard.
- **Contatos (F5)**: `/contatos` CRUD + vínculo de contatos a shows.
- **Dashboard**: KPIs, próximos shows, lucro por show, gráfico mensal receita×despesa.
- `src/lib/validation.ts` (Zod), `src/lib/enums.ts`, `src/lib/format.ts`, componentes
  em `src/components/`.
- `DECISIONS.md`: +D4 (auth própria), D5 (enums como String no SQLite), D6 (dinheiro em centavos).
- `README.md` atualizado com instruções de execução.

## Próximos passos (priorizados para a próxima sessão)
1. **Testes de server actions / integração** — cobrir auth (signup/login/duplicado),
   ownership (um usuário não acessa dados de outro), e os fluxos de criação. Considerar
   `vitest` com banco SQLite de teste isolado (`DATABASE_URL=file:./test.db`).
2. **Validação client-side + mensagens de erro por campo** — hoje a action retorna só a
   primeira mensagem; melhorar feedback (ex.: destacar campo, exibir todas as issues Zod).
3. **Visão de calendário para shows (F2)** — atualmente só lista; o mvp-scope pede
   "lista e calendário". Adicionar uma visão mensal simples.
4. **Filtros em Finanças** — por período (mês), por tipo, por show; e por status
   (pendentes) para "contas a receber/pagar".
5. **Polimento UX/responsivo** — estados de loading, empty states, acessibilidade,
   confirmar responsividade em telas pequenas.
6. **CI básico** — workflow (GitHub Actions) rodando `npm ci && npm run build && npm test`.
7. Eventual: exportação CSV das finanças; relatório anual.

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** em `personas-and-needs.md` (CRM, EPK,
  multiusuário) precisam de 5–10 entrevistas com músicos reais antes de investimento pesado.
- Foco em **português/LATAM** e faixas de preço (`business-plan.md`) são hipóteses — validar.
- Produção exigirá: migrar Prisma para **PostgreSQL**, definir `AUTH_SECRET` real,
  e (recomendado) rate-limiting no login antes de abrir beta.
