# PROGRESS — Plataforma de Gestão de Carreira para Músicos (Palco)

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 (MVP) — núcleo funcional + ciclos de CRUD completos + agenda em calendário
+ testes de integração de posse por usuário + ESLint no CI + filtros nas Finanças
(incl. categoria) + confirmação antes de excluir + página de Conta (perfil/senha).**
O app builda (`npm run build`), roda e passa nos testes (`npm test`, **83 testes**),
no typecheck e no **lint** (`npm run lint` → 0 warnings/erros). As cinco funcionalidades
do MVP (F1–F5 de `docs/mvp-scope.md`) estão implementadas e navegáveis. **125 testes**
verdes após a Sessão 14 (exportação CSV das Finanças). Sessão 4 entregou
a visão de calendário dos shows. Sessão 5 entregou **testes de integração das server
actions** com um banco SQLite isolado, cobrindo o isolamento por usuário. Sessão 6
configurou **ESLint** (`next/core-web-vitals`) e adicionou o passo de lint ao CI — fechando
o último item pendente da Definition of Done. Sessão 7 entregou **filtros na página de
Finanças** (mês, tipo, show, situação) via query string, com resumo recomputado sobre o
recorte. Sessão 8 entregou **confirmação antes de excluir** (componente `DeleteButton`)
nos três pontos de exclusão (show, contato, transação). Sessão 9 entregou a **página de
Conta** (`/conta`): editar perfil (nome/nome artístico) e trocar senha (com verificação
da senha atual). Sessão 10 adicionou o **filtro por categoria** nas Finanças. Sessão 11 entregou
**máscara de input monetário ao digitar** (componente `MoneyInput`) nos campos de
valor da transação e do cachê do show. Sessão 12 entregou **filtro por intervalo de
datas (De/Até)** nas Finanças. Sessão 13 entregou **criar show a partir de um clique
no dia do calendário** (data pré-preenchida via `?data=YYYY-MM-DD`). Sessão 14
entregou a **exportação CSV das Finanças** (`/financas/export`) respeitando os filtros
ativos. Sessão 15 entregou a **exportação iCalendar (.ics) da agenda de shows**
(`/shows/agenda.ics`), para assinar/importar no Google/Apple Calendar. Sessão 16
entregou o **destaque de pendências vencidas** (a receber/a pagar com data já passada)
no Painel e nas Finanças. Sessão 17 entregou a **busca textual nas Finanças** (campo
livre que casa descrição + categoria, ignorando acentos e caixa), integrada ao recorte
filtrado e à exportação CSV. Sessão 18 entregou a **projeção de caixa** no Painel
(`projectCashflow`): saldo de caixa projetado mês a mês a partir do caixa realizado,
somando pendências pelo mês de vencimento, com alerta de saldo negativo. Sessão 19
entregou a **visão semanal da agenda de shows** (`/shows/semana`): lista vertical de
domingo a sábado da semana, com navegação ←/→/Esta semana, criar show por dia e link de
detalhe; o alternador de visões virou Lista/Semana/Mês. Sessão 20 entregou a **página de detalhe do
contato** (`/contatos/[id]`): histórico de shows do contato (futuros/anteriores), resumo de
relacionamento (nº de shows, futuros, cachê total, próximo show) e navegação cruzada
shows↔contatos. Sessão 21 entregou o **relatório mensal das Finanças** (`/financas/relatorio`):
fechamento de um mês com resumo (receitas/despesas/saldo/caixa), pendências do mês e a quebra
por categoria (receitas e despesas) com participação (%), navegação ←/→/Mês atual e exportação
CSV do mês. Sessão 22 entregou **filtros e busca na lista de shows** (`/shows`): busca
textual (título/local/cidade, sem acento) + status + intervalo de datas, recorte recomputado
com contador "N de M" e estado vazio dedicado. Sessão 23 entregou **busca e filtro na lista de
contatos** (`/contatos`): busca textual (nome/e-mail/telefone/notas, sem acento) + tipo (papel),
recorte recomputado com contador "N de M" e estado vazio dedicado. Sessão 24 entregou o
**ranking de rentabilidade por show** (`/shows/rentabilidade`): lista os shows ordenados pelo
resultado líquido (P&L), com totais agregados e destaque do mais/menos rentável, excluindo
cancelados. **224 testes** verdes (medição real `vitest run` na Sessão 24; eram 217).
Próxima sessão: continuar o polimento de UX (acessibilidade, mensagens vazias) ou evoluções
de filtros (persistir o último filtro usado).

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

### Sessão 6 — 2026-06-16 (Fase 1 — ESLint + lint no CI)
- **ESLint configurado** (ver DECISIONS.md D8): `eslint@8.57.1` + `eslint-config-next@14.2.35`,
  config clássica em `.eslintrc.json` estendendo `next/core-web-vitals` (ignora `node_modules/`,
  `.next/`, `next-env.d.ts`, `prisma/seed.ts`). `npm run lint` (`next lint`) roda **limpo**
  (0 warnings/erros) sobre os 46 arquivos de `src/`.
- **CI**: passo **Lint** adicionado em `.github/workflows/ci.yml` (entre Typecheck e Test) e
  `NEXT_TELEMETRY_DISABLED=1` no `env` do job para logs limpos. Fecha o item "lint" da
  Definition of Done (antes o `next lint` exigia setup interativo e o CI não rodava lint).
- **Definition of Done — toda verde**: build (17 rotas), typecheck, lint, 55 testes, smoke
  test autenticado (/ 200, /login 200, /dashboard sem sessão 307).
- **`npm audit`**: 7 → 10 advisories; as 3 novas (high) são **só dev-tooling de lint**
  (`eslint-config-next`→`@next/eslint-plugin-next`→`glob` CLI), não exploitáveis no runtime —
  detalhado em D8.

### Sessão 7 — 2026-06-16 (Fase 1 — filtros nas Finanças)
- **Lógica pura de filtro** (`src/lib/finance.ts`): `filterTransactions` (mês/tipo/show/
  situação, critérios ausentes ignorados, mês inválido tratado como "sem filtro"),
  `availableMonths` (meses presentes, ordem decrescente), `isValidMonthKey`, `hasActiveFilter`.
  Testes em `src/lib/finance.test.ts` (+12 → **25 no arquivo, 67 no projeto**).
- **UI** (`src/app/(app)/financas/page.tsx`): formulário GET com seletores de Mês, Tipo,
  Show e Situação (`?mes=&tipo=&show=&status=`), botão **Filtrar** e link **Limpar**. O
  resumo (cards de Receitas/Despesas/Saldo/Caixa e pendências) é **recomputado sobre o
  recorte filtrado**; contador "N de M transações" e estado vazio dedicado para filtros sem
  resultado. Decisão de arquitetura registrada em **DECISIONS.md D9** (query string +
  filtragem em memória).
- Definition of Done verde: build (16 rotas), typecheck, lint (0), 67 testes, smoke test
  autenticado OK (/financas e variações com filtro → 200; sem sessão → 307). `npm audit`
  inalterado em relação à Sessão 6 (ver D6/D8).

### Sessão 8 — 2026-06-16 (Fase 1 — confirmação antes de excluir)
- **Componente reutilizável** `src/components/DeleteButton.tsx` (client): confirmação
  embutida em **duas etapas** (sem `confirm()` bloqueante). O primeiro clique troca o
  gatilho por "Confirmar / Cancelar"; só o "Confirmar" submete o server action (form com
  `id` oculto). Props flexíveis (`trigger`, `triggerClassName`, `confirmMessage`, labels e
  classes de confirm/cancel) para servir tanto botões de texto quanto o gatilho ícone (✕).
  Usa `useFormStatus` para desabilitar e mostrar "Excluindo..." durante o envio; inclui
  `aria-label`/`role="group"` para acessibilidade.
- **Aplicado nos 3 pontos de exclusão**: detalhe do show (`shows/[id]/page.tsx`), lista de
  contatos (`contatos/page.tsx`) e lista de transações (`financas/page.tsx`). Antes a
  exclusão era imediata (item de polimento pendente desde a Sessão 7 — "exclui direto").
- Definition of Done verde: build (16 rotas), typecheck limpo, lint (0), 67 testes, smoke
  test autenticado OK (/ 200, /login 200, /dashboard e /contatos sem sessão → 307). `npm
  audit` inalterado (10 advisories; nenhuma dependência nova adicionada — ver D6/D8).
- **Nota de teste**: o `DeleteButton` é puramente de UI (sem regra de negócio); não há
  lib de teste de DOM no projeto, então a verificação foi por build + smoke, alinhado às
  sessões anteriores (UI não coberta por testes unitários).

### Sessão 9 — 2026-06-16 (Fase 1 — página de Conta: perfil + senha)
- **Schemas puros** (`src/lib/validation.ts`): `updateProfileSchema` (nome obrigatório,
  nome artístico opcional) e `changePasswordSchema` (senha atual, nova ≥ 8 chars,
  confirmação) com `.refine` cruzado (confirmação corresponde + nova ≠ atual). Testes em
  `src/lib/validation.test.ts` (+5 → 13 no arquivo).
- **Server actions** (`src/app/(app)/conta/actions.ts`): `updateProfileAction` (grava
  nome/nome artístico do usuário logado, revalida `/conta` e o layout do app p/ o cabeçalho)
  e `changePasswordAction` (verifica a **senha atual** via `verifyPassword` antes de gravar
  o novo hash). Ambas retornam `{ error? , success? }`. Decisão sobre sessão registrada em
  **DECISIONS.md D10** (troca de senha não reemite/invalida o cookie de sessão no MVP).
- **UI**: `src/app/(app)/conta/page.tsx` com dois cards (Perfil, Trocar senha) +
  `ProfileForm.tsx` / `PasswordForm.tsx` (client, `useFormState`, feedback de erro/sucesso;
  os campos de senha são remontados após sucesso para limpar o que foi digitado).
  No `(app)/layout.tsx`, o nome no cabeçalho virou link para `/conta` e há item **Conta**
  na nav mobile.
- **Testes de integração** (`src/app/(app)/conta/actions.test.ts`, 6): atualização de
  perfil (incl. limpar nome artístico e rejeitar nome vazio); troca de senha com senha
  atual correta (hash muda no banco), bloqueio com senha atual incorreta e com confirmação
  divergente. Total do projeto: **78 verdes** (eram 67).
- Definition of Done verde: build (17 rotas, nova `/conta`), typecheck limpo, lint (0),
  78 testes, smoke test (/login 200, / 200, /conta sem sessão → 307→/login). `npm audit`
  inalterado (10 advisories; nenhuma dependência nova — ver D6/D8).

### Sessão 10 — 2026-06-16 (Fase 1 — filtro por categoria nas Finanças)
- **Lógica pura** (`src/lib/finance.ts`): novo campo `category` em `TransactionFilter`,
  aplicado em `filterTransactions` (categoria ausente → ignora; combina com os demais
  critérios); `hasActiveFilter` passa a considerar a categoria; nova
  `availableCategories(txs)` (categorias únicas, ignora vazias/em branco, ordem alfabética
  pt-BR). Testes em `src/lib/finance.test.ts` (+5 → **83 no projeto**, eram 78).
- **UI** (`src/app/(app)/financas/page.tsx`): seletor **Categoria** no formulário de
  filtros (`?categoria=`), exibido só quando há categorias; integrado ao recorte que
  recomputa o resumo e ao link **Limpar**. Sem novas dependências.
- Definition of Done verde: build (17 rotas), typecheck limpo, lint (0), 83 testes, smoke
  test (/login 200, / 200, /financas e /financas?categoria=... sem sessão → 307). `npm
  audit` inalterado (10 advisories; nenhuma dependência nova — ver D6/D8).

### Sessão 11 — 2026-06-16 (Fase 1 — máscara de input monetário)
- **Lógica pura** (`src/lib/money.ts`): nova `maskMoneyInput(input)` — trata todos os
  dígitos como centavos e formata em pt-BR ("12345" → "123,45"; "1234567" → "12.345,67";
  "1" → "0,01"). Trabalha **sobre strings** (sem aritmética de ponto flutuante), então
  preserva precisão em valores grandes; ignora caracteres não numéricos (digitação livre)
  e remove zeros à esquerda. A saída é compatível com `parseMoneyToCents` (verificado em
  teste). Testes em `src/lib/money.test.ts` (**11**, inclui idempotência e round-trip com
  `parseMoneyToCents`); total do projeto **94** (eram 83).
- **Componente reutilizável** `src/components/MoneyInput.tsx` (client): input controlado
  que aplica `maskMoneyInput` no `onChange`; envia a string mascarada no form (já parseável
  pelo schema Zod existente). Aceita `defaultValue` (formato de `centsToInputValue`, ex.:
  "1234.56") e o normaliza na montagem para edição.
- **Aplicado** nos dois campos de valor: `TransactionForm` (valor da transação) e
  `ShowForm` (cachê acordado). Sem novas dependências; nenhuma mudança nos server actions.
- Definition of Done verde: build (17 rotas), typecheck limpo, lint (0), 94 testes, smoke
  test autenticado OK (/ 200, /login 200, /dashboard e /shows/novo sem sessão → 307). `npm
  audit` inalterado (10 advisories; nenhuma dependência nova — ver D6/D8).

### Sessão 12 — 2026-06-16 (Fase 1 — filtro por intervalo de datas nas Finanças)
- **Lógica pura** (`src/lib/finance.ts`): novos campos `from`/`to` ("YYYY-MM-DD") em
  `TransactionFilter`, aplicados em `filterTransactions` como intervalo **inclusivo nas
  duas pontas** (compara a chave de dia da transação; intervalo invertido `from`>`to` não
  casa nada). Novos helpers `isValidDateKey` (mês 01–12, dia 01–31) e `dayKey` (chave
  "YYYY-MM-DD" em UTC, mesma convenção de `monthKey`). Datas de período inválidas são
  ignoradas; `hasActiveFilter` passa a considerar `from`/`to`. Testes em
  `src/lib/finance.test.ts` (+9 → **103 no projeto**, eram 94): intervalo from/to/ambos,
  invertido, inválido, combinação com tipo, e blocos `isValidDateKey`/`dayKey`.
- **UI** (`src/app/(app)/financas/page.tsx`): campos **De** e **Até** (`<input type="date">`,
  `?de=&ate=`) no formulário de filtros, combinados (AND) com os demais critérios e
  recomputando o resumo sobre o recorte; integrados ao link **Limpar**. Sem novas dependências.
- Definition of Done verde: build (17 rotas), typecheck limpo, lint (0), 103 testes, smoke
  test (/login 200, /financas e /financas?de=&ate= sem sessão → 307). `npm audit` inalterado
  (10 advisories: 3 moderate / 6 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 13 — 2026-06-16 (Fase 1 — criar show a partir do calendário)
- **Lógica pura** (`src/lib/calendar.ts`): novo `toDayParam(date)` (data local →
  "YYYY-MM-DD", agora reutilizado internamente por `dayBucketKey` — DRY) e
  `dayParamToDateTimeLocal(param, defaultTime="20:00")`, que valida a chave de dia e a
  converte no valor de um `<input type="datetime-local">` com horário padrão (entrada
  inválida → `undefined`, deixando o form sem data). Testes em `src/lib/calendar.test.ts`
  (+7 → **19 no arquivo, 110 no projeto**, eram 103): formatação local, round-trip com a
  grade, validação de mês/dia e horário customizado.
- **UI**: cada célula da grade do calendário (`src/app/(app)/shows/calendario/page.tsx`)
  agora é um `group` com um botão **+** (link para `/shows/novo?data=YYYY-MM-DD`) que
  aparece no hover/foco do dia, com `aria-label` por data. A página `shows/novo`
  (`src/app/(app)/shows/novo/page.tsx`) lê `?data=` e pré-preenche o campo de data do
  `ShowForm` via `dayParamToDateTimeLocal`. Sem novas dependências; nenhuma mudança nos
  server actions.
- Definition of Done verde: build (16 rotas), typecheck (`tsc --noEmit`) limpo, lint (0),
  110 testes, smoke test (/login 200, / 200, /shows/calendario e /shows/novo?data=... sem
  sessão → 307; data inválida também → 307, ignorada). `npm audit` inalterado (10
  advisories: 3 moderate / 6 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 14 — 2026-06-16 (Fase 1 — exportação CSV das Finanças)
- **Lógica pura** (`src/lib/csv.ts`): `escapeCsvField` (RFC 4180 — aspas quando há
  delimitador/aspas/quebra de linha, duplicando aspas internas), `toCsv` (matriz → texto,
  campos por `;`, linhas por CRLF), `centsToCsvAmount` (centavos → "1234,56", vírgula
  decimal, sem milhar, preserva sinal e precisão), `csvDate` (Date → "DD/MM/AAAA" em UTC) e
  `transactionsToCsv` (cabeçalho pt-BR + linhas; coluna **Situação** = Recebido/Pago/Pendente
  conforme tipo e `received`; coluna **Show** vazia quando não vinculado). Testes em
  `src/lib/csv.test.ts` (**15** → total do projeto **125**, eram 110). Decisão de formato
  registrada em **DECISIONS.md D11** (delimitador `;`, decimal vírgula, BOM — abre direto no
  Excel pt-BR).
- **Route handler** `src/app/(app)/financas/export/route.ts` (GET, `force-dynamic`): exige
  usuário (`requireUser`), lê os **mesmos filtros** da página de Finanças da query string
  (`mes/tipo/categoria/show/status/de/ate`), reaproveita `filterTransactions` (uma fonte de
  verdade), e responde `text/csv; charset=utf-8` com **BOM UTF-8**, `Content-Disposition:
  attachment; filename="financas-AAAA-MM-DD.csv"` e `Cache-Control: no-store`.
- **UI** (`src/app/(app)/financas/page.tsx`): botão **Exportar CSV** (`<a download>`) no
  cabeçalho, exibido quando há transações visíveis; o link carrega os filtros ativos via
  `buildExportQuery(filter)` para exportar exatamente o recorte na tela. Sem novas dependências.
- Definition of Done verde: build (16 rotas + `/financas/export`), typecheck limpo, lint (0),
  125 testes, smoke test (/login 200, / 200, /financas/export sem sessão → 307; **teste
  end-to-end autenticado**: download do CSV com BOM, formatação pt-BR e filtro `tipo=EXPENSE`
  aplicado — verificado). `npm audit` inalterado (10 advisories: 3 moderate / 6 high / 1
  critical; nenhuma dependência nova — ver D6/D8).

### Sessão 15 — 2026-06-16 (Fase 1 — exportação iCalendar da agenda)
- **Lógica pura** (`src/lib/ics.ts`): serialização iCalendar/RFC 5545 — `escapeIcsText`
  (escapa `\`, `;`, `,` e quebras de linha → `\n`), `foldIcsLine` (*line folding* a **75
  octetos UTF-8**, sem partir caractere multibyte, continuação com espaço), `formatIcsUtc`
  (Date → "AAAAMMDDTHHMMSSZ" em UTC), `icsEventStatus` (PROPOSED→TENTATIVE,
  CONFIRMED/PLAYED→CONFIRMED, CANCELLED→CANCELLED), `buildVEvent` (UID estável
  `<id>@palco.app`, DTSTART/DTEND com duração padrão de 120 min, SUMMARY/LOCATION/DESCRIPTION
  escapados) e `showsToIcs` (VCALENDAR completo, linhas em CRLF). Testes em
  `src/lib/ics.test.ts` (**15** → total do projeto **161**, eram 146). Decisão de formato
  registrada em **DECISIONS.md D12**.
- **Route handler** `src/app/(app)/shows/agenda.ics/route.ts` (GET, `force-dynamic`): exige
  usuário (`requireUser`), lista os shows do usuário (por padrão **exclui cancelados**;
  `?cancelados=1` os inclui como `STATUS:CANCELLED`) e responde `text/calendar; charset=utf-8`
  com `Content-Disposition: attachment; filename="agenda-shows.ics"` e `Cache-Control: no-store`.
- **UI** (`src/app/(app)/shows/page.tsx` e `shows/calendario/page.tsx`): link **Exportar .ics**
  no cabeçalho das duas visões (na lista, só quando há shows). Sem novas dependências.
- Definition of Done verde: build (16 rotas + `/shows/agenda.ics`), typecheck limpo, lint (0),
  161 testes, smoke test (/shows/agenda.ics sem sessão → 307; **teste end-to-end autenticado**:
  download do .ics com CRLF, acentos preservados, escape de `;`/`,`, default sem cancelados =
  1 VEVENT e `?cancelados=1` = 2 VEVENT — verificado). `npm audit` inalterado (10 advisories:
  3 moderate / 6 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 16 — 2026-06-16 (Fase 1 — destaque de pendências vencidas)
- **Lógica pura** (`src/lib/finance.ts`): `pendingDueStatus(date, now)` classifica uma
  data como `overdue`/`today`/`upcoming` comparando por **dia em UTC** (mesma convenção de
  `dayKey`; "hoje" não conta como vencido); `isOverdue(tx, now)` (pendente — `received ===
  false` — e com data anterior a hoje); `summarizeOverdue(txs, now)` soma e conta as
  pendências vencidas separando **a receber** de **a pagar** (`{ income, expense,
  incomeCount, expenseCount }`). Testes em `src/lib/finance.test.ts` (+8 → **47 no arquivo,
  154 no projeto**): classificação de vencimento, regra de `received`, fronteira "hoje",
  somatório/contagem por tipo e lista vazia.
- **UI Finanças** (`src/app/(app)/financas/page.tsx`): banner **⚠ Vencidas** (a receber/a
  pagar com totais e contagem) calculado sobre o recorte filtrado visível; cada linha
  pendente e vencida ganha o badge vermelho **"Vencida"** (no lugar do amarelo "A receber/A
  pagar").
- **UI Painel** (`src/app/(app)/dashboard/page.tsx`): banner clicável **⚠ Pendências
  vencidas** (link para `/financas?status=pending`) exibido só quando há algo vencido.
- Definition of Done verde: build (16 rotas), typecheck limpo, lint (0), 154 testes, smoke
  test (/login 200, / 200, /dashboard e /financas sem sessão → 307; **teste end-to-end
  autenticado**: inserida 1 pendência vencida → banner do Painel, banner e badge "Vencida"
  nas Finanças renderizados — verificado). `npm audit` inalterado (10 advisories: 3
  moderate / 6 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 17 — 2026-06-17 (Fase 1 — busca textual nas Finanças)
- **Lógica pura** (`src/lib/finance.ts`): nova `normalizeText(value)` (minúsculas, sem
  acentos via `NFD` + remoção de diacríticos, espaços das bordas aparados) e novo campo
  `q` em `TransactionFilter`. `filterTransactions` passa a casar o termo contra
  **descrição + categoria** normalizadas (substring, AND com os demais critérios; termo
  vazio/em branco é ignorado). `hasActiveFilter` considera `q` (mas ignora só-espaços).
  Para suportar a busca, `TxLike` ganhou `description?` opcional. Testes em
  `src/lib/finance.test.ts` (+7 → **54 no arquivo, 161 no projeto**, eram 154): busca em
  descrição/categoria, case-insensitive, sem acento (são↔sao, violão↔violao), termo vazio
  ignorado, combinação com tipo, e bloco dedicado de `normalizeText`.
- **UI** (`src/app/(app)/financas/page.tsx`): campo **Buscar** (`<input type="search">`,
  `?q=`) no início do formulário de filtros, combinado (AND) com os demais critérios e
  recomputando o resumo sobre o recorte; integrado ao link **Limpar** e à query de
  exportação (`buildExportQuery`).
- **Exportação** (`src/app/(app)/financas/export/route.ts`): lê `?q=` e reaproveita o mesmo
  `filterTransactions`, mantendo a exportação fiel ao recorte visível. Sem novas dependências.
- Definition of Done verde: build (16 rotas + `/financas/export`), typecheck limpo, lint (0),
  161 testes, smoke test (/financas sem sessão → 307; **teste end-to-end autenticado**:
  `?q=transporte` → 200 com 2 linhas; `?q=` inexistente → estado vazio; `/financas/export?q=transporte`
  → CSV só com a linha de transporte — verificado). `npm audit` inalterado (10 advisories:
  3 moderate / 6 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 18 — 2026-06-17 (Fase 1 — projeção de caixa no Painel)
- **Lógica pura** (`src/lib/finance.ts`): `projectCashflow(txs, { now?, months? })` →
  `{ startBalance, months[] }`. Parte do `cashBalance` (caixa realizado) e, mês a mês a
  partir do mês atual, soma as pendências (`received === false`) pelo seu **mês de
  vencimento**, acumulando o saldo projetado (`endBalance`). Pendências **vencidas/de meses
  anteriores** são dobradas no mês atual (ainda esperadas); pendências **além do horizonte**
  são ignoradas; horizonte mínimo de 1 mês; `now`/`months` injetáveis. Helper privado
  `sequentialMonths` (sequência "YYYY-MM" em UTC, vira o ano). Tipos `CashflowMonth`/
  `CashflowProjection`. Testes em `src/lib/finance.test.ts` (+6 → **60 no arquivo, 167 no
  projeto**, eram 161): só-realizadas, distribuição por vencimento + acúmulo, dobra de
  vencidas no mês atual, corte pelo horizonte, sinal de saldo negativo, virada de ano/mínimo.
- **UI Painel** (`src/app/(app)/dashboard/page.tsx`): seção **Projeção de caixa** (6 meses)
  com tiles por mês — saldo projetado (vermelho quando negativo) e a variação do mês;
  intro com o caixa atual; aviso "⚠ Caixa projetado fica negativo…" quando algum mês fica no
  vermelho; link "Ver pendências" (`/financas?status=pending`). Exibida só quando há
  pendências. Decisão registrada em **DECISIONS.md D13**. Sem novas dependências.
- Definition of Done verde: build (16 rotas), typecheck limpo, lint (0), 167 testes, smoke
  test (/login 200, / 200, /dashboard sem sessão → 307; **teste end-to-end autenticado**:
  caixa realizado + pendência de despesa no mês seguinte → seção renderiza com saldo
  projetado negativo e o aviso — verificado). `npm audit` inalterado (10 advisories: 3
  moderate / 6 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 19 — 2026-06-17 (Fase 1 — visão semanal da agenda)
- **Lógica pura** (`src/lib/calendar.ts`): `parseDayParam(param, ref)` ("YYYY-MM-DD" →
  Date local à meia-noite; entrada inválida/inexistente como 31/02 cai no dia de referência),
  `startOfWeek` (domingo da semana, meia-noite local), `weekRange` (intervalo [domingo,
  domingo seguinte) para uma consulta única ao banco), `shiftWeek(date, delta)` (navegação
  por semanas), `formatWeekTitle(start)` (rótulo "14 – 20 de junho de 2026", tratando virada
  de mês e de ano) e `buildWeekGrid<T>(ref, items, today)` (7 células domingo→sábado,
  distribuindo itens no dia local e ordenando por horário — espelha `buildMonthGrid`). Testes
  em `src/lib/calendar.test.ts` (+13 → **32 no arquivo, 180 no projeto**, eram 167): round-trip
  e fallback de `parseDayParam`, domingo/range/shift, rótulo nas 3 faixas, distribuição/ordem/
  hoje/fora-da-semana no grid.
- **UI** `src/app/(app)/shows/semana/page.tsx`: lista vertical de domingo a sábado (um bloco
  por dia, dia de hoje destacado), com navegação ←/→ e link **Esta semana**; cada show mostra
  horário, título, local (venue · cidade), ponto de status e rótulo, com link para o detalhe;
  botão **+** por dia (`/shows/novo?data=…`, reaproveitando o pré-preenchimento da Sessão 13);
  estado vazio "Nenhum show nesta semana". Consulta só os shows da semana (`weekRange`).
- **Alternador de visões** (`src/components/ShowsViewToggle.tsx`): passou a ter 3 opções —
  **Lista / Semana / Mês** (antes Lista/Calendário). O Painel ganhou link **Ver agenda**
  (`/shows/calendario`) no card de Próximos shows. Sem novas dependências.
- Definition of Done verde: build (17 rotas, nova `/shows/semana`), typecheck limpo, lint (0),
  180 testes, smoke test (/shows/semana sem sessão → 307; `?semana=lixo` → 307, ignorado;
  **teste e2e autenticado** com cookie de sessão real: semana de 7–13/jun renderiza o show
  semeado com link de detalhe, semana vazia mostra o estado vazio — verificado). `npm audit`
  inalterado (10 advisories: 3 moderate / 6 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 20 — 2026-06-17 (Fase 1 — página de detalhe do contato / CRM)
- **Lógica pura** (`src/lib/contacts.ts`): `summarizeContactShows(shows, now?)` →
  `{ total, upcoming, past, byStatus, totalFee, nextShow }`. Separa futuros (`date >= now`,
  ordem crescente) de passados (`date < now`, decrescente), conta por status (inclui zeros),
  soma o cachê **excluindo CANCELLED** e aponta o próximo show futuro não cancelado. `now`
  injetável. Tipos `ContactShowLike`/`ContactShowsSummary`. Testes em `src/lib/contacts.test.ts`
  (**7** → total do projeto **187**, eram 180): lista vazia, separação futuros/passados,
  fronteira "agora" (>=), contagem por status com zeros, soma de cachê sem cancelados,
  `nextShow` (menor data não cancelada) e `nextShow` nulo.
- **UI** (`src/app/(app)/contatos/[id]/page.tsx`): detalhe do contato com dados de contato
  (e-mail clicável/telefone/notas), cartão **Histórico de shows** (nº de shows, futuros,
  cachê total, próximo show) e lista de **Shows vinculados** agrupada em Próximos/Anteriores,
  com ponto+badge de status, cachê e link para o detalhe do show; estado vazio dedicado.
- **Navegação cruzada**: nome do contato na lista (`contatos/page.tsx`) e nos pills do
  detalhe do show (`shows/[id]/page.tsx`) agora linkam para `/contatos/[id]`; botão **Ver**
  na lista de contatos. `deleteContactAction` passou a **redirecionar** para `/contatos`
  (como `deleteShowAction`), para excluir a partir do detalhe sem ficar numa página órfã;
  teste de posse ajustado para `catchRedirect`. Sem novas dependências.
- Definition of Done verde: build (17 rotas, nova `/contatos/[id]`), typecheck limpo,
  lint (0), 187 testes, smoke test (/contatos/abc sem sessão → 307; **e2e autenticado com
  cookie de sessão real**: /contatos e /contatos/[id] → 200, detalhe renderiza resumo e a
  lista de shows agrupada após vincular shows ao contato — verificado). `npm audit` inalterado
  (10 advisories: 3 moderate / 6 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 21 — 2026-06-17 (Fase 1 — relatório mensal das Finanças)
- **Lógica pura** (`src/lib/finance.ts`): nova `categoryReport(txs)` →
  `{ income, expense, totalIncome, totalExpense }`, onde `income`/`expense` são listas de
  `CategorySlice` (`{ category, amount, share }`) agregadas por categoria, separando receitas
  de despesas, ordenadas por valor decrescente (empate pelo nome, pt-BR), com a participação
  (`share`, 0..1) de cada categoria no total do seu tipo; categorias em branco/ausentes caem
  em **"Sem categoria"**. Testes em `src/lib/finance.test.ts` (+5 → **65 no arquivo, 192 no
  projeto**, eram 187): lista vazia, separação receita/despesa + agregação, ordenação + share,
  desempate por nome e bucket "Sem categoria".
- **Página** `src/app/(app)/financas/relatorio/page.tsx` (`force-dynamic`): fechamento de UM
  mês (`?mes=YYYY-MM`, fallback ao mês atual via `parseMonthKey`). Reaproveita `filterTransactions`
  (só `{ month }`), `summarizeFinances` e a nova `categoryReport` — uma fonte de verdade. Mostra
  resumo (Receitas/Despesas/Saldo do mês/Caixa realizado), banner de pendências do mês, e dois
  cartões **Receitas/Despesas por categoria** com barra de participação (%); navegação
  ←/→/**Mês atual** (`shiftMonth`/`formatMonthTitle` do `calendar.ts`), link **Exportar CSV**
  do mês (`/financas/export?mes=`) e estado vazio dedicado. Sem novas dependências.
- **UI Finanças** (`src/app/(app)/financas/page.tsx`): botão **Relatório** no cabeçalho
  (exibido quando há transações). Decisão de escopo registrada em **DECISIONS.md D14**.
- Definition of Done verde: build (17 rotas + `/financas/relatorio`), typecheck (`tsc --noEmit`)
  limpo, lint (0), 192 testes, smoke test (/financas/relatorio e variações sem sessão → 307,
  inclusive `?mes=lixo`; **e2e autenticado com cookie de sessão real**: mês com dados renderiza
  resumo, categorias e shares 75%/25%, "A pagar no mês"; mês sem dados → estado vazio — verificado).
  `npm audit` inalterado (10 advisories: 3 moderate / 6 high / 1 critical; nenhuma dependência
  nova — ver D6/D8).

### Sessão 22 — 2026-06-17 (Fase 1 — filtros e busca na lista de shows)
- **Lógica pura** (`src/lib/shows.ts`): `filterShows(shows, filter)` filtra por `q`
  (busca em **título + local + cidade** normalizados, sem acento/caixa — reaproveita
  `normalizeText`), `status` (exato; inválido ignorado, via `isValidShowStatus`) e intervalo
  `from`/`to` ("YYYY-MM-DD", inclusivo nas duas pontas, compara `dayKey`; invertido não casa
  nada — reaproveita `isValidDateKey`/`dayKey` de `finance.ts`). Combinação em AND; critérios
  ausentes/inválidos ignorados. `hasActiveShowFilter` indica se há recorte ativo. Espelha o
  padrão das Finanças (filtragem em memória sobre o recorte do usuário — ver D9). Testes em
  `src/lib/shows.test.ts` (**15** → total do projeto **207**, eram 192): status, busca
  título/local/cidade, acento/caixa, intervalo from/to/invertido, combinação AND, imutabilidade.
- **UI** (`src/app/(app)/shows/page.tsx`): formulário GET (`?q=&status=&de=&ate=`) com campos
  Buscar/Status/De/Até, botão **Filtrar** e link **Limpar**; contador "N de M shows" quando há
  filtro; estado vazio dedicado "Nenhum show corresponde aos filtros". Consulta o mesmo conjunto
  de shows do usuário e filtra em memória (uma consulta). Sem novas dependências.
- Definition of Done verde: build (17 rotas), typecheck (`tsc --noEmit`) limpo, lint (0),
  207 testes, smoke test (/shows e variações com filtro sem sessão → 307; **e2e autenticado com
  cookie de sessão real**: sem filtro = 2 shows, `?q=festival` = "1 de 2" só Festival,
  `?status=PLAYED` = só o show realizado, `?q=zzz` = estado vazio — verificado). `npm audit`
  inalterado (10 advisories: 3 moderate / 6 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 23 — 2026-06-17 (Fase 1 — busca e filtro na lista de contatos)
- **Lógica pura** (`src/lib/contacts.ts`): `filterContacts(contacts, filter)` filtra por `q`
  (busca em **nome + e-mail + telefone + notas** normalizados, sem acento/caixa — reaproveita
  `normalizeText` de `finance.ts`) e `role` (papel exato; inválido ignorado, via
  `isValidContactRole`). Combinação em AND; critérios ausentes/inválidos ignorados.
  `hasActiveContactFilter` indica se há recorte ativo. Espelha o padrão das Finanças e dos
  Shows (filtragem em memória sobre o recorte do usuário — ver D9). Testes em
  `src/lib/contacts.test.ts` (+10 → total do projeto **217**, eram 207): papel exato/inválido,
  busca nome/e-mail/telefone/notas, acento/caixa, combinação AND, termo sem match, imutabilidade.
- **UI** (`src/app/(app)/contatos/page.tsx`): formulário GET (`?q=&papel=`) com campos
  Buscar/Tipo, botão **Filtrar** e link **Limpar**; contador "N de M contatos" quando há filtro;
  estado vazio dedicado "Nenhum contato corresponde aos filtros". Consulta o mesmo conjunto de
  contatos do usuário e filtra em memória (uma consulta). Sem novas dependências.
- Definition of Done verde: build (17 rotas), typecheck (`tsc --noEmit`) limpo, lint (0),
  217 testes, smoke test (/contatos e variações com filtro sem sessão → 307, inclusive
  `?papel=LIXO`). `npm audit` inalterado (10 advisories: 3 moderate / 6 high / 1 critical;
  nenhuma dependência nova — ver D6/D8).

### Sessão 24 — 2026-06-17 (Fase 1 — ranking de rentabilidade por show)
- **Lógica pura** (`src/lib/finance.ts`): `rankShowsByProfit(shows, txs, opts?)` →
  `{ rows, count, totalIncome, totalExpenses, totalNet, best, worst }`. Reaproveita
  `computeShowPnL` (uma fonte de verdade do P&L por show); ordena por `net` decrescente
  (empate pelo `id`, estável); por padrão **exclui shows `CANCELLED`** (`opts.excludeStatuses`
  configurável); agrega receita bruta (cachê + extras), despesas e resultado líquido, e aponta
  o show mais/menos rentável. Tipos `ShowProfitRow<S>`/`ShowsProfitability<S>` (genéricos sobre
  `ShowLike` para carregar metadados de exibição). Testes em `src/lib/finance.test.ts` (+7 →
  **72 no arquivo, 224 no projeto**, eram 217): vazio, ordenação + desempate, agregação,
  receitas extras, exclusão de cancelados (padrão e custom), show sem status.
- **Página** `src/app/(app)/shows/rentabilidade/page.tsx` (`force-dynamic`): consulta os shows
  do usuário e as transações vinculadas (`showId != null`) numa só leitura cada, chama
  `rankShowsByProfit`, e mostra cards de resumo (Shows analisados/Receita bruta/Despesas/
  Resultado líquido), destaque Mais/Menos rentável e uma tabela por show (cachê, extras,
  despesas, resultado, margem) com link para o detalhe e estado vazio dedicado. Decisão
  registrada em **DECISIONS.md D15**.
- **UI Shows** (`src/app/(app)/shows/page.tsx`): botão **Rentabilidade** no cabeçalho (exibido
  quando há shows). Sem novas dependências.
- Definition of Done verde: build (18 rotas, nova `/shows/rentabilidade`), typecheck
  (`tsc --noEmit`) limpo, lint (0), 224 testes, smoke test (/shows/rentabilidade sem sessão →
  307; **e2e autenticado com cookie de sessão real**: página → 200 renderiza 2 shows ativos
  ordenados, exclui o cancelado, destaca mais/menos rentável — verificado). `npm audit`
  inalterado (10 advisories: 3 moderate / 6 high / 1 critical; nenhuma dependência nova — ver D6/D8).

## Próximos passos (priorizados para a próxima sessão)
1. **Polimento UX**: estados de loading/erro inline (mensagens de falha do server action),
   mensagens vazias, acessibilidade. (máscara de input monetário entregue na Sessão 11.)
2. **Calendário — evoluções**: arrastar/soltar para remarcar; mini-calendário de salto rápido.
   (visão semanal entregue na Sessão 19 — `/shows/semana`; link do dashboard para a agenda na
   Sessão 19; clicar num dia para criar show com a data na Sessão 13; exportação iCalendar
   `.ics` na Sessão 15 — base em `src/lib/calendar.ts` e `src/lib/ics.ts`.)
3. **Filtros — evoluções**: persistir o último filtro usado (ex.: cookie/localStorage).
   (filtro por categoria entregue na Sessão 10; intervalo de datas na Sessão 12;
   exportação CSV do recorte filtrado na Sessão 14; busca textual na Sessão 17;
   base em `src/lib/finance.ts`.)
4. **Sessões/segurança** (ver D10): considerar `tokenVersion`/`passwordChangedAt` no `User`
   para invalidar sessões ao trocar a senha quando houver login em múltiplos dispositivos.

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** em `personas-and-needs.md` (CRM, multiusuário)
  precisam de 5–10 entrevistas com músicos reais antes de investimento pesado.
- Foco **português/LATAM** e faixas de preço (`business-plan.md`) são hipóteses — validar.
- **Segurança em produção**: definir `AUTH_SECRET` forte e migrar para PostgreSQL antes
  de qualquer deploy real. Revisar advisories do Next (D6) e planejar upgrade p/ Next 15+.
