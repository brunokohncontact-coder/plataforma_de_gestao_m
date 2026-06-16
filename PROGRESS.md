# PROGRESS — Plataforma de Gestão de Carreira para Músicos

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 em andamento — MVP funcional ponta a ponta.** O app builda (`npm run build` ✓),
roda (`npm start` ✓ — `/login` 200, `/` redireciona) e tem testes verdes (`npm test` — 34 ✓).
As 5 features do escopo (F1–F5) estão implementadas com CRUD e a tela de rentabilidade por
show (F4). Próxima sessão: polimento, validações de borda e mais testes/UX.

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/market-analysis.md`, `docs/personas-and-needs.md`, `docs/business-plan.md`,
  `docs/mvp-scope.md` — pesquisa, personas, plano e escopo do MVP.
- `DECISIONS.md` — D1 (foco back-office), D2 (núcleo MVP), D3 (stack).

### Sessão 2 — 2026-06-16 (Fase 1 — scaffold + MVP)
- **Scaffold**: Next.js 14 (App Router) + TS + Tailwind + Prisma + Vitest. Config completa
  (`package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss`,
  `vitest.config.ts`, `.gitignore`, `.env.example`). Next fixado em 14.2.35 (patch de segurança).
- **Modelo de dados** (`prisma/schema.prisma`): `User`, `Show`, `Transaction`, `Contact`
  com relações e índices. Migration inicial em `prisma/migrations/`. SQLite em dev.
  Enums viraram `String` (SQLite não suporta enum) validados na app — ver D6.
- **Lógica de negócio (testada ANTES da UI)**:
  - `src/lib/finance.ts` — `showProfitability` (F4), `financeSummary` (F3, com a receber/pagar),
    `monthlyTotals`, `totalsByCategory`, `sumByType`. + `src/lib/money.ts` (arredondamento/BRL).
  - `src/lib/session.ts` — token de sessão assinado (HMAC). `src/lib/password.ts` — scrypt.
  - `src/lib/validation.ts` — schemas Zod. `src/lib/enums.ts` — enums + rótulos.
  - Testes: `finance.test.ts` (16), `session.test.ts` (6), `validation.test.ts` (8),
    `password.test.ts` (4) — **34 testes, todos verdes**.
- **Auth (F1)**: `src/lib/auth.ts` (cookies + Prisma), páginas `(auth)/login`, `(auth)/register`,
  ações em `(auth)/actions.ts` (register/login/logout). Rotas protegidas via `requireUser`.
- **UI da área logada** (`src/app/(app)/`): layout com navegação + logout.
  - **Dashboard** (`dashboard/`): KPIs financeiros, próximos shows, fluxo mensal (mini-barras),
    rentabilidade dos shows realizados.
  - **Shows (F2)**: lista, criar, detalhe (com P&L — F4), editar, excluir; status e contato.
  - **Finanças (F3)**: lista com KPIs e por-categoria, criar, excluir, alternar liquidado/pendente.
  - **Contatos (F5)**: lista + criar + excluir; contagem de shows vinculados.
- `prisma/seed.ts` — usuário demo (`demo@palco.app` / `demo12345`) com dados de exemplo.
- `DECISIONS.md` — D4 (cachê via `fee`, anti double-count), D5 (auth própria), D6 (enums string).
- `README.md` atualizado com stack, features e instruções.

## Próximos passos (priorizados para a próxima sessão)
1. **Edição de transações e de contatos** (hoje só criar/excluir). Reusar os forms.
2. **Validação/erros de borda na UI**: as server actions de show/transação retornam `errors`,
   mas nem todas as páginas exibem todos; revisar mensagens e estados vazios.
3. **Mais testes**: cobrir as server actions garantindo **isolamento de workspace** (um usuário
   não acessa dados de outro) com Prisma de teste (SQLite temporário). Hoje os testes são só de
   funções puras.
4. **UX/polimento**: confirmação antes de excluir, formatação de inputs de moeda, visão de
   **calendário** para shows (mvp-scope cita "lista e calendário" — só lista feita).
5. **Filtros**: finanças por mês/período e por show; shows por status.
6. **Deploy/produção**: documentar migração SQLite→Postgres (trocar `provider` + `DATABASE_URL`)
   e variáveis (`AUTH_SECRET`). Considerar CI (GitHub Actions: build + test).

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** em `personas-and-needs.md` (CRM/F5, multiusuário)
  precisam de 5–10 entrevistas com músicos reais antes de investimento pesado.
- **Double-counting do cachê** (D4): o cachê é o campo `fee` e transações de receita vinculadas
  são "extras". Validar com usuários se isso é intuitivo ou se confunde.
- Foco **português/LATAM** e faixas de preço (`business-plan.md`) continuam como hipóteses.
- **Auth própria** (D5) é deliberadamente simples para o MVP; migrar para Auth.js antes de
  login social/recuperação de senha/multiusuário.
