# PROGRESS — Plataforma de Gestão de Carreira para Músicos

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 em andamento.** O app builda (`npm run build`), roda (`npm start`) e tem testes
verdes (`npm test` — 20 testes). Já entregue: scaffold, modelo de dados, lógica financeira
testada, **F1 (Auth) completo** e **F2 (Shows CRUD) completo**, com Painel/Dashboard
consumindo a lógica de negócio. F3 (Finanças) e F5 (Contatos) ainda são placeholders.

### Como rodar
```
cp .env.example .env      # já existe um .env de dev no container, mas é gitignored
npm install
npm run db:push           # cria/atualiza o SQLite dev.db
npm run db:seed           # opcional: usuário demo@palco.app / senha123 com dados
npm run dev               # http://localhost:3000
npm test                  # testes da lógica de negócio + auth
```

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/` — market-analysis, personas-and-needs, business-plan, mvp-scope.
- `DECISIONS.md` — D1 (foco back-office), D2 (núcleo MVP), D3 (stack).

### Sessão 2 — 2026-06-15 (Fase 1 — scaffold + F1 + F2)
- **Scaffold**: Next.js 15 (App Router) + TS + Tailwind + Prisma (SQLite). Configs:
  `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`,
  `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.example`.
- **Modelo de dados**: `prisma/schema.prisma` — `User`, `Show`, `Transaction`, `Contact`
  + enums (ShowStatus, SettlementStatus, TransactionType, ContactRole). `prisma/seed.ts`.
- **Lógica de negócio** (`src/lib/finance.ts`, funções puras): `showProfitability` (P&L
  por show = cachê + receitas − despesas vinculadas, + realizedNet/margem),
  `financialSummary` (previsto vs. recebido/pago, por categoria, contas a receber),
  `monthlyBreakdown`. Testes: `src/lib/finance.test.ts` (13).
- **F1 — Auth** (decisão D4): `src/lib/auth.ts` (bcrypt + sessão HMAC em cookie
  HTTP-only), `src/lib/session.ts` (getCurrentUser/requireUser/cookies),
  `src/lib/validation.ts` (zod). Páginas `(auth)/login`, `(auth)/signup`, server actions
  em `(auth)/actions.ts` (signup/login/logout). Testes: `src/lib/auth.test.ts` (7).
- **F2 — Shows CRUD**: `(app)/shows` (lista), `/shows/new`, `/shows/[id]` (detalhe com
  P&L + excluir), `/shows/[id]/edit`. `(app)/shows/actions.ts` (create/update/delete com
  escopo por userId). Componente reutilizável `src/components/ShowForm.tsx`.
- **Dashboard/Painel** (`(app)/dashboard`): cards de saldo previsto/recebido/a receber/
  despesas, receitas e despesas por categoria, resultado mensal, próximos shows. Estado
  vazio com CTAs.
- **Layout protegido** (`(app)/layout.tsx`) com nav + logout; landing page pública.
- Helpers `src/lib/format.ts` (moeda/data pt-BR) e `src/lib/labels.ts` (rótulos de enums).
- Placeholders `(app)/financas` e `(app)/contatos` (evitam links quebrados na nav).
- `DECISIONS.md` — adicionada D4 (estratégia de autenticação).
- **Verificado**: build OK, 20 testes verdes, smoke test do servidor (landing 200, guard
  de auth redireciona, dashboard e detalhe de show renderizam com dados do seed).

## Próximos passos (priorizados para a próxima sessão)
1. **F3 — Finanças (CRUD de transações)**: substituir o placeholder `(app)/financas`.
   - Lista + filtros (tipo, mês, categoria, status), formulário (reutilizar padrão do
     `ShowForm`), vínculo opcional a um show (select), marcar recebido/pendente.
   - `schema`/`actions` análogos aos de shows (`transactionSchema` já existe em
     `validation.ts`). Revalidar `/dashboard` e `/shows/[id]` ao salvar.
2. **F5 — Contatos (CRM)**: substituir placeholder `(app)/contatos`. CRUD usando
   `contactSchema` (já existe). O `ShowForm` já tem o select de contato.
3. **Vincular transações ao show pela própria tela do show**: botão "adicionar despesa"
   em `/shows/[id]` que abre o form de transação já com `showId` preenchido.
4. **Polimento**: feedback de sucesso (toasts), validação de campos no cliente, paginação
   da lista de shows, visão de calendário (F2 menciona lista E calendário — só lista feita).
5. **CI**: workflow GitHub Actions rodando `npm ci && npm test && npm run build`.
6. **Auth hardening**: rate limiting no login, e considerar `AUTH_SECRET` obrigatório em
   produção (já lança erro se ausente).

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** em `personas-and-needs.md` (CRM, multiusuário)
  ainda precisam de 5–10 entrevistas com músicos antes de investimento pesado.
- Modelagem da rentabilidade: decidi que `Show.fee` NÃO é uma Transaction (para evitar
  dupla contagem) e o status de recebimento do cachê vive em `Show.feeStatus`. Validar se
  isso casa com o fluxo mental do usuário (ver comentário no topo de `src/lib/finance.ts`).
- Em produção é preciso trocar o provider do Prisma para PostgreSQL e definir `DATABASE_URL`
  e `AUTH_SECRET` reais (ver D3/D4).
