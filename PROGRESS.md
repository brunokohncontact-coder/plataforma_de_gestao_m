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
cancelados. Sessão 25 entregou o **resumo anual das Finanças** (`/financas/anual`): visão de
12 meses (receitas/despesas/resultado), totais do ano e destaque do melhor/pior mês, com
navegação por ano e link de cada mês para o relatório mensal. **231 testes** verdes (medição
real `vitest run` na Sessão 25; eram 224). Sessão 26 entregou a **invalidação de sessões
ao trocar a senha** (`passwordChangedAt` no `User`; `getCurrentUser` recusa tokens emitidos
antes da troca — fecha o gap de segurança da D10/D17). **240 testes** verdes. Sessão 27
entregou o **ranking de contatos por atividade** (`/contatos/ranking`): ordena os contatos
pelo cachê total (shows não cancelados) e nº de shows que trazem, com destaque do mais ativo
(ver D18). **246 testes** verdes. Sessão 28 entregou a **rentabilidade por local**
(`/shows/locais`): agrega o P&L dos shows por casa/venue (normalizando acento/caixa, com
fallback à cidade e grupo "Sem local"), respondendo "quais casas valem a pena?" (ver D19).
**252 testes** verdes. Sessão 29 entregou a **agenda de contas a pagar/receber**
(`/financas/agenda`): distribui as pendências em janelas de vencimento (Vencidas/Hoje/
Próximos 7 dias/Mais tarde) com totais por janela e ações inline (ver D20). **257 testes** verdes.
Sessão 30 entregou os **contatos para reativar** (`/contatos/reativar`): lista os contratantes
dormentes (já tocaram, sem nada agendado e há >60 dias sem show), ordenados pelos mais esquecidos,
com atalho de contato (mailto/tel) — follow-up de prospecção (ver D21). **263 testes** verdes.
Sessão 31 entregou a **receita agendada** (`/shows/receita-agendada`): projeta os cachês dos
shows futuros (não cancelados) por mês, separando confirmado de a confirmar — pipeline de
faturamento a partir da agenda (ver D22). **269 testes** verdes. Sessão 32 entregou a
**persistência do último filtro das Finanças** (middleware em `/financas`): salva o recorte
filtrado num cookie e o restaura ao voltar à página pelo menu (ver D23). **282 testes** verdes.
Sessão 33 **generalizou a persistência de filtro para as listas de Shows e Contatos**: a lógica
pura da D23 virou o módulo genérico `src/lib/listFilter.ts` (parametrizado pelas chaves de cada
lista) + registro `LIST_FILTER_CONFIGS`; o middleware passou a cobrir `/financas`, `/shows` e
`/contatos` (cada um com cookie próprio); `financasFilter.ts` virou fachada fina (ver D24).
**297 testes** verdes. Sessão 34 entregou os **cachês a receber** (`/shows/a-receber`):
`reconcileShowFees` cruza a agenda (cachê do show) com as finanças (receitas recebidas) e lista os
shows já realizados cujo cachê ainda não entrou no caixa — o dinheiro esquecido — com alerta no
Painel (ver D25). **305 testes** verdes. Sessão 35 entregou o **quitar cachê inline** em
`/shows/a-receber`: botão **Quitar** por linha que cria a receita recebida vinculada ao show no
valor em aberto, sem passar pelas Finanças; o saldo é recalculado no servidor (idempotente), via
`settleShowFeeAction`, reaproveitando o `DeleteButton` (confirmação em duas etapas) generalizado
com `groupLabel` (ver D26). **311 testes** verdes. Sessão 36 entregou o **atalho de cobrança**
em `/shows/a-receber`: botões **✉ E-mail** e **WhatsApp** por linha que abrem uma mensagem de
cobrança pronta (assunto/corpo com show, data, local e valor) para o contato vinculado ao show
— módulo puro `src/lib/billing.ts` (escolha do contato por papel, redação, normalização de
telefone pt-BR, montagem de `mailto:`/`wa.me`), ver D27. **331 testes** verdes. Sessão 37
entregou o **quitar valor parcial** em `/shows/a-receber`: `settleShowFeeAction` aceita um campo
opcional `amount` (validado e limitado ao saldo no servidor via o helper puro
`resolveSettlementAmount`), e o novo componente client `SettleFeeButton` abre na linha um campo
de valor (reusa `MoneyInput`) pré-preenchido com o saldo e editável — lançar menos deixa o
restante na lista (ver D28). **340 testes** verdes. Sessão 38 entregou o **registro da data real
do recebimento** ao quitar um cachê em `/shows/a-receber`: `settleShowFeeAction` aceita um campo
opcional `receivedAt` (`YYYY-MM-DD`), decidido pelo helper puro `resolveReceivedDate` (vazio/inválido
→ agora; passado/hoje → meia-noite UTC daquele dia; futuro → agora) — a receita cai no **mês certo**,
corrigindo projeção de caixa, relatório mensal e resumo anual (ver D29). **346 testes** verdes.
Sessão 39 entregou o **seletor de qual contato cobrar** em `/shows/a-receber`: a lógica pura
de `billing.ts` passou a expor todos os contatos alcançáveis (`reachableBillingContacts` +
`buildShowBillings`, com `pickBillingContact`/`buildShowBilling` agora delegando a elas — DRY); o
novo componente client `BillingActions` mostra um `<select>` "quem cobrar" quando o show tem mais
de um contato alcançável (default = escolha automática por papel), com os botões ✉ E-mail/WhatsApp
montados no servidor para cada contato (ver D30). **351 testes** verdes.
Sessão 40 entregou o **aging dos cachês a receber** em `/shows/a-receber`: a função pura
`bucketReceivablesByAge` agrupa o que falta receber pela idade do atraso (dias desde o show)
em quatro baldes (até 30 / 31–60 / 61–90 / mais de 90 dias), com total, contagem e participação
(%) por balde, atraso médio ponderado pelo valor e pior caso; a página ganhou um card de aging
(baldes ≥61 dias destacados) e um selo "há N dias" por linha, para priorizar a cobrança do
dinheiro parado há mais tempo (ver D31). **358 testes** verdes.
Próxima sessão: continuar o polimento de UX (acessibilidade, mensagens vazias, estados de erro
inline dos server actions) ou evoluções de calendário (arrastar/soltar para remarcar).

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

### Sessão 25 — 2026-06-17 (Fase 1 — resumo anual das Finanças)
- **Lógica pura** (`src/lib/finance.ts`): `annualSummary(txs, year)` →
  `{ year, months[12], totalIncome, totalExpense, net, best, worst }`. Consolida as transações
  de UM ano em 12 meses (janeiro→dezembro, zeros inclusive), soma os totais do ano e aponta o
  **melhor/pior mês por resultado líquido** entre os que tiveram movimento (empate pelo mês mais
  cedo). Considera só transações cujo mês (UTC) cai no ano. Nova `availableYears(txs)` (anos
  presentes, ordem decrescente). Tipos `AnnualMonth`/`AnnualSummary`. Testes em
  `src/lib/finance.test.ts` (+7 → **79 no arquivo, 231 no projeto**, eram 224): 12 meses sem
  dados, agregação + totais, ignora outros anos, melhor/pior mês + desempate, `availableYears`.
- **Página** `src/app/(app)/financas/anual/page.tsx` (`force-dynamic`): lê `?ano=YYYY`
  (fallback ao ano atual via `parseYear`, faixa 1970–2999), consulta as transações do usuário
  numa só leitura, chama `annualSummary`. Mostra cards de totais (Receitas/Despesas/Saldo do
  ano), destaque Melhor/Pior mês (link p/ o relatório do mês) e uma tabela **mês a mês** com
  mini-barras de proporção (receita/despesa na escala do pico do ano), linha de Total e link de
  cada mês para `/financas/relatorio?mes=`; estado vazio dedicado ("Nenhuma transação em AAAA").
  Decisão registrada em **DECISIONS.md D16**.
- **UI Finanças** (`src/app/(app)/financas/page.tsx`): botão **Resumo anual** no cabeçalho
  (exibido quando há transações). Sem novas dependências.
- Definition of Done verde: build (18 rotas + `/financas/anual`), typecheck (`tsc --noEmit`)
  limpo, lint (0), 231 testes, smoke test (/financas/anual e `?ano=2025` sem sessão → 307;
  **e2e autenticado com cookie de sessão real**: ano com dados → 200 com totais, melhor/pior
  mês e link do mês para o relatório; ano sem dados → estado vazio — verificado). `npm audit`:
  10 advisories (agora 4 moderate / 5 high / 1 critical — **reclassificação** de uma advisory
  high→moderate na árvore existente do Next/postcss; total inalterado, **nenhuma dependência
  nova** — ver D6/D8).

### Sessão 26 — 2026-06-17 (Fase 1 — invalidar sessões ao trocar a senha) [segurança]
- **Schema** (`prisma/schema.prisma`): novo campo `passwordChangedAt DateTime @default(now())`
  no `User` — marca temporal da última troca de senha.
- **Lógica pura** (`src/lib/auth.ts`): `verifySessionToken` passa a devolver também `issuedAt`
  (o `iat` do JWT, em segundos UNIX) em `SessionPayload`; nova `isSessionFresh(issuedAt,
  passwordChangedAt)` decide se um token ainda vale — recusa tokens emitidos **antes** da
  última troca de senha (compara em segundos UNIX, tolerando o arredondamento; sem
  `passwordChangedAt` → válido p/ legados; token sem `iat` → recusado). Testes em
  `src/lib/auth.test.ts` (**6**).
- **Enforcement** (`src/lib/session.ts`): `getCurrentUser` busca o usuário e, antes de
  devolvê-lo, aplica `isSessionFresh(payload.issuedAt, user.passwordChangedAt)` — token
  obsoleto → `null` (redireciona para /login via `requireUser`). Teste de integração em
  `src/lib/session.test.ts` (**3**, mockando `next/headers`): token novo → usuário; token
  emitido antes de `passwordChangedAt` → null; sem cookie → null.
- **Troca de senha** (`src/app/(app)/conta/actions.ts`): `changePasswordAction` grava
  `passwordChangedAt = now` junto com o novo hash e **reemite o cookie do dispositivo atual**
  (`setSessionCookie`) — quem trocou a senha continua logado aqui; os demais dispositivos
  com tokens antigos são deslogados no próximo request. Mensagem de sucesso atualizada
  ("As outras sessões foram encerradas."). Teste de `conta` ajustado (mock de
  `setSessionCookie`; asserção de que `passwordChangedAt` avança).
- **Decisão** registrada em **DECISIONS.md D17** (substitui D10). Sem novas dependências.
- Definition of Done verde: build (18 rotas), typecheck (`tsc --noEmit`) limpo, lint (0),
  **240 testes** (eram 231), smoke test + **e2e de runtime** (servidor real `next start`:
  token válido em `/conta` → 200; após avançar `passwordChangedAt` para depois do `iat`,
  o mesmo token em `/conta` → 307 → /login — invalidação confirmada ao vivo). `npm audit`
  inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 27 — 2026-06-17 (Fase 1 — ranking de contatos por atividade / CRM)
- **Lógica pura** (`src/lib/contacts.ts`): `rankContactsByActivity(items, now?)` →
  `{ rows, count, top }`. Para cada contato com ao menos um show vinculado, agrega
  `totalShows` (todos os status), `activeShows`/`upcomingShows` (não cancelados; futuro =
  `date >= now`), `totalFee` (soma do cachê dos não cancelados, centavos) e `lastShowDate`
  (show não cancelado mais recente, ou null). Ordena por cachê total desc, desempatando por
  nº de shows ativos, nome (pt-BR) e id — estável e determinística. O cachê é atribuído
  integralmente a cada contato vinculado (ver **DECISIONS.md D18**). Tipos genéricos
  `ContactRankShowLike`/`ContactRankLike`/`ContactWithShows`/`ContactRankRow`/`ContactsRanking`.
  Testes em `src/lib/contacts.test.ts` (+6 → total do projeto **246**, eram 240): lista vazia,
  ignora contatos sem shows, ordem por cachê, exclusão de cancelados (cachê/ativos/futuros,
  mas conta no total), `lastShowDate`/null com só cancelados, desempate por ativos + nome.
- **Página** `src/app/(app)/contatos/ranking/page.tsx` (`force-dynamic`): consulta os contatos
  do usuário com seus shows (`shows.show`) numa só leitura, chama `rankContactsByActivity`, e
  mostra o card "Mais ativo" + contagem e uma tabela por contato (Shows ativos/total, Próximos,
  Cachê total, Último show) com link para o detalhe; estado vazio dedicado quando nenhum contato
  tem shows vinculados, com nota de rodapé sobre o critério de cachê.
- **UI Contatos** (`src/app/(app)/contatos/page.tsx`): botão **Ranking** no cabeçalho (exibido
  quando há contatos). Sem novas dependências.
- Definition of Done verde: build (19 rotas, nova `/contatos/ranking`), typecheck (`tsc --noEmit`)
  limpo, lint (0), 246 testes, smoke test (/contatos/ranking sem sessão → 307; **e2e autenticado
  com cookie de sessão real**: página → 200, "Bar Top" (R$ 3.000,00, ignora show cancelado de
  R$ 9.990,00) no topo, "Casa Pequena" (R$ 1.500,00) abaixo, contato "Sem Shows" excluído —
  verificado). `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma
  dependência nova — ver D6/D8).

### Sessão 28 — 2026-06-17 (Fase 1 — rentabilidade por local / venue)
- **Lógica pura** (`src/lib/finance.ts`): `rankVenuesByProfit(shows, txs, opts?)` →
  `{ rows, count, totalNet, best, worst }`. Agrupa os shows por **local** e soma o P&L de
  cada grupo (reaproveitando `computeShowPnL`, fonte única do cálculo por show). A chave de
  agrupamento é `normalizeText(venue)` (sem acento, minúsculo, trim); se `venue` for vazio,
  cai para `city`; se ambos vazios, agrupa em "Sem local" (chave `""`). O **nome exibido** é a
  grafia original mais frequente do grupo (desempate pela 1ª ocorrência), preservando acento/
  caixa do usuário (helper `pickLabel`). Cada linha traz `showCount`, `totalFee`, `totalExtra`,
  `totalExpenses`, `totalNet`, `avgNet` (resultado médio por show) e `margin` (margem agregada).
  Por padrão **exclui `CANCELLED`** (`opts.excludeStatuses` configurável). Ordena por `totalNet`
  desc, desempatando por nº de shows desc, nome (pt-BR) e chave — estável. Tipos
  `VenueShowLike`/`VenueProfitRow`/`VenuesProfitability`. Testes em `src/lib/finance.test.ts`
  (+6 → total do projeto **252**, eram 246): vazio, agrupamento por acento/caixa + soma de P&L
  + grafia exibida, fallback à cidade + grupo "Sem local", receita extra + margem, ordenação +
  best/worst, exclusão de cancelados.
- **Página** `src/app/(app)/shows/locais/page.tsx` (`force-dynamic`): consulta os shows do
  usuário (id/fee/status/venue/city) e as transações vinculadas (`showId != null`) numa só
  leitura cada, chama `rankVenuesByProfit`, e mostra cards de resumo (Locais analisados/
  Resultado líquido total/Local mais rentável), destaque Mais/Menos rentável e uma tabela por
  local (Shows, Cachê, Extras, Despesas, Resultado, Média/show); estado vazio dedicado e nota
  de rodapé sobre o critério de agrupamento. Decisão registrada em **DECISIONS.md D19**.
- **UI Shows** (`src/app/(app)/shows/page.tsx`): botão **Por local** no cabeçalho (ao lado de
  Rentabilidade, exibido quando há shows). Sem novas dependências.
- Definition of Done verde: build (20 rotas, nova `/shows/locais`), typecheck (`tsc --noEmit`)
  limpo, lint (0), 252 testes, smoke test (/shows/locais sem sessão → 307; **e2e autenticado
  com cookie de sessão real**: página → 200, "Bar do Zé" agrega 2 shows (R$ 300,00, ignora
  cancelado de R$ 999,00, exibe a grafia "Bar do Zé"), "Recife" (show sem venue, via cidade)
  separado em R$ 30,00, "Café Acústico" R$ 50,00, total R$ 380,00 — verificado). `npm audit`
  inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 29 — 2026-06-17 (Fase 1 — agenda de contas a pagar/receber)
- **Lógica pura** (`src/lib/finance.ts`): `buildDueAgenda(txs, opts?)` →
  `{ buckets, totalIncome, totalExpense, count }`. Distribui as pendências (`received === false`)
  em **4 janelas fixas** comparando por dia (UTC): `overdue` (vencidas), `today` (hoje), `week`
  (próximos `weekHorizon` dias, padrão 7) e `later` (mais tarde). Cada janela (`DueBucket`) traz
  os itens (`DueAgendaItem`, com `daysUntil`) ordenados por vencimento crescente e os totais
  income/expense/net/count; o retorno soma os totais gerais. Transações realizadas são ignoradas.
  `now`/`weekHorizon` injetáveis. Constante exportada `DUE_BUCKET_ORDER`; helpers privados
  `utcMidnight`/`txTime`. Testes em `src/lib/finance.test.ts` (+5 → **90 no arquivo, 257 no
  projeto**, eram 252): ignora realizadas + 4 janelas zeradas, distribuição por janela, totais
  por janela + gerais, ordenação por vencimento + `daysUntil`, `weekHorizon` customizado.
- **Página** `src/app/(app)/financas/agenda/page.tsx` (`force-dynamic`): consulta só as pendências
  do usuário (`received: false`) numa leitura, chama `buildDueAgenda`, mostra cards de resumo
  (A receber/A pagar/Saldo pendente) e uma seção por janela **não vazia** (rótulo, dica, totais e
  lista de contas com vencimento relativo "vence em N dias"/"venceu há N dias", badge a receber/a
  pagar, valor, link de edição e ✓ para marcar pago/recebido). Estado vazio "Tudo em dia! 🎉".
  Decisão registrada em **DECISIONS.md D20**.
- **Reuso/UI**: a página reaproveita `toggleReceivedAction` (marcar pago/recebido inline) — que
  passou a **revalidar `/financas/agenda`** (junto de `deleteTransactionAction`). Botão
  **A pagar/receber** no cabeçalho de Finanças (`src/app/(app)/financas/page.tsx`), exibido quando
  há pendências. Sem novas dependências.
- Definition of Done verde: build (21 rotas, nova `/financas/agenda`), typecheck (`tsc --noEmit`)
  limpo, lint (0), 257 testes, smoke test (/financas/agenda sem sessão → 307; **e2e autenticado com
  cookie de sessão real**: página → 200, 4 pendências distribuídas (Vencidas/Hoje/Próximos 7 dias/
  Mais tarde), realizada excluída, totais A receber R$ 1.500,00 / A pagar R$ 580,00 / Saldo
  pendente R$ 920,00 — verificado). `npm audit` inalterado (10 advisories: 4 moderate / 5 high /
  1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 30 — 2026-06-17 (Fase 1 — contatos para reativar / CRM prospecção)
- **Lógica pura** (`src/lib/contacts.ts`): `findContactsToReengage(items, opts?)` →
  `{ rows, count, staleDays }`. Inclui um contato quando tem ao menos um show **não cancelado
  no passado** (`date < now`), **nenhum** show não cancelado futuro (`date >= now`) e o último
  show foi há **`>= staleDays` dias** (padrão 60, injetável; `now` injetável). Cada linha
  (`ReengageRow`) traz `lastShowDate`, `daysSinceLastShow` (diferença de meia-noite UTC, mesma
  convenção de `dayKey`), `pastShows` (passados não cancelados) e `totalFee` (cachê histórico,
  centavos). Ordena pelos mais esquecidos primeiro (`daysSinceLastShow` desc), desempatando por
  cachê desc, nome (pt-BR) e id. Reaproveita os tipos genéricos `ContactWithShows`/`ContactRankLike`
  do ranking. Testes em `src/lib/contacts.test.ts` (+6 → total do projeto **263**, eram 257):
  lista vazia, inclusão só de dormentes (exclui com futuro/recente/sem shows), shows cancelados
  ignorados (passado e futuro), cálculo de `daysSinceLastShow` em dias UTC, ordenação + desempate
  por cachê, `staleDays` customizado.
- **Página** `src/app/(app)/contatos/reativar/page.tsx` (`force-dynamic`): consulta os contatos
  do usuário com seus shows numa só leitura, chama `findContactsToReengage`, mostra cards de
  resumo (nº para reativar + contato de prioridade), uma tabela por contato (Último show, Sem
  contato com rótulo relativo "há N meses/dias", Shows passados, Cachê histórico) com link para o
  detalhe e atalho **✉ E-mail / ☎ Ligar** (mailto/tel) por linha; estado vazio "Nenhum contato
  dormente 🎶" e nota de rodapé sobre o critério. Decisão registrada em **DECISIONS.md D21**.
- **UI Contatos** (`src/app/(app)/contatos/page.tsx`): botão **Reativar** no cabeçalho (ao lado de
  Ranking, exibido quando há contatos). Sem novas dependências.
- Definition of Done verde: build (22 rotas, nova `/contatos/reativar`), typecheck (`tsc --noEmit`)
  limpo, lint (0), 263 testes, smoke test (/contatos/reativar sem sessão → 307; **e2e autenticado
  com cookie de sessão real**: página → 200, "Bar Frio" (show passado de R$ 300,00, sem futuro)
  listado com atalho mailto e rótulo "há … meses", "Bar Ativo" (tem show futuro) corretamente
  excluído — verificado). `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical;
  nenhuma dependência nova — ver D6/D8).

### Sessão 31 — 2026-06-18 (Fase 1 — receita agendada / pipeline de cachês futuros)
- **Lógica pura** (`src/lib/finance.ts`): `forecastBookedRevenue(shows, opts?)` →
  `{ months, total, count, confirmedTotal, tentativeTotal, nextMonth }`. A partir dos shows
  ainda por acontecer (dia `>= hoje` em UTC, mesma convenção de `dayKey`; show de hoje conta),
  **excluindo `CANCELLED`**, soma o cachê (`fee`) por mês de realização ("YYYY-MM"). Cada mês
  (`BookedRevenueMonth`) separa `confirmed` (status CONFIRMED/PLAYED) de `tentative` (PROPOSED
  ou sem status), com a invariante `total = confirmed + tentative`. Só meses com shows aparecem,
  em ordem crescente; `nextMonth` aponta o primeiro. `now` injetável. Tipos
  `BookedRevenueShowLike`/`BookedRevenueMonth`/`BookedRevenueForecast`; helper privado
  `isConfirmedBooking`. Distinto de `projectCashflow` (parte das pendências de caixa) — aqui a
  fonte é a **agenda de shows**. Testes em `src/lib/finance.test.ts` (+6 → **96 no arquivo, 269
  no projeto**, eram 263): vazio, ignora passados/inclui hoje, ignora cancelados, agrupa por mês
  + invariante confirmed+tentative, status ausente = tentativo, totais gerais + ordenação.
- **Página** `src/app/(app)/shows/receita-agendada/page.tsx` (`force-dynamic`): consulta só os
  shows futuros do usuário (`date >= hoje`) numa leitura, chama `forecastBookedRevenue`, e mostra
  cards de resumo (Total agendado/Confirmado/A confirmar/Shows agendados com % confirmado) e uma
  tabela mês a mês (Shows, Confirmado, A confirmar, Total) com mini-barra de proporção
  confirmado/a confirmar e link do mês para o calendário (`/shows/calendario?mes=`), além de
  linha de Total no rodapé; estado vazio dedicado e nota de rodapé sobre o critério. Decisão
  registrada em **DECISIONS.md D22**.
- **UI Shows** (`src/app/(app)/shows/page.tsx`): botão **Receita agendada** no cabeçalho (ao
  lado de Por local, exibido quando há shows). Sem novas dependências.
- Definition of Done verde: build (23 rotas, nova `/shows/receita-agendada`), typecheck
  (`tsc --noEmit`) limpo, lint (0), 269 testes, smoke test (/shows/receita-agendada sem sessão →
  307; **e2e autenticado com cookie de sessão real**: página → 200, "Confirmado fut" (R$ 2.000,00)
  e "Proposto fut" (R$ 500,00) somam R$ 2.500,00 em jul/2026, show passado e cancelado excluídos —
  verificado ao vivo com `next start`). `npm audit` inalterado (10 advisories: 4 moderate / 5 high
  / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 32 — 2026-06-18 (Fase 1 — persistir o último filtro das Finanças)
- **Lógica pura** (`src/lib/financasFilter.ts`): `decideFinancasFilter(searchParams, cookie)` →
  `{ kind }` de quatro casos (`reset` | `persist` | `restore` | `pass`), com helpers
  `canonicalFilterQuery` (serializa só as chaves de filtro conhecidas e não-vazias, em ordem
  estável — descarta `reset`/lixo) e `hasAnyFilterParam`. Constantes `FINANCAS_FILTER_COOKIE`
  e `FINANCAS_FILTER_KEYS` (`q/mes/tipo/categoria/show/status/de/ate`). Regras: `?reset=1` →
  esquece; URL com qualquer chave de filtro → persiste o recorte canônico (ou apaga se vazio);
  visita "limpa" (sem chaves) com cookie salvo → restaura. Testes em
  `src/lib/financasFilter.test.ts` (+13 → **282 no projeto**, eram 269): canonização/ordem/trim,
  prioridade do reset, persist com recorte vazio = apagar, restore + sanitização do cookie,
  ausência de loop (a URL restaurada já tem chaves → vira persist).
- **Middleware** (`src/middleware.ts`, `matcher: ["/financas"]`): traduz a decisão pura em
  resposta HTTP. Persiste com `Set-Cookie` httpOnly/SameSite=Lax/180d; **set e delete usam
  `Path=/`** para casar (o `cookies.delete` do Next sempre emite `Path=/`; o cookie só é lido
  em `/financas`, então o escopo amplo é inócuo — ver D23). Cookies não podem ser gravados no
  render de um Server Component, daí o middleware.
- **UI** (`src/app/(app)/financas/page.tsx`): os dois links **Limpar** apontam para
  `/financas?reset=1` (antes `/financas`, que com o cookie salvo voltaria a restaurar). O link
  "Finanças" do menu agora reabre a página já com o último filtro aplicado.
- Definition of Done verde: build (23 rotas + **Middleware** 26.8 kB), typecheck (`tsc --noEmit`)
  limpo, lint (0), **282 testes**, smoke test ao vivo (`next start`) dos 4 caminhos do middleware
  via `curl -i`: persist (Set-Cookie canônico, `q=` vazio descartado, Path=/), restore (307 →
  `/financas?q=...&mes=...`), reset (307 → `/financas` + cookie expirado Path=/), visita limpa
  sem cookie (passa direto, auth 307 → /login). `npm audit` inalterado (10 advisories: 4 moderate
  / 5 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 33 — 2026-06-18 (Fase 1 — persistir filtro também em Shows e Contatos)
- **Generalização da lógica** (`src/lib/listFilter.ts`): extraída a decisão pura da Sessão 32
  para um módulo genérico parametrizado pelas chaves de cada lista — `canonicalQuery(params, keys)`,
  `hasAnyFilterParam(params, keys)`, `decideListFilter(params, cookie, keys)` (mesmos 4 casos:
  `reset` | `persist` | `restore` | `pass`). Registro declarativo `LIST_FILTER_CONFIGS` com
  `{ path, cookie, keys }` para as três listas: `/financas` (`financas_filtro`, 8 chaves),
  `/shows` (`shows_filtro`: `q/status/de/ate`), `/contatos` (`contatos_filtro`: `q/papel`).
- **Fachada `src/lib/financasFilter.ts`**: agora delega ao genérico (cookie/chaves vindos do
  registro), preservando sua API pública e os **13 testes** existentes.
- **Middleware** (`src/middleware.ts`, `matcher: ["/financas","/shows","/contatos"]`): casa a rota
  exata contra `LIST_FILTER_CONFIGS` e aplica a mesma tradução decisão→HTTP (Set-Cookie httpOnly/
  SameSite=Lax/180d com `Path=/`; redirect em restore/reset). Um só middleware serve as três listas.
- **UI**: os links **Limpar** de Shows (`/shows?reset=1`) e Contatos (`/contatos?reset=1`) passaram
  a sinalizar o reset (senão o cookie salvo os re-restauraria — como já fazia Finanças). Sem novas
  dependências. Decisão registrada em **DECISIONS.md D24**.
- Definition of Done verde: build (24 rotas + **Middleware** 26.9 kB), typecheck (`tsc --noEmit`)
  limpo, lint (0), **297 testes** (+15: novo `src/lib/listFilter.test.ts`), smoke test ao vivo
  (`next start`) dos caminhos do middleware em `/shows` e `/contatos` via `curl -i`: persist
  (Set-Cookie canônico `q=jazz&status=DONE` / `papel=VENUE`, Path=/), restore (307 →
  `/shows?q=jazz&status=DONE` / `/contatos?papel=VENUE`), reset (307 → rota base + cookie expirado),
  visita limpa sem cookie (passa direto, auth 307 → /login). `npm audit` inalterado (10 advisories:
  4 moderate / 5 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 34 — 2026-06-18 (Fase 1 — cachês a receber: reconciliar agenda × finanças)
- **Lógica pura** (`src/lib/finance.ts`): `reconcileShowFees(shows, txs, { now })` cruza o cachê
  acordado (`Show.fee`) com a receita de fato recebida (INCOME vinculada por `showId`, `received=true`).
  Para cada show **já realizado** calcula `outstanding = max(0, fee − collected)` e lista só os com
  saldo > 0, do gig mais antigo ao mais recente. "Realizado" (`isHappenedGig`) = `PLAYED` ou
  `CONFIRMED` com data passada (cobre quem esqueceu de virar o status). Expõe também
  `registeredPending` (receita lançada mas não recebida, que **não** abate o saldo) e `unregistered`.
  Tipos `ReceivableShowLike`/`ShowReceivableRow`/`ShowReceivables`. **8 testes** novos em
  `finance.test.ts` (abatimento só por recebido, exclusão de futuro/proposto/cancelado, sem cachê,
  isolamento por `showId`, despesa não abate, clamp em zero, ordenação). Ver **DECISIONS.md D25**.
- **Página** `src/app/(app)/shows/a-receber/page.tsx` (`force-dynamic`): lê os shows
  `PLAYED`/`CONFIRMED` e as receitas vinculadas a shows numa só consulta cada; cards (Total a receber/
  Shows pendentes/Já recebido) + tabela (show, data, cachê, recebido, a receber) com link do show,
  anotação "receita não lançada" / "X pendente", rodapé de total e estado vazio comemorativo.
- **Painel** (`src/app/(app)/dashboard/page.tsx`): alerta âmbar "🎤 Cachês a receber" com total e
  contagem, linkando para a página, quando há saldo (reaproveita `shows`+`txs` já carregados).
- **UI Shows** (`src/app/(app)/shows/page.tsx`): botão **A receber** no cabeçalho (ao lado de
  Receita agendada). Sem novas dependências nem mudança de schema.
- Definition of Done verde: build (25 rotas, nova `/shows/a-receber`), typecheck (`tsc --noEmit`)
  limpo, lint (0), **305 testes**, smoke test ao vivo (`next start`): rota sem sessão → 307; **e2e
  autenticado com cookie de sessão real** (seed demo) → `/shows/a-receber` 200 com "Total a receber"
  e linhas "pendente", `/dashboard` 200 com o alerta "Cachês a receber". `npm audit` inalterado
  (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 35 — 2026-06-18 (Fase 1 — quitar cachê inline em "Cachês a receber")
- **Server action** (`src/app/(app)/shows/actions.ts`): `settleShowFeeAction(formData)` quita o
  saldo em aberto de um show direto da lista, sem ir às Finanças. Confirma posse (`findFirst` por
  `userId`), recalcula no servidor `outstanding = max(0, fee − Σ receitas INCOME já recebidas)` via
  `prisma.transaction.aggregate` (nunca confia em valor do cliente) e, se houver saldo, cria UMA
  receita `INCOME`/`received=true`/`category="Cachê"`/`description="Cachê — {título}"`/`date=now`
  vinculada ao show. **Idempotente**: já quitado/`fee<=0`/show de outro usuário → no-op. Revalida
  `/shows/a-receber`, `/shows`, `/shows/{id}`, `/financas`, `/financas/agenda`, `/dashboard`.
- **UI** (`src/app/(app)/shows/a-receber/page.tsx`): nova coluna **Ações** com o botão **Quitar**
  por linha (confirmação em duas etapas) e nota de rodapé atualizada explicando o atalho.
- **Reúso** (`src/components/DeleteButton.tsx`): generalizado com a prop `groupLabel` (default
  "Confirmar exclusão") para o `aria-label` do grupo de confirmação ficar correto em usos que não
  são exclusão; o botão Quitar passa `groupLabel="Confirmar lançamento do cachê"`. Ver **D26**.
- **Testes** (`src/app/(app)/shows/actions.test.ts`): +6 (saldo total, recebimento parcial só
  quita o restante, idempotência quando já quitado, pendente não abate, isolamento por usuário,
  `fee=0` no-op). Sem mudança de schema nem novas dependências.
- Definition of Done verde: build (25 rotas; `/shows/a-receber` agora 707 B com o client de
  confirmação), typecheck (`tsc --noEmit`) limpo, lint (0), **311 testes**, smoke test ao vivo
  (`next start` + cookie de sessão real do seed demo): `/shows/a-receber` 200 com a linha "Show no
  Bar do Zé" (cachê R$ 1.500,00, **A receber R$ 1.250,00**) e o botão "Lançar R$ 1.250,00 como
  recebido"; rota sem sessão → 307. `npm audit` inalterado (10 advisories: 4 moderate / 5 high /
  1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 36 — 2026-06-18 (Fase 1 — atalho de cobrança em "Cachês a receber")
- **Lógica pura** (`src/lib/billing.ts`): `buildShowBilling(show, contacts, { fromName })` →
  `{ contact, subject, body, mailtoUrl, whatsappUrl } | null`. Reúne: `pickBillingContact`
  (escolhe entre os contatos vinculados ao show só os com e-mail/telefone, prioriza por papel
  BOOKER→PROMOTER→VENUE→PRODUCER→OTHER→PRESS, desempate por nome pt-BR/id), `buildDunningMessage`
  (assunto "Cachê pendente — {título}" + corpo educado pt-BR com data UTC, local "venue · city"
  e valor `formatMoney`, saudação personalizada e assinatura opcional), `normalizeWhatsappPhone`
  (heurística pt-BR: 10–11 díg. ganham DDI 55; 12–13 começando com 55 mantidos; demais ≥8 díg.
  usados como vieram; <8 → null), `buildMailtoUrl`/`buildWhatsappUrl` (encoding de URL; WhatsApp
  só com o corpo). **20 testes** novos em `src/lib/billing.test.ts`. Ver **DECISIONS.md D27**.
- **Página** (`src/app/(app)/shows/a-receber/page.tsx`): a consulta de shows passou a incluir
  `contacts.include.contact`; cada linha monta o `buildShowBilling` (assinatura = `artistName`
  ou `name` do usuário) e renderiza, na coluna **Ações** (ao lado de Quitar), os botões
  **✉ E-mail** (`<a href=mailto:>`) e **WhatsApp** (`<a href=wa.me target=_blank rel=noopener>`),
  exibidos só quando há o canal. Nota de rodapé atualizada. Sem novas dependências nem mudança de schema.
- Definition of Done verde: build (25 rotas; `/shows/a-receber` 707 B), typecheck (`tsc --noEmit`)
  limpo, lint (0), **331 testes** (eram 311), smoke test ao vivo (`next start`): rota sem sessão →
  307; **e2e autenticado com cookie de sessão real** (seed demo + contato "Zé do Bar" vinculado ao
  show PLAYED) → `/shows/a-receber` 200 com `mailto:ze@bardoze.com` (assunto "Cachê pendente"),
  `wa.me/5511999990001` (telefone `(11) 99999-0001` normalizado) e os botões ✉ E-mail / WhatsApp —
  verificado. `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma
  dependência nova — ver D6/D8).

### Sessão 37 — 2026-06-18 (Fase 1 — quitar valor parcial em "Cachês a receber")
- **Lógica pura** (`src/lib/finance.ts`): `resolveSettlementAmount(outstanding, requested?)` →
  decide quanto lançar ao quitar. Saldo ≤ 0 → 0; valor pedido ausente/inválido (NaN)/≤ 0 → quita
  o saldo inteiro (mesmo comportamento do botão da Sessão 35); valor válido → `min(round(req),
  outstanding)` (clamp em `[0, outstanding]`, impedindo sobre-lançamento). Retorna sempre inteiro
  de centavos. **6 testes** novos em `finance.test.ts`. Ver **DECISIONS.md D28**.
- **Server action** (`src/app/(app)/shows/actions.ts`): `settleShowFeeAction` passou a ler um
  campo **opcional** `amount` (string reais pt-BR, via `parseMoneyToCents`). O saldo continua
  recalculado no servidor (`prisma.transaction.aggregate`) e o valor a lançar passa por
  `resolveSettlementAmount` — o `amount` do cliente nunca ultrapassa o saldo (mantém a regra da
  D26). Vazio = quita tudo. **3 testes** de integração novos em `shows/actions.test.ts` (parcial
  real, clamp ao saldo, vazio = saldo cheio) — total **340** (eram 331).
- **Componente client** `src/components/SettleFeeButton.tsx`: substitui o uso do `DeleteButton`
  na página. O clique em **Quitar** abre, na própria linha, um `MoneyInput` pré-preenchido com o
  saldo em aberto (editável) + **Lançar/Cancelar** (`SubmitButton` com estado pendente). Lançar o
  valor cheio quita; lançar menos deixa o restante na lista. `DeleteButton` segue intacto nos
  pontos de exclusão.
- **Página** (`src/app/(app)/shows/a-receber/page.tsx`): troca do `DeleteButton` pelo
  `SettleFeeButton` na coluna Ações; nota de rodapé atualizada (quitação total ou parcial). Sem
  novas dependências nem mudança de schema.
- Definition of Done verde: build (25 rotas; `/shows/a-receber` 1.06 kB com o client de valor),
  typecheck (`tsc --noEmit`) limpo, lint (0), **340 testes**, smoke test ao vivo (`next start`):
  rota sem sessão → 307; **e2e autenticado com cookie de sessão real** (seed demo) →
  `/shows/a-receber` 200 com "Show no Bar do Zé", o botão **Quitar** e a nota de quitação parcial
  — verificado. `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma
  dependência nova — ver D6/D8).

### Sessão 38 — 2026-06-18 (Fase 1 — data real do recebimento ao quitar cachê)
- **Lógica pura** (`src/lib/finance.ts`): `resolveReceivedDate(raw, now)` → decide a DATA da
  receita ao quitar. Vazio/ inválido (regex `isValidDateKey`) → `now` (comportamento histórico
  da D26); data válida no passado/hoje → **meia-noite UTC daquele dia** (consistente com
  `dayKey`/`monthKey`, que keyam por UTC); data no **futuro** → `now` (não se recebe no futuro —
  mantém a projeção de caixa sã). **4 testes** novos em `finance.test.ts`. Ver **DECISIONS.md D29**.
- **Server action** (`src/app/(app)/shows/actions.ts`): `settleShowFeeAction` passou a ler um
  campo **opcional** `receivedAt` (`YYYY-MM-DD`) e usa `resolveReceivedDate(...)` como `date` da
  `Transaction` (antes era `new Date()` fixo). A validação/ rejeição de futuro fica no servidor
  (não confia no `max` do input). Revalida também `/financas/relatorio` e `/financas/anual` (o
  caixa pode cair noutro mês). **2 testes** de integração novos em `shows/actions.test.ts` (data
  informada gravada; futura cai para agora) — total **346** (eram 340).
- **Componente client** `src/components/SettleFeeButton.tsx`: ganhou um `<input type="date">`
  (`name="receivedAt"`, label `sr-only`) ao lado do `MoneyInput`, default = hoje (prop `today`,
  calculada no servidor via `dayKey(new Date())` para evitar mismatch de hidratação; `max={today}`
  bloqueia futuro na UI). A página passa `today` ao botão e a nota de rodapé menciona a data real.
- Definition of Done verde: build (25 rotas; `/shows/a-receber` 1.14 kB), typecheck (`tsc
  --noEmit`) limpo, lint (0), **346 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/shows/a-receber` sem sessão → 307. `npm audit` inalterado (10 advisories: 4 moderate / 5 high /
  1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 39 — 2026-06-18 (Fase 1 — seletor de qual contato cobrar em "Cachês a receber")
- **Lógica pura** (`src/lib/billing.ts`): extraído o comparador `compareBillingContacts`
  (papel → nome pt-BR → id) e a nova `reachableBillingContacts(contacts)` (lista todos os contatos
  alcançáveis — com e-mail/telefone — em ordem de prioridade de cobrança). `pickBillingContact`
  virou `reachableBillingContacts(...)[0] ?? null` (DRY). Nova `buildShowBillings(show, contacts,
  opts)` → `ShowBilling[]`: monta a cobrança (assunto/corpo/mailto/wa.me) para **cada** contato
  alcançável, na mesma ordem (o 1º é a escolha automática); `buildShowBilling` (singular) preservado
  como `buildShowBillings(...)[0] ?? null`, mantendo API e testes antigos intactos. **5 testes**
  novos em `src/lib/billing.test.ts` (20→25 no arquivo; total do projeto **351**, eram 346):
  `reachableBillingContacts` (ordem + exclusão de não-alcançáveis + vazio) e `buildShowBillings`
  (vazio, cobrança por contato com mensagem personalizada, equivalência com `buildShowBilling`).
- **Componente client** `src/components/BillingActions.tsx`: recebe `ShowBilling[]` pronto do
  servidor. Com **um** contato, mostra direto os botões ✉ E-mail / WhatsApp (idêntico ao anterior);
  com **vários**, antepõe um `<select>` "quem cobrar" (escolha automática pré-selecionada, rótulo
  `Nome (Papel)` via `CONTACT_ROLE_LABELS`) e os botões refletem o contato escolhido. O cliente só
  alterna o índice — nenhum recálculo no cliente. Acessível (`<label sr-only>`, `title`/`aria-label`).
- **Página** (`src/app/(app)/shows/a-receber/page.tsx`): passou a chamar `buildShowBillings` por
  linha e renderiza `<BillingActions billings={...} />` na coluna Ações (substituindo a renderização
  inline de um único contato). Nota de rodapé atualizada (escolher quem cobrar). Decisão em **D30**.
- Definition of Done verde: build (25 rotas; `/shows/a-receber` 1.97 kB com o seletor), typecheck
  (`tsc --noEmit`) limpo, lint (0), **351 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/shows/a-receber` sem sessão → 307; `/login` → 200. `npm audit` inalterado (10 advisories: 4
  moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8).

## Próximos passos (priorizados para a próxima sessão)
1. **Polimento UX**: estados de loading/erro inline (mensagens de falha do server action),
   mensagens vazias, acessibilidade. (máscara de input monetário entregue na Sessão 11.)
2. **Calendário — evoluções**: arrastar/soltar para remarcar; mini-calendário de salto rápido.
   (visão semanal entregue na Sessão 19 — `/shows/semana`; link do dashboard para a agenda na
   Sessão 19; clicar num dia para criar show com a data na Sessão 13; exportação iCalendar
   `.ics` na Sessão 15 — base em `src/lib/calendar.ts` e `src/lib/ics.ts`.)
3. **Filtros — evoluções**: persistência do último filtro entregue para Finanças (Sessão 32),
   Shows e Contatos (Sessão 33) — módulo genérico `src/lib/listFilter.ts` + middleware (ver D23/D24).
   Próximo possível: indicador visual de "filtro lembrado" na UI, ou estender a `/shows/calendario`
   e listas derivadas se fizer sentido.
   (filtro por categoria entregue na Sessão 10; intervalo de datas na Sessão 12;
   exportação CSV do recorte filtrado na Sessão 14; busca textual na Sessão 17;
   base em `src/lib/finance.ts`.)
5. **Cachês a receber — evoluções** (entregue na Sessão 34, `/shows/a-receber` + `reconcileShowFees`,
   ver D25; **quitar cachê inline** entregue na Sessão 35 — `settleShowFeeAction`, ver D26;
   **atalho de cobrança** mailto/WhatsApp para o contato do show entregue na Sessão 36 —
   `src/lib/billing.ts`, ver D27; **quitar valor parcial** entregue na Sessão 37 —
   `SettleFeeButton` + `resolveSettlementAmount`, ver D28; **data real do recebimento** entregue na
   Sessão 38 — `resolveReceivedDate` + campo `receivedAt`, ver D29; **seletor de qual contato
   cobrar** entregue na Sessão 39 — `buildShowBillings` + `BillingActions`, ver D30; **aging dos
   recebíveis** entregue na Sessão 40 — `bucketReceivablesByAge`, ver D31): próximo
   possível — lembrar a última escolha de contato por show, registrar a data prometida de
   pagamento na própria cobrança, ou trazer o aging para o Painel (alerta de recebível ≥90 dias).
4. **Sessões/segurança**: invalidação ao trocar a senha entregue na Sessão 26
   (`passwordChangedAt` + `isSessionFresh`, ver D17). Evoluções possíveis: "encerrar sessão
   específica" (lista de sessões revogáveis) e recuperação de senha por e-mail — adiáveis.

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** em `personas-and-needs.md` (CRM, multiusuário)
  precisam de 5–10 entrevistas com músicos reais antes de investimento pesado.
- Foco **português/LATAM** e faixas de preço (`business-plan.md`) são hipóteses — validar.
- **Segurança em produção**: definir `AUTH_SECRET` forte e migrar para PostgreSQL antes
  de qualquer deploy real. Revisar advisories do Next (D6) e planejar upgrade p/ Next 15+.
