# PROGRESS — Plataforma de Gestão de Carreira para Músicos (Palco)

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 (MVP) — núcleo funcional + ciclos de CRUD completos + agenda em calendário
+ testes de integração de posse por usuário.**
O app builda (`npm run build`), roda e passa nos testes (`npm test`, **55 testes**). As
cinco funcionalidades do MVP (F1–F5 de `docs/mvp-scope.md`) estão implementadas e
navegáveis. Sessão 4 entregou a visão de calendário dos shows. Sessão 5 entregou
**testes de integração das server actions** com um banco SQLite isolado, cobrindo o
isolamento por usuário (um usuário não acessa/altera dados de outro) — a fronteira de
segurança crítica do produto. Próxima sessão: polimento de UX (confirmação ao excluir,
estados vazios/erro) e filtros nas Finanças.

## Modelo de branches (a partir de 2026-06-16)
O repositório tem um tronco **`main`** (ver DECISIONS.md D7), já definido como **default
branch** e **protegido por ruleset** (requer PR + check `build-and-test`, bloqueia push
direto e force-push — verificado: push direto na `main` → 403). Toda sessão deve partir
de `main` (`git checkout main && git pull`), desenvolver no branch designado e abrir PR
**com base em `main`**. As 15 PRs antigas de execuções paralelas foram fechadas; os
branches `claude/...` legados podem ser apagados no GitHub (o ambiente bloqueia deleção
de branch via git/API).

## Stack escolhida (ver DECISIONS.md D3–D6)
Next.js 14.2 (App Router) + TypeScript + Prisma (SQLite em dev) + Tailwind. Auth própria
leve (bcrypt + JWT em cookie httpOnly via `jose`). Testes com Vitest. CI em `.github/workflows/ci.yml`.

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/` — market-analysis, personas-and-needs, business-plan, mvp-scope.
- `DECISIONS.md` — D1 (foco back-office), D2 (núcleo MVP), D3 (stack).

### Sessão 2 — 2026-06-16 (Fase 1 — scaffold + MVP)
- **Scaffold**: `package.json`, `tsconfig.json`, `next.config.mjs`, Tailwind
  (`tailwind.config.ts`, `postcss.config.mjs`, `src/app/globals.css`), Vitest
  (`vitest.config.ts`), `.gitignore`, `.env.example`. CI em `.github/workflows/ci.yml`.
  Hook de sessão `scripts/session-setup.sh` + `.claude/settings.json` (prepara env em sessões web).
- **Modelo de dados** (`prisma/schema.prisma`): `User`, `Show`, `Transaction`, `Contact`,
  `ContactsOnShows`. Valores monetários em centavos (Int). Enums como String (D5).
  Seed de demonstração em `prisma/seed.ts` (`npm run db:seed`).
- **Lógica de negócio (pura, testada antes da UI)**:
  - `src/lib/finance.ts` — `computeShowPnL` (F4), `summarizeFinances`, `totalsByCategory`,
    `totalsByMonth`. `src/lib/money.ts` — centavos/reais e formatação BRL.
  - Testes: `src/lib/finance.test.ts` (13) + `src/lib/validation.test.ts` (8) = **21, verdes**.
- **Auth (F1)**: `src/lib/auth.ts`, `src/lib/session.ts`, `src/app/(auth)/*`
  (login, register, logout). Cookie httpOnly; `requireUser()` protege as rotas do app.
- **App shell**: `src/app/(app)/layout.tsx` (nav responsiva + logout), landing `src/app/page.tsx`.
- **F2 Shows**: lista, novo, detalhe, editar, excluir — `src/app/(app)/shows/*`.
- **F3 Finanças**: lista com resumo, nova transação, alternar recebido/pago, excluir —
  `src/app/(app)/financas/*`.
- **F4 Rentabilidade**: P&L na tela do show (`shows/[id]`) e blocos no dashboard
  (`src/app/(app)/dashboard/page.tsx`).
- **F5 Contatos**: lista, novo, editar, excluir — `src/app/(app)/contatos/*`.
- Verificação de runtime: servidor sobe; `/` e `/login` → 200; `/dashboard` sem sessão → 307→/login.

### Sessão 3 — 2026-06-16 (Fase 1 — fecho de ciclos de CRUD)
- **Editar transação**: `TransactionForm` refatorado para modo criar/editar (props `action`,
  `values`, `submitLabel`); `updateTransactionAction` em `financas/actions.ts` (com posse
  e revalidação do show antigo+novo); página `financas/[id]/editar`; link ✎ na lista.
- **Vincular/desvincular contato↔show pela UI**: `linkContactToShowAction` /
  `unlinkContactFromShowAction` em `shows/actions.ts` (upsert idempotente no join, checagem
  de posse); seção de contatos interativa no detalhe do show (`shows/[id]`).
- Build verde (16 rotas), typecheck limpo, 21 testes verdes, smoke test das rotas novas OK.
- **Organização do repo**: `main` criado/protegido (D7), default branch trocado, 15 PRs
  antigas fechadas.

### Sessão 4 — 2026-06-16 (Fase 1 — visão de calendário dos shows)
- **Lógica pura de calendário** (`src/lib/calendar.ts`): `parseMonthKey`/`monthKey`/
  `shiftMonth` (navegação por `?mes=YYYY-MM`, com fallback ao mês atual), `monthGridRange`
  (intervalo da grade p/ consulta única ao banco), `buildMonthGrid` (grade de semanas
  domingo→sábado, distribuindo shows no dia local e ordenando por horário). Testes:
  `src/lib/calendar.test.ts` (**12**), total do projeto **33 verdes**.
- **Página** `src/app/(app)/shows/calendario/page.tsx`: grade mensal com navegação
  ←/→/Hoje, ponto de status por show, links para o detalhe e legenda. Consulta só os
  shows da janela exibida (inclui bordas dos meses vizinhos).
- **Alternador Lista/Calendário** (`src/components/ShowsViewToggle.tsx`) nas duas telas;
  cores de status sólidas em `src/lib/domain.ts` (`SHOW_STATUS_DOT`).
- Build verde (17 rotas, nova `/shows/calendario`), typecheck limpo, smoke test autenticado
  OK (render do mês + fallback de `?mes` inválido → 200). `npm audit` inalterado (ver D6).

### Sessão 5 — 2026-06-16 (Fase 1 — testes de integração de posse por usuário)
- **Infra de teste com banco isolado**: `src/test/global-setup.ts` (aplica o schema com
  `prisma db push --force-reset` num `prisma/test.db` dedicado), `src/test/db.ts`
  (helpers `resetDb`, `createUser/createShow/createContact/createTransaction`). Config em
  `vitest.config.ts`: `test.env` (DATABASE_URL→`file:./test.db`, AUTH_SECRET de teste),
  `globalSetup` e `fileParallelism: false` (serializa os testes que tocam o banco).
- **Testes de integração das server actions** (mockando `next/cache`, `next/navigation`
  e `@/lib/session.requireUser` para simular o usuário logado):
  - `src/app/(app)/shows/actions.test.ts` (10): create/validação; update/delete bloqueados
    para não-donos; link/unlink contato↔show com posse cruzada (contato e show precisam
    ser do mesmo dono); upsert idempotente.
  - `src/app/(app)/financas/actions.test.ts` (8): create; rejeição de vincular show de
    outro usuário; update/toggle/delete bloqueados para não-donos.
  - `src/app/(app)/contatos/actions.test.ts` (4): create/validação de e-mail;
    update/delete bloqueados para não-donos.
  - Total do projeto: **55 verdes** (eram 33). Typecheck limpo, build verde (17 rotas),
    smoke test autenticado OK (/ 200, /login 200, /dashboard sem sessão 307).
- **`npm audit`**: 7 advisories (3 moderate, 3 high, 1 critical), **todos** na árvore do
  Next 14.2.x (Next; `esbuild` via tooling de dev; `postcss` em build-time). Nenhum se
  aplica ao runtime do MVP e a correção exige Next 16 (breaking) — mantida a decisão D6.
- **Gap conhecido**: `next lint` ainda não tem ESLint configurado (prompt interativo); o
  CI não roda lint. Configurar ESLint é uma unidade de trabalho à parte (ver próximos passos).

## Próximos passos (priorizados para a próxima sessão)
1. **Configurar ESLint** (`next lint`): hoje não há config (prompt interativo) e o CI não
   roda lint. Adicionar `.eslintrc` (preset `next/core-web-vitals`) + passo de lint no CI,
   corrigindo o que aparecer. Fecha o item "lint" da Definition of Done.
2. **Polimento UX**: estados de loading/erro, mensagens vazias, acessibilidade,
   confirmação antes de excluir (hoje exclui direto). Formatar input monetário ao digitar.
3. **Filtros/períodos nas Finanças** (por mês, por tipo, por show).
4. **Conta**: editar perfil (nome/nome artístico), trocar senha.
5. **Calendário — evoluções**: link do dashboard direto para o mês atual; clicar num dia
   vazio para criar show já com a data; visão semanal. (base pronta em `src/lib/calendar.ts`.)

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** em `personas-and-needs.md` (CRM, multiusuário)
  precisam de 5–10 entrevistas com músicos reais antes de investimento pesado.
- Foco **português/LATAM** e faixas de preço (`business-plan.md`) são hipóteses — validar.
- **Segurança em produção**: definir `AUTH_SECRET` forte e migrar para PostgreSQL antes
  de qualquer deploy real. Revisar advisories do Next (D6) e planejar upgrade p/ Next 15+.
- Exclusões na UI são imediatas (sem confirmação) — decidir padrão de confirmação.
