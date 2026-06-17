# Decisões (para revisão humana)

Registro de decisões discutíveis tomadas autonomamente entre sessões. Cada entrada:
contexto, decisão, justificativa e alternativas consideradas.

---

## 2026-06-15 — D1: Foco do produto = back-office de gestão, não divulgação/distribuição
- **Decisão:** posicionar a plataforma como o "sistema operacional de gestão de carreira"
  (agenda, finanças, contatos, contratos), e **não** competir de frente com distribuição
  (Beatchain/TuneCore), site builder (Bandzoogle) ou descoberta de fãs (Bandsintown).
- **Justificativa:** a pesquisa de mercado (`docs/market-analysis.md`) mostra que a gestão
  operacional interna é a maior lacuna; o substituto atual é planilha/Notion.
- **Risco/validação:** depende de entrevistas com músicos reais. Tratar como hipótese.

## 2026-06-15 — D2: Núcleo do MVP = Shows + Finanças + Rentabilidade + CRM básico
- **Decisão:** v1 entrega F1–F5 de `docs/mvp-scope.md`; split de receita, contratos,
  EPK e distribuição ficam para fases futuras.
- **Justificativa:** são as necessidades mais consistentemente **validadas** e o
  diferencial (rentabilidade por show) não existe bem no mercado.

## 2026-06-15 — D3: Stack = Next.js + TypeScript + Prisma + Tailwind
- **Decisão:** Next.js (App Router) + TypeScript + Prisma ORM + Tailwind CSS. Banco:
  **SQLite em dev** (zero dependência externa, alinhado a execuções remotas efêmeras),
  com schema portável para **PostgreSQL** em produção.
- **Justificativa:**
  - Next.js: full-stack num só repo (UI + API routes/server actions), ótimo DX, deploy fácil.
  - TypeScript: segurança de tipos para lógica financeira.
  - Prisma: schema declarativo, migrations, troca SQLite→Postgres com mudança mínima.
  - Tailwind: prototipagem rápida e responsiva.
  - SQLite em dev: o container remoto é efêmero e sem Postgres garantido; SQLite permite
    `build`/`test`/`run` sem serviços externos, mantendo a regra "nunca deixar a base quebrada".
- **Alternativas consideradas:** Remix/SvelteKit (menos familiar/ecossistema); Postgres
  local em dev (exige serviço rodando — atrito nas execuções remotas); Drizzle (Prisma é
  mais maduro para migrations rápidas).
- **A revisar:** se produção exigir Postgres desde já, migrar o `provider` do Prisma.

## 2026-06-16 — D4: Autenticação própria leve (bcrypt + JWT em cookie), não Auth.js
- **Decisão:** implementar autenticação por e-mail/senha própria: hash com `bcryptjs`
  e sessão via JWT assinado (`jose`) em cookie httpOnly. Sem provedores externos/OAuth.
- **Justificativa:** o MVP só precisa de login por credenciais; Auth.js agregaria
  dependências e configuração (adapters, providers) sem valor imediato. A solução cabe em
  ~3 arquivos (`src/lib/auth.ts`, `session.ts`, actions) e roda sem serviços externos —
  alinhada às execuções remotas efêmeras. O modelo já isola dados por `userId`.
- **Alternativas consideradas:** Auth.js/NextAuth (mais robusto p/ OAuth e múltiplos
  provedores — adotar quando entrarem login social ou multiusuário); Lucia (descontinuado).
- **A revisar:** ao introduzir OAuth, recuperação de senha ou multiusuário, reavaliar Auth.js.

## 2026-06-16 — D5: SQLite no Prisma sem enums nativos → campos String validados na app
- **Decisão:** os "enums" (status do show, tipo de transação, papel do contato) são
  colunas `String` no Prisma, com valores válidos centralizados em `src/lib/domain.ts` e
  validados por Zod (`src/lib/validation.ts`).
- **Justificativa:** o provider SQLite do Prisma não suporta `enum`. String + validação
  na borda mantém o schema portável; ao migrar para PostgreSQL podem virar enums nativos.

## 2026-06-16 — D6: Permanecer no Next.js 14.2.x (patch) apesar de advisories
- **Decisão:** fixar `next@14.2.35` (último patch da linha 14.2). Vários advisories do
  `npm audit` só têm correção no Next 15/16, que exigem React 19 e mudanças maiores.
- **Justificativa:** os advisories restantes não se aplicam ao uso atual do MVP (sem
  i18n middleware, sem CSP nonces, sem `beforeInteractive` com input não confiável, sem
  Image Optimization exposta publicamente). Migrar para 15/16 autonomamente arriscaria
  quebrar a base, contra a regra de "nunca deixar a base quebrada".
- **A revisar:** planejar upgrade para Next 15+/React 19 quando houver janela para validar
  a migração (App Router é majoritariamente compatível).

## 2026-06-16 — D8: Configurar ESLint com `next/core-web-vitals` (ESLint 8 + `.eslintrc.json`)
- **Decisão:** adotar `eslint@8.57.1` + `eslint-config-next@14.2.35` com config clássica
  (`.eslintrc.json` estendendo `next/core-web-vitals`), e adicionar passo de **Lint** ao CI
  (entre Typecheck e Test). `next lint` roda limpo (0 warnings/erros) sobre os 46 arquivos
  de `src/`.
- **Justificativa:** fecha o item "lint" da Definition of Done, que estava pendente desde a
  Sessão 5 (o prompt interativo do `next lint` impedia rodar no CI). ESLint 8 + `.eslintrc`
  (em vez de ESLint 9 flat config) porque o Next 14.2 ainda não suporta flat config de forma
  estável; alinhado à versão do `eslint-config-next` casada com o Next instalado.
- **Alternativas consideradas:** ESLint 9 + `eslint.config.mjs` (flat) — descartado por
  imaturidade no Next 14.2; Biome — descartado para não trocar de ferramenta sem motivo forte.
- **`npm audit` (novas vulnerabilidades):** o `npm audit` subiu de 7 para 10 advisories.
  As 3 novas (high) vêm **apenas da cadeia de dev-tooling do ESLint**:
  `eslint-config-next` → `@next/eslint-plugin-next` → `glob@>=10.2.0 <10.5.0`
  (GHSA-5j98-mcp5-4vw2: command injection no **CLI** do `glob` via flag `-c/--cmd`).
  **Não exploitável no nosso uso:** `glob` aqui é dependência transitiva de lint (build-time,
  não vai para o bundle de produção) e nunca invocamos o CLI `glob -c`. Mantida a postura da
  D6 (não fazer upgrades breaking só por advisories que não se aplicam ao runtime do MVP).

## 2026-06-16 — D7: Criar branch `main` como tronco canônico
- **Decisão:** criar `main` (a partir do commit da Fase 0, `38d8343`) como tronco do
  projeto. PRs passam a ter base em `main`; sessões futuras partem de `main`.
- **Justificativa:** o repositório não tinha trunk — o default era um branch de rotina
  arbitrário e cada execução criava branches paralelos sem convergência, dificultando
  histórico e revisão. Um `main` estável dá um ponto único de integração.
- **Pendência manual:** definir `main` como *default branch* nas configurações do GitHub
  (as ferramentas disponíveis nesta sessão não permitem alterar o default branch).
- **Alternativas consideradas:** criar `main` já com a Fase 1 (descartado: deixaria a PR
  #16 sem conteúdo a revisar); manter o modelo sem trunk (descartado: insustentável).

## 2026-06-16 — D9: Filtros das Finanças via query string + filtragem em memória
- **Decisão:** os filtros da página de Finanças (mês, tipo, show, situação) vivem na **query
  string** (`?mes=&tipo=&show=&status=`, formulário GET) e a filtragem roda **em memória**
  no servidor — carrega-se todas as transações do usuário e aplica-se `filterTransactions`
  (lógica pura, testada em `finance.test.ts`) antes de recomputar o resumo (`summarizeFinances`).
- **Justificativa:** a query string torna os filtros **compartilháveis/bookmarkáveis** e
  segue o padrão já adotado no calendário (`?mes=`). Filtrar em memória mantém uma única
  fonte de verdade (a lógica pura testada) para a lista, o resumo (cards) e os meses
  disponíveis do seletor, sem duplicar a regra em SQL. Para a escala do MVP (transações de
  um músico individual) o custo é irrelevante.
- **Alternativas consideradas:** filtrar no banco com `where` dinâmico (descartado por ora:
  duplicaria a regra e exigiria múltiplas queries para resumo + meses disponíveis; deve ser
  reconsiderado se o volume por usuário crescer muito); filtros client-side com estado React
  (descartado: quebraria o padrão server-component e a navegabilidade por URL).

## 2026-06-16 — D10: Troca de senha não invalida sessões ativas
- **Decisão:** ao trocar a senha em `/conta`, atualiza-se apenas o `passwordHash`; o
  cookie de sessão (JWT) **não** é reemitido nem invalidado. A `changePasswordAction`
  exige a senha atual correta antes de gravar a nova.
- **Justificativa:** o JWT de sessão (`src/lib/auth.ts`) é assinado sobre o `userId`, não
  sobre a senha — não há, hoje, lista de sessões/versão de credencial no banco para
  revogar. Reemitir o cookie do próprio usuário que trocou a senha não agrega segurança
  real (a sessão dele já era válida) e invalidar sessões de **outros** dispositivos exigiria
  infraestrutura de revogação (ex.: campo `passwordChangedAt`/`tokenVersion` checado em
  `verifySessionToken`). Para o MVP single-user isso é over-engineering.
- **Alternativas consideradas:** adicionar `tokenVersion` ao `User` e embutir no JWT,
  invalidando todas as sessões ao trocar a senha (recomendado para quando houver login em
  múltiplos dispositivos / produção — anotado como evolução); reemitir só o cookie atual
  (descartado: efeito de segurança nulo).

## 2026-06-16 — D11: Exportação CSV das Finanças (delimitador ;, decimal vírgula, BOM)
- **Decisão:** a exportação de transações (`/financas/export`) gera CSV com **delimitador
  `;`**, valores em **reais com vírgula decimal e sem separador de milhar** ("1234,56"),
  datas em **DD/MM/AAAA** e prefixo **BOM UTF-8**. A serialização é uma camada pura em
  `src/lib/csv.ts` (testada em `csv.test.ts`); o route handler aplica os **mesmos filtros**
  da página de Finanças (reaproveitando `filterTransactions`) lidos da query string.
- **Justificativa:** essa combinação abre **direto no Excel/Google Sheets em pt-BR** sem
  assistente de importação — o Excel em português usa `;` como separador de lista e vírgula
  como decimal; o BOM garante que acentos (ç, ã, ê) não corrompam. Manter a serialização
  pura permite testá-la sem HTTP e reusar a lógica de filtro já validada (uma fonte de
  verdade para lista, resumo e exportação). Atende à persona "odeia planilha" dando uma
  saída pronta para o contador, sem reescrever os dados.
- **Alternativas consideradas:** CSV "padrão internacional" (delimitador `,`, decimal `.`)
  — descartado por exigir wizard de importação no Excel pt-BR e confundir o usuário-alvo;
  geração client-side via Blob — descartada por duplicar a lógica de filtro no cliente e
  perder a verificação de posse no servidor; XLSX nativo — over-engineering para o MVP
  (exigiria dependência pesada; CSV cobre o caso de uso).

## 2026-06-16 — D12: Exportação iCalendar (.ics) da agenda de shows
- **Decisão:** a agenda de shows é exportável em **iCalendar/RFC 5545** via
  `/shows/agenda.ics` (um `VEVENT` por show). Datas emitidas em **UTC** (sufixo `Z`);
  `DTEND` = `DTSTART` + **duração padrão de 120 min** (o modelo não guarda hora de término);
  `STATUS` mapeado de PROPOSED→TENTATIVE, CONFIRMED/PLAYED→CONFIRMED, CANCELLED→CANCELLED;
  `UID` estável = `<showId>@palco.app`. Por padrão **exclui** shows cancelados; `?cancelados=1`
  os inclui (como `STATUS:CANCELLED`). A serialização é uma camada pura em `src/lib/ics.ts`
  (testada em `ics.test.ts`), com escape de TEXT e *line folding* a 75 octetos UTF-8.
- **Justificativa:** `.ics` é o formato universal de calendário — o músico importa/assina a
  agenda no Google/Apple Calendar e a vê no celular junto do resto da rotina, sem digitar
  nada de novo (atende à persona "odeia planilha" e à Necessidade #1, agenda). Emitir em UTC
  é o mais portável entre clientes (cada um exibe no fuso local). Manter a serialização pura
  espelha a decisão do CSV (D11): testável sem HTTP e com a posse garantida no servidor
  (`requireUser`). UID estável permite reimportar sem duplicar eventos.
- **Alternativas consideradas:** guardar hora de término por show — adiado (mudança de
  schema/UX para ganho marginal; 2h cobre a maioria dos shows); incluir cancelados por
  padrão — descartado (poluiriam o calendário; ficam atrás de `?cancelados=1`); emitir em
  horário local com `TZID`/`VTIMEZONE` — over-engineering (exigiria embutir a base de fusos;
  UTC é inequívoco); biblioteca de iCal de terceiros — desnecessária (o subconjunto usado é
  pequeno e a dependência somaria superfície de `npm audit`).

## 2026-06-17 — D14: Relatório financeiro com granularidade mensal e quebra por categoria
- **Decisão:** o relatório das Finanças (`/financas/relatorio`) é um **fechamento mensal** —
  seleciona-se UM mês (`?mes=YYYY-MM`, padrão o atual) e vê-se o resumo do mês mais a quebra
  por categoria (receitas e despesas separadas, com participação % de cada categoria no total
  do seu tipo). A agregação é uma camada pura nova (`categoryReport` em `src/lib/finance.ts`,
  testada); a página reaproveita `filterTransactions` (apenas o critério de mês),
  `summarizeFinances` e os helpers de navegação de mês do `calendar.ts`. Categorias em
  branco caem no bucket **"Sem categoria"**.
- **Justificativa:** o fechamento mensal é o ciclo natural de quem presta contas (ao contador,
  a si mesmo) e responde "quanto entrou/saiu neste mês e para onde foi". A granularidade mensal
  reaproveita toda a infra de mês já existente (`parseMonthKey`/`shiftMonth`/`formatMonthTitle`,
  `monthKey`) e o mesmo formato de query string do calendário/filtros, mantendo a navegabilidade
  por URL. Reusar `filterTransactions`/`summarizeFinances` evita duplicar regra (uma fonte de
  verdade já testada); só a quebra por categoria com % é nova e ganhou testes próprios. O Painel
  já mostra as 5 maiores categorias e o fluxo dos últimos 6 meses — o relatório complementa com
  o **detalhe completo de um mês** e exportação CSV daquele recorte.
- **Alternativas consideradas:** relatório que reaproveita TODOS os filtros das Finanças
  (mês/tipo/categoria/show/data/busca) em vez de só o mês — descartado por ora (o caso de uso é
  "fechamento do mês"; filtrar por categoria num relatório de categorias é redundante, e a página
  de Finanças já cobre o recorte livre + exportação); granularidade anual/trimestral —
  adiável (mensal cobre a decisão de prestação de contas; dá para navegar mês a mês); gráfico de
  pizza/biblioteca de charts — over-engineering para o MVP (barras de participação com CSS bastam
  e não somam dependência/superfície de `npm audit`).

## 2026-06-17 — D13: Projeção de caixa parte do realizado e dobra vencidas no mês atual
- **Decisão:** a projeção de caixa (`projectCashflow`, exibida no Painel) parte do
  **caixa realizado** (`cashBalance` = recebido − pago) e projeta os próximos meses somando
  apenas as **pendências** (`received === false`) pelo seu **mês de vencimento**, acumulando
  o saldo. Pendências **vencidas ou de meses anteriores** ao atual são **dobradas no mês
  atual** (não no passado); pendências **além do horizonte** (6 meses no Painel) são
  ignoradas. Mês de referência e horizonte são injetáveis (pureza/teste).
- **Justificativa:** responde à pergunta de decisão "vou ter caixa nos próximos meses?".
  Partir do realizado evita contar duas vezes o que já entrou/saiu. Bucketizar pendências
  por vencimento dá a curva de saldo; dobrar as vencidas no mês atual reflete a expectativa
  realista (ainda se espera receber/pagar) sem inventar datas passadas. Reaproveita
  `summarizeFinances` (uma fonte de verdade para o caixa). Distinta da D-anterior de
  **vencidas** (Sessão 16), que olha o passado; esta olha para frente.
- **Alternativas consideradas:** distribuir vencidas no mês original (descartado: poluiria
  meses passados que não aparecem na projeção e some o impacto); incluir transações
  realizadas futuras (não existem no modelo — realizado é sempre passado/presente);
  projeção diária/semanal (over-engineering para o MVP; mensal cobre a decisão de fluxo).

## 2026-06-17 — D15: Ranking de rentabilidade por show exclui cancelados por padrão
- **Decisão:** a página **Rentabilidade por show** (`/shows/rentabilidade`) lista todos os
  shows do usuário ordenados pelo resultado líquido (P&L) decrescente, com totais agregados
  e destaque do mais/menos rentável. A agregação é uma camada pura nova (`rankShowsByProfit`
  em `src/lib/finance.ts`, testada) que **reaproveita `computeShowPnL`** (uma fonte de verdade
  do cálculo por show) e **exclui shows com status `CANCELLED` por padrão** (parâmetro
  `excludeStatuses` configurável). O ponto de entrada é um botão **Rentabilidade** no cabeçalho
  da lista de Shows.
- **Justificativa:** "quais shows realmente deram dinheiro" é a decisão central de F4 (o
  diferencial do produto). O detalhe do show já mostra o P&L individual; faltava a visão
  comparativa para priorizar/repetir os gigs que pagam e renegociar/cortar os que dão prejuízo.
  Shows cancelados não geram receita real (o cachê acordado nunca se concretiza), então poluiriam
  o ranking e os totais — daí a exclusão padrão, alinhada ao mesmo critério já usado no resumo de
  relacionamento do contato (Sessão 20, soma de cachê sem cancelados). Reusar `computeShowPnL`
  evita duplicar a regra de P&L. Sem novas dependências.
- **Alternativas consideradas:** incluir cancelados com o cachê zerado — descartado (ainda
  poluiria a lista sem agregar decisão); permitir um filtro de período no ranking — adiável (a
  lista de Shows já tem filtro por data; o ranking olha o histórico completo, que é o caso de uso
  de "quais gigs valem a pena"); colocar a página sob `/financas` — descartado (a análise é por
  show; o ponto de entrada natural é a área de Shows, ao lado da agenda/exportação).

## 2026-06-17 — D16: Resumo anual das Finanças com granularidade de 12 meses
- **Decisão:** o resumo anual (`/financas/anual`) é uma **visão de 12 meses de um ano** —
  seleciona-se UM ano (`?ano=YYYY`, padrão o atual) e vê-se janeiro→dezembro com receitas,
  despesas e resultado por mês, mais os totais do ano e o destaque do **melhor/pior mês** (por
  resultado líquido, entre os meses que tiveram movimento). A agregação é uma camada pura nova
  (`annualSummary` em `src/lib/finance.ts`, testada), com `availableYears` para os anos
  presentes. Cada mês linka para o relatório mensal (`/financas/relatorio?mes=`). O ponto de
  entrada é um botão **Resumo anual** no cabeçalho das Finanças.
- **Justificativa:** complementa o relatório mensal (D14, "como foi este mês?") e a projeção/
  fluxo dos últimos 6 meses do Painel com a pergunta **"como foi o ano?"** — o recorte natural
  para imposto/prestação de contas e para ver sazonalidade (quais meses rendem mais). A
  granularidade anual sobre 12 meses fixos dá uma tabela estável e comparável; reaproveita a
  mesma convenção de chave de mês (`monthKey`, UTC) e o padrão de query string dos demais
  recortes, mantendo a navegabilidade por URL. Manter a agregação pura segue o padrão das
  demais features (testável sem HTTP, posse garantida no servidor por `requireUser`). Sem novas
  dependências (barras de proporção em CSS, sem biblioteca de charts).
- **Alternativas consideradas:** reaproveitar `totalsByMonth` (existente) na página — descartado
  porque `totalsByMonth` só devolve os meses com movimento, e a visão anual precisa dos 12 meses
  fixos (zeros inclusive) para a tabela e o cálculo de melhor/pior; granularidade trimestral —
  adiável (mensal cobre a leitura de sazonalidade e a navegação ano a ano já existe); exportação
  CSV do ano inteiro — adiável (o relatório mensal e a lista de Finanças já exportam; dá para
  somar depois reaproveitando `filterTransactions`); gráfico de linha/biblioteca de charts —
  over-engineering para o MVP (barras CSS bastam e não somam superfície de `npm audit`).
