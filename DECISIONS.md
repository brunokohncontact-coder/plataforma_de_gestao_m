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

## 2026-06-16 — D10: Troca de senha não invalida sessões ativas  _(SUPERSEDIDA por D17 em 2026-06-17)_
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

## 2026-06-17 — D17: Trocar a senha invalida sessões antigas (passwordChangedAt no JWT iat)
- **Decisão:** **substitui D10.** Ao trocar a senha em `/conta`, além de gravar o novo
  `passwordHash`, grava-se `passwordChangedAt = now` no `User` (novo campo, default `now()`).
  O JWT de sessão já carrega `iat` (emitido em); `getCurrentUser` (`src/lib/session.ts`)
  passa a recusar tokens cujo `iat` seja **anterior** a `passwordChangedAt`, via a função
  pura `isSessionFresh(iat, passwordChangedAt)` em `src/lib/auth.ts`. A `changePasswordAction`
  reemite o cookie do dispositivo atual (`setSessionCookie`) logo após gravar — assim quem
  trocou a senha **continua logado aqui** (token novo com `iat >= passwordChangedAt`), e os
  **demais dispositivos** com tokens antigos são deslogados no próximo request.
- **Justificativa:** fecha o gap de segurança apontado em D10 e nos bloqueios do PROGRESS —
  ao trocar a senha (cenário típico: suspeita de comprometimento), todas as sessões antigas
  deixam de valer, sem precisar de uma tabela de sessões/revogação. Usar o `iat` que o JWT
  já emite + um único timestamp no `User` é a abordagem mais simples que invalida **todos**
  os tokens anteriores de uma vez (mais simples que `tokenVersion`, que exigiria embutir e
  incrementar um contador). A comparação é em segundos UNIX, tolerando o arredondamento
  entre a gravação de `passwordChangedAt` (ms) e o `iat` do token reemitido na mesma operação.
  Registros sem `passwordChangedAt` (legados, caso houvesse) são tratados como válidos para
  não deslogar ninguém na introdução do campo; token sem `iat` é recusado por segurança.
- **Alternativas consideradas:** `tokenVersion` incremental no `User` embutido no JWT
  (descartado: equivalente em efeito, porém mais estado e mais código que um timestamp);
  manter D10 / não invalidar (descartado: deixa sessões roubadas válidas por até 30 dias);
  lista de sessões revogáveis no banco (over-engineering para o MVP single-user — adiável se
  surgir necessidade de "encerrar uma sessão específica" em vez de "todas").

## 2026-06-17 — D18: Ranking de contatos atribui o cachê por relação (não rateado)
- **Contexto:** o ranking de contatos (`/contatos/ranking`, `rankContactsByActivity` em
  `src/lib/contacts.ts`) ordena os contatos pela atividade que geram — shows vinculados e
  cachê acordado. Como a relação Contato↔Show é many-to-many (`ContactsOnShows`), um mesmo
  show pode estar vinculado a vários contatos, e era preciso decidir como o cachê do show
  conta para cada contato.
- **Decisão:** o cachê de um show é atribuído **integralmente a cada contato vinculado**
  (não é rateado/dividido entre eles). O ranking ordena por cachê total (shows não
  cancelados) desc, desempatando por nº de shows ativos, depois nome (pt-BR) e id. Shows
  `CANCELLED` não somam cachê nem contam como ativos/futuros, mas aparecem no total bruto de
  shows (coluna "ativos / total"). Só entram no ranking contatos com ao menos um show
  vinculado. Não há agregado de cachê somando todos os contatos (seria enganoso por causa da
  contagem múltipla); a página expõe `count` e `top`, e uma nota de rodapé explica o critério.
- **Justificativa:** a pergunta de negócio é "qual parceiro mais movimenta minha agenda?".
  Atribuir o cachê inteiro a cada contato responde isso por contato sem inventar um rateio
  arbitrário (dividir por nº de contatos distorceria casas que sempre trabalham com um
  produtor, por ex.). Mantém a métrica simples e a lógica pura/testável, reaproveitando o
  padrão de `rankShowsByProfit` (D15) e `summarizeContactShows` (exclusão de cancelados).
- **Alternativas consideradas:** ratear o cachê igualmente entre os contatos do show
  (descartado: rateio arbitrário, confunde mais do que ajuda no MVP); ranquear só por nº de
  shows (descartado: ignora o valor, que é o sinal mais útil); incluir contatos sem shows com
  zero (descartado: ruído — a tela é um ranking, não a lista completa, que já existe em
  `/contatos`).

## 2026-06-17 — D19: Rentabilidade por local agrupa por venue normalizado (fallback cidade)
- **Contexto:** já havia rentabilidade por show (`/shows/rentabilidade`, D15, P&L de cada gig
  isolado). Faltava a leitura agregada por **casa/venue** — "quais lugares valem a pena tocar?"
  —, somando todos os shows do mesmo local. O `venue` (e `city`) é texto livre e opcional, então
  era preciso decidir como agrupar grafias diferentes da mesma casa e o que fazer sem local.
- **Decisão:** `rankVenuesByProfit` (`src/lib/finance.ts`, pura/testada) agrupa por uma **chave
  normalizada** `normalizeText(venue)` (sem acento, minúsculo, trim) — assim "Bar do Zé" e
  "bar do zé" caem no mesmo grupo. Se `venue` for vazio, a chave **cai para a cidade**
  (`normalizeText(city)`); se ambos vazios, o grupo é "Sem local" (chave `""`). O **nome exibido**
  é a grafia original mais frequente do grupo (desempate pela 1ª ocorrência), preservando o que o
  usuário digitou. Soma o P&L via `computeShowPnL` (fonte única), **exclui `CANCELLED`** por
  padrão (mesmo critério de D15/D18) e ordena por resultado total desc (desempate por nº de shows,
  nome pt-BR, chave). A página `/shows/locais` é o ponto de entrada (botão "Por local" em Shows).
- **Justificativa:** a decisão de negócio "continuar tocando nesta casa?" é por local, não por
  gig. Normalizar acento/caixa junta os registros que o músico digitou de formas levemente
  diferentes sem exigir um cadastro de locais (over-engineering para o MVP, dados livres). O
  fallback para a cidade aproveita o dado mais grosseiro quando o local não foi preenchido, em
  vez de jogar tudo em "Sem local". Reusar `computeShowPnL`/`normalizeText` evita duplicar regra
  e mantém a lógica testável sem HTTP (posse garantida no servidor por `requireUser`). Sem novas
  dependências.
- **Alternativas consideradas:** um modelo `Venue` com FK nos shows (descartado: muito cadastro
  para o MVP de dados livres; dá para migrar depois se o agrupamento textual não bastar); agrupar
  só por cidade (descartado: perde o grão da casa, que é a unidade de decisão); ratear o cachê
  quando o show tem vários contatos (não se aplica — o cachê do show é do local, atribuído ao
  grupo do show, sem múltipla contagem como em D18); incluir cancelados (descartado: não
  representam rentabilidade real, alinhado a D15).

## 2026-06-17 — D20: Agenda de contas a pagar/receber por janelas de vencimento
- **Contexto:** já havia a projeção de caixa (`projectCashflow`, D13) — visão **mensal agregada**
  ("vou ter dinheiro nos próximos meses?") — e o resumo de pendências vencidas (`summarizeOverdue`,
  Sessão 16). Faltava a leitura **acionável do dia a dia**: a lista individual de cada conta
  pendente ordenada por vencimento, para responder "o que preciso cobrar/pagar agora?". A página
  de Finanças tem filtro por situação=pendente, mas mistura tudo numa lista única ordenada por data
  decrescente, sem separar o que já venceu do que vence em breve.
- **Decisão:** `buildDueAgenda` (`src/lib/finance.ts`, pura/testada) distribui as pendências
  (`received === false`) em **4 janelas fixas** comparando por dia (UTC): `overdue` (vencidas),
  `today` (hoje), `week` (próximos `weekHorizon` dias, padrão 7) e `later` (mais tarde). Cada
  janela traz os itens ordenados por vencimento crescente (com `daysUntil`), e os totais a
  receber/a pagar/saldo; o retorno também soma os totais gerais. A página `/financas/agenda`
  (`force-dynamic`) consulta só as pendências do usuário (`received: false`) e renderiza as janelas
  não vazias; o ponto de entrada é o botão "A pagar/receber" em Finanças, exibido quando há
  pendências. O `weekHorizon` é injetável (default 7) para teste e evolução.
- **Justificativa:** a decisão operacional do músico é "o que está atrasado e o que vence essa
  semana?", não um agregado mensal. Janelas fixas (vencidas/hoje/semana/depois) dão a triagem de
  urgência que a projeção mensal e a lista plana não dão, sem inventar configuração. Comparar por
  dia em UTC reaproveita a convenção já usada (`dayKey`/`pendingDueStatus`) e mantém a lógica
  determinística e testável sem HTTP. Reusa `toggleReceivedAction` (marcar pago/recebido direto da
  agenda) — que passou a revalidar `/financas/agenda`. Sem novas dependências.
- **Alternativas consideradas:** aging financeiro por faixas (0–30/31–60/61–90 dias, padrão de
  contas a receber — descartado: granularidade de cobrança corporativa, excessiva para o público
  do MVP); só reusar o filtro `status=pending` da página de Finanças (descartado: não separa
  urgência nem ordena por vencimento crescente); incluir realizadas como histórico (descartado: a
  tela é uma agenda de ação, não um extrato — o extrato já é a lista de Finanças).

## 2026-06-17 — D21: Contatos para reativar (follow-up de relações dormentes)
- **Contexto:** o CRM já respondia "quem mais movimenta minha agenda?" (`rankContactsByActivity`,
  D18) e "qual o histórico deste contato?" (`summarizeContactShows`, Sessão 20). Faltava a leitura
  **prospectiva**: "de quem eu já recebi shows, mas está parado — quem eu deveria contatar de novo
  pra fechar o próximo gig?". Para um músico autônomo, reaquecer uma relação que já rendeu cachê
  costuma ser mais barato que conquistar um contratante novo, mas é exatamente o que se esquece sem
  um lembrete.
- **Decisão:** `findContactsToReengage` (`src/lib/contacts.ts`, pura/testada) lista os contatos
  **dormentes**: tem ao menos um show **não cancelado no passado** (`date < now`), **nenhum** show
  não cancelado futuro (`date >= now`) e o último show foi há **`>= staleDays` dias** (padrão 60,
  injetável). Ordena pelos mais esquecidos primeiro (maior `daysSinceLastShow`), desempatando pelo
  maior cachê histórico acumulado (relações mais valiosas), depois nome (pt-BR) e id — estável e
  determinística. A página `/contatos/reativar` (`force-dynamic`) consulta os contatos do usuário
  com seus shows numa leitura, renderiza a tabela e oferece um atalho de
  contato (mailto/tel) por linha. Ponto de entrada: botão "Reativar" no cabeçalho de Contatos.
- **Justificativa:** os critérios codificam a intuição de prospecção — só interessa quem **já
  trabalhou** comigo (histórico real, não um lead frio), **não tem nada marcado** (se já há show
  futuro, a relação está ativa) e **esfriou** (passou o limite de dias). Reaproveita os tipos
  genéricos `ContactWithShows`/`ContactRankLike` do ranking e a convenção de dia UTC
  (`daysSinceLastShow` por diferença de meia-noite UTC, como `dayKey`), mantendo a lógica testável
  sem banco/HTTP. `staleDays=60` é uma **hipótese** de ciclo de recontato — fixa no MVP, injetável
  para virar preferência depois.
- **Alternativas consideradas:** filtro de "inativos" embutido na lista de Contatos (descartado:
  mistura prospecção com a busca/edição do dia a dia; a tabela dedicada prioriza por urgência);
  incluir contatos **sem nenhum show** como "nunca contatados" (descartado: vira lista de leads,
  outro fluxo — aqui o valor é o histórico de cachê comprovado); ordenar primeiro por cachê
  (descartado: o eixo da tela é "há quanto tempo sumiu"; o cachê entra como desempate). Marcar
  "contato feito" para sair da lista exigiria um campo `lastContactedAt` no modelo — adiado por
  ser mudança de schema + CRUD; hoje a saída natural é agendar um novo show.

## D22 — Receita agendada: pipeline de cachês a partir da agenda de shows (Sessão 31)
- **Contexto:** o app já tinha visões financeiras de competência/realizado (P&L por show,
  resumo mensal/anual, projeção de caixa pelas pendências). Faltava responder, do ponto de vista
  da **agenda**, "quanto já tenho contratado para faturar nos próximos meses?" — o pipeline de
  cachês dos shows ainda por acontecer, separando o que está garantido do que ainda é proposta.
- **Decisão:** `forecastBookedRevenue(shows, { now? })` (em `src/lib/finance.ts`, pura) considera
  os shows com dia `>= hoje` (UTC, mesma convenção de `dayKey`), **exclui `CANCELLED`**, e soma o
  cachê (`fee`) por mês de realização. Cada mês separa `confirmed` (status CONFIRMED/PLAYED) de
  `tentative` (PROPOSED ou status ausente), mantendo a invariante `total = confirmed + tentative`.
  Só meses com shows aparecem (lista esparsa, ordem crescente). A página `/shows/receita-agendada`
  (`force-dynamic`) lê só os shows futuros do usuário (`date >= hoje`) e renderiza resumo + tabela
  mês a mês. Ponto de entrada: botão "Receita agendada" no cabeçalho de Shows.
- **Justificativa:** a fonte é a **agenda** (cachê acordado do show), não os lançamentos
  financeiros — por isso é distinto de `projectCashflow` (que parte das transações pendentes) e
  não os mistura. O corte por status confirmado/proposto codifica a diferença entre receita
  contratada e pipeline incerto, decisão central para o planejamento do músico. Lista esparsa de
  meses (sem horizonte fixo) evita uma escolha arbitrária de "próximos N meses" e acomoda tanto
  bookings próximos quanto um festival distante. Cachê bruto (sem extras/despesas) mantém a tela
  focada no "quanto entra contratado"; o resultado líquido já é coberto por `/shows/rentabilidade`.
- **Alternativas consideradas:** horizonte fixo de N meses com zeros (descartado: arbitrário e
  esconde bookings além do horizonte; a lista esparsa é mais fiel); somar à projeção de caixa
  existente (descartado: dupla contagem com pendências financeiras e mistura duas fontes de
  verdade); usar net (P&L) em vez do cachê bruto (descartado: extras/despesas de shows futuros
  raramente estão lançadas, distorceriam a projeção — o eixo aqui é receita contratada).

## D23 — Persistir o último filtro das Finanças via middleware + cookie (Sessão 32)
- **Contexto:** a página `/financas` filtra por query string (GET). Ao sair e voltar pelo menu,
  o usuário perdia o recorte e tinha de refiltrar. Queríamos lembrar o último filtro entre
  navegações/sessões. Restrição técnica: no App Router, `cookies().set()` não pode ser chamado
  durante o render de um Server Component (só em Server Action, Route Handler ou middleware).
- **Decisão:** um **middleware** com `matcher: ["/financas"]` decide persistir/restaurar. A
  lógica de decisão é uma **função pura testada** (`decideFinancasFilter` em
  `src/lib/financasFilter.ts`) com quatro casos: `reset` (link "Limpar" → `?reset=1` apaga o
  cookie), `persist` (URL com qualquer chave de filtro → grava o recorte canônico, ou apaga se
  vazio), `restore` (visita sem chaves + cookie salvo → redireciona para `/financas?<filtro>`),
  `pass`. O cookie guarda só as chaves conhecidas e não-vazias, em ordem estável
  (`canonicalFilterQuery`), evitando lixo e loops (a URL restaurada já tem chaves → vira persist,
  não restaura de novo). Cookie httpOnly, SameSite=Lax, 180 dias.
- **Justificativa:** o middleware é o único ponto pré-render onde dá para ler a URL **e** gravar
  cookie **e** redirecionar, fechando o ciclo sem tocar em cada Server Action. Manter a decisão
  como função pura preserva o padrão do projeto (lógica de negócio testável fora do framework) e
  cobre os casos de borda (reset, recorte vazio, ausência de loop) com testes unitários baratos.
- **Path do cookie = `/`:** o `cookies.delete` do `NextResponse` sempre emite `Path=/` (ignora
  options de path nesta versão do Next), e `set(..., maxAge: 0)` é tratado como deleção e também
  força `Path=/`. Um cookie gravado em `Path=/financas` não casaria com essa deleção (o browser
  distingue cookies por nome+path), então "Limpar" não o apagaria. Para `set` e `delete` casarem,
  ambos usam `Path=/`. O escopo amplo é inócuo: o cookie só é **lido** pelo middleware em
  `/financas`; o custo é alguns bytes a mais nas demais requisições.
- **Alternativas consideradas:** `localStorage` + JS no cliente (descartado: exigiria componente
  client e re-navegação no `useEffect`, com flash de conteúdo sem filtro; o cookie+middleware
  resolve no servidor, sem flicker); gravar o cookie numa Server Action a cada filtro (descartado:
  o filtro é um GET via `<form method="get">`, não uma action — middleware é o encaixe natural);
  redirecionar a partir do próprio Server Component (descartado: não pode gravar cookie no render);
  cookie em `Path=/financas` (descartado: deleção não casaria — ver acima).

## D24 — Generalizar a persistência de filtro para Shows e Contatos (Sessão 33)
- **Contexto:** a D23 entregou a persistência do filtro só para `/financas`. As listas de
  `/shows` (busca + status + intervalo de datas) e `/contatos` (busca + tipo) filtram do mesmo
  jeito (query string via `<form method="get">`) e sofriam o mesmo atrito: sair e voltar pelo
  menu perdia o recorte. Queríamos o mesmo comportamento sem duplicar a lógica nem o middleware.
- **Decisão:** extrair a lógica pura da D23 para um módulo **genérico** `src/lib/listFilter.ts`
  (`canonicalQuery`/`hasAnyFilterParam`/`decideListFilter`), parametrizado pelo conjunto de chaves
  de cada lista. Um **registro** `LIST_FILTER_CONFIGS` declara `{ path, cookie, keys }` para as três
  listas (`/financas`, `/shows`, `/contatos`), cada uma com cookie próprio. O middleware passa a
  casar a rota exata da requisição contra esse registro (`matcher: ["/financas","/shows","/contatos"]`)
  e aplicar a mesma tradução decisão→HTTP. `src/lib/financasFilter.ts` vira uma fachada fina que
  delega ao genérico, preservando sua API e os 13 testes existentes. Os links "Limpar" de Shows e
  Contatos passaram a apontar para `?reset=1` (como já fazia Finanças), senão o cookie salvo os
  re-restauraria.
- **Justificativa:** o comportamento (persist/restore/reset/pass, canonização, ausência de loop,
  Path=/ do cookie) é idêntico entre as listas; uma única implementação genérica testada evita
  três cópias divergentes e um middleware com ramos repetidos. O registro declarativo torna trivial
  adicionar uma quarta lista no futuro (basta uma entrada + a rota no matcher).
- **Cookies separados por lista:** cada lista guarda seu recorte num cookie distinto
  (`financas_filtro`/`shows_filtro`/`contatos_filtro`), pois as chaves não se sobrepõem por completo
  (ex.: `status` existe em Finanças e Shows com domínios diferentes; `papel` só em Contatos). A
  sanitização (`canonicalQuery` filtra pelas `keys` da lista) já descartaria chaves estranhas, mas
  cookies separados deixam o escopo explícito e evitam vazamento de um filtro entre listas.
- **Alternativas consideradas:** um único cookie compartilhado com todas as chaves (descartado:
  acoplaria as listas e exigiria namespacing das chaves); manter três módulos copiados (descartado:
  duplicação da lógica de borda da D23); um middleware por rota (descartado: o `matcher` já roteia,
  e o registro centraliza a config). O `matcher` do middleware deve ser mantido em sincronia com os
  `path` de `LIST_FILTER_CONFIGS` (anotado em ambos os arquivos).

## D25 — Cachês a receber: reconciliar a agenda (cachê do show) com as finanças (Sessão 34)
- **Contexto:** o app já projeta receita futura (`forecastBookedRevenue`, D22) e lista pendências
  financeiras (`buildDueAgenda`/`summarizeOverdue`), mas faltava o elo que pega o dinheiro
  esquecido: o gig que **já aconteceu** e cujo cachê nunca entrou no caixa — seja porque a
  receita nunca foi lançada, seja porque foi lançada mas segue pendente. Esse é o atrito real do
  músico ("toquei, e cadê o pagamento?"), e nenhum relatório existente o respondia, porque o cachê
  acordado vive no `Show.fee` (agenda) e o recebimento vive nas `Transaction` (finanças).
- **Decisão:** uma função pura `reconcileShowFees(shows, txs, { now })` em `src/lib/finance.ts`
  cruza as duas fontes. Para cada show que **já aconteceu** ela calcula `outstanding =
  max(0, fee − collected)`, onde `collected` é a soma das receitas (INCOME) vinculadas ao show e
  **já recebidas** (`received=true`). Lista só os shows com `outstanding > 0`, do gig mais antigo
  ao mais recente. Página `/shows/a-receber` (cards Total a receber / Shows pendentes / Já recebido
  + tabela com link do show) e um alerta âmbar no Painel quando há saldo. Link "A receber" no
  cabeçalho de Shows.
- **"Já aconteceu" (`isHappenedGig`):** conta como realizado o show `PLAYED` **ou** `CONFIRMED`
  com data já passada (UTC) — porque o usuário frequentemente esquece de virar o status para
  Realizado depois do show. `PROPOSED` e `CANCELLED` ficam de fora (não geram cobrança).
- **Só `received=true` abate o saldo:** uma receita lançada mas ainda pendente (`received=false`)
  **não** reduz o `outstanding` (ela própria é uma conta a receber); o valor pendente é exposto
  à parte (`registeredPending`) só para informar a UI ("X pendente"). Assim o saldo a receber
  reflete caixa de fato, coerente com `cashBalance`. Shows com `fee <= 0` são ignorados.
- **Justificativa:** mantém a regra de negócio pura e testável (8 testes cobrindo abatimento por
  recebido, exclusão do futuro/proposto/cancelado, sem cachê, isolamento por `showId`, despesa não
  abate, clamp em zero, ordenação) e reaproveita o vínculo `Transaction.showId` já existente — sem
  mudança de schema.
- **Alternativas consideradas:** (a) marcar o próprio `Show` como "pago" com um booleano dedicado
  — descartado: duplicaria a verdade que já está nas transações e exigiria migração + UI de
  marcação; (b) considerar qualquer receita lançada (recebida ou não) como quitação — descartado:
  confundiria "faturado" com "recebido" e esconderia atrasos; (c) só `PLAYED` — descartado por
  perder os confirmados-passados que o usuário esqueceu de atualizar (o caso mais perigoso).

## D26 — Quitar o cachê inline a partir de "Cachês a receber" (Sessão 35)
- **Contexto:** a Sessão 34 (D25) entregou a lista `/shows/a-receber` que mostra o dinheiro
  esquecido (gig já realizado cujo cachê não entrou no caixa), mas para registrar o recebimento
  o usuário tinha de sair para as Finanças, criar uma receita, vinculá-la ao show e marcá-la como
  recebida — quatro passos para a ação mais comum da própria tela. O atrito anulava metade do valor
  da página.
- **Decisão:** um botão **Quitar** por linha que dispara `settleShowFeeAction(formData)` (server
  action em `src/app/(app)/shows/actions.ts`). A ação **recalcula o saldo no servidor** (cachê do
  show − soma das receitas INCOME já `received=true` vinculadas, via `prisma.transaction.aggregate`)
  e cria **uma** receita recebida (`type=INCOME`, `received=true`, `category="Cachê"`,
  `description="Cachê — {título}"`, `date=now`, `showId`) no valor em aberto. Reaproveita o
  componente `DeleteButton` (confirmação em duas etapas, sem diálogo bloqueante) — generalizado com
  uma prop `groupLabel` para corrigir o `aria-label` do grupo (era fixo em "Confirmar exclusão").
- **Saldo recalculado no servidor, nunca vindo do cliente:** o valor a lançar é derivado do banco
  no momento do clique, não de um campo do formulário. Isso torna a ação **idempotente** (se o show
  já foi quitado entre o carregamento da página e o clique — ou em duplo-clique — `outstanding <= 0`
  e nada é criado) e fecha o vetor de um cliente forjar o valor. Espelha exatamente a regra pura de
  `reconcileShowFees` (D25): só recebido abate; pendente não; `fee <= 0` é ignorado; posse do show
  é exigida (`findFirst` por `userId`).
- **Justificativa:** transforma a página de relatório em ferramenta de ação com um clique, sem
  duplicar a verdade financeira (continua tudo em `Transaction`, sem flag "pago" no `Show` — ver a
  alternativa (a) rejeitada na D25) e sem mudança de schema. Cobertura: 6 testes de integração em
  `shows/actions.test.ts` (saldo total, recebimento parcial, idempotência quando já quitado,
  pendente não abate, isolamento por usuário, `fee=0` no-op).
- **Alternativas consideradas:** (a) um formulário inline com campo de valor editável — descartado:
  o caso esmagador é "recebi o cachê combinado, inteiro"; um campo abre espaço para erro e para o
  vetor de valor forjado; lançar parcial continua possível pelas Finanças. (b) confiar no
  `outstanding` já calculado e renderizado na linha — descartado: dado obsoleto/forjável; o recálculo
  no servidor é barato (um `aggregate`) e correto. (c) marcar como recebida uma receita pendente
  existente em vez de criar nova — descartado: nem sempre existe pendente lançada (o caso
  `unregistered`), e criar a receita unifica os dois fluxos num só caminho.

## D27 — Atalho de cobrança (e-mail/WhatsApp) a partir de "Cachês a receber" (Sessão 36)
- **Contexto:** a página `/shows/a-receber` (D25) já aponta os cachês esquecidos e permite
  **Quitar** o recebimento (D26), mas o passo que antecede o recebimento — **cobrar** o
  contratante/casa — continuava manual: o usuário tinha de abrir o app de e-mail/WhatsApp,
  achar o contato, lembrar a data/valor do show e redigir a mensagem do zero. É justamente o
  trabalho chato que faz o cachê ficar "na mesa".
- **Decisão:** um módulo **puro** `src/lib/billing.ts` monta a cobrança e os atalhos prontos
  (`buildShowBilling` → `{ contact, subject, body, mailtoUrl, whatsappUrl }`). A página passa
  a carregar os contatos vinculados ao show (`contacts.include.contact`) e renderiza, por
  linha, os botões **✉ E-mail** (link `mailto:` com assunto/corpo) e **WhatsApp** (link
  `https://wa.me/<telefone>?text=...`), exibidos só quando há canal disponível.
- **Escolha do contato (`pickBillingContact`):** entre os contatos vinculados ao show, só os
  que têm e-mail **ou** telefone; prioriza pelo papel que costuma pagar primeiro
  (BOOKER → PROMOTER → VENUE → PRODUCER → OTHER → PRESS), desempatando por nome (pt-BR) e id
  para ser determinístico. Sem contato alcançável → nenhum botão (a nota de rodapé orienta a
  vincular um contato).
- **Telefone (`normalizeWhatsappPhone`):** heurística pt-BR (foco LATAM, ver business-plan.md)
  — número local de 10–11 dígitos (DDD + assinante) ganha o DDI **55**; número que já começa
  com 55 e tem 12–13 dígitos é mantido; demais comprimentos (≥ 8 dígitos) são usados como
  vieram, assumindo DDI próprio; < 8 dígitos → sem link. O WhatsApp recebe só o **corpo** da
  mensagem (não tem campo de assunto); o e-mail recebe assunto + corpo.
- **Justificativa:** fecha o ciclo "ver o que falta → cobrar → quitar" na mesma tela, sem
  backend novo (nenhum envio server-side: os links abrem o cliente nativo do usuário, que
  preserva sua identidade/assinatura e evita custo/risco de e-mail transacional no MVP). Toda
  a lógica difícil (escolha de contato, redação, normalização de telefone, encoding de URL) é
  pura e coberta por **20 testes** em `src/lib/billing.test.ts`.
- **Alternativas consideradas:** (a) enviar o e-mail pelo servidor (SMTP/serviço) — descartado
  no MVP: exige provedor, segredos e tratamento de bounce/spam; o `mailto:`/`wa.me` resolve com
  zero infra e mantém a mensagem sob controle do usuário. (b) deixar o usuário escolher o
  contato a cobrar — adiado: a prioridade por papel acerta o caso comum (um contratante por
  show); um seletor é polimento futuro. (c) link de WhatsApp via `api.whatsapp.com` — `wa.me`
  é o encurtador oficial e mais curto, equivalente em comportamento.

## D28 — Quitar valor PARCIAL do cachê a partir de "Cachês a receber" (Sessão 37)
- **Contexto:** o botão **Quitar** (D26) lançava sempre o saldo **inteiro** em aberto. Mas
  cachê de gig com frequência entra em partes (sinal + saldo, ou parcelas), e nesses casos o
  usuário só podia registrar o recebimento parcial saindo para as Finanças — exatamente o
  atrito que a D26 queria eliminar. A alternativa (a) da D26 (campo de valor editável) havia
  sido adiada por priorizar o caso "recebi tudo"; com o fluxo de quitação já consolidado e
  testado, vale agora cobrir o recebimento parcial sem reintroduzir o risco que motivou a recusa.
- **Decisão:** `settleShowFeeAction` passou a aceitar um campo **opcional** `amount` (string em
  reais pt-BR). Vazio/ausente → quita o saldo inteiro (comportamento idêntico ao da D26, para
  não quebrar nada); informado → o servidor valida e **limita** o valor ao saldo recalculado
  via o helper **puro** `resolveSettlementAmount(outstanding, requested)` em `src/lib/finance.ts`.
  A UI virou um componente client dedicado `src/components/SettleFeeButton.tsx`: o clique em
  **Quitar** abre, na própria linha, um campo de valor (reaproveita `MoneyInput`) já preenchido
  com o saldo em aberto e editável + **Lançar/Cancelar**. Lançar o valor cheio quita; lançar
  menos deixa o restante na lista (a página é `force-dynamic`, então recalcula no próximo render).
- **A verdade do saldo continua no servidor (mantém a D26):** o `amount` do formulário é só uma
  conveniência da UI. O servidor recalcula `outstanding` do banco e aplica
  `resolveSettlementAmount`, que faz **clamp** em `[0, outstanding]` — um cliente não consegue
  sobre-lançar (forjar valor maior que o saldo), e `amount` inválido/zerado cai no caso "quita
  tudo" ou vira no-op. Isso responde diretamente à objeção da D26-(a): o campo editável **não**
  abre vetor de valor forjado porque o limite superior é imposto no servidor.
- **Justificativa:** completa o fluxo "ver → cobrar → quitar" para o caso de pagamento em partes
  sem nova dependência nem mudança de schema (continua tudo em `Transaction`). A lógica de decisão
  é pura e isolada (`resolveSettlementAmount`), coberta por **6 testes** em `finance.test.ts`
  (sem valor → tudo; inválido/≤0 → tudo; parcial; clamp ao saldo; saldo 0 → 0; arredondamento) +
  **3 testes de integração** em `shows/actions.test.ts` (parcial real, clamp, vazio = saldo cheio).
- **Alternativas consideradas:** (a) manter só a quitação total e mandar o usuário às Finanças
  para parcial — descartado: é o atrito que a D26 atacou. (b) reaproveitar o `DeleteButton`
  (confirmação em duas etapas, sem campo) — não comporta entrada de valor; um componente próprio
  com `MoneyInput` é mais claro e mantém o `DeleteButton` focado em exclusão. (c) validar/limitar o
  valor só no cliente — descartado pela mesma razão da D26: dado do cliente é forjável; o clamp
  tem de estar no servidor.

## D29 — Registrar a data REAL do recebimento ao quitar um cachê (Sessão 38)
- **Contexto:** desde a D26/D28 o botão **Quitar** em `/shows/a-receber` cria a receita do cachê
  sempre com `date: new Date()` — ou seja, o caixa entrava no mês em que o usuário *clicou*, não no
  mês em que o dinheiro de fato caiu. Como a data da transação é o que alimenta `monthKey` (e logo a
  **projeção de caixa**, o **relatório mensal** e o **resumo anual**), lançar com atraso jogava a
  receita no mês errado, distorcendo justamente os relatórios financeiros que são o valor do produto.
- **Decisão:** `settleShowFeeAction` passou a aceitar um campo **opcional** `receivedAt` (string de
  dia `YYYY-MM-DD`, de um `<input type="date">`). A decisão de qual data usar virou o helper **puro**
  `resolveReceivedDate(raw, now)` em `src/lib/finance.ts`: vazio/inválido → `now` (comportamento
  histórico, sem quebrar a D26); data válida no passado/hoje → **meia-noite UTC daquele dia**
  (consistente com `dayKey`/`monthKey`, que keyam por UTC em todo o app); data no **futuro** → `now`
  (não se recebe dinheiro no futuro — mantém a projeção de caixa sã). O `SettleFeeButton` ganhou o
  campo de data (default = hoje, calculado no **servidor** via `dayKey(new Date())` e passado como
  prop `today` para evitar mismatch de hidratação; `max={today}` impede escolher futuro na própria UI).
- **A validação fica no servidor (mantém a D26/D28):** o `receivedAt` do formulário é conveniência da
  UI; `resolveReceivedDate` re-valida o formato e **rejeita futuro** independentemente do `max` do
  input — um cliente não consegue forjar uma data de recebimento no futuro.
- **Justificativa:** completa o fluxo "ver → cobrar → quitar" com fidelidade contábil (a receita cai
  no mês certo) sem nova dependência nem mudança de schema (continua tudo em `Transaction.date`). A
  lógica é pura e isolada, coberta por **4 testes** em `finance.test.ts` (vazio/nulo/inválido → now;
  passado → meia-noite UTC + mês certo; hoje aceito; futuro → now) + **2 testes de integração** em
  `shows/actions.test.ts` (data informada gravada; futura cai para o momento atual).
- **Alternativas consideradas:** (a) manter `new Date()` e mandar o usuário corrigir a data nas
  Finanças — descartado: é o atrito que a D26 atacou. (b) adicionar uma coluna `receivedAt` separada
  no schema — desnecessário: `Transaction.date` já É a data do caixa para receitas recebidas;
  duplicar abriria divergência. (c) parsear a data no fuso local do navegador — descartado: o app
  inteiro keya por UTC (`dayKey`/`monthKey`); misturar fusos quebraria a estabilidade dos relatórios.

## D30 — Seletor de qual contato cobrar em "Cachês a receber" (Sessão 39)
- **Contexto:** desde a D27 (Sessão 36) os atalhos de cobrança (✉ E-mail / WhatsApp) em
  `/shows/a-receber` cobram sempre UM contato — o de maior prioridade de papel
  (`pickBillingContact`: BOOKER→PROMOTER→VENUE→…). Mas um show pode ter vários contatos
  alcançáveis vinculados (ex.: contratante E casa), e nem sempre quem paga é o do papel mais
  alto. O usuário não tinha como cobrar outro contato sem sair da página.
- **Decisão:** a lógica pura de `billing.ts` passou a expor **todos** os contatos alcançáveis,
  não só o escolhido. Extraído o comparador `compareBillingContacts` (papel→nome pt-BR→id) e a
  nova `reachableBillingContacts(contacts)` (lista ordenada por prioridade); `pickBillingContact`
  virou `reachableBillingContacts(...)[0] ?? null` (DRY). Nova `buildShowBillings(show, contacts,
  opts)` → `ShowBilling[]` (uma cobrança montada por contato alcançável, na mesma ordem; o
  primeiro é a escolha automática). `buildShowBilling` (singular) preservado como
  `buildShowBillings(...)[0] ?? null` — API e testes antigos intactos. O novo componente client
  `src/components/BillingActions.tsx` recebe a lista pronta do servidor e, quando há **mais de um**
  contato, antepõe um `<select>` "quem cobrar" (escolha automática pré-selecionada); com um só,
  mostra direto os botões — comportamento idêntico ao anterior. Tudo (assunto/corpo/links) já vem
  montado do servidor; o cliente só alterna o índice (sem recálculo nem segredo no cliente).
- **Justificativa:** dá controle ao usuário sobre quem cobrar sem nova dependência, mudança de
  schema ou server action. A lógica é pura e isolada, coberta por testes (ordem de prioridade,
  exclusão de não-alcançáveis, lista vazia, mensagem personalizada por contato, equivalência
  `buildShowBilling` = primeiro de `buildShowBillings`) — **5 testes** novos em `billing.test.ts`
  (20→25).
- **Alternativas consideradas:** (a) manter a escolha automática única — descartado: não cobre o
  caso real de mais de um pagador possível. (b) recalcular a mensagem no cliente ao trocar de
  contato — desnecessário e arriscado (duplicaria a redação pt-BR); montar tudo no servidor e só
  alternar é mais simples e determinístico. (c) um seletor de papel/prioridade configurável —
  exagero para o MVP; a ordem por papel continua sendo o default sensato.

## D31 — Aging dos cachês a receber (Sessão 40)
- **Contexto:** desde a D25 (Sessão 34) `/shows/a-receber` lista os cachês em aberto ordenados do
  show mais antigo ao mais recente, mas só com o valor em aberto por linha e os totais agregados.
  Faltava a leitura clássica de cobrança: **quanto** do dinheiro está parado **há quanto tempo** —
  o sinal que diz onde concentrar o esforço de cobrança (o recebível velho tende a virar perda).
- **Decisão:** nova função pura `bucketReceivablesByAge(reconcileShowFees(...))` em `finance.ts`
  que agrupa os recebíveis por idade do atraso (dias UTC desde a data do show, nunca negativo) em
  quatro baldes fixos — até 30 / 31–60 / 61–90 / mais de 90 dias (`receivableAgeBucket` +
  `RECEIVABLE_AGE_BUCKET_ORDER`/`LABELS`). Cada balde traz total, contagem e participação (`share`)
  no total a receber; o agregado expõe `weightedAvgDays` (atraso médio ponderado pelo valor em
  aberto — destaca onde está o dinheiro grande e velho) e `maxDaysOutstanding` (pior caso). A
  página ganhou um card de aging (4 baldes, com os ≥61 dias destacados em vermelho/âmbar) e um
  selo "há N dias" por linha. Nada de schema, dependência ou server action novos — apenas leitura
  derivada do que `reconcileShowFees` já produz.
- **Justificativa:** transforma a lista plana num instrumento de priorização de cobrança com
  custo marginal mínimo (reaproveita `ShowReceivables`). Lógica pura e isolada, coberta por
  **8 testes** novos em `finance.test.ts` (classificação por balde, fronteiras 30/60/90, baldes
  sempre presentes mesmo vazios, share, ordenação intra-balde, média ponderada, pior caso, atraso
  nunca negativo).
- **Alternativas consideradas:** (a) datar o atraso pela data de vencimento de uma transação
  pendente em vez da data do show — descartado: o caso central é o cachê **sem** receita lançada
  (`unregistered`), que não tem transação; a data do show é o marco objetivo de quando o dinheiro
  deveria ter entrado. (b) baldes configuráveis pelo usuário — exagero para o MVP; 30/60/90 é a
  convenção de aging de contas a receber. (c) página dedicada `/shows/a-receber/aging` — preferi
  integrar na própria lista para manter o fluxo "ver → priorizar → cobrar → quitar" num só lugar.

## D32 — Aging dos recebíveis no Painel: destacar o que está parado há +90 dias (Sessão 41)
- **Contexto:** a Sessão 40 (D31) entregou o aging dos cachês a receber dentro de `/shows/a-receber`
  (card com 4 baldes por idade do atraso). Mas o sinal mais crítico — dinheiro **encalhado** há muito
  tempo, que tende a virar perda — só aparecia depois de o usuário abrir aquela página. O Painel já
  tinha um alerta âmbar "🎤 Cachês a receber" (Sessão 34) com o total agregado, sem distinguir o
  recebível novo do velho. Queríamos que o recebível velho saltasse aos olhos já na primeira tela.
- **Decisão:** o Painel passou a chamar `bucketReceivablesByAge(receivables)` (a mesma lógica pura
  testada da D31) e a destacar o **balde "older"** — recebíveis parados **há mais de 90 dias**.
  Quando esse balde tem itens, o alerta de cachês a receber **escala de âmbar para vermelho** e
  ganha um segmento "🚨 R$ X parado há mais de 90 dias (N)". Sem stale, o banner segue âmbar (igual
  ao anterior). Nenhuma mudança de schema, dependência ou server action.
- **Por que >90 dias (balde "older") e não ≥61 dias:** 90 dias é a fronteira clássica de "conta a
  receber em risco" no aging contábil; é o ponto em que vale interromper o usuário no Painel. Os
  baldes 31–60 / 61–90 continuam visíveis no card detalhado de `/shows/a-receber` (D31) para a
  priorização fina; o Painel mostra só o sinal de urgência máxima para não poluir.
- **Por que escalar o banner existente em vez de um segundo alerta:** o assunto é o mesmo
  ("cachês a receber") e o destino do clique é o mesmo (`/shows/a-receber`); um segundo banner
  separado duplicaria a chamada para ação e competiria por atenção com o de "Pendências vencidas".
  Escalar a cor + acrescentar um segmento mantém um único ponto de entrada, mais legível.
- **Sem novos testes unitários:** a regra de negócio (classificação por idade, total do balde) já é
  pura e coberta por `bucketReceivablesByAge` (8 testes, D31); esta sessão é só apresentação. A
  verificação foi por build + typecheck + lint + suíte completa + smoke (mesmo critério das demais
  mudanças de UI — ver Sessão 8).
- **Alternativas consideradas:** (a) um segundo banner vermelho dedicado a ≥90 dias — descartado
  (duplicaria CTA/destino, ver acima); (b) trazer os 4 baldes inteiros para o Painel — descartado
  (excesso de informação na visão de resumo; o detalhe é o papel de `/shows/a-receber`); (c) usar
  ≥61 dias como gatilho — descartado (90 dias é o limiar de risco real; 61–90 ainda é cobrança de
  rotina).

## D33 — Comparativo mês a mês no Relatório mensal (Sessão 42)
- **Contexto:** o Relatório mensal (`/financas/relatorio`, D14) mostrava os números do mês isolados
  (receitas, despesas, saldo, caixa), sem responder à pergunta de gestão mais imediata do músico:
  "estou indo melhor ou pior que o mês passado?". O usuário tinha de navegar ←/→ e comparar de
  cabeça.
- **Decisão:** adicionar à `src/lib/finance.ts` duas funções puras — `computeDelta(current,
  previous)` (variação de uma métrica: `delta` absoluto, `pct` relativo, `direction` up/down/flat) e
  `compareSummaries(current, previous)` (aplica `computeDelta` às quatro métricas de
  `FinanceSummary`: receitas, despesas, saldo de competência e caixa realizado). A página computa o
  resumo do mês anterior reaproveitando `filterTransactions({ month: prevKey })` +
  `summarizeFinances` (mesma fonte de verdade do mês corrente) e renderiza, sob cada card de número,
  uma linha "▲/▼ R$ X (Y%)".
- **Semântica de cor (bom/ruim) na UI, não na lógica:** `computeDelta.direction` é puramente o sinal
  do delta. Quem renderiza decide o que é bom: receitas/saldo/caixa subindo = verde; despesas
  subindo = vermelho (`upIsGood` por card). Mantém a lógica pura neutra e testável sem assumir
  domínio.
- **`pct = null` quando a base anterior é 0:** não há porcentagem a partir de zero; a UI mostra
  "novo" no lugar do percentual (ex.: primeira receita de uma categoria nova). Base anterior
  negativa usa `|previous|` no denominador (saldo de competência pode ser negativo).
- **Comparativo só aparece quando o mês anterior tem transações** (`hasPrevData`): comparar contra
  um mês vazio produziria "novo/—" em tudo, sem valor; melhor omitir e manter a tela limpa.
- **Sem schema, sem dependência, sem server action:** é leitura/derivação sobre dados já carregados;
  uma consulta a mais ao banco não é feita (filtra-se o mesmo conjunto já em memória).
- **Testes:** 8 testes unitários novos (`computeDelta`: subida, queda, flat, base zero→null, base
  negativa, preserva current/previous; `compareSummaries`: quatro métricas e base zerada). Total do
  projeto 358→366.
- **Alternativas consideradas:** (a) comparar contra a média dos últimos N meses — descartado por
  ora (mês-a-mês é o comparativo que o usuário tem em mente ao abrir o relatório; média móvel pode
  vir depois sobre a mesma `computeDelta`); (b) sparkline/tendência — fora do escopo desta sessão
  (cabe no resumo anual, D16); (c) embutir a cor "bom/ruim" no `direction` da lógica — descartado
  (acoplaria semântica de domínio à função pura).

## D34 — Comparativo ano a ano (YoY) no Resumo anual (Sessão 43)
- **Contexto:** o Resumo anual (`/financas/anual`, D16) mostrava os 12 meses, totais e melhor/pior
  mês de um ano isolado. Faltava a pergunta seguinte de planejamento: "estou melhor que no ano
  passado?". O comparativo mês a mês já existia no Relatório mensal (D33), com a base pura
  `computeDelta`/`MetricDelta` pronta para reúso em outro nível de agregação.
- **Decisão:** adicionar a função pura `compareAnnualSummaries(current, previous)` em
  `src/lib/finance.ts`, que aplica `computeDelta` aos três totais do ano (receitas, despesas,
  resultado) e a cada mês casado por `monthIndex` ao mesmo mês do ano anterior (`AnnualComparison`
  + `AnnualMonthComparison`). A página `/financas/anual` computa `annualSummary(allTxs, year-1)`
  sobre o **mesmo** conjunto já carregado (sem consulta extra ao banco) e renderiza: linha
  "▲/▼ R$ X (Y%)" sob cada card de total e um selo compacto "▲/▼ Y%" na coluna Resultado do mês a
  mês (só quando aquele mês teve movimento no ano anterior).
- **Semântica de cor reaproveitada de D33:** `direction` é só o sinal; a UI decide bom/ruim via
  `upIsGood` (receitas/resultado subindo = verde; despesas subindo = vermelho). `pct = null` →
  "novo". O comparativo só aparece quando o ano anterior tem transações (`prevHasActivity`); contra
  ano vazio seria "novo" em tudo, sem valor.
- **Sem schema, sem dependência, sem server action:** leitura/derivação sobre dados em memória.
- **Testes:** 3 testes unitários novos (`compareAnnualSummaries`: totais YoY + pct, casamento por
  mês com flat em mês sem movimento, base zerada→pct null). Total do projeto 366→369.
- **Alternativas consideradas:** (a) comparativo de todos os meses lado a lado (tabela 24 colunas) —
  descartado por poluição visual; o selo por mês + os totais cobrem a leitura rápida; (b) gráfico de
  duas séries (este ano vs anterior) — fora do escopo desta sessão, cabe sobre a mesma
  `compareAnnualSummaries` depois.

## D35 — Comparativo com a média móvel no Relatório mensal (Sessão 44)
- **Contexto:** o Relatório mensal (`/financas/relatorio`) já comparava o mês corrente ao mês
  imediatamente anterior (D33). Mas o mês anterior pode ser atípico (um show grande, um mês parado),
  produzindo uma leitura enganosa de "melhor/pior". A própria D33 antecipou o reúso de `computeDelta`
  para comparar contra a **média dos últimos N meses** — a tendência, que suaviza o ruído de um único mês.
- **Decisão:** adicionar a função pura `averageSummaries(summaries: FinanceSummary[])` em
  `src/lib/finance.ts`, que faz a média **campo a campo** de uma lista de `FinanceSummary` (o "mês
  típico"). A página computa os resumos dos últimos 3 meses (janela `AVERAGE_WINDOW`), descarta os
  sem movimento, e compara o mês corrente contra a média deles via o já existente `compareSummaries`.
  Cada card de número passa a exibir DUAS linhas de delta rotuladas: "vs. mês ant." (D33) e
  "vs. média".
- **Denominador = meses ativos, exige ≥2:** a média divide só pelos meses **com transações** na
  janela (não dilui com meses vazios de um histórico curto). O bloco "vs. média" só aparece quando
  há ≥2 meses ativos — com apenas 1, a média seria idêntica ao mês anterior (redundante com a linha
  "vs. mês ant."). As duas comparações têm flags independentes (`hasPrevData`/`hasAverageData`).
- **Componentes arredondados, saldos derivados:** `averageSummaries` arredonda ao centavo os
  componentes (receitas, despesas, recebido, pago, pendências) e **deriva** `balance`/`cashBalance`
  deles, preservando a invariante `balance = receitas − despesas` (evita um saldo médio que não bate
  com seus componentes por causa de arredondamento independente).
- **Sem schema, sem dependência, sem server action:** leitura/derivação sobre os mesmos dados já
  carregados (filtra-se o mesmo conjunto em memória, uma consulta a mais NÃO é feita). Reaproveita
  `compareSummaries`/`computeDelta` (a UI decide bom/ruim via `upIsGood`, lógica pura neutra — D33).
- **Testes:** 4 testes unitários novos (`averageSummaries`: lista vazia→zeros, único→idêntico, média
  campo a campo, arredondamento dos componentes + saldos derivados). Total do projeto 369→373.
- **Alternativas consideradas:** (a) média dos últimos N meses-calendário contando vazios como zero —
  descartado: diluiria a base de quem tem pouco histórico, distorcendo a "tendência"; (b) mediana em
  vez de média — mais robusta a outliers, mas menos intuitiva para o usuário e desnecessária com
  janela curta; (c) uma terceira linha/seção separada em vez de delta por card — descartado, a
  segunda linha rotulada por card é mais compacta e alinha cada métrica à sua variação.

## D36 — Quebra por categoria no Resumo anual (Sessão 45)
- **Contexto:** o Resumo anual (`/financas/anual`, D16/D34) já mostrava os 12 meses, totais, melhor/
  pior mês e o comparativo YoY — o "quando" do dinheiro do ano. Faltava o "onde": para onde foi o
  dinheiro no ano (quais categorias dominaram receita e despesa). O Relatório mensal já respondia isso
  no nível do mês via `categoryReport` (D21), com o componente visual de cards já pronto.
- **Decisão:** adicionar a função pura `annualCategoryReport(txs, year)` em `src/lib/finance.ts`, que
  filtra as transações cujo mês (UTC) cai no ano (mesmo critério de prefixo `"YYYY-"` do
  `annualSummary`) e **delega ao `categoryReport` existente** — uma só fonte de verdade da agregação
  por categoria (ordenação por valor, desempate pt-BR, "Sem categoria", `share`). A página computa o
  relatório sobre o **mesmo** conjunto de transações já carregado (sem consulta extra) e renderiza dois
  cards (Receitas/Despesas por categoria) reaproveitando o padrão visual do Relatório mensal.
- **Sem schema, sem dependência, sem server action:** leitura/derivação sobre dados em memória.
- **Reúso em vez de duplicação:** delegar a `categoryReport` (em vez de reimplementar a agregação por
  ano) mantém o comportamento idêntico entre o relatório mensal e o anual; só muda o recorte temporal.
- **Testes:** 3 testes unitários novos (`annualCategoryReport`: filtra só o ano informado; agrega o ano
  inteiro com `share`; ano sem movimento → zerado). Total do projeto 373→376.
- **Alternativas consideradas:** (a) reaproveitar `totalsByCategory` (que mistura receita+despesa numa
  linha por categoria) — descartado: o usuário pensa receita e despesa separadamente, e `categoryReport`
  já entrega isso com participação; (b) gráfico de pizza — fora do escopo; as barras de participação
  por categoria (já usadas no relatório mensal) cobrem a leitura "quem pesa mais" com menos peso visual.

## D37 — Sazonalidade das Finanças (Sessão 46)
- **Contexto:** o Resumo anual (`/financas/anual`, D16/D34/D36) responde "como foi ESTE ano, mês a
  mês?". Mas para planejar — quando empurrar mais shows, quando segurar despesa, quando guardar — o
  músico precisa do padrão que se repete TODO ano: dezembro de festas costuma render, janeiro
  costuma ser morto. Nenhuma função existente cruzava o mesmo mês do calendário entre anos
  diferentes (`totalsByMonth` agrega por `YYYY-MM`; `annualSummary` é um único ano).
- **Decisão:** adicionar a função pura `monthlySeasonality(txs)` em `src/lib/finance.ts`, que agrega
  por **mês do calendário** (jan→dez, 1-12) somando todos os anos, e expõe por mês: total/ano somado,
  nº de anos com movimento naquele mês (`years`) e a **média por ano-ativo** (`avgIncome`/`avgExpense`,
  com `avgNet` derivado). Também devolve `yearsObserved` (anos distintos com qualquer transação) e o
  melhor/pior mês por `avgNet`. Nova página `/financas/sazonalidade` com cards de destaque + tabela
  de barras (mesmo padrão visual do Resumo anual), e link na barra de ações de `/financas`.
- **Denominador = anos com movimento naquele mês (não a amplitude do histórico):** um dezembro só
  conta como ano-ativo se teve receita ou despesa, então a média é "um dezembro típico em que houve
  trabalho", não diluído por dezembros vazios de um histórico ainda curto. Mesmo princípio da média
  móvel do relatório mensal (D35: denominador = meses ativos). `avgNet` é **derivado** de
  `avgIncome−avgExpense` (não a média dos nets) para preservar a invariante após o arredondamento.
- **Aviso com <2 anos:** com um único ano de histórico a "média" de cada mês é o próprio mês (não há
  padrão sazonal real); a página mostra um aviso âmbar dizendo isso, em vez de esconder a tela.
- **Sem schema, sem dependência, sem server action:** leitura/derivação sobre as transações já
  carregadas (uma consulta, a mesma do resumo anual). Reaproveita `monthKey` (UTC).
- **Testes:** 5 testes unitários novos (`monthlySeasonality`: vazio→12 meses zerados sem best/worst;
  soma o mesmo mês entre anos + conta anos ativos; média divide só pelos anos ativos do mês, não pelo
  histórico todo; `avgNet` derivado + arredondamento ao centavo; best/worst por resultado médio).
  Total do projeto 376→381.
- **Alternativas consideradas:** (a) dividir pela amplitude total do histórico (contando anos vazios
  como zero) — descartado: distorceria a "época típica" de quem tem pouco histórico, igual à rejeição
  em D35; (b) mediana em vez de média — mais robusta a outliers, mas menos intuitiva e desnecessária
  com históricos curtos; (c) reaproveitar `annualSummary` por ano e somar — descartado: precisaria
  varrer ano a ano e ainda não daria a contagem de anos-ativos por mês numa passada só.

## D38 — Exportação CSV do Resumo anual (Sessão 47)
- **Contexto:** o Relatório mensal já exportava CSV do mês (Sessão 21/Sessão 14, `/financas/export`
  com filtros; o relatório linka o recorte do mês). O Resumo anual (`/financas/anual`, D16/D34/D36)
  mostrava os 12 meses na tela, mas não dava como **levar o ano inteiro para uma planilha**
  (contador/IR/prestação de contas) — lacuna de consistência com o resto das Finanças.
- **Decisão:** adicionar a função pura `annualSummaryToCsv(summary)` em `src/lib/csv.ts`, que
  serializa um `AnnualSummary` já computado (cabeçalho + 12 meses jan→dez + linha "Total do ano"),
  e um route handler `GET /financas/anual/export?ano=YYYY` que **espelha** o handler de
  `/financas/export` (carrega transações do usuário, computa `annualSummary`, devolve CSV com BOM
  UTF-8 e `Content-Disposition`). Botão "⬇ CSV" na página do resumo anual.
- **Resumo, não transações brutas:** o CSV exportado é o **agregado mês a mês** (o que a tela do
  resumo anual mostra), não a lista de lançamentos — quem quer os lançamentos já tem
  `/financas/export` (filtrável por `?mes=`). Assim cada export responde a uma pergunta distinta
  (fechamento do ano vs. extrato detalhado) sem duplicar o outro.
- **Reúso dos rótulos de mês:** `MONTH_NAMES_LONG` (antes privado em `calendar.ts`) virou export e é
  reaproveitado pelo serializador — uma só fonte de verdade dos nomes pt-BR dos meses, evitando uma
  segunda cópia da lista em `csv.ts`. Sem ciclo de import (`csv`→`calendar`; `calendar` não importa
  `csv`/`finance`).
- **Sem schema, sem dependência, sem server action:** leitura/derivação sobre os dados já
  carregados; a camada pura (testada) faz a serialização e a camada HTTP só faz I/O.
- **Testes:** 4 testes unitários novos (14 linhas = cabeçalho+12 meses+total; agrega no mês certo e
  totaliza o ano; resultado negativo preservado no mês e no total; ignora transações de outros anos).
  Total do projeto 381→385.
- **Alternativas consideradas:** (a) incluir a quebra por categoria do ano (D36) no mesmo CSV —
  descartado: misturaria duas tabelas de formatos diferentes num arquivo só; melhor um export por
  visão se houver demanda; (b) reaproveitar `/financas/export?mes=` doze vezes — descartado: não dá
  a consolidação anual numa planilha única, que é o ponto; (c) gerar XLSX em vez de CSV — fora do
  escopo (exigiria dependência nova); CSV com BOM já abre no Excel/Sheets pt-BR.

## D39 — Custos fixos recorrentes / custo fixo mensal estimado (Sessão 48)
- **Contexto:** as Finanças tinham muitas visões de receita e de resultado (resumo anual,
  sazonalidade, relatório mensal, projeção de caixa, rentabilidade), mas nenhuma respondia à
  pergunta de sobrevivência do freelancer: "qual é meu custo fixo mensal — quanto preciso faturar
  TODO mês só para manter as luzes acesas?". As despesas existem soltas; o que faltava era separar
  o **recorrente** (sala de ensaio, streaming, telefone, software) do **pontual** (um conserto, um
  equipamento) e estimar o piso mensal. `categoryReport`/`monthlySeasonality` agregam valores, mas
  nenhuma detecta **recorrência** (em quantos meses distintos a categoria reaparece).
- **Decisão:** função pura `recurringExpenses(txs, options)` em `src/lib/finance.ts`, que agrupa as
  despesas por categoria e marca como recorrente toda categoria presente em ≥ `minMonths` meses
  distintos (default 3). Por categoria expõe: total, meses-ativos, janela (`monthsSpan` = meses
  entre 1ª e última ocorrência), conta típica (`avgPerActiveMonth` = total / meses-ativos,
  arredondada), `regularity` (meses-ativos / janela, 0..1), `lastMonth` e `active`. O
  **`estimatedMonthlyFixedCost`** soma a conta típica apenas das categorias AINDA ATIVAS. Nova
  página `/financas/custos-fixos` (card do custo estimado + tabela de categorias com barras), com
  link na barra de ações de `/financas` quando há despesas.
- **Recorrência = nº de MESES DISTINTOS, não de lançamentos:** dois lançamentos no mesmo mês não
  fazem um custo fixo; três meses diferentes sim. `minMonths = 3` evita falso positivo de uma
  despesa esporádica que por acaso caiu duas vezes seguidas.
- **Conta típica = total / meses-ativos (não / janela):** mede "quanto custa quando cai", sem
  diluir por meses em que a despesa não ocorreu — mesmo princípio de denominador-ativo da média
  móvel (D35) e da sazonalidade (D37). A `regularity` separada informa o quão constante ela é
  dentro da janela (1 = todo mês).
- **Custo estimado só conta o que ainda está ativo:** `active` = última ocorrência dentro dos
  últimos `activeWithinMonths` meses (default 2). Assim um custo que você já cortou (ex.: assinatura
  cancelada há meses) continua listado para histórico, mas **não infla** o piso mensal. A página
  marca as encerradas com selo e as exclui do total.
- **Sem schema, sem dependência, sem server action:** leitura/derivação sobre as transações de
  despesa já filtradas no banco (`where type EXPENSE`); reaproveita `monthKey` (UTC). Categoria
  vazia → "Sem categoria".
- **Testes:** 11 testes unitários novos (`recurringExpenses`: vazio; ignora receitas; limiar de
  `minMonths`; `monthsObserved`; arredondamento da conta típica; `regularity` com gap; custo
  estimado exclui categorias encerradas; ordenação por conta típica desc; "Sem categoria").
  Total do projeto 385→396.
- **Alternativas consideradas:** (a) detectar recorrência por descrição/valor exato (assinaturas
  idênticas) — mais preciso para casos limpos, mas frágil com valores que variam (conta de luz) e
  exige texto livre nem sempre preenchido; categoria é o eixo já estruturado e estável; (b) usar a
  média de TODAS as despesas mensais como "custo fixo" — descartado: misturaria custo variável de
  show (transporte, cachê de banda) com o fixo, inflando o piso; (c) persistir custos fixos
  declarados pelo usuário (um cadastro) — mais exato, porém pede schema/UI nova e disciplina de
  cadastro; a detecção automática entrega valor imediato sobre os dados que já existem. Pode evoluir
  para um modo declarado depois se houver demanda.

## D40 — Ponto de equilíbrio em shows (Sessão 49)
- **Contexto:** a D39 entregou o **custo fixo mensal estimado** ("quanto preciso faturar todo mês"),
  e a rentabilidade por show (F4) já dizia quanto cada gig deixa. Faltava cruzar os dois na pergunta
  de planejamento mais concreta do músico autônomo: **"quantos shows por mês eu preciso fazer só
  para cobrir minhas contas fixas?"**. Um número em reais ("preciso de R$ X/mês") é abstrato; um
  número em shows ("preciso de 2 gigs/mês") é acionável — vira meta de agenda.
- **Decisão:** função pura `computeBreakEven(shows, txs, options)` em `src/lib/finance.ts`, que
  compõe duas fontes de verdade já existentes: `recurringExpenses(...).estimatedMonthlyFixedCost`
  (custo fixo) e a média do `computeShowPnL().net` dos shows **realizados**. Expõe `monthlyFixedCost`,
  `avgNetPerShow`, `showsConsidered`, `avgShowsPerMonth` (ritmo atual), `showsNeeded`
  (`ceil(custoFixo / netMédio)`) e `covered`. Nova página `/financas/ponto-de-equilibrio` (destaque
  da meta de shows/mês + selo verde/âmbar comparando com o ritmo atual + os três números por trás),
  com link na barra de `/financas` quando há despesas.
- **"Show realizado" = mesmo critério de `reconcileShowFees`/`isHappenedGig`:** PLAYED, ou CONFIRMED
  com data já passada. Propostos, cancelados e confirmados futuros **não** entram na média — senão um
  show grande ainda por acontecer (sem despesas vinculadas lançadas) inflaria o net médio com a ilusão
  de margem cheia.
- **`showsNeeded = null` em dois casos honestos:** (a) sem custo fixo a cobrir (`monthlyFixedCost <= 0`)
  — nada a bater; (b) `avgNetPerShow <= 0` — o show médio não sobra nada, então **nenhum** número de
  shows fecha a conta; a UI então orienta a rever cachê/custos em vez de mostrar uma meta infinita.
- **`avgShowsPerMonth` = shows realizados ÷ amplitude (meses entre 1º e último, inclusive):** o ritmo
  atual, para o selo "já cobre / abaixo da meta". Mesmo princípio de denominador-ativo de D35/D37/D39.
- **Heurística de planejamento, não contabilidade exata:** custo fixo (todas as categorias recorrentes)
  e custo por show (despesas vinculadas ao show) são tratados como blocos separados — pode haver leve
  sobreposição se uma categoria recorrente também aparecer vinculada a shows. A página declara isso
  no rodapé e aponta para Custos fixos e Rentabilidade por show. Aceitável: o objetivo é uma meta de
  agenda, não fechamento. Sem schema, sem dependência, sem server action.
- **Testes:** 7 testes unitários novos (`computeBreakEven`: vazio→nulls; cálculo de shows/mês a partir
  de custo+netMédio; desconto de despesa vinculada no P&L; só shows realizados; net médio negativo→null;
  sem custo fixo→null; `covered` quando o ritmo bate a meta). Total do projeto 394→401.
- **Alternativas consideradas:** (a) meta em reais apenas (já dada por D39) — menos acionável; (b) usar
  o cachê bruto médio em vez do net — descartado: ignoraria os custos do próprio show, otimista demais;
  (c) projetar com os shows futuros já agendados (cruzar com `forecastBookedRevenue`) — interessante,
  mas mistura "quanto preciso" com "quanto já tenho", duas perguntas; fica como evolução futura.

## D41 — Reserva para impostos (Sessão 50)
- **Contexto:** o músico autônomo no Brasil (MEI/Simples/carnê-leão) costuma gastar o que entra e
  ser pego de surpresa pelo imposto. As Finanças já tinham caixa, custo fixo (D39) e ponto de
  equilíbrio (D40), mas faltava a pergunta de disciplina financeira mais simples e útil:
  **"quanto eu deveria estar guardando de cada cachê para o imposto?"**.
- **Decisão:** função pura `taxReserve(txs, { year, rate })` em `src/lib/finance.ts`, que aplica uma
  alíquota sobre as **receitas efetivamente recebidas** (caixa de entrada) do ano, mês a mês, e
  expõe `months[12]` (recebido + reserva por mês), `totalReceivedIncome`, `totalReserve` e a `rate`
  saneada. Nova página `/financas/reserva-impostos` com seletor de alíquota (atalhos 6/11/15/27,5%),
  navegação por ano, destaque do total a guardar no ano e tabela mês a mês com link ao relatório
  mensal. Link na barra de `/financas` quando há receitas.
- **Base = receita RECEBIDA, não competência nem a receber:** imposto incide sobre faturamento que
  de fato entrou. Usar `totalIncome` (competência) ou incluir pendências mandaria o músico guardar
  dinheiro que ainda não tem. Coerente com a semântica de caixa de `summarizeFinances`.
- **Alíquota é HIPÓTESE, default 6% (`DEFAULT_TAX_RATE`):** aproxima a faixa inicial do Simples
  Nacional (Anexo III), apenas como ordem de grandeza segura. A página mostra um aviso âmbar quando
  a alíquota padrão está em uso e a torna ajustável por query (`?aliquota=`, 0–100, com `,`/`.`),
  sem persistência/schema — o regime real varia muito por perfil e deve ser confirmado com contador.
  Sinalizado para validação nos bloqueios do PROGRESS.
- **Arredondamento por mês, total = soma das mensais:** cada `reserve` é `round(recebido × rate)`
  e o total soma as reservas mensais (não a reserva do total) — diferença de centavos, mas mantém a
  coluna e o rodapé somando exatamente, como nas demais tabelas (D21/anual).
- **Sem alíquota progressiva nem dedução de despesas:** modelo de faturamento bruto (Simples/MEI),
  não lucro presumido/real nem carnê-leão progressivo — manteria o cálculo simples e previsível. O
  carnê-leão progressivo (27,5% sobre o líquido) fica como evolução futura se a validação pedir.
- **Testes:** 6 testes unitários novos (`taxReserve`: alíquota padrão; só receitas recebidas;
  filtro por ano UTC; ano sem receita → 12 meses zerados; arredondamento mensal; saneamento da
  alíquota para [0,1] incl. NaN). Total do projeto 401→407.
- **Alternativas consideradas:** (a) persistir a alíquota no `User` (schema) — adiado, query basta
  para a v1 e evita migração; (b) reserva sobre o lucro (receita − despesa) em vez do faturamento —
  descartado p/ Simples/MEI, que tributam faturamento; fica como modo futuro junto do carnê-leão;
  (c) exportação CSV — adiável, o padrão de `/financas/anual/export` (D38) é reaproveitável depois.

## D42 — Funil de propostas / pipeline de shows (Sessão 51)
- **Contexto:** as análises de shows até aqui olhavam o que **já aconteceu** (rentabilidade D-,
  por local, a receber) ou o caixa futuro por mês (receita agendada D22). Faltava a visão de
  **booking**: quantos shows estão em cada estágio (proposta → confirmado → realizado → cancelado),
  quanto de cachê está parado em negociação/confirmado e quão bem as propostas viram show de verdade.
- **Decisão:** função pura `showPipeline(shows)` em `src/lib/finance.ts`, que agrupa os shows pelo
  `status` em quatro etapas (`PIPELINE_STAGE_ORDER`), somando contagem e cachê por etapa, e deriva:
  `openValue`/`openCount` (PROPOSED + CONFIRMED — dinheiro ainda não realizado), os recortes de
  proposto/confirmado/realizado/cancelado, `decidedCount` (PLAYED + CANCELLED) e a
  `conversionRate = PLAYED / (PLAYED + CANCELLED)`. Nova página `/shows/funil` com cards de destaque,
  barras por etapa (cor sólida de `SHOW_STATUS_DOT`) e atalhos para a lista filtrada por status
  (`/shows?status=…`). Link "Funil" na barra de `/shows`.
- **Snapshot, não fluxo histórico:** os status são o estado **atual** de cada show (um show pode
  mudar de PROPOSED→CONFIRMED→PLAYED com o tempo), e o schema não registra transições. Por isso a
  página é explícita ("retrato do estado atual, não histórico de conversão") e a única taxa exposta
  é a **concretização sobre shows já decididos** (PLAYED vs. CANCELLED) — honesta sem precisar de
  histórico. Uma taxa proposta→realizado de verdade exigiria log de transições (evolução futura).
- **`conversionRate` é `null`, não 0, sem shows decididos:** distinguir "ainda não dá para dizer"
  (nada PLAYED/CANCELLED) de "0% de aproveitamento" — a UI mostra "—" nesse caso. Mesma escolha de
  `MetricDelta`/comparativos (evitar divisão por zero sinalizando ausência).
- **Status desconhecido é ignorado** (não entra em `total`): robustez a dados legados/inesperados,
  espelhando `rankShowsByProfit`/`computeShowPnL`, que toleram o campo opcional `status` de `ShowLike`.
- **Cachê em aberto exclui realizado e cancelado:** o valor de PLAYED já virou (ou deveria virar)
  caixa — vive em "a receber" (D25); o de CANCELLED não vai entrar. "Em aberto" = só o que ainda
  está em jogo (proposto + confirmado), respondendo "quanto tenho na mesa?".
- **Sem schema/persistência:** tudo deriva dos campos `status` e `fee` já existentes; zero migração.
- **Testes:** 6 testes unitários novos (`showPipeline`: funil vazio com as 4 etapas; agregação por
  etapa; valor em aberto; taxa de concretização; `null` sem decididos; ignora status desconhecido).
  Total do projeto 407→413.
- **Alternativas consideradas:** (a) registrar transições de status (histórico) para uma taxa de
  conversão real e tempo médio em cada etapa — adiado, exige schema e captura nas server actions;
  (b) incluir o funil no Painel — adiável, a página dedicada basta e o dashboard já está denso;
  (c) exportação CSV do funil — desnecessária para uma visão de contagem/valor agregado.

## D43 — Funil de propostas no Painel (Sessão 52)
- **Contexto:** o funil (`/shows/funil`, D42) é uma página dedicada que o usuário só vê se navegar
  até ela. O sinal "quanto tenho na mesa?" (cachê em aberto) e "quão bem fecho propostas?" (taxa de
  concretização) é de visão diária — merece aparecer já na primeira tela, junto dos demais alertas
  do Painel (pendências, recebíveis, projeção de caixa). A própria D42 deixou isso como evolução (b).
- **Decisão:** o Painel passa a renderizar uma seção "Funil de propostas" (só quando há shows,
  `pipeline.total > 0`) com três blocos derivados de `showPipeline` (já existente, D42): **Cachê em
  aberto** (`openValue`/`openCount`, link para `/shows/funil`), **Em negociação**
  (`proposedValue`/`proposedCount`, link para `/shows?status=PROPOSED`) e **Taxa de concretização**
  (`conversionRate`, "—" quando `null`). Cabeçalho com link "Ver funil".
- **Reaproveitamento, zero lógica nova:** a página só consome a função pura `showPipeline`, já coberta
  por 6 testes unitários (D42). Não há novo cálculo a testar — espelha a escolha da Sessão 41 (aging
  no Painel reusando `bucketReceivablesByAge`). Total de testes inalterado (413).
- **Posição na página:** logo após a Projeção de caixa e antes da grade de duas colunas (próximos
  shows / fluxo / rentabilidade / categorias), mantendo os alertas de ação (pendências, recebíveis)
  no topo e as visões analíticas em sequência.
- **Alternativas consideradas:** (a) um quarto `SummaryCard` no topo só com o cachê em aberto —
  perderia a taxa de concretização e a quebra proposto/confirmado, que dão o contexto de booking;
  (b) substituir a página dedicada pelo card — não, a página tem as barras por etapa e os atalhos
  por status que não cabem num resumo. O card é um portal para ela, não um substituto.

## D44 — Evolução do cachê ao longo do tempo (Sessão 53)
- **Contexto:** a plataforma já mede *rentabilidade* (P&L por show/local) e *projeção* (receita
  agendada, fluxo de caixa), mas faltava o sinal de **progressão de carreira**: "estou cobrando mais
  com o tempo?". Para o músico, a evolução do **preço** (cachê) é tão decisória quanto o lucro — é o
  que diz se o trabalho de booking está aumentando o valor percebido.
- **Decisão:** nova função pura `feeTrend(shows, { now? })` (em `src/lib/finance.ts`) + página
  `/shows/evolucao-cache`. Agrega o **cachê médio por mês** dos shows já realizados, em ordem
  cronológica, e deriva: cachê médio geral, maior/menor cachê, melhor/pior mês e uma **tendência**
  (variação do cachê médio do mês mais recente vs. o primeiro mês). Responde "meu cachê está subindo?".
- **Critério de "realizado":** reaproveita o helper privado `isHappenedGig` (PLAYED, ou CONFIRMED
  com data passada) — mesma régua de `reconcileShowFees`/`computeBreakEven`. Propostos, cancelados e
  futuros ficam de fora (não são preço efetivamente praticado).
- **Só shows com cachê (`fee > 0`):** gigs sem cachê registrado (0) distorceriam a média de "quanto
  cobro" — mesma postura de `reconcileShowFees`, que ignora `fee <= 0`. Documentado na função.
- **Preço, não lucro:** usa apenas `show.fee` (não desconta despesas vinculadas nem soma receitas
  extras). É deliberadamente a evolução do **valor cobrado**, complementar — não redundante — à
  Rentabilidade por show (D-F4), que mede o líquido. Por isso `feeTrend` nem recebe transações.
- **Tendência via `computeDelta`:** a variação reusa `computeDelta(últimoMês, primeiroMês)` (D33),
  uma só fonte de verdade do cálculo de delta/%/direção. `null` com menos de 2 meses ativos (sem
  dois pontos não há tendência).
- **Sem schema/persistência, sem dependência nova:** tudo deriva de `status`/`fee`/`date` já
  existentes; zero migração. Link "Evolução do cachê" na barra de `/shows` (ao lado de Rentabilidade
  e Por local) quando há shows.
- **Testes:** 7 testes unitários novos em `finance.test.ts` (vazio→zerado/nulo; agrupamento mensal
  cronológico com média/total/min/max; só realizados; ignora `fee<=0`; tendência último vs primeiro;
  `null` com um único mês; desempate de melhor/pior mês). Total do projeto 413→420.
- **Alternativas consideradas:** (a) usar o resultado líquido (P&L) por show em vez do cachê — seria
  redundante com a Rentabilidade e misturaria preço com custo; o cachê isolado responde melhor à
  pergunta de progressão; (b) granularidade trimestral/anual em vez de mensal — mensal preserva o
  detalhe e a UI já lida bem com gaps (só meses com shows aparecem); (c) incluir shows futuros
  confirmados como "preço contratado" — não, distorceria a *evolução realizada* com expectativa;
  (d) trazer o indicador para o Painel — adiável (o dashboard já está denso); a página dedicada basta.

## D45 — Mix de receitas / diversificação das fontes de renda (Sessão 54)
- **Contexto:** a plataforma já tem muitos relatórios de receita (relatório mensal, resumo anual,
  sazonalidade, rentabilidade por show/local, ranking de contatos), mas todos olham *quanto* e *quando*
  se fatura. Faltava um sinal de **risco de concentração**: "de onde vem minha renda e o quanto eu
  dependo de uma única fonte?". Para o músico autônomo, depender de um só tipo de receita (ou de um só
  contratante recorrente que aparece como categoria) é uma fragilidade clássica — perder essa frente
  derruba o faturamento.
- **Decisão:** nova função pura `incomeMix(txs)` (em `src/lib/finance.ts`) + página
  `/financas/fontes-de-renda`. Agrupa as receitas (`INCOME`) por **categoria** (= fonte de renda:
  cachê, aulas, streaming, merch, etc.), com participação (`share`) de cada uma, concentração nas
  maiores (`topShare`, `top3Share`), o índice **HHI** (Herfindahl–Hirschman), o **número efetivo de
  fontes** (1/HHI, índice de Simpson) e um **veredito de diversificação**.
- **Por que HHI:** é a métrica padrão de concentração (antitruste/portfólio) e responde exatamente à
  pergunta de dependência. O número efetivo de fontes (1/HHI) traduz o HHI para uma linguagem
  intuitiva ("como se a renda viesse de N fontes iguais"), melhor para a UI do que o índice cru.
- **Thresholds do veredito (hipótese de produto):** uma fonte só → `concentrated`; HHI ≥ 0,45 (≈ uma
  fonte dominante ou só duas relevantes) → `concentrated`; HHI ≥ 0,25 (≈ até 4 fontes equivalentes) →
  `moderate`; abaixo → `diversified`. São cortes arbitrários e razoáveis — **marcados como hipótese**
  a refinar com uso real; centralizados em `diversificationLevel` (uma só fonte de verdade).
- **Categoria como proxy de fonte:** reusa o campo `category` já existente (mesma normalização de
  `categoryReport`: em branco/ausente → "Sem categoria"); zero schema, zero migração, zero dependência
  nova. Considera **todas as receitas lançadas** (recebidas e a receber) — a diversificação é estrutural,
  não de caixa; documentado na função e na página.
- **Não é o ranking de contatos (D18):** o ranking responde "quem é meu melhor cliente?"; o mix responde
  "estou dependente demais de uma frente de receita?". São perguntas distintas (cliente × fonte) — e o
  mix particiona 100% da renda por categoria, sem o double-count por contato do ranking.
- **Testes:** 9 testes unitários novos em `finance.test.ts` (vazio/sem receita; ignora despesas e agrupa;
  "Sem categoria"; ordenação por valor + desempate pt-BR; top3Share/HHI/efetivas; fonte única →
  concentrada; fonte dominante → concentrada; bem distribuída → diversificada; intermediária → moderada).
  Total do projeto 420→429.
- **Alternativas consideradas:** (a) concentração por **contratante** (atribuir o cachê de cada show a um
  contato) — exigiria uma regra de atribuição quando o show tem vários contatos (ambígua) e se sobreporia
  ao ranking; categoria é inequívoca e particiona limpo; (b) considerar só receitas **recebidas** — a
  diversificação é uma propriedade estrutural da carteira de receitas, não do caixa; incluir as a receber
  evita um retrato enviesado por atraso de recebimento; (c) trazer o alerta de concentração para o Painel —
  adiável (dashboard já denso); a página dedicada basta por ora.

## D46 — Desempenho por dia da semana (Sessão 55)
- **Contexto:** os relatórios temporais de shows olham *quando* no calendário (sazonalidade por mês,
  evolução do cachê mês a mês) ou *onde* (rentabilidade por local). Faltava o eixo **dia da semana**:
  o músico de casa noturna/bar vive de fins de semana, e saber *quais dias da semana pagam melhor e
  concentram a agenda* ajuda a decidir quais convites aceitar e onde está a ociosidade (terça vazia?).
- **Decisão:** nova função pura `weekdayPerformance(shows)` (em `src/lib/finance.ts`) + página
  `/shows/dias-semana`. Agrega os shows **já realizados com cachê** por dia da semana (0=domingo..6=sábado),
  com nº de shows, faturamento total, **cachê médio** e participações (no nº e no faturamento) por dia,
  além de três destaques: melhor cachê médio, maior faturamento e dia mais movimentado.
- **Critério de "realizado" reusa `isHappenedGig`** (PLAYED, ou CONFIRMED com data passada) e ignora
  `fee <= 0` — exatamente como `feeTrend`/`reconcileShowFees`, para que "cachê médio" não seja diluído por
  gigs sem cachê e propostos/cancelados/futuros não entrem. Consistência com o resto do módulo.
- **Sempre os 7 dias no resultado** (mesmo zerados): a UI mostra as lacunas da agenda (dias em que o
  músico não toca) em vez de "pular" dias — a ociosidade é informação, não ausência. Dia da semana
  extraído em **UTC** (`getUTCDay`) para estabilidade nos testes, igual a `monthKey`/`dayKey`.
- **Desempate determinístico dos destaques:** helper interno `pick(rank, tiebreak)` — empate na métrica
  principal cai no nº de shows (mais amostras = sinal mais confiável); empate total resolve pelo **dia
  mais cedo da semana** (a iteração já está em ordem domingo→sábado). Documentado e coberto por teste.
- **Zero schema/dependência:** usa `date`/`status`/`fee` já existentes no `Show`; nenhuma migração.
- **Testes:** 7 testes unitários novos em `finance.test.ts` (vazio → 7 dias zerados e destaques nulos;
  agregação com média/total/participações; só realizados; ignora fee<=0; destaques por média/volume/
  movimento; empate total → dia mais cedo; empate de média → mais shows). Total do projeto 429→436.
- **Alternativas consideradas:** (a) usar P&L líquido por dia (cachê − despesas vinculadas) em vez do
  cachê bruto — descartado por ora: o cachê é o sinal direto de "quanto esse dia paga" e a maioria das
  despesas não é vinculada por show; fica como evolução possível; (b) cruzar com a hora do dia — fora de
  escopo (não há campo de horário separado e a granularidade não compensa); (c) incluir shows futuros
  confirmados — não, distorceria o padrão *realizado* com expectativa, mesma postura de `feeTrend` (D44).

## D47 — Fidelização / retenção de contratantes (Sessão 56)
- **Contexto:** o CRM já tem o **ranking** (quem mais movimenta a agenda, por contato — D18), o
  **detalhe do contato** (histórico individual — Sessão 20) e o **reativar** (dormentes a recontatar —
  D21). Faltava a leitura de **carteira**: que fração dos contratantes *volta* a contratar e quanto da
  receita vem deles. É a diferença entre um negócio que vive de prospecção constante (todo cliente é
  novo) e um sustentável (base fiel). Pergunta: "minha agenda se sustenta em quem volta?".
- **Decisão:** nova função pura `clientRetention(items, now?)` (em `src/lib/contacts.ts`) + página
  `/contatos/retencao`. Métrica de carteira: contratante = contato com ≥1 show **não cancelado**;
  **recorrente** = ≥2 shows não cancelados. Retorna taxa de recompra (`repeatRate` = recorrentes/total),
  fatia da receita dos recorrentes (`recurringFeeShare`), nº de únicos, média de shows por contratante,
  o mais fiel e as linhas (rows/recurring) ordenadas por nº de shows, depois cachê, nome (pt-BR) e id.
- **"Recorrente" = ≥2 shows não cancelados**, contando shows **futuros confirmados** também: uma
  re-contratação já agendada é fidelização tanto quanto uma já realizada — o sinal é "o cliente voltou",
  não "o show aconteceu". Coerente com o ranking (D18), que também conta não cancelados incluindo futuros.
  Difere de `feeTrend`/`weekdayPerformance` (que olham só realizados) porque ali a pergunta é sobre o
  *passado de preço/volume*, e aqui sobre o *relacionamento*.
- **Cachê por contato** (um show com vários contatos conta para cada um), mesma convenção do ranking —
  documentado na UI. Não tenta atribuir o cachê a um único contratante (regra ambígua, ver D45).
- **Distinção das telas vizinhas:** ranking é uma lista *por contato* ordenada por valor; retenção é um
  *KPI de carteira* (taxas/fatias) com a tabela só dos recorrentes; reativar é a lista de *dormentes*.
  O estado vazio da retenção (ninguém voltou) aponta para o reativar — fechando o ciclo de prospecção.
- **Zero schema/dependência/server action:** usa `status`/`date`/`fee` dos shows já vinculados via
  `ContactsOnShows`; nenhuma migração.
- **Testes:** 7 testes unitários novos em `contacts.test.ts` (vazio; ignora sem show/só cancelado;
  classifica recorrente vs. único + taxa; cancelado não conta no nº/cachê; fatia da receita dos
  recorrentes; ordenação por nº de shows com desempate por cachê + mais fiel; lastShowDate pelo mais
  recente incl. futuro). Total do projeto 436→443.
- **Alternativas consideradas:** (a) "novos vs. recorrentes por ano" (série temporal de aquisição) —
  mais rico, mas exige uma definição de "primeiro show" por janela e dobra a complexidade; o retrato de
  carteira responde a pergunta principal com menos ruído, fica como evolução; (b) trazer a taxa de
  recompra para o Painel — adiável (dashboard já denso), a página dedicada basta por ora; (c) limiar de
  recorrência configurável (≥3?) — ≥2 é o limiar natural de "voltou"; sem demanda para parametrizar.

## D48 — Atuação por cidade / rollup geográfico (Sessão 57)
- **Contexto:** a Rentabilidade por local (`/shows/locais`, D19) agrega o P&L por **casa/venue**
  (caindo para a cidade só quando não há venue). Faltava a leitura **geográfica** de um nível acima:
  uma cidade reúne várias casas, e a decisão de turnê/deslocamento é por cidade ("vale ir a São Paulo?",
  não "vale o Bar do Zé?"). Pergunta: "quais cidades valem a turnê?".
- **Decisão:** nova função pura `rankCitiesByProfit(shows, txs, opts?)` (em `src/lib/finance.ts`) +
  página `/shows/cidades`. Agrupa **estritamente por `city`** (normalizado sem acento/caixa via
  `normalizeText`); shows sem cidade caem em "Sem cidade" (chave ""). Mesma forma de retorno da
  rentabilidade por local — `CityProfitRow`/`CitiesProfitability` são **type aliases** de
  `VenueProfitRow`/`VenuesProfitability` (a forma é idêntica; aliases dão clareza semântica sem
  duplicar tipos).
- **DRY — agregador compartilhado:** o corpo de `rankVenuesByProfit` foi extraído para o helper privado
  `aggregateShowProfit(shows, txs, keyer, emptyLabel, opts)`, parametrizado pela função `keyer`
  (`show → { key, rawLabel }`) e pelo rótulo do grupo vazio. `rankVenuesByProfit` (keyer = venue||city,
  "Sem local") e `rankCitiesByProfit` (keyer = city, "Sem cidade") são fachadas finas. `pickLabel` passou
  a receber o `emptyLabel`. Uma só fonte de verdade da agregação/ordenação/desempate, reaproveitando
  `computeShowPnL`. Os 6 testes de `rankVenuesByProfit` seguem verdes sem alteração (refactor puro).
- **Exibição:** mesma convenção de local — nome = grafia original mais frequente da cidade (preserva
  acento/caixa do usuário). A página acrescenta uma **barra de participação** por linha (resultado/maior
  resultado positivo) que a tela de locais não tinha, e cruza-links com `/shows/locais` para descer ao
  detalhe por casa.
- **Critérios herdados:** exclui `CANCELLED` por padrão (configurável via `opts.excludeStatuses`); inclui
  PROPOSED/CONFIRMED futuros (é um retrato de onde a agenda rende, não só do realizado — coerente com
  D19). Cachê + receitas/despesas extras vinculadas via `computeShowPnL`.
- **Zero schema/dependência/server action:** usa `city`/`venue`/`fee`/`status` já existentes; nenhuma
  migração.
- **Testes:** 5 testes unitários novos em `finance.test.ts` (vazio; agrupa casas distintas da mesma
  cidade — o rollup; "Sem cidade"; ordenação desc + melhor/pior; exclui cancelados). Total do projeto
  443→448.
- **Alternativas consideradas:** (a) generalizar para um parâmetro `groupBy: "venue" | "city"` numa única
  função pública — escolhi duas funções nomeadas + helper privado, por legibilidade nas páginas e
  estabilidade dos testes existentes; (b) estado/UF em vez de cidade — o schema não tem campo de estado e
  parsear de texto livre é frágil; cidade é o dado confiável que existe; (c) trazer para o Painel —
  adiável (dashboard já denso).

## 2026-06-20 — D49: Conflitos de agenda = dias com 2+ shows não cancelados (sinal, não bloqueio)
- **Contexto:** a plataforma é uma ferramenta de booking; fechar dois compromissos para o mesmo
  dia por engano é um erro operacional caro (e constrangedor). Nenhuma tela apontava sobreposições
  na agenda.
- **Decisão:** nova função pura `findScheduleConflicts(shows, { now? })` em `src/lib/shows.ts` que
  agrupa os shows por dia (`dayKey`, UTC) e devolve apenas os dias com **2+ shows não cancelados**,
  em ordem cronológica, marcando cada dia como `upcoming` (hoje ou no futuro). Página `/shows/conflitos`
  lista os dias com os shows envolvidos; o Painel mostra um alerta âmbar **só** quando há conflitos
  `upcoming` (acionáveis); a lista `/shows` ganha um selo "Conflitos N" quando há qualquer conflito.
- **Justificativa:** é um **sinal**, não um bloqueio — um músico pode legitimamente fazer matinê +
  show à noite no mesmo dia, então não impedimos o cadastro; apenas destacamos para revisão. O
  `schema` só tem data (sem hora de término/duração), então "mesmo dia" é a granularidade confiável;
  não há como detectar sobreposição de horário de forma robusta. Cancelados não conflitam.
- **Alternativas consideradas:** (a) validar/bloquear no cadastro do show — descartado: invasivo e
  os double-headers são legítimos; (b) detectar sobreposição por janela de horário/duração —
  descartado: o schema não tem duração e a hora isolada do `date` é pouco confiável (muitos shows
  têm 00:00); (c) só na página, sem alerta no Painel — descartado: o valor está em ver o conflito
  **antes** de acontecer, e o Painel é a primeira tela. Reaproveita o padrão de alerta dos recebíveis
  (D32) e do funil (D43) trazidos ao dashboard.
- **`npm audit`:** inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de
  D6/D8; nenhuma dependência nova foi adicionada nesta sessão.

## D50 — Concentração de receita por contratante / risco de dependência (Sessão 58)
- **Contexto:** o CRM já tem três leituras de contatos — ranking por volume (D18), reativação de
  dormentes (D21) e fidelização/recompra (D47). Faltava a leitura de **risco**: quanto da receita
  depende de poucos contratantes. Perder um cliente que responde por 70% do cachê é um buraco grande
  na agenda, e nenhuma tela apontava essa exposição. Pergunta: "quão dependente sou de um único
  contratante?".
- **Decisão:** nova função pura `clientConcentration(items)` em `src/lib/contacts.ts` + página
  `/contatos/concentracao`. É o equivalente do mix de receitas (`incomeMix`/D45) no eixo de
  contratantes: soma o cachê por contato (shows não cancelados), calcula a participação de cada um,
  o HHI (Herfindahl), o nº efetivo de contratantes (1/HHI) e um veredito `concentrated`/`moderate`/
  `diversified`.
- **Consistência de limiares:** reusa os mesmos cortes de HHI da D45 (uma fonte só, ou HHI ≥ 0,45 →
  concentrada; ≥ 0,25 → moderada; abaixo → diversificada). Mantido um classificador local em
  `contacts.ts` (4 linhas) em vez de exportar o privado de `finance.ts`, para não acoplar os módulos
  por um detalhe trivial; o comentário aponta a D45 como fonte do critério.
- **Convenção de cachê por contato:** um show com vários contatos conta o cachê para **cada** contato
  (idêntico ao ranking D18 e à retenção D47), então o denominador é a soma desses cachês e as
  participações somam 1. É coerente com as outras telas de contato; mede dependência de contratantes
  como *fontes de booking*, não a receita bruta contábil.
- **Quem entra:** só contatos com cachê > 0 (shows não cancelados). Contatos sem faturamento não geram
  dependência e ficam de fora do universo (não inflam o nº de contratantes nem diluem o HHI).
- **Zero schema/dependência/server action:** usa `status`/`fee` dos shows já vinculados; nenhuma
  migração.
- **Alternativas consideradas:** (a) reaproveitar literalmente o tipo `IncomeMix` — descartado: os
  campos (categoria/transação) não casam com contratante/shows; tipos próprios são mais claros; (b)
  trazer o indicador para o Painel — adiável (dashboard já denso), a página dedicada e o link em
  `/contatos` bastam por ora; (c) ponderar pela receita realizada (transações recebidas) em vez do
  cachê acordado — descartado por ora: o cachê acordado é o dado direto da relação com o contratante;
  cruzar com as transações recebidas é uma evolução possível.
- **`npm audit`:** inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de
  D6/D8; nenhuma dependência nova foi adicionada nesta sessão.

## D51 — Prazo de recebimento (DSO realizado dos cachês) (Sessão 59)
- **Contexto:** o ciclo de recebíveis já cobria o que **ainda falta** receber — `reconcileShowFees`
  (D25) lista o saldo em aberto e `bucketReceivablesByAge` (D31) mede há quanto tempo está parado.
  Faltava a leitura **realizada**: sobre o dinheiro que **já entrou**, quanto tempo depois do show
  ele caiu no caixa. Sem isso o músico não sabe quanto adiantar/planejar de caixa entre tocar e
  receber, nem quais contratantes pagam rápido. Pergunta: "depois que toco, em quanto tempo recebo?".
- **Decisão:** nova função pura `paymentLag(shows, txs)` em `src/lib/finance.ts` + página
  `/shows/prazo-recebimento`. Mede, sobre receitas **INCOME já recebidas** (`received=true`)
  vinculadas a um show, o prazo = dias (UTC, por dia) entre a data do show e a data do pagamento.
  Agrega por show (`avgDays` ponderado pelo valor de cada recebimento; `lastDays` = pior prazo) e
  expõe o **prazo médio global ponderado pelo valor** (o "DSO" do caixa), além de baldes de
  velocidade e dos shows mais rápido/mais lento.
- **Baldes de velocidade** (`paymentSpeedBucket`): no dia ou adiantado (≤0) / até 7 / 8–30 / 31–60 /
  mais de 60 dias. Limiares são **hipótese de produto** (faixas usuais de prazo de pagamento no
  Brasil); ajustáveis. Distintos dos baldes de aging (D31, 30/60/90) de propósito: aging prioriza
  cobrança do que está velho; aqui o foco é o tempo típico até pagar.
- **Prazo negativo = adiantado:** pagamento antes da data do show (sinal/cachê adiantado) é válido e
  informativo, então NÃO é zerado — cai no balde "no dia ou adiantado" e aparece como "N d adiantado".
- **Ponderação pelo valor (não por contagem):** o prazo médio pondera cada real, não cada
  recebimento — um recebimento grande e lento pesa mais que vários pequenos e rápidos, que é o que
  importa para o caixa. Coerente com `weightedAvgDays` do aging (D31).
- **Quem entra:** só shows **não cancelados** (a data do show é a âncora) e recebimentos com valor > 0
  vinculados (`showId`). Pendentes (`received=false`), despesas e receitas avulsas (sem `showId`)
  ficam de fora — o universo é "cachê de show que efetivamente foi pago". Difere do `reconcileShowFees`,
  que olha só PLAYED/CONFIRMED-passado; aqui qualquer show pago conta (até futuro pago adiantado).
- **Zero schema/dependência/server action:** usa `date`/`status`/`fee` dos shows e `date`/`amount`/
  `received`/`showId` das transações já existentes; nenhuma migração. Página é server component puro.
- **Alternativas consideradas:** (a) mediana em vez de média ponderada — adiável; a média ponderada
  pelo valor é o número de caixa direto e mais fácil de explicar, mediana fica como evolução; (b)
  trazer o DSO para o Painel — adiável (dashboard já denso), a página dedicada e o link em `/shows`
  bastam por ora; (c) reaproveitar os baldes de aging (D31) — descartado: prazo realizado e atraso
  pendente têm faixas e sinais diferentes; (d) quebrar o prazo por contratante (quem paga rápido) —
  evolução natural possível reusando os contatos vinculados ao show.
- **`npm audit`:** inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de
  D6/D8; nenhuma dependência nova foi adicionada nesta sessão.

## D54 — Hub central de Relatórios (Sessão 62)
- **Contexto:** o app acumulou 24 páginas de análise (rentabilidade, recebíveis, prazo de
  recebimento, sazonalidade, custos fixos, retenção, concentração…), todas alcançáveis só por
  **barras de botões** que foram crescendo no topo de `/shows` (12 links) e `/financas`. A navegação
  principal tinha apenas Painel/Shows/Finanças/Contatos. Resultado: relatórios valiosos ficavam
  enterrados e dependiam de o usuário lembrar em qual lista o botão morava — um problema real de
  discoverability, não mais um relatório a somar.
- **Decisão:** criar um **hub** em `/relatorios` que indexa todo o acervo, e um item **Relatórios**
  na navegação principal (desktop + mobile). O catálogo é **dado puro** em `src/lib/reports.ts`
  (`REPORT_GROUPS` por área — Shows/Finanças/Contatos — com título, href, descrição e ícone; helpers
  `allReports`/`reportCount`), de modo que a página é só renderização e a corretude do catálogo é
  **testável** por invariantes (hrefs únicos e absolutos, sem título/descrição vazios, cada href no
  prefixo da sua área, grupos não vazios) — 9 testes novos.
- **Fonte única:** registrar um relatório passa a ser editar `REPORT_GROUPS` num único lugar; o hub e
  os testes refletem automaticamente. As barras de botões existentes em `/shows` e `/financas` foram
  **mantidas** (atalhos contextuais não-quebrados); o hub é aditivo, não uma migração arriscada.
- **Sem schema/dependência/server action:** a página exige só sessão (`requireUser`), sem consulta ao
  banco — é navegação pura. Nenhuma dependência nova.
- **Alternativas consideradas:** (a) gerar o catálogo varrendo o filesystem de rotas — descartado:
  frágil, sem descrições editoriais e sem controle de ordem; o registro manual é a fonte de verdade;
  (b) remover as barras de botões e centralizar tudo no hub — descartado nesta sessão: mudança ampla e
  arriscada em ~15 páginas; o hub aditivo entrega o valor sem regressão (a poda das barras fica como
  evolução possível); (c) submenu suspenso na navbar — descartado: 24 itens não cabem num dropdown
  legível; uma página com cards agrupados e descrições é mais navegável e acessível.
- **`npm audit`:** inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de
  D6/D8; nenhuma dependência nova foi adicionada nesta sessão.

## D53 — Distribuição de cachês por faixa de preço (Sessão 61)
- **Contexto:** a análise de preços tinha só a leitura **temporal** — `feeTrend` (D44) mostra a
  evolução do cachê médio mês a mês ("estou cobrando mais?"). Faltava o **formato** da tabela de
  cachês num retrato único: em que faixa de preço o músico mais toca e onde está concentrado o
  faturamento. Média sozinha engana (um show de R$ 8.000 infla a média de uma agenda de bares de
  R$ 400). Pergunta: "em que faixa eu mais toco e de onde vem o dinheiro?".
- **Decisão:** nova função pura `feeDistribution(shows)` em `src/lib/finance.ts` + página
  `/shows/faixas-de-cache`. Distribui os cachês dos shows **já realizados** pelas faixas fixas de
  `FEE_BANDS`, com count, total, participação no nº de shows (`countShare`) e no faturamento
  (`feeShare`) por faixa, mais `avgFee`, `medianFee`, `modalBand` (faixa típica) e `topValueBand`
  (onde está o faturamento). Reusa a mesma noção de "realizado" e `fee > 0` de `feeTrend`/`weekdayPerformance`.
- **Mediana além da média:** `medianFee` entra como número robusto a outliers (metade cobra acima,
  metade abaixo) — exatamente o que a evolução da D44 deixou como "adiável" (ver alternativa (a) da
  D51, mesma lógica). Helper `median()` privado, par → média arredondada dos dois centrais.
- **Faixas fixas (`FEE_BANDS`) são hipótese de produto:** até R$ 500 / 500–1k / 1k–2k / 2k–3,5k /
  3,5k–5k / acima de 5k (centavos). Limiares refletem o mercado indie pt-BR e **podem não servir a
  todo segmento** — sinalizado na UI e aqui; ajustáveis. `min` inclusivo, `max` exclusivo (um cachê
  no limite cai na faixa de cima). `feeBandKeyFor` exportada para teste de fronteira.
- **Desempates determinísticos:** `modalBand` = mais shows, empate → maior faturamento, depois faixa
  mais alta; `topValueBand` = maior faturamento, empate → mais shows, depois faixa mais alta (mesma
  estratégia `pick(rank, tiebreak)` de `weekdayPerformance`). `bands` sempre traz as 6 faixas (mesmo
  as zeradas) para o gráfico não pular.
- **Zero schema/dependência/server action:** usa `date`/`status`/`fee` dos shows existentes; nenhuma
  migração. Página é server component puro; link "Faixas de cachê" em `/shows`, ao lado de "Evolução
  do cachê" (D44), com que forma o par tempo×distribuição da análise de preços.
- **Alternativas consideradas:** (a) faixas dinâmicas (quartis/percentis dos próprios dados) —
  descartado por ora: faixas fixas em R$ são mais legíveis e comparáveis entre meses; quartis ficam
  como evolução; (b) trazer a faixa típica para o Painel — adiável (dashboard já denso, mesma postura
  da D51 alt. (b)); (c) histograma por bin uniforme — descartado: faixas de mercado significativas
  comunicam melhor que bins aritméticos.
- **`npm audit`:** inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de
  D6/D8; nenhuma dependência nova foi adicionada nesta sessão.

## D52 — Prazo de recebimento por contratante (quem paga rápido x devagar) (Sessão 60)
- **Contexto:** o prazo de recebimento (D51) responde "em quanto tempo recebo?" no geral e por show,
  mas não diz *quem* paga rápido e quem deixa esperando — informação que o músico usa para negociar
  prazos, dar prioridade e decidir com quem voltar a tocar. Evolução já antecipada na alternativa (d)
  da D51.
- **Decisão:** nova função pura `paymentLagByContact(shows, txs, getPayer)` em `src/lib/finance.ts` +
  página `/shows/prazo-recebimento/por-contratante`. **Reaproveita `paymentLag`** (a mesma regra de
  quem entra e o cálculo de prazo por show) e só **redistribui os shows pelo pagador**, agregando o
  prazo ponderado pelo valor por contratante. Sem recomputar nada — DRY total sobre a D51.
- **Atribuição do pagador:** cada show é atribuído a UM contato responsável pelo pagamento, escolhido
  por papel via a nova `pickPayerContact(contacts)` em `src/lib/billing.ts` — reusa a ordenação de
  prioridade de cobrança da D27/D30 (BOOKER/PROMOTER antes de VENUE; desempate por nome pt-BR/id),
  mas, ao contrário de `pickBillingContact`, **NÃO exige canal** (e-mail/telefone): para *agrupar* por
  quem paga, o contratante conta mesmo sem dado de contato cadastrado.
- **Grupo "Sem contratante":** shows pagos sem nenhum contato vinculado caem num grupo de chave nula,
  que é sempre ordenado **por último** (não é um contratante de verdade) e fica **fora** de
  `contactCount`/`slowest`/`fastest`. Mantém a página honesta sem inventar atribuição.
- **Ordenação e métricas:** grupos do prazo médio mais lento ao mais rápido (o problema de caixa no
  topo); dentro de cada grupo os shows herdam a ordenação lento→rápido de `paymentLag`. O prazo de
  cada contratante pondera os shows pelo valor recebido (coerente com D31/D51); `slowest`/`fastest`
  dão os destaques "paga mais devagar/rápido".
- **`getPayer` como callback (decoupling):** a função pura recebe o seletor de pagador por parâmetro
  em vez de importar `billing` — mantém `src/lib/finance.ts` sem imports (núcleo puro), com a página
  injetando `pickPayerContact`. Finance faz a matemática; billing decide quem é o pagador.
- **Zero schema/dependência/server action:** usa os contatos já vinculados (`ContactsOnShows`) e as
  transações existentes; nenhuma migração. Página é server component puro, cruza-link com
  `/contatos/[id]` e com a página geral `/shows/prazo-recebimento` (botão "Por contratante").
- **Alternativas consideradas:** (a) atribuir o pagamento ao contato cujo papel pagou *de fato* —
  descartado: não há vínculo transação↔contato no schema, só show↔contato; a escolha por papel é a
  melhor heurística sem nova modelagem; (b) ratear um show entre vários contatos — descartado:
  complica sem ganho (o pagador é um só na prática), e o show é a unidade de prazo; (c) exigir canal
  (reusar `pickBillingContact`) — descartado: excluiria contratantes sem e-mail/telefone do
  agrupamento, distorcendo a leitura.
- **`npm audit`:** inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de
  D6/D8; nenhuma dependência nova foi adicionada nesta sessão.

## D55 — Podar as barras de relatórios apontando para o hub (Sessão 63)
- **Contexto:** a D54 criou o hub `/relatorios` (catálogo de todos os relatórios) e o item na navbar,
  mas **manteve as barras de botões** no topo de `/shows`, `/financas` e `/contatos` como atalhos —
  explicitamente deixando a *poda* das barras como "evolução possível" (alternativa c da D54). Essas
  barras tinham crescido demais: `/shows` carregava ~10 links de relatório no cabeçalho, `/financas` 8
  e `/contatos` 4, competindo visualmente com as ações primárias (+ Novo / Exportar) e quebrando linha.
- **Decisão:** substituir, em cada uma das três listas, o bloco de links de relatório por **um único
  link "Relatórios"** que aponta para a seção correspondente do hub via âncora (`/relatorios#shows`,
  `/relatorios#financas`, `/relatorios#contatos`). As seções do hub ganharam `id={group.area}` +
  `scroll-mt-24` para o salto âncora respeitar o cabeçalho fixo. O hub passa a ser a fonte única de
  descoberta de relatórios; registrar um relatório novo continua sendo só editar `REPORT_GROUPS`.
- **O que ficou nas barras (não é relatório):** ações *operacionais* e *contextuais* permanecem —
  alternador de visões Lista/Semana/Mês e **Exportar .ics** em `/shows`, **Exportar CSV** (age sobre o
  recorte filtrado) em `/financas`, e os botões primários **+ Novo show / + Nova transação / + Novo
  contato**. O atalho **Conflitos** de `/shows` foi mantido por ser um *alerta com estado vivo* (badge
  de contagem + destaque âmbar para conflitos futuros) que o hub estático não consegue sinalizar.
- **Sem schema/dependência/server action:** mudança puramente de UI/navegação. Nenhuma rota foi
  removida — todos os relatórios continuam acessíveis (agora pelo hub); as âncoras só melhoram o salto.
- **Alternativas consideradas:** (a) remover também o link por página, confiando só na navbar global —
  descartado: o link contextual ancorado leva direto à seção da área onde o usuário está, com menos
  cliques; (b) manter as barras — descartado: era exatamente o problema de poluição que a D54 sinalizou
  para resolver depois; (c) mover Conflitos/Exportar para o hub — descartado: não são relatórios e
  perderiam o estado/contexto da lista (badge de conflito, recorte filtrado do CSV).
- **`npm audit`:** inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de
  D6/D8; nenhuma dependência nova foi adicionada nesta sessão.

## D56 — Busca textual no hub de Relatórios (Sessão 64)
- **Contexto:** o hub `/relatorios` (D54) reúne 24 relatórios em três grupos. Com o acervo passando de
  duas dezenas, percorrer todos os cards para achar um relatório específico ficou custoso — o item 0
  dos próximos passos previa "um campo de busca/filtro no hub conforme o acervo cresce".
- **Decisão:** adicionar um **campo de busca ao vivo** no topo do hub que filtra os cards conforme o
  texto digitado. A lógica é uma função pura `filterReports(query)` em `src/lib/reports.ts` (fonte
  única do catálogo): casa insensível a acento/caixa (reusa `normalizeText` de `finance.ts`),
  **multitermo AND** (cada termo precisa aparecer na mesma entrada) e varre **título + descrição +
  rótulo do grupo** — assim "shows" traz todos os relatórios da área, e "prazo contratante" só casa o
  relatório que tem ambos. Grupos sem nenhuma entrada casada são omitidos; consulta vazia devolve tudo
  (cópia rasa, sem mutar `REPORT_GROUPS`). `countFilteredReports` deriva a contagem para o "N de M".
- **UI:** o filtro roda no **cliente** (`ReportsBrowser.tsx`, `"use client"`) sobre o catálogo estático
  — sem ida ao servidor a cada tecla. A página `/relatorios` continua server component (auth + cabeçalho)
  e delega a lista ao browser. Os `id={group.area}`/`scroll-mt-24` foram preservados, então as âncoras
  `#shows`/`#financas`/`#contatos` das listas (D55) seguem funcionando. Estado vazio honesto quando
  nada casa; contador "N de M relatórios" aparece só quando há filtro ativo.
- **Alternativas consideradas:** (a) filtro no servidor via query string — descartado: o catálogo é
  estático e pequeno; filtrar no cliente é instantâneo e não exige reload. (b) agrupar por subtema dentro
  de cada área (outra opção do item 0) — adiável; com busca, achar um relatório já fica direto. (c)
  match OR em vez de AND — descartado: AND é mais preciso para refinar conforme se digita.
- **Sem schema/dependência/server action.** `npm audit` inalterado (10 advisories — 4 moderate / 5 high
  / 1 critical), mesma postura de D6/D8; nenhuma dependência nova.

## D57 — Prazo MEDIANO de recebimento (mediana ponderada, robusta a outlier) (Sessão 65)
- **Contexto:** a página `/shows/prazo-recebimento` (D51) destaca o **prazo médio ponderado pelo valor**
  (o "DSO" do músico). A média é sensível a outlier: um único cachê pago muito atrasado (ex.: 90 dias)
  infla o número e dá a impressão falsa de que "todo mundo paga devagar", mesmo quando a maioria pagou
  em dias. Faltava uma leitura **típica**, resistente a esse efeito — o item 5 dos próximos passos já
  previa "a mediana do prazo (além da média ponderada)".
- **Decisão:** expor `medianDays` no `PaymentLag` (`src/lib/finance.ts`) — a **mediana ponderada pelo
  valor** sobre o prazo de cada show: o dia em que metade do faturamento recebido já tinha entrado.
  Usa os **mesmos insumos do DSO médio** (o `avgDays` de cada show, ponderado pelo `received`), então
  as duas métricas contam a mesma história com pesos consistentes — uma é a média, a outra a mediana.
  Helper interno puro `weightedMedian({value, weight}[])`: ordena por valor, acumula peso e devolve o
  menor valor cujo acumulado alcança metade do peso total (convenção do "meio": se o acumulado bate
  exatamente na metade num item, média desse valor com o próximo); pesos <= 0 ignorados; vazio → 0.
- **UI:** novo card "Prazo mediano (ponderado)" ao lado de "Prazo médio (ponderado)" (a grade de
  destaques passou de 3 para 4 colunas em telas largas), com nota de que ele resiste a um atraso
  isolado, e o rodapé explicativo atualizado. Não toca a tabela por show nem a distribuição por faixa.
- **Alternativas consideradas:** (a) mediana sobre os recebimentos individuais (cada transação) em vez
  de por show — descartado: o DSO médio já agrega por show (avgDays ponderado), então a mediana sobre
  os mesmos pontos mantém a coerência; medir por transação misturaria duas granularidades. (b) mediana
  **não** ponderada (cada show conta igual) — descartado: distorceria a leitura de caixa, em que um
  show de R$ 5.000 pesa mais que um de R$ 200; a ponderação por valor responde "metade do dinheiro
  entrou até quando". (c) também por contratante (`paymentLagByContact`) — adiável: com poucos shows
  por contratante a mediana fica ruidosa; a global é a mais útil e fica como leitura primária.
- **Sem schema/dependência/server action.** `npm audit` inalterado (10 advisories — 4 moderate / 5 high
  / 1 critical), mesma postura de D6/D8; nenhuma dependência nova.

## D58 — Agrupar os relatórios por subtema dentro de cada área no hub (Sessão 66)
- **Contexto:** o hub `/relatorios` (D54) já reúne 24 relatórios em 3 grandes áreas (Shows/Finanças/
  Contatos) com busca textual (D56). Mas a área **Shows** sozinha tem 12 cards num bloco único — uma
  grade longa e indiferenciada onde "Funil de propostas", "Rentabilidade por show", "Cachês a receber"
  e "Prazo de recebimento" se misturam, embora respondam a perguntas de naturezas distintas (agenda,
  preço, dinheiro a entrar). Era o item 0 dos próximos passos: "agrupar visualmente os relatórios por
  subtema dentro de cada área".
- **Decisão:** adicionar um campo **`subtopic` (obrigatório)** a cada `ReportEntry` em
  `src/lib/reports.ts` e renderizar cada área como subseções por subtema. Os subtemas escolhidos:
  Shows → *Agenda & pipeline*, *Rentabilidade & preço*, *Recebíveis*; Finanças → *Fechamentos*,
  *Receitas & pendências*, *Custos & metas*; Contatos → *Quem move a carreira*, *Relacionamento*. As
  entradas de `REPORT_GROUPS` foram **reordenadas para ficarem contíguas por subtema** (sem mudar
  hrefs nem remover relatórios), e um teste de invariante garante que continuem contíguas.
- **Lógica pura:** nova `subgroupEntries(entries)` agrupa por subtema preservando a ordem de primeira
  aparição do subtema e a ordem das entradas dentro dele (sem mutar) — testável e reutilizável fora do
  React. A busca `filterReports` passou a varrer também o `subtopic` no haystack: buscar "recebíveis"
  agora traz o subtema inteiro, do mesmo modo que buscar a área traz todos os seus relatórios.
- **UI:** `ReportsBrowser.tsx` passou a iterar `subgroupEntries(group.entries)` dentro de cada
  `<section>`, com um subcabeçalho `<h3>` discreto (uppercase, menor que o `<h2>` da área) por
  subtema. As âncoras `#shows`/`#financas`/`#contatos` (D55) seguem na `<section>` da área — intactas.
- **Alternativas consideradas:** (a) deixar o `subtopic` opcional e cair num bloco "sem subtema" —
  descartado: com só 24 entradas vale a pena classificar todas e manter o tipo estrito; (b) criar um
  3º nível de navegação/âncoras por subtema — descartado: excesso para o tamanho atual, os
  subcabeçalhos visuais já bastam; (c) ordenar os subtemas alfabeticamente — descartado: a ordem
  editorial (do mais decisivo ao mais específico) comunica melhor, e a contiguidade em `REPORT_GROUPS`
  já a define.
- **Sem schema/dependência/server action.** `npm audit` inalterado (10 advisories — 4 moderate / 5
  high / 1 critical), mesma postura de D6/D8; nenhuma dependência nova.

## D61 — Projeção de fechamento do ano no Painel (Sessão 69)
- **Contexto:** a projeção de fechamento do ano (D60, `/financas/projecao-ano`) responde à pergunta de
  planejamento "como fecho o ano?", mas vivia só num relatório que exige navegar até as Finanças. O
  Painel já é a primeira tela e carrega **todas** as transações e shows do usuário — então o número
  mais importante do planejamento podia aparecer ali sem custo de consulta.
- **Decisão:** card "Projeção de {ano}" no Painel (`dashboard/page.tsx`) que chama `projectYearEnd(txs,
  shows, anoCorrente)` com os dados já em memória (zero consulta extra) e mostra o **resultado projetado
  do ano** com a composição em uma linha (receitas − despesas, caixa realizado hoje, e o destaque do
  cachê agendado de shows futuros). O card inteiro é um link para `/financas/projecao-ano` (detalhe).
- **Quando aparece:** só quando há um componente **futuro** que muda o caixa realizado —
  `scheduledIncome > 0 || pendingIncome > 0 || pendingExpense > 0`. Se tudo do ano já foi realizado, o
  projetado == realizado e o card seria redundante com os cards de resumo; nesse caso fica oculto.
- **Posição:** logo após os cards de resumo e antes da Projeção de caixa — o ano inteiro (visão macro)
  antes do mês-a-mês de caixa (visão de curto prazo), seguindo a ordem do raciocínio de planejamento.
- **Alternativas consideradas:** (a) um quinto card de resumo no grid — descartado: o resultado
  projetado precisa de contexto (composição, agendado) que não cabe no formato compacto do
  `SummaryCard`. (b) sempre exibir — descartado pela redundância acima. (c) permitir trocar de ano no
  Painel — desnecessário: o Painel é "agora", a navegação por ano vive no relatório.
- **Sem schema/dependência/server action nem lógica nova** — reaproveita a função pura `projectYearEnd`
  (já testada em `finance.test.ts`), só UI. `npm audit` inalterado (10 advisories — 4 moderate / 5 high
  / 1 critical), mesma postura de D6/D8/D60.

## D60 — Projeção de fechamento do ano (Sessão 68)
- **Contexto:** os relatórios financeiros olhavam para trás (Resumo anual, Sazonalidade, Relatório
  mensal) ou para frente em peças isoladas: **Receita agendada** projeta só cachês de shows futuros,
  e **Projeção de caixa** (D-cashflow) projeta o saldo de caixa mês a mês. Faltava juntar tudo na
  pergunta de planejamento que decide investir/segurar custo: "se nada mudar, como fecho o ANO inteiro?".
- **Decisão:** novo relatório `/financas/projecao-ano` com a função pura `projectYearEnd(txs, shows,
  year, {now})`. A receita projetada soma três fontes: (1) **realizado** (transações do ano com
  `received=true`), (2) **pendente lançado** (`received=false`) e (3) **cachê agendado** dos shows
  futuros do ano (data ≥ hoje, não CANCELLED, fee>0). A despesa projetada soma só (1)+(2).
- **Anti-dupla-contagem:** o cachê agendado de cada show entra como `max(0, fee − receita INCOME já
  vinculada ao show em QUALQUER período)` — assim um sinal/depósito já lançado para o show não é
  contado de novo via agenda. Reusa `isConfirmedBooking` para separar `scheduledConfirmed` (CONFIRMED/
  PLAYED) de `scheduledTentative` (PROPOSED/sem status), e `utcMidnight`/`monthKey` para o recorte.
- **Assimetria deliberada (receita futura sim, despesa futura não):** a agenda é um compromisso firme
  de dinheiro a entrar, então projetar cachê futuro é honesto; já "adivinhar" despesas recorrentes
  futuras seria especulativo e duplicaria o relatório de **Custos fixos**. A projeção é portanto
  **conservadora no resultado** (despesa só do que já está lançado), e a UI explicita isso com nota +
  link para Custos fixos. Risco: pode parecer otimista demais; mitigado pela transparência da
  composição (cada parcela aparece separada) e anotado como hipótese de UX a validar.
- **Alternativas consideradas:** (a) incluir uma estimativa de custo recorrente futuro (via
  `recurringExpenses`) — adiada: vira um cenário "com custos fixos" opcional (ver próximos passos),
  não o default, para não misturar fato com estimativa. (b) basear a receita futura em pendências de
  finanças em vez da agenda — descartado: a agenda (cachê do show) é a fonte mais completa do que está
  por vir; pendências lançadas já entram separadas. (c) projetar por mês (curva) em vez de total do ano
  — adiado: o total responde a pergunta principal; a curva já existe na Projeção de caixa.
- **Sem schema/dependência/server action.** Página só de leitura, carrega transações + shows do ano em
  `Promise.all`. `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma
  postura de D6/D8; nenhuma dependência nova.

## D59 — Sumário de salto rápido por subtema no hub de Relatórios (Sessão 67)
- **Contexto:** com 24 relatórios distribuídos em 8 subtemas (D58), o hub `/relatorios` virou uma
  página longa. As âncoras de área `#shows`/`#financas`/`#contatos` (D55) já existiam, mas não havia
  como pular direto a um subtema (ex.: "Recebíveis") sem rolar e procurar o subcabeçalho. Era o
  "próximo possível" do item 0: "âncoras/salto por subtema, ou um índice de subtemas no topo".
- **Decisão:** gerar âncoras de subtema e um índice navegável a partir do catálogo (fonte única
  `REPORT_GROUPS`), e renderizar um `<nav>` "Ir para um tema" no topo do hub. Cada subtema vira uma
  pílula-âncora com a contagem de relatórios; clicar leva à subseção correspondente.
- **Lógica pura** (`src/lib/reports.ts`): `subtopicSlug(area, subtopic)` deriva um id de âncora
  estável `<area>-<subtema-kebab>` (via `normalizeText`, sem acento/caixa) — **prefixado pela área**
  para que subtemas homônimos de áreas diferentes não colidam. `reportsNavIndex()` devolve, na ordem
  do hub, cada área (rótulo + âncora + contagem) com seus subtemas (subtema + âncora + contagem),
  reusando `subgroupEntries`. Ambas testáveis fora do React; testes garantem formato do slug,
  determinismo, não-colisão entre áreas, soma das contagens e unicidade das âncoras.
- **UI** (`ReportsBrowser.tsx`): o `<nav>` lê `reportsNavIndex()` e **some durante a busca** (quando
  a lista já está recortada pelo filtro — manter o índice cheio confundiria). Cada subseção de subtema
  recebeu `id={subtopicSlug(...)}` + `scroll-mt-24` (mesma classe das âncoras de área) para o salto
  parar abaixo do cabeçalho fixo.
- **Alternativas consideradas:** (a) scroll-spy destacando a seção visível — descartado por ora:
  exige JS de observação no client e ganho marginal para o tamanho atual; fica como próximo passo.
  (b) índice só de áreas (sem subtemas) — descartado: as áreas já têm âncora desde D55; o valor novo é
  justamente saltar ao subtema. (c) duplicar a lista de subtemas à mão no componente — descartado:
  violaria a fonte única; `reportsNavIndex` deriva tudo do catálogo, então novos relatórios entram no
  índice automaticamente.
- **Sem schema/dependência/server action.** `npm audit` inalterado (10 advisories — 4 moderate / 5
  high / 1 critical), mesma postura de D6/D8; nenhuma dependência nova.

## D62 — Cenário "com custos fixos" na projeção de fechamento do ano (Sessão 70)
- **Contexto:** `projectYearEnd` (D60) deliberadamente NÃO inventa despesas futuras — só conta o
  realizado + o pendente já lançado. Isso deixa o **resultado projetado otimista**: os custos fixos
  recorrentes (aluguel de sala, streaming, telefone…) que ainda vão se repetir até dezembro não
  entram. A plataforma já estima esse custo (`recurringExpenses.estimatedMonthlyFixedCost`, D39), então
  dava para oferecer uma leitura mais conservadora sem reintroduzir a assimetria no número principal.
- **Decisão:** função pura nova `projectYearEndWithFixedCosts(forecast, txs, monthlyFixedCost, {now})`
  (em `src/lib/finance.ts`) que **camada por cima** do `YearEndForecast`, somando o custo fixo típico
  aos meses futuros do ano. Card opcional "Cenário com custos fixos" em `/financas/projecao-ano`,
  mostrado abaixo do resultado projetado cru (que segue como número principal, preservando o default
  da D60).
- **Modelo (evitar dupla contagem / não superestimar):**
  - Só vale para o **ano corrente** (`forecast.isCurrentYear`); ano passado/futuro degrada para o
    forecast cru (`monthsEstimated = 0`).
  - Aplica o custo fixo só aos meses **estritamente posteriores** ao mês de `now` — o mês corrente já
    está parcialmente realizado, então fica de fora para não superestimar.
  - Um mês futuro que **já tenha qualquer despesa lançada** (recebida ou pendente) é considerado
    coberto e não recebe o custo fixo, evitando contagem dupla com o pendente já projetado.
  - `monthlyFixedCost ≤ 0` zera a estimativa (`applicable = false`).
- **Justificativa:** responde "e se eu contar as contas fixas que ainda vão cair?" sem mexer no número
  conservador-por-design da D60. O músico vê os dois lados: o piso (projeção crua, sem despesa futura
  inventada) e o teto pessimista (com o custo fixo recorrente projetado).
- **Alternativas consideradas:** (a) embutir o custo fixo direto em `projectYearEnd` — descartado:
  violaria a decisão explícita da D60 de não projetar despesas e quebraria os testes/contrato
  existentes; layer separado e opt-in é mais honesto. (b) incluir o mês corrente na estimativa —
  descartado: superestimaria, pois parte do mês já está realizada e contabilizada. (c) ratear o custo
  fixo proporcionalmente em meses que já têm alguma despesa não-fixa — descartado por complexidade e
  baixa precisão; tratar "mês com despesa lançada" como coberto é a aproximação simples e defensável.
- **Sem schema/dependência/server action.** Lógica pura testada (6 casos novos em `finance.test.ts`).
  `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova.

## D63 — Projeção do ano vs. fechamento do ano anterior (Sessão 71)
- **Contexto:** a projeção de fechamento (D60) e seus derivados (cenário com custos fixos, D62; card no
  Painel, D61) respondem "como fecho ESTE ano?", mas sozinhos não dizem se isso é bom ou ruim. Faltava a
  leitura de planejamento que ancora o número num referencial: "estou no caminho de fechar **melhor que
  o ano passado**?". É a pergunta que decide se dá para relaxar, segurar custo ou correr atrás de show.
- **Decisão:** função pura nova `compareYearEndToPrevious(current, previous)` → `YearEndComparison`
  (em `src/lib/finance.ts`), que opera sobre **dois `YearEndForecast` já calculados** e reusa
  `computeDelta` (D — comparativos) para resultado, receita e despesa projetados. Card "vs. {ano
  anterior}" em `/financas/projecao-ano`, logo abaixo do resultado projetado, com a frase de salto
  ("deve fechar X acima/abaixo de {ano-1}") e dois mini-cards (Receitas/Despesas) com variação %.
- **Modelo:**
  - Compara os campos **projetados** (`projectedResult/Income/Expense`). Para o ano corrente é a
    projeção; para um ano **já encerrado**, `projectYearEnd` degrada esses campos para o resultado de
    competência lançado (sem shows futuros) — que é o fechamento real do ano, a base natural de
    comparação. Não foi preciso uma função especial de "ano fechado".
  - `direction` de cada `MetricDelta` reflete só o **sinal**; a UI decide o que é bom (resultado/receita
    subir = verde) vs. ruim (despesa subir = vermelho), via prop `goodWhenUp`.
  - `hasPreviousData = false` quando o ano anterior não teve receita nem despesa → a UI **omite** o card
    (comparar contra zero não informa; `pct` já é `null` nesse caso, herdado de `computeDelta`).
  - A página passou a carregar shows de `year-1..year` (antes só `year`) para que a projeção do ano
    anterior fique correta mesmo ao navegar para um ano futuro; os shows passados não geram receita
    agendada, então o custo é só de I/O.
- **Justificativa:** transforma um número absoluto ("R$ X") num número com significado ("R$ X, +25% vs.
  o ano passado"), reaproveitando 100% da lógica existente (dois `projectYearEnd` + `computeDelta`).
  Zero schema, zero dependência, zero server action.
- **Alternativas consideradas:** (a) comparar contra uma **meta** definida pelo usuário — descartado por
  ora: exigiria schema/CRUD de metas; o ano anterior é uma régua que já existe nos dados, sem fricção.
  (b) comparar o **caixa realizado** (`realizedResult`) em vez do projetado — descartado: o realizado de
  meio de ano contra o fechamento cheio do ano anterior é maçã-com-laranja; projetado-contra-fechado é a
  comparação honesta de "vou terminar melhor?". (c) comparar mês-a-mês acumulado (run-rate) — adiável,
  mais ruidoso; o agregado anual é a leitura de planejamento pedida.
- **Sem schema/dependência/server action.** Lógica pura testada (2 casos novos em `finance.test.ts`).
  `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova.

## D64 — Comparação vs. ano anterior no card de projeção do Painel (Sessão 72)
- **Contexto:** a Sessão 71 (D63) entregou a comparação "vs. {ano anterior}" no relatório
  `/financas/projecao-ano`, mas o card "Projeção de {ano}" do Painel (D61) mostrava só o número absoluto
  projetado. Faltava a leitura de planejamento — "estou indo melhor que ano passado?" — já na primeira
  tela, sem exigir abrir o relatório. É a pergunta que decide se dá para relaxar ou correr atrás de show.
- **Decisão:** reaproveitar 100% a função pura `compareYearEndToPrevious` (D63) no dashboard. O Painel já
  carrega **todos** os shows e transações do usuário, então basta um segundo `projectYearEnd` para
  `currentYear - 1` sobre os mesmos dados (zero consulta extra) e passá-lo, junto do forecast do ano
  corrente, a `compareYearEndToPrevious`. Renderiza uma pílula compacta `YoYBadge` ("▲/▼ X% vs. {ano-1}")
  ao lado do resultado projetado, só quando `comparison.hasPreviousData`.
- **Modelo/UI:** a pílula é deliberadamente mais enxuta que o card do relatório (que tem frase de salto +
  mini-cards de receita/despesa) — no Painel cabe só o sinal sobre o **resultado** projetado (verde sobe /
  vermelho desce / neutro empata), com o fechamento do ano-1 no `title` (hover). Quem quer o detalhe
  segue o link "Ver detalhe" já existente para `/financas/projecao-ano`.
- **Justificativa:** transforma o número absoluto do card numa leitura com referencial, reusando lógica
  pura já testada (`finance.test.ts`, D63) — zero schema, zero dependência, zero server action, zero novo
  teste (mudança de UI, mesma postura das Sessões 69/71).
- **Alternativas consideradas:** (a) trazer também os mini-cards de receita/despesa para o Painel —
  descartado: polui o card do dashboard, que deve ser um resumo escaneável; o detalhe vive no relatório.
  (b) comparar o caixa realizado em vez do projetado — descartado pela mesma razão da D63 (maçã com
  laranja); projetado-contra-fechado é a comparação honesta.
- **Sem schema/dependência/server action/teste novo.** `npm audit` inalterado (10 advisories — 4 moderate
  / 5 high / 1 critical), mesma postura de D6/D8; nenhuma dependência nova.

## D65 — Cenário "com custos fixos" no card de projeção do Painel (Sessão 73)
- **Contexto:** a Sessão 70 (D62) entregou o cenário conservador `projectYearEndWithFixedCosts` num
  **card próprio** em `/financas/projecao-ano`, fechando a assimetria deliberada da projeção crua (D60),
  que projeta a receita futura mas não inventa despesa. O card "Projeção de {ano}" do Painel (D61/D64)
  mostrava só o número crú — e é justamente esse número otimista-por-design que o músico vê primeiro,
  podendo superestimar o quanto vai sobrar. Faltava o sinal conservador já na primeira tela.
- **Decisão:** reaproveitar 100% a lógica pura `projectYearEndWithFixedCosts` + `recurringExpenses` (D62/D39)
  no dashboard. O Painel já carrega todas as transações/shows do usuário, então é zero consulta extra:
  estima-se o custo fixo mensal típico (`recurringExpenses(txs).estimatedMonthlyFixedCost`) e passa-se ao
  cenário sobre o forecast já computado. Renderiza-se uma **linha compacta** "Com custos fixos: {resultado}"
  abaixo da composição do card, só quando `fixedScenario.applicable && estimatedRemainingFixedCost > 0`.
- **Modelo/UI:** no Painel é uma linha (não um card, como no relatório de detalhe) para não inflar a
  primeira tela — o número crú segue como principal e em destaque; a linha conservadora aparece discreta,
  com o resultado verde/vermelho e o texto detalhando custo/mês × nº de meses estimados. Quem quer o
  detalhe (com link para ajustar os custos fixos) segue "Ver detalhe" para `/financas/projecao-ano`.
- **Justificativa:** dá ao card a leitura honesta de "e se eu somar o que vou gastar todo mês?", sem
  duplicar regra (a estimativa de custo fixo e a montagem do cenário vivem na lógica pura testada de
  `finance.ts`) e sem custo de I/O. Mesma postura das Sessões 69/71/72: mudança de UI que reusa lógica
  pura já coberta por `finance.test.ts`.
- **Alternativas consideradas:** (a) replicar o card inteiro do relatório no Painel — descartado: polui
  o dashboard, que deve ser escaneável; o detalhe (com link para custos fixos) vive no relatório.
  (b) mostrar a linha sempre, mesmo com custo fixo zero — descartado: sem custo a estimar a linha não
  agrega e só repetiria o número crú. (c) substituir o número crú pelo conservador — descartado: o crú é
  o número de planejamento padrão; o conservador é opt-in/complementar, coerente com D62.
- **Sem schema/dependência/server action/teste novo.** `npm audit` inalterado (10 advisories — 4 moderate
  / 5 high / 1 critical), mesma postura de D6/D8; nenhuma dependência nova.

## D66 — Seletor de cenário (otimista × conservador) na projeção do ano (Sessão 74)
- **Contexto:** `projectYearEnd` (D60) soma TODOS os cachês de shows futuros do ano — confirmados E ainda
  a confirmar (PROPOSED/sem status) — como receita agendada. É uma leitura otimista da agenda: assume que
  toda proposta vira dinheiro. Quem planeja com cautela quer também o **piso**: "e se só os shows JÁ
  confirmados se pagarem?". O forecast já separava `scheduledConfirmed`/`scheduledTentative` (montantes),
  mas não havia como ler a projeção sem a parte tentativa. É o "seletor de cenário" do item 6 do PROGRESS.
- **Decisão:** adicionar uma camada PURA `applyYearEndScenario(forecast, mode)` (`mode`: `"optimistic"`
  default × `"conservative"`) que, no modo conservador, remove `scheduledTentative` da receita agendada e
  reprojeta `projectedIncome`/`projectedResult` e as contagens. Otimista devolve o forecast inalterado
  (mesma referência). Para a contagem correta de shows por cenário, `YearEndForecast` ganhou
  `scheduledConfirmedCount`/`scheduledTentativeCount` (populados em `projectYearEnd`). A página
  `/financas/projecao-ano` ganhou um seletor de pílulas Otimista/Conservador (via `?cenario=conservador`,
  preservando `?ano`), que só aparece quando há cachê tentativo a descartar (`scheduledTentative > 0`).
- **Modelo/UI:** o cenário se aplica ao forecast do ano E ao do ano anterior (consistência na comparação
  D63; sem efeito no ano encerrado, que não tem shows futuros). As despesas NÃO mudam por cenário — a
  projeção já não inventa despesa futura (D60); o cenário "com custos fixos" (D62) segue como camada
  ortogonal sobre a despesa. O seletor é stateless (query string), sem cookie/persistência — segue o
  padrão dos demais filtros por URL da plataforma.
- **Justificativa:** dá a leitura conservadora pedida no item 6 do PROGRESS reaproveitando dados que o
  forecast já calculava, sem schema, sem dependência e sem server action. A pureza permitiu testes diretos
  (`applyYearEndScenario`: otimista intacto, conservador remove tentativo e reprojeta, sem-tentativo
  coincide) + cobertura das novas contagens em `projectYearEnd`. Total 539 testes (eram 535).
- **Alternativas consideradas:** (a) recomputar tudo a partir das transações/shows com uma flag em
  `projectYearEnd` — descartado: duplicaria a varredura; derivar do forecast já pronto é mais barato e
  testável isoladamente. (b) persistir a escolha de cenário num cookie — descartado por ora: o default
  otimista é o número de planejamento padrão e a URL já é compartilhável; persistir pode esconder do
  usuário qual cenário ele vê. (c) um terceiro cenário "pessimista" combinando conservador + custos fixos
  — adiável: as duas camadas são ortogonais e podem ser cruzadas depois sem retrabalho.
- **Sem schema/dependência/server action.** `npm audit` inalterado (10 advisories — 4 moderate / 5 high /
  1 critical), mesma postura de D6/D8; nenhuma dependência nova.

## D67 — Piso conservador ("só confirmados") no card de projeção do Painel (Sessão 75)
- **Contexto:** a Sessão 74 (D66) entregou o seletor otimista × conservador `applyYearEndScenario` na
  página de detalhe `/financas/projecao-ano`, dando o piso "e se só os shows JÁ confirmados se pagarem?".
  O card "Projeção de {ano}" do Painel (D61/D64/D65) já trazia o número crú (otimista-por-design, soma
  cachês a confirmar) e a linha "Com custos fixos" (D65), mas não a leitura conservadora — justamente o
  piso que o músico cauteloso quer ver na primeira tela quando há propostas ainda não fechadas inflando
  a projeção. Era o "levar o seletor de cenário ao card do Painel" do item 6 do PROGRESS.
- **Decisão:** reaproveitar 100% a lógica pura `applyYearEndScenario(forecast, "conservative")` (D66) no
  dashboard, sobre o forecast já computado — zero consulta extra. Renderiza-se uma **linha compacta**
  "Só confirmados: {resultado}" abaixo da composição do card, só quando há cachê tentativo a descartar
  (`forecast.scheduledTentative > 0`), detalhando o montante e o nº de shows a confirmar deixados de fora.
- **Modelo/UI:** linha (não card, nem pílulas interativas) para não inflar o Painel nem transformar o
  card — que é um `<Link>` único para o detalhe — num componente cliente. O número crú segue principal/em
  destaque; o piso aparece discreto em cinza (neutro, vs. âmbar dos custos fixos), com resultado
  verde/vermelho. Quem quer alternar cenário interativamente segue "Ver detalhe" (pílulas da D66).
- **Justificativa:** entrega o piso conservador na primeira tela reusando lógica pura já testada
  (`finance.test.ts`), sem schema, dependência, server action nem teste novo — mesma postura das
  Sessões 69/72/73. Mantém o card escaneável e server-side (sem interatividade), coerente com D65.
- **Alternativas consideradas:** (a) pílulas interativas Otimista/Conservador no card — descartado:
  exigiria tornar o card cliente e quebraria o `<Link>` envolvente; o detalhe (D66) já oferece a
  alternância. (b) substituir o número crú pelo conservador — descartado: o crú é o número de
  planejamento padrão (coerente com D65/D66); o piso é complementar/opt-in visual. (c) mostrar a linha
  sempre — descartado: sem cachê tentativo o piso coincide com o crú e só repetiria o número.
- **Sem schema/dependência/server action/teste novo.** `npm audit` inalterado (10 advisories — 4 moderate
  / 5 high / 1 critical), mesma postura de D6/D8; nenhuma dependência nova.

## D68 — Cenário "pior caso" (conservador + custos fixos) na projeção do ano (Sessão 76)
- **Contexto:** a projeção do ano (`/financas/projecao-ano`) já tinha DUAS camadas conservadoras
  **ortogonais**: o cenário conservador (D66, `applyYearEndScenario`) ataca a RECEITA — descarta os
  cachês de shows ainda a confirmar — e o cenário com custos fixos (D62, `projectYearEndWithFixedCosts`)
  ataca a DESPESA — soma o custo fixo recorrente que ainda deve se repetir até dezembro. Cada uma sozinha
  dá um piso parcial; nenhuma respondia o pior caso honesto: "e se só os shows JÁ confirmados se pagarem E
  eu continuar pagando meus custos fixos?". A alternativa (c) da D66 ("um terceiro cenário pessimista
  combinando conservador + custos fixos") foi adiada lá justamente porque as camadas eram ortogonais e
  podiam ser cruzadas depois sem retrabalho — é o que esta sessão faz.
- **Decisão:** adicionar uma camada PURA `projectYearEndPessimistic(forecast, txs, monthlyFixedCost, opts)`
  → `PessimisticYearEndScenario` que COMPÕE as duas funções já testadas (DRY, sem revarrer dados): aplica
  `applyYearEndScenario(forecast, "conservative")` ao forecast cru e, sobre o resultado, chama
  `projectYearEndWithFixedCosts`. Recebe sempre o forecast **cru/otimista**, então o piso independe do
  seletor de cenário da página. Devolve resultado/receita/despesa do piso + os componentes de cada eixo
  (`droppedTentative`/`droppedTentativeCount`, `estimatedRemainingFixedCost`, `fixedCost`) e `applicable`
  (true quando ao menos um eixo morde). A página ganhou um card "Pior caso" (borda rose-500).
- **Modelo/UI:** o card só é renderizado quando AMBOS os eixos mordem
  (`droppedTentative > 0 && estimatedRemainingFixedCost > 0`) E no modo otimista. Essa é a única situação
  em que o cruzamento mostra algo que nenhum outro card/pílula da view já mostra: em modo conservador o
  card de custos fixos (que usa o forecast já conservador) JÁ é o piso; e sem um dos eixos o pior caso
  coincide com o número crú, com a pílula conservadora, ou com o card de custos fixos. A borda rose-500
  (mais forte que o âmbar dos custos fixos) sinaliza que é o cenário mais cauteloso. O número crú segue
  como principal; o pior caso é leitura complementar/opt-in (coerente com D62/D66/D67).
- **Justificativa:** entrega o pior caso pedido na D66(c) reaproveitando 100% lógica pura já coberta por
  `finance.test.ts`, sem schema, dependência ou server action. A pureza permitiu testar o cruzamento e
  cada eixo isoladamente (cruza os dois; não-aplicável sem nenhum; aplicável só pela receita; só pela
  despesa). Total 543 testes (eram 539).
- **Alternativas consideradas:** (a) um terceiro botão "Pior caso" no seletor de pílulas — adiável: o
  seletor hoje é binário otimista×conservador (eixo da receita); um terceiro estado misturaria os dois
  eixos no mesmo controle e exigiria repensar a semântica das pílulas e a comparação YoY por cenário.
  O card sempre-visível (quando aplicável) entrega o número sem essa complexidade. (b) recomputar tudo a
  partir das transações/shows — descartado: duplicaria a varredura; compor as duas camadas já prontas é
  mais barato e testável. (c) mostrar o card em qualquer modo/sempre — descartado pela redundância descrita
  acima (duplicaria o card de custos fixos em modo conservador, ou repetiria o número crú sem um dos eixos).
- **Sem schema/dependência/server action.** `npm audit` inalterado (10 advisories — 4 moderate / 5 high /
  1 critical), mesma postura de D6/D8; nenhuma dependência nova.

## D69 — Piso "pior caso" no card de projeção do Painel (Sessão 77)
- **Contexto:** a Sessão 76 (D68) entregou `projectYearEndPessimistic` e o card "Pior caso" na página de
  detalhe `/financas/projecao-ano`, cruzando os dois eixos conservadores (receita só de confirmados D66 +
  despesa com custos fixos futuros D62) num único piso honesto. O card "Projeção de {ano}" do Painel já
  trazia o número crú (D61), a comparação YoY (D64), a linha "Com custos fixos" (D65) e o piso "Só
  confirmados" (D67) — mas não o pior caso, o chão absoluto que o músico cauteloso quer ver na primeira
  tela quando AMBOS os riscos coexistem (propostas a confirmar inflando a receita E custo fixo a estimar).
  Era o "levar o piso 'pior caso' ao card do Painel" do item 6 do PROGRESS.
- **Decisão:** reaproveitar 100% a lógica pura `projectYearEndPessimistic(forecast, txs, monthlyFixedCost)`
  (D68) no dashboard, sobre o forecast já computado e o custo fixo recorrente típico (`recurringExpenses`
  D39) — zero consulta extra. Renderiza-se uma **linha compacta** "Pior caso: {resultado}" abaixo das
  linhas "Só confirmados" e "Com custos fixos", só quando AMBOS os eixos mordem
  (`droppedTentative > 0 && estimatedRemainingFixedCost > 0`).
- **Modelo/UI:** a condição "ambos os eixos" espelha a do card da página (D68) e é a única em que o
  cruzamento mostra algo que as duas linhas acima já não mostram: sem o eixo da receita o pior caso = "Com
  custos fixos"; sem o eixo da despesa = "Só confirmados". Linha (não card nem pílula) para não inflar o
  Painel nem tornar o `<Link>` envolvente um componente cliente — mesma postura de D65/D67. Cor rose-700
  (mais forte que o âmbar dos custos fixos e o cinza do "só confirmados"), espelhando a borda rose-500 do
  card de detalhe — sinaliza que é o cenário mais cauteloso. O número crú segue principal; o pior caso é
  leitura complementar/opt-in visual.
- **Justificativa:** entrega o chão na primeira tela reusando lógica pura já testada (`finance.test.ts`),
  sem schema, dependência, server action nem teste novo — mesma postura das Sessões 69/72/73/75. Mantém o
  card escaneável e server-side.
- **Alternativas consideradas:** (a) mostrar a linha sempre que `pessimistic.applicable` — descartado:
  com só um eixo mordendo, o número repetiria uma das duas linhas acima (redundância idêntica à da D68).
  (b) substituir o número crú pelo pior caso — descartado: o crú é o número de planejamento padrão; o
  piso é complementar. (c) escalar a borda do card inteiro para rose quando o pior caso é negativo —
  adiável: a borda hoje reflete `forecast.projectedResult` (o número principal); mudá-la pelo cenário
  opt-in confundiria a leitura primária.
- **Sem schema/dependência/server action/teste novo.** `npm audit` inalterado (10 advisories — 4 moderate
  / 5 high / 1 critical), mesma postura de D6/D8; nenhuma dependência nova.
