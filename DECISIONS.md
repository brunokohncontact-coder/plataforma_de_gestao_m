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

## D70 — Prazo de recebimento (DSO) no Painel (Sessão 78)
- **Contexto:** o item 5 dos próximos passos previa "trazer o DSO/aging para o Painel". O aging dos
  recebíveis já chegou ao dashboard na Sessão 41 (D32 — o que AINDA falta receber, com destaque para o
  dinheiro encalhado há >90 dias). Faltava o lado realizado: o DSO — sobre o cachê que JÁ entrou, em
  quantos dias depois do show o dinheiro caiu no caixa. A métrica já existia na página
  `/shows/prazo-recebimento` (D51: `paymentLag`, DSO médio ponderado; D57: DSO mediano robusto a outlier),
  mas não na primeira tela.
- **Decisão:** novo helper puro `paymentLagHeadline(lag)` em `src/lib/finance.ts` que condensa um
  `PaymentLag` no que cabe num card de Painel: decide se vale mostrar (`show` — exige amostra mínima de
  `PAYMENT_LAG_HEADLINE_MIN_SHOWS = 2` shows pagos e `totalReceived > 0`), expõe `avgDays`/`medianDays`, o
  `bucket` de velocidade (tom do card, via `paymentSpeedBucket`) e `skewed` (a média excede a mediana em
  ≥ `PAYMENT_LAG_SKEW_THRESHOLD_DAYS = 7` dias → um recebimento muito atrasado infla o DSO médio e a
  mediana é a leitura típica mais honesta). O dashboard chama `paymentLag(shows, txs)` (reaproveitando os
  shows/transações já carregados — zero consulta extra) e renderiza um card "Prazo de recebimento" que
  destaca a MEDIANA ("metade do cachê entra até …"), com a média como complemento e um aviso quando
  `skewed`; linka para `/shows/prazo-recebimento`.
- **Modelo/UI:** a mediana vira o número principal (não a média) por ser a leitura típica resistente a
  outlier — coerente com a ênfase da D57. Tons por balde (`onTime`/`d7` verde, `d30` âmbar, `d60` laranja,
  `slow` vermelho) na borda e no número, escalando do mais rápido (bom) ao mais lento (ruim). Limite de 2
  shows pagos evita um "DSO" sem sentido estatístico a partir de um único recebimento. Card server-side,
  `<Link>` envolvente (sem componente cliente), mesma postura dos demais cards do Painel.
- **Justificativa:** entrega o sinal de fluxo de caixa ("depois que toco, em quanto tempo recebo?") na
  primeira tela reaproveitando lógica pura já testada; o helper novo isola a decisão de exibição/ênfase do
  Painel (testável em `finance.test.ts` — +5 testes), sem duplicar o cálculo do prazo.
- **Alternativas consideradas:** (a) mostrar a média como número principal — descartado: um único show
  muito atrasado a distorce (a razão de existir a mediana, D57). (b) mostrar o card a partir de 1 show pago
  — descartado: DSO de amostra 1 é o prazo daquele show, não uma métrica. (c) recomputar na página em vez
  de helper puro — descartado: a decisão de exibição (limite, assimetria, tom) é lógica de negócio e merece
  teste isolado.
- **Sem schema/dependência/server action.** `npm audit` inalterado (10 advisories — 4 moderate / 5 high /
  1 critical), mesma postura de D6/D8; nenhuma dependência nova.

## D71 — Indicador de "filtro lembrado" nas listas (Sessão 79)
- **Contexto:** o item 3 dos próximos passos previa, após a persistência genérica do último filtro
  (D23/D24 — Finanças/Shows/Contatos via cookie + middleware), um "indicador visual de filtro lembrado na
  UI". Sem ele, ao voltar a uma lista pelo menu o middleware restaura o recorte salvo silenciosamente: a
  lista abre já filtrada e o usuário pode estranhar ("por que só aparecem alguns?"), sem perceber que é um
  filtro herdado da última visita.
- **Decisão:** o middleware passa a marcar a URL de RESTAURAÇÃO com `?...&lembrado=1`
  (`withRestoredFlag` em `src/lib/listFilter.ts`); cada página de lista lê o marcador
  (`FILTER_RESTORED_PARAM`) e renderiza uma pílula discreta `RememberedFilterNotice` ("Filtro restaurado da
  sua última visita." + atalho "Limpar" → `?reset=1`). O marcador NÃO é chave de filtro, então
  `canonicalQuery` o ignora: nunca entra no cookie e some na primeira submissão do formulário (que não tem
  esse campo). Como a URL restaurada já carrega chaves de filtro, a próxima passada no middleware vira
  `persist` (não re-restaura) — sem loop, comportamento idêntico ao já testado na D24.
- **Modelo/UI:** componente server puro (sem cliente), só renderiza quando `restored`; tom `brand` (a
  identidade do app), mais leve que os avisos âmbar de alerta. Reaproveita o `?reset=1` já existente como
  ação de "esquecer". Inserido acima do formulário de filtro nas três listas.
- **Justificativa:** fecha a lacuna de feedback da persistência de filtro reaproveitando toda a infra pura
  já testada (D24); a lógica nova (marcar/ler o flag) é pura e isolada em `listFilter.ts`, com +4 testes em
  `listFilter.test.ts` cobrindo `withRestoredFlag`/`wasFilterRestored` e a garantia de que o marcador não
  vaza para o cookie.
- **Alternativas consideradas:** (a) destacar visualmente cada campo restaurado no formulário — descartado:
  mais ruído visual para o mesmo sinal. (b) cookie de sessão sinalizando "acabei de restaurar" — descartado:
  estado extra e frágil; o marcador na URL é stateless e auto-expira na próxima navegação. (c) toast/efêmero
  — descartado: exigiria componente cliente e timer; a pílula persistente é suficiente e server-side.
- **Sem schema/dependência/server action.** `npm audit` inalterado (10 advisories — 4 moderate / 5 high /
  1 critical), mesma postura de D6/D8; nenhuma dependência nova.

### D72 — Exportação CSV da lista de Shows (Sessão 80)
- **Contexto:** as Finanças já têm exportação CSV respeitando os filtros (`/financas/export`, D14) e a
  agenda de shows tem exportação iCalendar (`/shows/agenda.ics`, D15), mas a **lista de Shows não tinha
  exportação tabular**. Um músico que quer levar a lista de shows para a contabilidade, fechar um período
  com o empresário ou só ter um backup planilhável ficava sem saída — `.ics` é calendário, não planilha.
- **Decisão:** adicionar `showsToCsv(shows)` à camada pura `src/lib/csv.ts` (interface `CsvShow`,
  `SHOW_CSV_HEADERS`, helper `csvTime` para a hora em UTC) e um route handler `GET /shows/export` que
  reaproveita os MESMOS filtros da lista (`q`, `status`, `de`, `ate`) via `filterShows`, espelhando
  `financas/export`. A página de Shows ganha um link "Exportar CSV" que carrega a query do filtro ativo
  (`buildShowExportQuery`), para o arquivo refletir o recorte visível.
- **Modelo/UI:** colunas Data, Hora, Título, Local, Cidade, Status, Cachê (R$), Observações. Status sai
  como rótulo legível (`SHOW_STATUS_LABELS`) com fallback defensivo p/ valor desconhecido; cachê em reais
  com vírgula decimal (`centsToCsvAmount`); data/hora em UTC (mesma convenção de `csvDate`/`dayKey`, estável
  em teste e independente do fuso do servidor). BOM UTF-8 + delimitador `;` + escape RFC 4180, idênticos às
  exportações existentes — o arquivo abre direto no Excel/Sheets pt-BR.
- **Justificativa:** fecha uma assimetria óbvia entre as áreas do app reaproveitando 100% da infra pura já
  testada (`toCsv`/`escapeCsvField`/`centsToCsvAmount`/`csvDate` e `filterShows`); a lógica nova é pura e
  isolada, com +7 testes em `csv.test.ts`. Sem schema, sem dependência, sem server action.
- **Por que UTC na hora:** o app armazena `date` em UTC e a lista exibe com `formatDateTime` (fuso local do
  cliente). Para o CSV optou-se por UTC para casar com `csvDate`/`dayKey` (já UTC) e manter os testes
  determinísticos; a alternativa (hora local do servidor) seria instável entre ambientes. Documentado para
  revisão caso usuários estranhem o deslocamento — aceitável por ora, consistente com a coluna de data.
- **Alternativas consideradas:** (a) exportar todos os shows ignorando filtro — descartado: a página de
  Finanças já estabeleceu que a exportação respeita o recorte exibido (D14), consistência vale mais. (b)
  reusar o `.ics` — descartado: calendário não é planilha, casos de uso distintos. (c) uma coluna única
  "Data/Hora" — descartado: colunas separadas são mais fáceis de ordenar/filtrar na planilha.
- **Segurança:** route protegido por `requireUser` (307 → `/login` sem sessão, confirmado no smoke test);
  consulta filtrada por `userId`, sem vazamento entre usuários.
- **Sem schema/dependência/server action.** `npm audit` inalterado (10 advisories — 4 moderate / 5 high /
  1 critical), mesma postura de D6/D8; nenhuma dependência nova.

### D73 — Seletor de três cenários na projeção do ano (Sessão 81)
- **Contexto:** a página `/financas/projecao-ano` já oferecia dois pisos conservadores sobre a projeção
  crua: "só confirmados" (D66, ataca a receita descartando cachês de shows a confirmar) e "pior caso"
  (D68, soma também o custo fixo recorrente futuro). Mas a UI era assimétrica: o seletor tinha só dois
  botões (Otimista × Conservador) e o pior caso aparecia como um **card extra** que só surgia no modo
  otimista quando ambos os eixos mordiam. O usuário não conseguia ver o pior caso como o número
  PRINCIPAL (com composição de receita/despesa detalhada), nem alternar entre os três pisos de forma
  uniforme.
- **Decisão:** transformar o seletor num grupo de **três botões** — Otimista / Conservador / Pior caso —
  em que cada um escolhe qual piso vira o número principal e a composição abaixo. A lógica pura ganhou
  `yearEndScenarioView(forecast, txs, fixedCost, mode)` (+ tipo `YearEndScenarioChoice` de 3 valores), que
  normaliza qualquer um dos três cenários num formato comum (totais + composição de receita/despesa +
  custo fixo futuro + tentativo descartado), reaproveitando `applyYearEndScenario` (D66) e
  `projectYearEndPessimistic` (D68) sem reprojetar do zero. O card standalone de "Pior caso" foi removido
  (consolidado no botão/headline); o card "Cenário com custos fixos" (D62) some no modo pior caso, onde o
  custo fixo já está embutido no número principal. A composição de despesas ganha a linha "Custo fixo
  estimado" no modo pior caso.
- **Gating:** o botão Conservador só aparece quando há cachê tentativo a descartar (`scheduledTentative > 0`);
  o botão Pior caso só quando há custo fixo futuro a somar (`estimatedRemainingFixedCost > 0`) — caso
  contrário coincidiria com o conservador ou com o otimista. O grupo inteiro aparece quando há ao menos um
  piso a oferecer. Slugs pt-BR na query: `?cenario=conservador` / `?cenario=pessimista` (otimista é o
  default sem param).
- **Comparação vs. ano anterior:** `compareYearEndToPrevious` teve o parâmetro alargado para um tipo
  estrutural `YearEndResultLike` (`Pick` de `year`/`projectedResult`/`projectedIncome`/`projectedExpense`),
  para aceitar tanto `YearEndForecast` quanto o novo `YearEndScenarioView` — a comparação agora respeita o
  cenário escolhido (compara pior-caso-2026 vs. pior-caso-do-ano-anterior, que num ano encerrado degrada
  para o fechamento real, pois não há shows futuros nem meses a estimar).
- **Justificativa:** consolida três affordances espalhadas (card de custos fixos + card de pior caso +
  seletor de 2 botões) num único controle coerente, reaproveitando 100% da lógica pura já testada (D66/D68/
  D62) — a única lógica nova (`yearEndScenarioView`) é pura, com +6 testes em `finance.test.ts`. Sem schema,
  sem dependência, sem server action.
- **Alternativas consideradas:** (a) manter os cards extras e só renomear — descartado: a duplicação
  (botão + card mostrando o mesmo número) confunde. (b) estender `YearEndScenarioMode` para 3 valores —
  descartado: `applyYearEndScenario` é puramente derivável do forecast, mas o pior caso precisa de `txs` +
  custo fixo (não cabe na mesma assinatura); criou-se o tipo separado `YearEndScenarioChoice` para o
  seletor da página, preservando o contrato de `applyYearEndScenario`. (c) mostrar os três números lado a
  lado sempre — descartado: polui a tela; o seletor mantém um número principal por vez com composição
  detalhada.
- **Segurança:** sem mudança — página protegida por `requireUser` (307 → `/login` sem sessão, confirmado no
  smoke test), consultas filtradas por `userId`.
- **Sem schema/dependência/server action.** `npm audit` inalterado (10 advisories — 4 moderate / 5 high /
  1 critical), mesma postura de D6/D8; nenhuma dependência nova.

### D74 — Página dedicada de Fluxo de caixa projetado (Sessão 82)
- **Contexto:** a projeção de caixa (`projectCashflow`, Sessão 18) já existia como **lógica pura testada**,
  mas só era renderizada num **card do Painel** com horizonte fixo de 6 meses e poucos detalhes (saldo ao
  fim de cada mês + variação). Faltava uma visão dedicada para responder com calma "quando o caixa vai
  apertar?" — com horizonte ajustável, o pior momento destacado e a quebra de a-receber/a-pagar por mês.
- **Decisão:** criar a página `/financas/fluxo-de-caixa` reaproveitando **100%** de `projectCashflow` (sem
  lógica nova). A página oferece um **seletor de horizonte** (3/6/12/24 meses via `?meses=`, default 6,
  validado contra a lista), três cards de destaque (Caixa atual, Saldo ao fim do horizonte, **Pior momento**
  = menor `endBalance` e em que mês), um alerta vermelho quando o caixa fica negativo (mostrando o primeiro
  mês em que isso ocorre) e a tabela mês a mês (a receber, a pagar, variação e saldo acumulado, com barras
  proporcionais ao maior fluxo do horizonte). Registrada no hub de Relatórios em Finanças → Receitas &
  pendências (`REPORT_GROUPS` em `reports.ts`), aparecendo na busca e no índice automaticamente.
- **Justificativa:** segue o padrão já consagrado "card no Painel + página dedicada" (como a projeção de
  fechamento do ano, D60/D61). O card do Painel continua sendo o vislumbre rápido; a página dá o controle
  (horizonte) e os insights (pior momento, primeiro mês negativo) sem inflar o dashboard. Zero lógica nova
  → zero teste novo necessário (a lógica já tem cobertura em `finance.test.ts`); a página é puramente de
  apresentação sobre função pura testada.
- **Alternativas consideradas:** (a) só aumentar o horizonte do card do Painel — descartado: o dashboard já
  está denso e o card de 6 meses cumpre o papel de vislumbre. (b) tornar o horizonte do Painel configurável
  — descartado: mistura controle de relatório no dashboard; melhor concentrar isso na página dedicada.
- **Segurança:** sem mudança — página protegida por `requireUser` (307 → `/login` sem sessão, confirmado no
  smoke test), consultas filtradas por `userId`.
- **Sem schema/dependência/server action.** `npm audit` inalterado (10 advisories — 4 moderate / 5 high /
  1 critical), mesma postura de D6/D8; nenhuma dependência nova.

## D75 — Cadência de shows: volume de apresentações ao longo do tempo (Sessão 83)
- **Contexto:** o app já media a evolução do **preço** (`feeTrend`, `/shows/evolucao-cache`) e o formato
  da distribuição de cachês (`feeDistribution`, `/shows/faixas-de-cache`), além do desempenho por dia da
  semana. Faltava a dimensão de **volume/atividade** ao longo do tempo — "estou tocando mais ou menos?",
  independente de quanto cobro. `feeTrend` traz uma contagem por mês, mas só de shows com `fee > 0`, então
  não responde à pergunta de cadência (gigs de graça também são atividade) nem mede o tempo parado.
- **Decisão:** uma função pura `gigCadence(shows, { now? })` em `src/lib/finance.ts` conta os shows **já
  realizados** (`isHappenedGig` — PLAYED, ou CONFIRMED com data passada) **por mês**, em ordem cronológica,
  e deriva: média por mês ativo, média por mês de calendário (diluindo parados), mês mais cheio/vazio, a
  **janela** do primeiro ao último gig (`spanMonths`), os **meses parados** dentro dela (`idleMonths`) e a
  **tendência** (contagem do mês recente vs. o primeiro, reaproveitando `computeDelta`). Página
  `/shows/cadencia` com cards de destaque, card de tendência ("Você está tocando mais/menos") e tabela mês
  a mês com barras. Registrada no hub de Relatórios em Shows → Agenda & pipeline (`REPORT_GROUPS`).
- **Conta gigs de cachê 0 (distinto de `feeTrend`):** o eixo aqui é **atividade**, não preço — um show de
  graça para construir público continua sendo um show tocado. Por isso `gigCadence` não filtra por `fee`,
  ao contrário de `feeTrend`/`feeDistribution` (que medem preço e exigem `fee > 0`). Documentado na função
  e na própria página.
- **Justificativa:** completa o trio preço (`feeTrend`) × distribuição (`feeDistribution`) × volume
  (`gigCadence`) — juntos respondem "toco mais E cobro mais?". `idleMonths`/`spanMonths` dão um sinal de
  saúde da agenda (tempo parado entre gigs) que nenhum outro relatório oferecia. Mantém o padrão do projeto:
  lógica pura testável (`computeDelta`, `isHappenedGig`, `monthKey` reaproveitados), página de apresentação
  sobre função pura. Cobertura: 10 testes em `finance.test.ts` (agrupamento, exclusão de proposto/cancelado/
  futuro, contagem de gigs grátis, span/idle inclusive na virada de ano, desempates de cheio/vazio, trend).
- **Alternativas consideradas:** (a) reaproveitar a contagem de `feeTrend` — descartado: ignora gigs sem
  cachê e não tem span/idle/tendência de volume. (b) usar todos os shows (incl. futuros/propostos) —
  descartado: cadência é histórico realizado; agenda futura já é coberta por receita agendada/funil. (c)
  granularidade semanal — over-engineering para o MVP (mensal casa com os demais relatórios temporais).
- **Sem schema/dependência/server action.** `npm audit` inalterado (10 advisories — 4 moderate / 5 high /
  1 critical), mesma postura de D6/D8; nenhuma dependência nova.

## D76 — Crescimento ano a ano: a carreira está faturando mais? (Sessão 84)
- **Contexto:** o app já fechava UM ano por vez (`annualSummary` → `/financas/anual`) e achatava todos os
  anos num calendário de 12 meses (`monthlySeasonality` → `/financas/sazonalidade`), mas faltava a visão
  **longitudinal**: a série dos anos lado a lado para responder "estou faturando mais do que no ano
  passado?" ao longo de toda a história. `compareAnnualSummaries` compara só dois anos (atual vs. anterior),
  exigindo navegação manual; não havia a trajetória completa num lugar só.
- **Decisão:** uma função pura `yearlyHistory(txs)` em `src/lib/finance.ts` consolida os totais por ano
  (receita/despesa/resultado) **apenas dos anos com movimento**, em ordem cronológica crescente, e calcula
  o crescimento de cada ano frente ao **ano ativo imediatamente anterior** (predecessor na série, exposto em
  `previousYear`), reaproveitando `computeDelta`. Deriva totais acumulados, média do resultado por ano,
  melhor/pior ano (por resultado líquido) e a **tendência de longo prazo** (resultado do último ano vs. o
  primeiro). Página `/financas/crescimento` com cards de destaque, card de tendência ("A sua carreira está
  crescendo/encolhendo") e tabela ano a ano (barras + variação YoY do resultado), cada ano linkando para o
  resumo anual (`/financas/anual?ano=`). Registrada no hub de Relatórios em Finanças → Fechamentos.
- **Comparar com o ano ativo anterior, não o ano-calendário −1:** em históricos com lacunas (ex.: 2022 e
  depois 2025), comparar 2025 com 2024 (zerado) marcaria o ano como "novo" e perderia o sinal de
  crescimento. Comparar com o **predecessor na série** e expor `previousYear` mantém o rótulo "vs. {ano}"
  sempre verdadeiro. Documentado na função e na própria página ("o ano anterior com movimento").
- **Justificativa:** responde uma pergunta de carreira que nenhum relatório cobria (a trajetória plurianual),
  reaproveitando 100% de helpers já testados (`computeDelta`, `monthKey`) — sem schema, sem dependência, sem
  server action. Mantém o padrão do projeto: lógica pura testável + página de apresentação. Cobertura: 7
  testes em `finance.test.ts` (vazio, agregação/ordenação, deltas YoY, lacuna entre anos ativos, melhor/pior
  ano, tendência último-vs-primeiro, ano único sem deltas). **582 testes** no projeto (eram 575).
- **Alternativas consideradas:** (a) estender `/financas/anual` com uma mini-série dos anos — descartado:
  mistura fechamento mensal de um ano com a visão plurianual, sobrecarregando a página; o hub já separa os
  relatórios por pergunta. (b) incluir anos vazios na série (com resultado 0) — descartado: poluiria a tabela
  e a tendência com anos sem atividade; a série de anos ativos é mais honesta. (c) CAGR/taxa composta —
  over-engineering para o MVP; a variação YoY simples + tendência último-vs-primeiro já comunicam a direção.
- **Sem schema/dependência/server action.** `npm audit` inalterado (10 advisories — 4 moderate / 5 high /
  1 critical), mesma postura de D6/D8; nenhuma dependência nova.

## D77 — Meta de faturamento anual: estou no caminho de bater a meta? (Sessão 85)
- **Contexto:** o app projetava o fechamento do ano por vários ângulos (`projectYearEnd` e cenários,
  D60–D73), mas não havia uma **meta** do próprio usuário para comparar — o subtema "Custos & metas" do
  hub só tinha custos (custos fixos, ponto de equilíbrio, reserva de impostos), nenhuma meta. Faltava
  responder "quanto eu quero faturar este ano e o quão perto estou?".
- **Decisão:** introduzir a primeira mudança de schema desde a base do MVP — modelo `RevenueGoal`
  (userId, year, amount em centavos) com **unique (userId, year)**: uma meta de faturamento por ano, por
  usuário. A lógica de progresso fica numa função pura `computeGoalProgress` em `src/lib/finance.ts` que
  cruza a meta com o **realizado** (receita já recebida, `YearEndForecast.realizedIncome`) e a
  **projeção** (`projectedIncome`), reaproveitando 100% do `projectYearEnd` já existente — sem recomputar
  agregações. Página `/financas/metas` (CRUD da meta + card de progresso) e card compacto no Painel.
- **Faturamento (receita bruta), não resultado líquido:** a meta é sobre o que **entra** (receita), não
  sobre o lucro. É a métrica que o músico controla via agenda/cachês e a mais intuitiva para "meta do
  ano"; o resultado líquido já é coberto pela projeção de fechamento (D60). `realized` = receita recebida
  no ano; `projected` = recebido + a receber lançado + cachê agendado de shows futuros.
- **Ritmo (`pace`) por avanço linear, só no ano corrente:** compara o realizado ao esperado por um
  avanço **linear** da meta ao longo do ano (meta × fração do ano decorrida), com faixa de ±5% para
  "no ritmo". Linear é uma simplificação consciente (ignora sazonalidade — D37); para o sinal "estou
  adiantado/atrasado" basta, e não exige histórico. Ano passado não julga ritmo (a meta já está decidida
  pelo total); ano futuro ainda não começou. Documentado na função.
- **Upsert por ano + isolamento:** `setRevenueGoalAction` faz upsert na chave (userId, year) — uma meta
  por ano, sem duplicar; `deleteRevenueGoalAction` usa `deleteMany` escopado ao `userId` (idempotente e
  imune a ano de outro usuário). O `DeleteButton` reusado passa o ano no campo `id` (sua convenção).
- **Justificativa:** entrega uma alavanca de planejamento que faltava (a meta do usuário), ancorando os
  números de projeção numa referência pessoal, com custo baixo: reusa `projectYearEnd`, `MoneyInput`,
  `DeleteButton` e o padrão lógica-pura-testável + página. Cobertura: 8 testes de `computeGoalProgress`
  (razões/restante, onTrackToHit, ritmo adiantado/atrasado/no-ritmo, ano futuro/passado, saneamento) + 6
  de integração das actions (cria, upsert sem duplicar, rejeita meta zero, isolamento entre usuários).
  **596 testes** no projeto (eram 582).
- **Alternativas consideradas:** (a) guardar a meta num cookie como os filtros (D23) — descartado: meta é
  dado de carreira, merece persistência real e por-ano; cookie é frágil e some entre dispositivos. (b)
  meta de resultado líquido em vez de faturamento — descartado: menos intuitiva e já há projeção de
  resultado; faturamento é o que o usuário mira. (c) ritmo ponderado por sazonalidade — over-engineering
  para o MVP; o avanço linear comunica a direção sem exigir histórico confiável. (d) metas por mês/
  trimestre — escopo maior; a meta anual cobre a pergunta principal e fica como evolução.
- **Schema alterado** (1ª vez desde o MVP): novo modelo `RevenueGoal` + relação no `User`, aplicado por
  `prisma db push` (dev). `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical),
  mesma postura de D6/D8; nenhuma dependência nova.

## D78 — Projeção do ano vs. meta de faturamento (Sessão 86)
- **Contexto:** a Sessão 85 (D77) introduziu a meta de faturamento (`RevenueGoal`) com progresso em
  `/financas/metas` e um card no Painel, mas a página de **projeção de fechamento**
  (`/financas/projecao-ano`) — onde o usuário escolhe o cenário (otimista / conservador / pior caso,
  D73) e vê a receita projetada — não mostrava a meta. Faltava fechar o loop: "neste cenário, eu bato a
  meta?". O schema já tinha a meta; era só cruzar.
- **Decisão:** adicionar um card **"vs. meta de {ano}"** em `/financas/projecao-ano` que reaproveita o
  helper puro já testado `computeGoalProgress` (D77), alimentado com a receita do **cenário selecionado**
  (`view.projectedIncome` / `view.realizedIncome`), não com o forecast cru. Mostra `% da meta`, a frase
  de sobra/falta (projeção − meta) e a barra realizado-sobre-projetado. Quando não há meta para o ano,
  exibe um convite discreto com link para `/financas/metas?ano={ano}`.
- **Comparar contra a RECEITA projetada, não o resultado:** a meta é de **faturamento** (D77), então o
  número confrontado é `projectedIncome` (receita), coerente com o card de Metas — e distinto do
  "Resultado projetado do ano" (receita − despesa) que domina a página. O rótulo deixa isso explícito
  ("Meta de faturamento (receita), não de resultado").
- **Seguir o seletor de cenário (o diferencial):** em `/financas/metas` a projeção é sempre otimista; aqui
  ela segue o cenário ativo. Assim o conservador/pior caso pode revelar que a meta **só fecha contando
  shows ainda a confirmar** — informação de planejamento que a página de Metas não dá. Esse era o motivo
  de colocar o card aqui em vez de duplicar Metas.
- **Sem nova lógica de negócio / sem novos testes:** o card é apresentação fina sobre `computeGoalProgress`
  (já com 8 testes, D77). Não há cálculo novo a cobrir — `onTrackToHit`, razões e saneamento já estão
  testados; o gap é `|projetado − meta|`, trivial. **596 testes** (inalterado). Custo de dados: +1
  `prisma.revenueGoal.findUnique` no `Promise.all` existente.
- **Alternativas consideradas:** (a) extrair um helper `compareProjectionToGoal` dedicado — descartado por
  DRY: `computeGoalProgress` já entrega `projectedRatio`/`onTrackToHit` e o gap é trivial; um helper novo
  só duplicaria. (b) comparar contra o resultado líquido projetado — incoerente com a meta ser de receita
  (D77) e com o card de Metas. (c) repetir o card de ritmo (`pace`) — redundante com `/financas/metas`; aqui
  o foco é o cenário × meta, não o avanço temporal. (d) comparar a meta também no Painel contra o piso
  conservador — deixado como próximo passo.
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D79 — Meta de faturamento vs. piso conservador na página de Metas (Sessão 87)
- **Contexto:** a página `/financas/metas` (D77) e o card do Painel (D77) cruzam a meta sempre com a
  projeção **otimista** do ano (`projectYearEnd().projectedIncome` — conta todos os shows futuros,
  inclusive os ainda a confirmar). Isso esconde um risco de planejamento: a meta pode estar "no caminho"
  só porque a projeção conta cachês de shows que talvez não se confirmem. O cenário conservador
  (`applyYearEndScenario`, D66) já existia para a projeção do ano, mas a página de Metas não o usava.
  D78 deixou explicitamente este item como próximo passo.
- **Decisão:** adicionar o helper puro `compareGoalScenarios` em `src/lib/finance.ts` e usá-lo em
  `/financas/metas` para mostrar, quando os cenários divergem, uma faixa "piso conservador": "mesmo
  contando só os shows já confirmados, a projeção fica em X (Y% da meta) — você bate / não bate a meta".
  Tom verde quando a meta resiste ao piso (`hitsEvenConservatively`), âmbar quando ela só fecha contando
  shows a confirmar (`hitsOnlyWithTentative`).
- **Helper compõe o já testado, não recalcula:** `compareGoalScenarios` roda `computeGoalProgress` (D77)
  nos dois cenários (projeção otimista e conservadora, ambas vindas dos forecasts já calculados na página)
  e deriva flags (`diverges`, `hitsEvenConservatively`, `hitsOnlyWithTentative`) + o `tentativeGap`
  (cachê a confirmar que separa os cenários). É pura e saneada (herda o saneamento de `computeGoalProgress`).
  **4 testes novos** (cobrem: bate só no otimista, folga real, cenários coincidem, saneamento). 600 testes
  no total (eram 596).
- **Por que um helper aqui e não em D78:** em D78 o card de projeção já seguia o seletor de cenário, então
  o gap era trivial (`|projetado − meta|`) e um helper teria duplicado. Aqui a página de Metas **não** tem
  seletor — ela precisa confrontar os DOIS cenários lado a lado num único render, e a comparação
  (qual cenário bate, qual é o gap) é lógica de negócio reutilizável que merece teste. O helper também
  fica pronto para o card do Painel adotar o mesmo piso depois.
- **Só aparece quando há divergência:** se não há cachê de shows a confirmar (`tentativeGap === 0`), os
  cenários coincidem e a faixa some — sem ruído quando a projeção já é toda de confirmados, ou em ano
  passado (sem shows futuros).
- **Alternativas consideradas:** (a) colocar no card do Painel em vez da página de Metas — a página de
  Metas é o lar natural do tema e tem espaço para a mensagem; o Painel pode adotar o helper depois sem
  retrabalho. (b) um seletor de cenário na página de Metas (como em projeção-ano) — exagero: a meta quer um
  veredito ("bate mesmo no piso?"), não uma exploração de cenários. (c) comparar contra o "pior caso"
  (conservador + custos fixos, D68) — descartado: a meta é de **faturamento/receita** (D77), e o pior caso
  ataca também a despesa; o piso de receita correto é só o conservador (descartar shows a confirmar).
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D80 — Piso conservador da meta no card do Painel (Sessão 88)
- **Contexto:** D79 entregou o helper puro `compareGoalScenarios` e a faixa "piso conservador" na
  página de Metas, e deixou explícito como próximo passo "levar o mesmo piso conservador (já testado)
  ao card de meta do Painel". O card "Meta de {ano}" do Painel mostrava só o ritmo/projeção otimista
  (`computeGoalProgress` sobre `forecast.projectedIncome`), escondendo o risco de a meta depender de
  shows ainda a confirmar — exatamente a pergunta que a página de Metas já respondia.
- **Decisão:** computar `goalScenarios = compareGoalScenarios(...)` no `dashboard/page.tsx` e, quando os
  cenários divergem, anexar ao card de meta uma linha compacta "piso conservador" (verde "Folga real."
  quando a meta resiste só com shows confirmados; âmbar "Atenção ao piso." quando ela só fecha contando
  shows a confirmar), espelhando a redação da página de Metas mas condensada para o Painel.
- **Zero I/O extra:** as DUAS projeções de que `compareGoalScenarios` precisa já estavam computadas no
  dashboard — a otimista é o `forecast` (`projectYearEnd`) e a conservadora é `conservative`
  (`applyYearEndScenario(forecast, "conservative")`, já usada na linha "Só confirmados" do card de
  projeção). O helper só recombina números já em mãos; nenhuma consulta ou recálculo de transações/shows.
- **Sem testes novos:** a lógica (`compareGoalScenarios`/`computeGoalProgress`) já é coberta por testes
  puros (D77/D79); esta é uma mudança de UI que reaproveita o helper testado, mesma postura das Sessões
  75/77 (linhas "Só confirmados"/"Pior caso" no card de projeção do Painel). 600 testes verdes.
- **Só aparece com divergência:** a linha some quando `tentativeGap === 0` (projeção toda de confirmados)
  ou em ano sem shows futuros a confirmar — sem ruído, igual à página de Metas.
- **Alternativas consideradas:** (a) mostrar o número conservador sempre, mesmo sem divergência — descartado:
  redundante com a projeção já exibida quando não há cachê a confirmar. (b) replicar os três Stats da página
  de Metas no Painel — exagero para um card de resumo; o Painel quer um veredito de uma linha, com link
  "Ver detalhe" para a página completa.
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D81 — Ritmo necessário no resto do ano na página de Metas (Sessão 89)
- **Contexto:** `computeGoalProgress` (D77) já dizia SE o músico está adiantado/atrasado frente à meta
  (`pace`: ahead/behind/on-track), mas não QUANTO ele precisa faturar daqui pra frente. O `pace`
  responde "estou no caminho?"; faltava o número acionável: "para bater a meta, preciso receber R$ X por
  mês no resto do ano". A página de Metas tinha o veredito qualitativo mas não a meta operacional mensal.
- **Decisão:** adicionar a função pura `goalRunRate(progress, { now })` em `src/lib/finance.ts`, que deriva
  do `RevenueGoalProgress` já computado: `requiredPerMonth` (falta receber ÷ meses restantes do calendário,
  mês corrente incluso), `currentPerMonth` (recebido ÷ meses decorridos, usando a mesma fração do ano do
  `pace`), `gapPerMonth` e um `verdict` categórico (`hit`/`on-pace`/`stretch`/`hard`/`unknown`) por faixa
  de `effortRatio` (required/current): ≤1 cobre no ritmo atual, ≤1,25 acelerar pouco, >1,25 acelerar
  bastante. Página de Metas ganhou um card "Ritmo necessário" (só ano corrente, só com meta em aberto).
- **Mês corrente sempre conta:** `monthsRemaining = 12 − monthIndex` inclui o mês atual (ainda dá pra
  faturar nele), então é sempre ≥ 1 no ano corrente — em dezembro sobra 1 mês e o necessário/mês = tudo
  que falta. Isso evita dividir por zero e reflete que o mês corrente ainda é faturável.
- **Denominadores deliberadamente diferentes:** o numerador de `currentPerMonth` usa a fração do ano
  decorrida (fracionária, acurada, coerente com o `pace` linear de `computeGoalProgress`), enquanto
  `requiredPerMonth` usa meses de calendário inteiros (mais intuitível para planejar: "faturar R$ X nos
  próximos N meses"). Cada um adota a noção de "mês" natural ao seu propósito; documentado na função.
- **Zero I/O extra:** o card recombina o `progress` já computado na página; nenhuma consulta nova ao banco.
- **Testes:** 9 casos puros para `goalRunRate` (on-pace/stretch/hard/hit/unknown, dezembro com 1 mês,
  ano futuro/passado não acionável, meta zero). 609 testes verdes (eram 600).
- **Alternativas consideradas:** (a) só mostrar o número, sem `verdict` — descartado: a faixa categórica
  (verde/âmbar/vermelho) comunica de relance se o esforço é factível, espelhando o padrão das demais
  mensagens da página. (b) `verdict` por valor absoluto do gap em vez de razão — descartado: a razão
  (required/current) é escala-invariante e diz "quanto acima do meu ritmo", mais comparável entre metas
  de tamanhos diferentes. (c) levar o card ao Painel já nesta sessão — adiado: a página de Metas é o lar
  natural; o helper puro fica pronto para o Painel adotar depois (mesmo caminho de D79→D80).
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D82 — Ritmo necessário no card de meta do Painel (Sessão 90)
- **Contexto:** D81 entregou o helper puro `goalRunRate` e o card "Ritmo necessário" na página de Metas,
  e deixou explícito como adiado "levar o card ao Painel depois (mesmo caminho de D79→D80, helper puro já
  testado)". O card "Meta de {ano}" do Painel mostrava o ritmo qualitativo (`pace`: adiantado/atrasado) e
  o piso conservador (D80), mas não o número acionável — quanto receber por mês para fechar a meta.
- **Decisão:** computar `goalRun = goalRunRate(goalProgress, {})` no `dashboard/page.tsx` e, quando
  `applicable && verdict !== "hit"`, anexar ao card de meta uma linha compacta "Ritmo necessário:
  {requiredPerMonth}/mês", colorida pelo `verdict` (verde on-pace / âmbar stretch / vermelho hard / cinza
  unknown) — espelhando a redação do card da página de Metas, condensada para o Painel.
- **Zero I/O extra:** `goalRunRate` deriva só do `goalProgress` (`RevenueGoalProgress`) já computado no
  dashboard; nenhuma consulta nem recálculo de transações/shows. Mesma postura das Sessões 75/77/88 (linhas
  reaproveitando helpers puros já em mãos no card do Painel).
- **Sem testes novos:** `goalRunRate`/`computeGoalProgress` já têm cobertura pura (D77/D81); esta é uma
  mudança de UI que reusa o helper testado. 609 testes verdes.
- **Só aparece quando acionável:** a linha some fora do ano corrente, sem meta, ou com a meta já batida
  (`verdict === "hit"`) — sem ruído, coerente com o card da página de Metas.
- **Alternativas consideradas:** (a) replicar os dois Stats (necessário/mês + ritmo atual) do card de Metas —
  exagero para um card-resumo; o Painel quer uma linha com link "Ver detalhe". (b) mostrar mesmo com a meta
  batida — descartado: redundante com o "100%"/barra cheia já visível.
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D83 — Resumo trimestral das Finanças (Sessão 91)
- **Contexto:** o conjunto de Fechamentos cobria o **mês** (Relatório mensal, D21) e o **ano** (Resumo
  anual, D36; Sazonalidade; Crescimento ano a ano), mas faltava a cadência **trimestral** — o período
  natural de revisão de progresso entre o mês e o ano, e o horizonte mais direto para acompanhar o pacing
  contra a meta anual de faturamento (D77).
- **Decisão:** nova função pura `quarterlySummary(txs, year)` em `src/lib/finance.ts` que **deriva os 4
  trimestres do `annualSummary`** (uma só fonte de verdade da agregação mensal já testada), agrupando
  jan–mar (Q1), abr–jun (Q2), jul–set (Q3), out–dez (Q4); soma income/expense/net por trimestre, repassa os
  totais do ano e aponta o melhor/pior trimestre (por resultado) entre os com movimento, com desempate pelo
  trimestre mais cedo (Q1→Q4) — espelhando exatamente o contrato e a semântica de `annualSummary`. Página
  `/financas/trimestral` análoga ao Resumo anual (totais do ano, cards de melhor/pior trimestre, tabela
  trimestre a trimestre com barras e período "Jan–Mar"), com navegação por ano e link cruzado ao Resumo
  anual. Registrada no hub de Relatórios (Finanças → Fechamentos).
- **Reaproveitamento:** zero duplicação de agregação — `quarterlySummary` chama `annualSummary` e fatia os
  12 meses em 4 trimestres; a página reusa o padrão visual (Stat/Bar/HighlightCard) do Resumo anual.
- **Testes:** 5 casos puros para `quarterlySummary` (4 trimestres vazios, agrupamento no trimestre certo +
  totais, ignora outros anos, melhor/pior por resultado, desempate pelo mais cedo). 614 testes verdes
  (eram 609).
- **Alternativas consideradas:** (a) trimestre **fiscal/móvel** (últimos 3 meses a partir de hoje) —
  descartado: trimestres de calendário são o que se compara ano a ano e o que o usuário espera de um
  "fechamento trimestral". (b) adicionar quebra por categoria e comparativo trimestre-a-trimestre já nesta
  sessão — adiado: o Resumo anual já cobre a categoria do ano, e manter o escopo fechado mantém a sessão
  funcional e mergeável; o helper puro deixa a porta aberta para um comparativo QoQ depois. (c) novo modelo/
  migração — desnecessário: a granularidade trimestral é puramente derivada das transações existentes.
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D84 — Exportação CSV do Resumo trimestral (Sessão 92)
- **Contexto:** o Resumo trimestral (D83) entrou sem exportação, enquanto o Resumo anual (D36) já oferece
  download CSV via `/financas/anual/export`. Para o músico que leva os fechamentos ao contador ou a uma
  planilha própria, faltava a paridade — o trimestre é justamente a cadência de revisão que se costuma
  consolidar fora da ferramenta.
- **Decisão:** nova função pura `quarterlySummaryToCsv(summary)` + `QUARTERLY_SUMMARY_CSV_HEADERS` em
  `src/lib/csv.ts`, espelhando `annualSummaryToCsv`: cabeçalho + 4 trimestres (Q1→Q4, zeros inclusive) +
  linha "Total do ano". Acrescenta uma coluna **"Período"** ("Janeiro–Março") para tornar o recorte de
  cada trimestre legível na planilha. Mesma convenção pt-BR já estabelecida (delimitador ";", decimal com
  vírgula, BOM UTF-8 prefixado na camada HTTP). Rota `GET /financas/trimestral/export` análoga à anual
  (`requireUser`, `parseYear` de `?ano=YYYY`, `Content-Disposition` de download
  `financas-trimestral-{ano}.csv`). Botão "⬇ CSV" no cabeçalho da página (só com movimento no ano).
- **Reaproveitamento:** a rota e o serializador são cópias estruturais dos equivalentes anuais; a camada
  pura reusa `quarterlySummary` (D83) e os helpers de CSV (`toCsv`/`centsToCsvAmount`/`MONTH_NAMES_LONG`).
- **Testes:** 4 casos puros para `quarterlySummaryToCsv` (forma 6 linhas com período; agregação no
  trimestre certo + total do ano; resultado negativo preservado; ignora outros anos). 618 testes verdes
  (eram 614).
- **Alternativas consideradas:** (a) **não** incluir a coluna "Período" para ficar 1:1 com o anual —
  rejeitado: o anual já traz o nome do mês na própria linha, então o trimestral precisa do período para
  não ficar ambíguo. (b) exportar também a quebra por categoria do trimestre — adiado: a página ainda não
  mostra categoria trimestral (mesma fronteira de escopo da D83), o CSV deve refletir o que a página
  apresenta.
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D85 — Meta por trimestre na página de Metas (Sessão 93)
- **Contexto:** a meta de faturamento é anual (D77), o card de pace diz se você está adiantado/atrasado
  (D77) e o "Ritmo necessário" (D81) dá o número mensal que falta — mas faltava o horizonte intermediário
  de revisão. O Resumo trimestral (D83) provou que o trimestre é a cadência natural entre o mês e o ano;
  o mesmo recorte aplicado à meta responde a pergunta acionável "em qual trimestre eu fiquei para trás?".
- **Decisão:** nova função pura `quarterlyGoalProgress(txs, year, goal, opts)` em `src/lib/finance.ts` que
  quebra a meta anual em **4 alvos iguais** (meta/4) e cruza cada alvo com a receita já recebida no
  trimestre. O `status` de cada trimestre depende do tempo (`hit`/`missed`/`in-progress`/`upcoming`),
  permitindo distinguir um trimestre que ficou para trás de um que ainda nem começou. Card "Meta por
  trimestre" em `/financas/metas`, com barra recebido/alvo por trimestre, selo de status e placar
  "{N} de 4 batidos".
- **Base de "recebido":** usa **só receitas recebidas** (`received`, regime de caixa), idêntica ao
  `realized` de `computeGoalProgress` — e deliberadamente NÃO a competência de `quarterlySummary`. A meta
  fala em dinheiro que entrou no caixa; medir o trimestre por competência inflaria o progresso com receita
  ainda a receber e divergiria do headline anual.
- **Divisão dos centavos:** o alvo é `floor(meta/4)` com o resto (0–3 centavos) distribuído aos primeiros
  trimestres, garantindo que a soma dos 4 alvos seja exatamente a meta (sem perda por arredondamento).
- **Reaproveitamento:** reusa os rótulos `QUARTER_LABELS` (D83) e os helpers internos `monthKey`/`sum`;
  a varredura é única e a função é pura (recebe `now` injetável para os testes).
- **Testes:** 7 casos puros para `quarterlyGoalProgress`. 625 testes verdes (eram 618).
- **Alternativas consideradas:** (a) **alvos sazonais** (ponderar cada trimestre pela receita histórica do
  ano anterior) — rejeitado por ora: mais sofisticado, mas com poucos anos de histórico fica ruidoso e o
  alvo "1/4 igual" é o piso honesto e previsível; pode evoluir depois. (b) **metas mensais** (12 alvos) —
  adiado: granularidade fina demais para a tela de meta, e o ritmo mensal já é coberto por `goalRunRate`
  (D81); o trimestre é o passo certo agora. (c) levar o card ao Painel — adiado para uma sessão futura
  (mesma evolução incremental que D80/D82 fizeram com os outros cards de meta).
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D86 — Meta por trimestre no Painel (tira compacta no card de meta) (Sessão 94)
- **Contexto:** a D85 (Sessão 93) entregou o card "Meta por trimestre" em `/financas/metas` via
  `quarterlyGoalProgress`, mas a função pura ainda não aparecia no Painel — onde os demais sinais da
  meta já vivem (progresso anual + piso conservador D80, ritmo necessário D82). A própria D85 anotou
  "levar o card ao Painel" como evolução adiada, na mesma cadência incremental de D80/D82.
- **Decisão:** acrescentar uma **tira compacta** ao card "Meta de {ano}" do dashboard, abaixo das linhas
  já existentes (piso conservador, ritmo necessário), reaproveitando `quarterlyGoalProgress` sobre as
  transações já carregadas (sem I/O extra além do lookup da meta, já feito). A tira é uma grade de 4
  mini-barras (uma por trimestre, largura = `ratio`, cor pelo status via o mapa local `QUARTER_BAR`) com
  o rótulo do trimestre (o atual em destaque) e um placar "{hitCount} de 4 batidos". Só renderiza quando
  há meta > 0 para o ano corrente; o detalhe completo (selos de status, valores, alvo) continua em
  `/financas/metas`.
- **Tira compacta, não o card inteiro:** o card de meta do Painel é um resumo glanceável que linka para o
  detalhe — repetir o card completo (com selos textuais e valores por trimestre) seria redundante e
  pesado. A grade de 4 barras coloridas dá de relance "em qual trimestre o ritmo caiu", que é o valor
  específico do recorte trimestral, sem encher o dashboard. Mesma escolha de "linha/tira no card +
  detalhe na página" das D67/D80/D82.
- **Cores:** mapa local `QUARTER_BAR` (status → classe de barra) espelha a semântica de `QUARTER_STATUS`
  da página de Metas (batido=verde, abaixo=âmbar, em andamento=marca, a seguir=cinza), mas é declarado no
  dashboard para não exportar UI de uma página; os rótulos/labels vêm do próprio `QuarterGoalProgress`.
- **Sem teste novo:** mudança puramente de UI que reaproveita `quarterlyGoalProgress` (já com 7 testes
  puros, D85). Verificada por build + typecheck + lint + smoke, alinhada às sessões de UI anteriores
  (41/52/69/88/90). 625 testes verdes (inalterado).
- **Alternativas consideradas:** (a) replicar o `QuarterlyCard` inteiro no Painel — rejeitado (redundante
  com a página de detalhe e visualmente pesado para o dashboard); (b) reduzir a uma única linha textual
  ("Q3: R$ X/Y") como as demais — rejeitado: perde o "qual trimestre falhou", que é o ponto do recorte;
  a grade de 4 barras é compacta e ainda assim comparativa.
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D87 — Meta por mês na página de Metas (granularidade fina) (Sessão 95)
- **Contexto:** a meta de faturamento é anual (D77); o "Ritmo necessário" (D81) dá o número mensal que
  falta dali pra frente; a "Meta por trimestre" (D85) responde "em qual trimestre fiquei para trás?". A
  própria D85 anotou as **metas mensais (12 alvos)** como evolução adiada — "granularidade fina demais
  para a tela de meta" naquele momento. Com o recorte trimestral já no ar (e levado ao Painel na D86), o
  passo seguinte natural é o detalhe mensal: o trimestre agrega três meses e esconde qual deles puxou o
  resultado pra baixo.
- **Decisão:** nova função pura `monthlyGoalProgress(txs, year, goal, opts)` em `src/lib/finance.ts`,
  espelhando `quarterlyGoalProgress` (D85) com **12 alvos iguais** (meta/12) em vez de 4. Cruza cada alvo
  com a receita já recebida no mês e classifica o `status` por tempo (`hit`/`missed`/`in-progress`/
  `upcoming`). Card "Meta por mês" em `/financas/metas` (abaixo do card trimestral), com uma grade
  responsiva de 12 mini-blocos (barra recebido/alvo, selo de status, valores, mês atual em destaque) e o
  placar "{N} de 12 batidos".
- **Base de "recebido" idêntica à D85/D77:** só receitas recebidas (`received`, regime de caixa), a mesma
  base do `realized` anual — e deliberadamente NÃO a competência. Coerência entre o headline anual, o
  trimestre e o mês.
- **Divisão dos centavos:** alvo `floor(meta/12)` com o resto (0–11 centavos) distribuído aos primeiros
  meses, garantindo que a soma dos 12 seja exatamente a meta (mesma regra da D85).
- **UI — grade compacta, não 12 linhas full-width:** o card trimestral usa 4 linhas largas; replicar isso
  para 12 meses dominaria a página. A grade de mini-blocos (2/3/4 colunas conforme a largura) mostra os 12
  meses de relance sem empurrar o resto da tela. O componente reusa o mapa de status da página (renomeado
  de `QUARTER_STATUS` para `GOAL_STATUS`, já que mês e trimestre compartilham a mesma união de status —
  `MonthGoalStatus = QuarterGoalStatus`).
- **Reaproveitamento:** `monthKey`/`sum` internos e o padrão exato da D85; rótulos curtos pt-BR num const
  local `MONTH_GOAL_LABELS` (mantém `finance.ts` sem dependência de `calendar.ts`, como já fazia com
  `QUARTER_LABELS`). Função pura com `now` injetável.
- **Testes:** 7 casos puros para `monthlyGoalProgress` (soma dos 12 alvos == meta; só recebidas agrupadas
  por mês; hit/missed em ano encerrado; missed/in-progress/upcoming no ano corrente; mês corrente que já
  bateu vira hit; ano futuro tudo upcoming; meta negativa saneada a 0). 632 testes verdes (eram 625).
- **Escopo desta sessão = só a página.** Levar a tira mensal ao Painel fica para uma sessão futura (mesma
  cadência incremental D80/D82/D86); o card do dashboard já carrega progresso anual + piso + ritmo +
  trimestre, e 12 mini-barras lá poderiam ficar pesadas — decidir o formato (talvez sparkline) à parte.
- **Alternativas consideradas:** (a) substituir o card trimestral pelo mensal — rejeitado: o trimestre é o
  horizonte de revisão mais leve e os dois recortes coexistem (anual→trimestral→mensal); (b) alvos sazonais
  ponderados pelo histórico — rejeitado por ora (ruidoso com poucos anos, igual à D85); (c) levar já ao
  Painel — adiado (acima).
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D88 — Tira mensal de meta no Painel (sparkline no card de meta) (Sessão 96)
- **Contexto:** a "Meta por mês" (D87) entrou na página `/financas/metas`, mas a própria D87 deixou
  explícito que **levar a tira mensal ao Painel ficaria para uma sessão futura** ("decidir o formato,
  talvez sparkline, à parte"). O card "Meta de {ano}" do dashboard já evoluiu pela mesma cadência
  incremental: piso conservador (D80), ritmo necessário (D82) e a tira trimestral (D86). O detalhe mensal
  é o passo seguinte natural — o trimestre agrega três meses e esconde qual deles puxou o ritmo pra baixo.
- **Decisão:** nova tira compacta "Por mês" no card "Meta de {ano}" do dashboard, **abaixo da tira
  trimestral** (D86), com 12 mini-barras (uma por mês, cor pelo status) no formato sparkline + o placar
  "{N} de 12 batidos". Reusa `monthlyGoalProgress` (D87) — **nenhuma lógica nova**. Só aparece com meta > 0.
- **Formato sparkline, não a grade de blocos da página:** a página tem espaço para 12 mini-blocos com
  valores e selos; o card do dashboard já carrega anual + piso + ritmo + trimestre, então a versão do
  Painel é deliberadamente mínima — só as 12 barras finas (grade de 12 colunas) com a inicial do mês como
  rótulo. O "de relance" é a cor das barras; quem quer o valor de cada mês segue o link para
  `/financas/metas`. Mesma filosofia "retrato compacto, detalhe na página" da tira trimestral (D86).
- **Reaproveitamento / DRY:** o mapa de cor de barra do dashboard foi renomeado de `QUARTER_BAR` para
  `GOAL_BAR` (`Record<QuarterGoalStatus, string>`), agora compartilhado pelas duas tiras — mês e trimestre
  usam a mesma união de status (`MonthGoalStatus = QuarterGoalStatus`), espelhando o `GOAL_STATUS` que a
  página já unificou na D87.
- **Rótulo = inicial do mês (J/F/M/...):** com 12 colunas finas não cabe "jan/fev"; a inicial mantém a
  orientação posicional (jan→dez) sem poluir. Há colisão de iniciais (3xJ, 2xM/A), tolerável porque o sinal
  é a sequência das barras, não a leitura individual do rótulo — o detalhe nomeado está na página.
- **Testes:** nenhum novo — `monthlyGoalProgress` já tem 7 casos puros (D87) e a mudança é puramente de
  apresentação (sem lógica). 632 testes seguem verdes.
- **Alternativas consideradas:** (a) replicar a grade de blocos da página no card — rejeitado: dominaria o
  dashboard; (b) substituir a tira trimestral pela mensal — rejeitado: os dois recortes coexistem
  (anual->trimestral->mensal), o trimestre é o horizonte de revisão mais leve; (c) destacar/rolar para o mês
  corrente — adiado (a barra do mês atual já ganha rótulo em destaque; scroll-spy fica para depois).
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D89 — Composição de despesas: "Para onde vai o dinheiro" (Sessão 97)
- **Contexto:** o app já tinha o **mix de receitas** (`incomeMix`, D45, `/financas/fontes-de-renda`):
  "de onde vem o dinheiro e quão dependente sou de uma única fonte". Faltava o espelho do lado das
  **despesas** — "para onde vai o dinheiro e qual gasto domina o orçamento". Os relatórios de despesa
  existentes olham outro ângulo: o relatório mensal/anual quebra por categoria mas só de um período;
  os **custos fixos** (D39) focam em recorrência (categorias que aparecem em ≥3 meses) para estimar o
  piso mensal. Nenhum respondia à composição/concentração de **toda** a despesa do histórico.
- **Decisão:** nova função pura `expenseMix(txs)` (em `src/lib/finance.ts`) — espelho exato de
  `incomeMix` para `EXPENSE`: agrupa as despesas por categoria (= rubrica), com total, participação
  (`share`), contagem, a concentração nas 3 maiores (`top3Share`), o **HHI**, o **número efetivo de
  rubricas** (1/HHI) e o veredito `level` (concentrated/moderate/diversified, reusando
  `diversificationLevel`). Página `/financas/composicao-despesas` com o veredito, cards de destaque
  (despesa total, maior gasto, nº de categorias) e a tabela de composição com barras. Registrada no hub
  de Relatórios (Finanças → Custos & metas).
- **DRY / reaproveitamento:** a matemática comum a `incomeMix` e `expenseMix` (agrupar por categoria de
  um único `type`, ordenar por valor decrescente com desempate por nome pt-BR, derivar HHI/top3) foi
  extraída no helper privado `categoryMixStats(txs, type)`. `incomeMix` foi **reescrito para delegar**
  a ele (saída pública idêntica — os 10 testes de `incomeMix` seguem verdes sem mudança), e `expenseMix`
  delega ao mesmo núcleo. Um teste novo cruza os dois (as mesmas transações como INCOME vs. EXPENSE
  produzem os mesmos números) travando essa simetria.
- **Semântica do `level` no lado da despesa:** a mesma escala de HHI, mas a leitura é **informativa, não
  um alerta de risco** — concentrar despesa numa rubrica não é necessariamente ruim (pode ser o gasto
  inevitável da operação). O texto da página é neutro: "concentrada" vira "é onde cortar rende mais",
  não "risco". A cor do veredito também muda (âmbar/azul/verde em vez do vermelho de risco de renda).
- **Sem schema, sem dependência, sem server action.** Considera todas as despesas lançadas (pagas e a
  pagar), coerente com `incomeMix` (que considera recebidas e a receber). Categoria em branco →
  "Sem categoria" (mesma norma de `categoryReport`/`incomeMix`).
- **Testes:** 8 casos puros novos de `expenseMix` (vazio, agrupamento ignorando receitas, "Sem
  categoria", ordenação/desempate, top3/HHI/efetivas, rubrica única→concentrada, distribuída→
  diversificada, espelho de `incomeMix`). **640 testes** verdes (eram 632).
- **Alternativas consideradas:** (a) reusar `categoryReport` (que já quebra despesa por categoria) —
  rejeitado: ele não traz HHI/concentração/veredito e é "por período" (mensal/anual), não a composição
  do histórico; (b) estender `incomeMix` para receber o tipo — rejeitado: a saída fala "fontes de renda"
  (sources/sourceCount), nomes errados para despesa; o helper compartilhado dá DRY sem poluir as APIs.
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D90 — Variação por categoria: "o que mudou de um mês para o outro" (Sessão 98)
- **Contexto:** o **relatório mensal** (D33, `/financas/relatorio`) já responde "estou melhor que o mês
  passado?" comparando os **quatro totais** (receita/despesa/saldo/caixa) frente ao mês anterior. Mas
  quando o saldo piora, ele não diz **qual categoria** explica a diferença — só que a despesa subiu.
  A composição de despesas (D89) e o mix de receitas (D45) olham um único recorte, sem comparar períodos.
  Faltava o cruzamento: a quebra por categoria de **dois** meses lado a lado, com a variação de cada uma.
- **Decisão:** nova função pura `compareCategoryReports(current, previous)` (em `src/lib/finance.ts`) —
  para receitas e despesas, lista toda categoria presente em **qualquer** dos dois períodos (ausente num
  lado conta como R$ 0) com `{amount, previousAmount, delta}`, onde `delta` é o `MetricDelta` já usado no
  relatório mensal. Ordena pelo **maior movimento absoluto** (`|delta|` desc; empate por valor atual desc,
  depois nome pt-BR) — quem mais mudou (alta ou queda) aparece primeiro. Expõe os totais dos dois lados, a
  variação dos totais (`incomeDelta`/`expenseDelta`) e três destaques: maior alta de despesa, maior
  **economia** (maior queda de despesa) e maior alta de receita. Página `/financas/variacao` com navegação
  por mês (←/→/Mês atual, mesmos helpers do relatório) comparando o mês escolhido vs. o anterior; cards de
  total com seta colorida, faixa de destaques e duas tabelas (despesas/receitas). Registrada no hub de
  Relatórios (Finanças → Fechamentos) e cruzada com o relatório mensal.
- **DRY / reaproveitamento:** delega a `categoryReport` (mesma definição de categoria e de "Sem categoria")
  e a `computeDelta` (mesma semântica de variação/`pct`/`direction` do relatório mensal) — uma fonte de
  verdade para os dois lados. A página reaproveita os helpers de mês do calendário (`parseMonthKey`,
  `shiftMonth`, `monthKey`, `formatMonthTitle`) e `filterTransactions({month})`, exatamente como o relatório.
- **Direção é só sinal; a UI decide o tom.** Como em D33, `direction` reflete só o sinal do delta: a página
  pinta despesa subindo de vermelho e caindo de verde (e o inverso para receita). Base anterior 0 → `pct`
  nulo, exibido como "novo".
- **Sem schema, sem dependência, sem server action.** Considera as transações lançadas (pagas e a pagar),
  coerente com o relatório mensal.
- **Testes:** 8 casos puros novos de `compareCategoryReports` (dois vazios, variação de despesa, categoria
  só num lado contando 0, ordenação por movimento absoluto, os três destaques, sem altas/quedas → destaques
  nulos, totais/variação agregados, "Sem categoria" nos dois lados). **648 testes** verdes (eram 640).
- **Alternativas consideradas:** (a) embutir a quebra comparada **dentro** do relatório mensal — rejeitado:
  inflaria uma página já densa; uma página dedicada com seu próprio foco ("o que mudou") é mais legível e
  segue o estilo do app (muitas páginas pequenas); as duas se cruzam por link. (b) comparar contra a
  **média** dos últimos meses (como o relatório faz para os totais) em vez do mês anterior — adiável: para
  "o que mudou" o mês imediatamente anterior é o quadro mais direto; a média por categoria fica para depois.
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D91 — Contas fixas a lançar no mês + lançar com um clique (Sessão 99)
- **Contexto:** os **custos fixos** (D39, `/financas/custos-fixos`) já descobrem QUAIS despesas se repetem
  todo mês e estimam o custo fixo mensal. Mas a análise era passiva: o usuário ainda tinha que **lembrar**
  de lançar cada conta recorrente todo mês e **redigitar** tudo. Faltava o lado acionável — "quais contas
  fixas eu ainda não lancei este mês?" — e um atalho para registrá-las sem retrabalho.
- **Decisão:** nova função pura `pendingFixedCosts(txs, options)` (em `src/lib/finance.ts`) reaproveita
  `recurringExpenses` para pegar as categorias recorrentes **ainda ativas** e filtra as que já têm ao menos
  uma despesa lançada no **mês de referência** (`options.now`, default agora) — o restante é o que falta
  lançar, ordenado pela maior conta típica primeiro (a ordem de `recurringExpenses`). Devolve `pending`
  (categoria + conta típica + última ocorrência + meses ativos), `loggedCount`, `activeCount`, `totalPending`
  e `month`. A página de custos fixos ganhou a seção **"⏰ A lançar em {mês}"** com cada conta pendente e um
  botão **"Lançar R$ X →"** que abre a Nova transação **pré-preenchida** (tipo EXPENSE, categoria, valor =
  conta típica, data = hoje); quando não há pendência mas há custo fixo ativo, mostra "✓ Todos os custos
  fixos já foram lançados". O **Painel** ganhou um alerta âmbar "Custos fixos a lançar" (reaproveita os `txs`
  já carregados; zero consulta extra) linkando para a página.
- **Pré-preenchimento da Nova transação:** `NewTransactionPage` passou a ler query params (`tipo`, `categoria`,
  `valor`, `descricao`, `data`) e repassá-los ao `TransactionForm` via a prop `values` que **já existia**
  (usada pela edição) — sem novo componente. Cada parâmetro é validado/saneado (tipo ∈ TRANSACTION_TYPES,
  data no formato `YYYY-MM-DD`, valor reduzido a dígitos/sep.); o que não casar é ignorado, mantendo o
  formulário utilizável. O valor usa `centsToInputValue` (mesma serialização da edição) e o `MoneyInput`
  reformata para "80,00" ao montar.
- **DRY / reaproveitamento:** `pendingFixedCosts` é uma camada fina sobre `recurringExpenses` (mesma
  definição de recorrência, "ainda ativa", conta típica e "Sem categoria"); o prefill reusa a prop `values`
  do formulário e `centsToInputValue`; o alerta do Painel reusa os `txs` já mapeados.
- **Mês de referência via `now`.** Como em `recurringExpenses`, a função é pura e parametrizada por `now`,
  então é testável de forma determinística e a UI passa a data corrente. "Já lançado" = existe despesa na
  mesma categoria no mês de `now` (qualquer valor) — não tenta casar o valor típico.
- **Sem schema, sem dependência, sem server action.** Considera as despesas lançadas (pagas e a pagar);
  o lançamento em si segue pelo fluxo normal de criação de transação (server action já existente).
- **Testes:** 7 casos puros novos de `pendingFixedCosts` (sem recorrência; ativa não lançada → pendente;
  já lançada no mês → fora + loggedCount; encerrada → fora; ordenação por conta típica; separação
  lançadas/pendentes no mesmo mês; `now` como referência). Verificação ao vivo autenticada: seção renderiza
  com a conta pendente, Nova transação abre com categoria/valor/data preenchidos e o alerta aparece no
  Painel. **655 testes** verdes (eram 648).
- **Alternativas consideradas:** (a) **criar a despesa direto** com um clique (como `settleShowFeeAction`
  faz para cachês, D26) — rejeitado por ora: a conta fixa real varia de mês a mês (valor da conta de luz,
  etc.), então pré-preencher e deixar o usuário **conferir/ajustar** antes de salvar é mais seguro que
  lançar cego; o atalho de prefill já elimina o retrabalho. (b) marcar "conta paga este mês?" por status
  explícito num modelo de recorrência — rejeitado: exigiria schema; inferir do histórico (a categoria
  apareceu no mês) é suficiente e sem custo. (c) só no Painel ou só na página — escolhido **ambos**: a
  página tem os atalhos de lançar; o Painel é o lembrete na primeira tela.
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D92 — Cachês a receber por contratante (de quem cobrar primeiro) (Sessão 100)
- **Contexto:** os recebíveis já têm duas leituras: a lista plana `/shows/a-receber` (D25–D40, com
  aging por idade do atraso, D31) e o prazo de recebimento realizado por contratante
  (`/shows/prazo-recebimento/por-contratante`, D52). O aging responde "qual dinheiro está parado há mais
  tempo?"; o DSO por contratante responde "quem PAGA rápido/devagar (histórico do que já entrou)". Faltava
  a pergunta operacional de cobrança: **"quem está me devendo AGORA — e há quanto tempo?"** — o saldo em
  aberto agrupado por devedor, para priorizar de quem cobrar primeiro.
- **Decisão:** nova função pura `outstandingByContact(receivables, getPayer, {now})` em `src/lib/finance.ts`
  e nova página `/shows/a-receber/por-contratante`. A função recebe a saída de `reconcileShowFees`
  (os shows com `outstanding > 0`) e `getPayer` (mesmo `billing.pickPayerContact` da D52 — contratante/
  promoter antes da casa, sem exigir canal), reaproveita a **idade do atraso de `bucketReceivablesByAge`**
  (dias UTC desde a data do show, baldes d30/d60/d90/older) e agrega por devedor: saldo a receber, nº de
  shows, **pior atraso** (`maxDaysOutstanding`), **atraso médio ponderado pelo valor em aberto**
  (`weightedAvgDays`) e o **balde de aging do pior atraso** (`oldestBucket`, cor de urgência). Ordena do
  **maior saldo devedor ao menor** (desempate: atraso mais longo, depois id), com o grupo "sem contratante"
  sempre por último; `topDebtor`/`oldestDebtor` ignoram o grupo nulo.
- **UI:** cards de destaque (total a receber, maior devedor, quem espera mais), tabela por contratante
  (a receber / shows / pior atraso / atraso médio, com bolinha de cor pelo balde de aging) e o detalhe de
  shows em aberto por contratante (mais atrasado → mais recente). A cobrança/quitação em si continua em
  `/shows/a-receber` (links cruzados nos dois sentidos) — esta página é a **priorização**, não duplica o
  fluxo de ação.
- **DRY / reaproveitamento:** compõe `reconcileShowFees` (regra de "já aconteceu" e abatimento),
  `receivableAgeBucket`/`RECEIVABLE_AGE_BUCKET_*` (mesma idade do atraso que o aging) e `pickPayerContact`
  (mesma escolha de pagador que o DSO por contratante). Nenhuma regra nova de quem entra/abate.
- **Distinção das vistas vizinhas:** difere do aging (D31, agrupa por **idade**, não por **devedor**) e do
  DSO por contratante (D52, mede o **prazo realizado** do que já entrou, não o **saldo em aberto**). As três
  respondem perguntas diferentes sobre o mesmo dinheiro.
- **Registro no hub:** novo card "A receber por contratante" em `REPORT_GROUPS` (subtema *Recebíveis*),
  contíguo a "Cachês a receber" — aparece na busca e no índice do hub automaticamente (D54/D56/D58).
- **Testes:** 5 casos puros novos de `outstandingByContact` (vazio; agrupa e ordena por maior saldo;
  pior atraso + atraso médio ponderado + `oldestBucket`; grupo nulo por último e ignorado em top/oldest;
  desempate por atraso quando o saldo é igual) + ajuste do invariante de busca do hub. Build/typecheck/lint
  verdes; smoke test (app sobe, rota responde 200, sem erro no log). **660 testes** verdes (eram 655).
- **Alternativas consideradas:** (a) **mediana do prazo por contratante** (item adiado na D57(c)) —
  segue adiado: com poucos shows por contratante a mediana fica ruidosa, e a pergunta de cobrança é melhor
  servida por "quanto/há quanto tempo me devem" do que por uma estatística de prazo. (b) embutir os atalhos
  de cobrança (e-mail/WhatsApp) por contratante aqui — adiado: o fluxo de cobrança/quitação já está consolidado
  em `/shows/a-receber` (por show, onde o valor e o canal são escolhidos); duplicá-lo por contratante exigiria
  agregar mensagem de vários shows e escolher canal — escopo próprio. (c) ordenar por idade do atraso em vez de
  saldo — descartado: o aging já prioriza por idade; aqui a leitura primária é "quem deve mais", com o atraso
  como desempate e sinal de cor.
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D93 — Cobrança consolidada por contratante (e-mail/WhatsApp na página "por contratante") (Sessão 101)
- **Contexto:** a D92 deixou `/shows/a-receber/por-contratante` como página de **priorização** ("quem me
  deve mais, e há quanto tempo"), explicitamente sem o atalho de cobrança — a alternativa (b) da D92 adiou
  embuti-lo porque "exigiria agregar mensagem de vários shows e escolher canal — escopo próprio". Este é esse
  escopo. Sem o atalho, o usuário via o maior devedor mas tinha de voltar a `/shows/a-receber` e cobrar
  **show a show**, perdendo a vantagem de já ter o devedor agrupado.
- **Decisão:** cobrança **consolidada** por contratante — um botão ✉ E-mail / WhatsApp por linha que abre
  **uma única mensagem** cobrindo **todos** os shows em aberto daquele contratante. Duas funções puras novas
  em `src/lib/billing.ts`:
  - `buildContactDunning(shows, {contactName, fromName})` → `DunningMessage | null`. Com **1** show delega a
    `buildDunningMessage` (mantém a redação singular já testada — evita "1 cachês"); com **vários**, lista
    cada show (`• "título" (DD/MM/AAAA UTC, em local) — valor`) e fecha com `Total em aberto: …`; `null` sem
    shows. Reaproveita `venueLabel`/`billingDate`/`formatMoney`.
  - `buildContactBilling(contact, shows, {fromName})` → `ContactBilling | null`. Junta a mensagem +
    `mailtoUrl`/`whatsappUrl` prontos (via `buildMailtoUrl`/`buildWhatsappUrl`, mesma normalização de telefone
    pt-BR da D27) + `showCount`/`totalOutstanding`; `null` quando o contato não tem canal (`hasChannel`) ou não
    há shows.
- **Por que aqui é diferente do por-show (D27):** lá `BillingActions` é um componente **cliente** com seletor
  de "quem cobrar" entre vários contatos do mesmo show. Aqui o pagador já está resolvido por contratante
  (um contato por grupo, via `pickPayerContact`), então a UI é só dois `<a>` no **server component** (sem JS
  de cliente) — mais simples e sem hidratação. O canal (e-mail/WhatsApp) é escolhido pelo botão; não há
  seleção de contato a fazer.
- **UI:** `page.tsx` estende o `PayerContact` resolvido com `email`/`phone` (já vinham do `pickPayerContact`,
  só não eram propagados), deriva `fromName` (`artistName` || `name`, igual a `/shows/a-receber`) e monta
  `buildContactBilling` por linha de detalhe a partir dos shows em aberto do grupo. Grupo "Sem contratante"
  e contatos sem canal não mostram botão.
- **DRY:** zero regra nova de telefone/redação/valor — tudo composto sobre helpers existentes do `billing.ts`.
  A escolha de pagador é a mesma da D52/D92 (`pickPayerContact`).
- **Testes:** 8 casos puros novos (`buildContactDunning`: vazio→null, 1 show = singular, vários listam+somam,
  saudação genérica sem nome; `buildContactBilling`: sem canal→null, sem shows→null, mailto/whatsapp+contagem+
  total, só-e-mail sem telefone). **668 testes** verdes (eram 660). Build/typecheck/lint verdes; smoke test
  (app sobe; `/login`→200; página protegida→307 sem sessão; sem erro no log).
- **Alternativas consideradas:** (a) link `mailto:` com vários destinatários ou um seletor de show por linha —
  descartado: o valor está em **uma** mensagem agregada por devedor (o ponto da página). (b) reaproveitar o
  componente cliente `BillingActions` — descartado: ele resolve seleção de contato por show, que aqui não
  existe (um pagador por grupo); anchors no servidor são mais simples. (c) data prometida de pagamento na
  cobrança — segue adiado (próximo passo do item 5 do PROGRESS).
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; nenhuma mudança de schema.

## D94 — Data prometida de pagamento + promessas furadas (Sessão 102)
- **Contexto:** o produto investe pesado em **cobrar o dinheiro que ficou na mesa** (aging D31/D32, DSO D51,
  por contratante D92, cobrança consolidada D93). Faltava o passo humano do follow-up: quando o músico cobra,
  o contratante diz *"pago dia X"* — e isso precisa virar um lembrete. Sem registrar a **promessa**, o
  recebível some na lista por data do show e o "ele disse que pagaria semana passada" se perde. Era o próximo
  passo do item 5 do PROGRESS, adiado na D93.
- **Decisão:** registrar a **data prometida de pagamento** por show e destacar as promessas **furadas** (data
  passou, cachê ainda em aberto). Persistência mínima: um campo opcional `Show.paymentPromisedAt DateTime?`
  (em vez de uma entidade "promessa" própria — um recebível tem no máximo uma promessa viva; quando paga, o
  recebível sai da lista e a promessa deixa de importar). Lógica pura em `src/lib/finance.ts`:
  - `paymentPromiseStatus(promisedAt, now)` → `"none" | "pending" | "broken"`. Compara por **dia UTC** (igual
    a `resolveReceivedDate`/aging): sem data ou inválida → none; hoje/futuro → pending; passou → broken. Como
    `reconcileShowFees` só devolve linhas **em aberto**, "broken" basta a data ter passado (não precisa
    rechecar saldo).
  - `summarizePaymentPromises(rows, now)` separa furadas × no prazo com contagem e total em aberto por grupo,
    cada grupo ordenado pela data prometida (mais urgente primeiro), desempatando por id. Ignora linhas sem
    promessa.
  - `resolvePromiseDate(raw)` resolve "YYYY-MM-DD" → meia-noite UTC, ou `null` (vazio/inválido = **limpar**).
    Diferente de `resolveReceivedDate`, **aceita data futura** — uma promessa é, por natureza, futura.
  - Tipo `PromisableShowLike` = `ReceivableShowLike` + `paymentPromisedAt?` (o genérico de `reconcileShowFees`
    propaga o campo às linhas sem alterar a assinatura existente).
- **Server action:** `setPaymentPromiseAction` grava/limpa a data; confirma posse do show; resolve a data no
  servidor (parse nunca confia no cliente). Revalida a-receber (as duas visões), o show e o Painel.
- **UI:** componente cliente `PromiseButton` (duas etapas, espelha `SettleFeeButton` — sem diálogo
  bloqueante): fechado mostra o selo do estado ("+ promessa" / 📅 data âmbar / ⚠ data vermelha); aberto, um
  `<input type="date">` com Salvar / Limpar / Cancelar. **Limpar** esvazia o input no DOM via `ref` e chama
  `form.requestSubmit()` — o `FormData` leva `promisedAt=""` de forma **determinística** (sem corrida de
  estado React). `/shows/a-receber` ganhou a coluna "Promessa" e o card "🤝 Promessas de pagamento"; o Painel
  ganhou a linha "🤝 {valor} em N promessas vencidas" no alerta de cachês a receber.
- **Por que não nas Finanças/transação:** a promessa é sobre o **cachê do show** (a unidade que a página de
  cobrança opera), não sobre uma transação específica — o saldo em aberto pode nem ter transação lançada
  (`unregistered`). Pôr no show mantém uma fonte única e some naturalmente quando o show é quitado.
- **DRY:** reaproveita `reconcileShowFees`, `utcMidnight`/`dayKey`/`isValidDateKey`, `SubmitButton` e o padrão
  de ação inline do `SettleFeeButton`. Nenhuma regra nova de "o que entra/abate".
- **Testes:** 12 puros (`paymentPromiseStatus` ×5, `summarizePaymentPromises` ×4, `resolvePromiseDate` ×3) +
  4 de integração da action (grava meia-noite UTC, limpa com vazio, ignora data inválida, bloqueia show de
  outro usuário). **684 testes** verdes (eram 668). Build/typecheck/lint verdes; smoke test **autenticado**
  (sessão semeada) renderiza a coluna/card/⚠ em `/shows/a-receber` e a linha no Painel.
- **Hipótese a validar:** que o músico vai de fato registrar a data prometida na hora da cobrança (fricção de
  um clique extra). Se a adoção for baixa, um caminho é capturar a promessa **junto** do atalho ✉/WhatsApp
  (registrar ao abrir a mensagem). Adiado até ter sinal de uso.
- **Alternativas consideradas:** (a) entidade `PaymentPromise` própria com histórico de promessas — descartado
  por ora: over-engineering p/ um recebível com no máximo uma promessa viva; dá pra evoluir se precisar de log.
  (b) promessa por transação pendente — descartado: o saldo em aberto pode não ter transação. (c) só um alerta
  no Painel sem editar na lista — descartado: o registro precisa estar onde se cobra.
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), mesma postura de D6/D8;
  nenhuma dependência nova; **um** campo de schema novo (aditivo, opcional, portável p/ PostgreSQL).

## D95 — Promessas furadas no recorte por contratante (Sessão 103)
- **Contexto:** a D94 registrou a **data prometida de pagamento** por show e destacou as promessas furadas,
  mas só na visão plana `/shows/a-receber` (coluna "Promessa" + card geral) e no Painel. A visão de cobrança
  priorizada por **devedor** (`/shows/a-receber/por-contratante`, D92/D93) ainda ignorava a promessa — ou seja,
  ao decidir "de quem cobrar primeiro" o músico não via *quem prometeu e não cumpriu*, que é justamente o sinal
  mais forte de cobrança. Era o "próximo possível" do item 5 do PROGRESS.
- **Decisão:** trazer o panorama de promessas para a página por contratante, **sem nova lógica pura** — apenas
  reaproveitando `summarizePaymentPromises`/`paymentPromiseStatus` (D94), chamados sobre os recebíveis já
  agrupados por `outstandingByContact` (D92). Três níveis de sinal, do geral ao específico:
  - **Banner geral** (espelha o card de `/shows/a-receber`): total/contagem de promessas vencidas × no prazo
    do recorte inteiro, a partir de `summarizePaymentPromises(receivables.rows)`.
  - **Selo por contratante** ("⚠ N promessas vencidas") na tabela de priorização e no cabeçalho do detalhe,
    a partir de um `Map<chave-do-grupo, PaymentPromiseSummary>` construído com uma chamada por grupo
    (`r.rows.map(a => a.row)`). A chave casa exatamente a de `byContact.rows` (`contact.id` / `"__none__"`).
  - **Selo por show** na lista de detalhe: "⚠ promessa vencida" (vermelho) ou "📅 promete {data}" (âmbar),
    via `paymentPromiseStatus(show.paymentPromisedAt)`. O campo já vinha no `findMany` (sem `select`).
- **Por que aqui não tem o `PromiseButton`:** a página por contratante é de **priorização/leitura** (decidir por
  quem começar); o registro/edição da data continua único em `/shows/a-receber` (D94) — evita dois pontos de
  escrita do mesmo campo. O rodapé e o banner linkam para lá.
- **DRY:** nenhuma função nova; toda a classificação/agrupamento de promessas é a de D94, já com 9 testes puros.
  A mudança é de UI (composição de helpers testados), no mesmo padrão das sessões 41/52/72/77 (sinal no Painel
  reaproveitando lógica pura). Por isso **não** adiciona testes — contagem segue em **684**.
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **684 testes** verdes; smoke test
  **autenticado** (sessão semeada com um contratante e dois shows PLAYED sem cachê lançado — um com promessa
  10 dias vencida, outro prometido p/ +5 dias) renderiza HTTP 200 com o banner "🤝 Promessas de pagamento",
  o selo "⚠ promessa vencida" por show e por devedor e o "📅 promete" no prazo.
- `npm audit` inalterado (10 advisories — 4 moderate / 5 high / 1 critical), nenhuma dependência nova;
  nenhuma mudança de schema.
- **Alternativas consideradas:** (a) ordenar os contratantes com promessa furada no topo (acima do maior
  devedor) — descartado por ora: muda o critério de priorização da D92 (maior saldo) sem pedido claro; o selo
  já chama atenção visual sem reordenar. (b) `summarizePromisesByContact` como função pura nova em `finance.ts`
  — descartado: seria um wrapper trivial de um `.map` + `summarizePaymentPromises` por grupo, sem regra própria
  a testar; manter a composição na página é mais simples e não cria superfície redundante.

## D96 — Fins de semana livres (oportunidades de booking) (Sessão 104)
- **Contexto:** todo o acervo de análise de agenda olhava para **trás** (rentabilidade, cadência, dias da
  semana) ou para **conflitos** (dois shows no mesmo dia). Faltava a visão **para frente** mais acionável de um
  músico que toca em bares/casas: *quais fins de semana ainda estão vazios?* A noite de sexta a domingo é onde
  mora a maior parte do faturamento de gig; um fim de semana sem nada marcado é receita que ficou na mesa. Era
  o complemento natural de `findScheduleConflicts` (mesma família "agenda").
- **Decisão:** nova função pura `findOpenWeekends(shows, { now?, weeks? })` em `src/lib/shows.ts` + página
  `/shows/fins-de-semana-livres` (janela padrão de 12 fins de semana). Definições:
  - **Fim de semana = sexta + sábado + domingo** (ancorado na sexta). Cobre as três noites de gig.
  - **Ocupado** se *qualquer* show não cancelado cai numa das três noites (mesma chave de dia UTC `dayKey` de
    D20/conflitos — uma fonte de verdade para data). `CANCELLED` é ignorado (não ocupa a data).
  - **Ancoragem da janela:** começa no fim de semana **corrente** enquanto seu domingo não passou, senão no
    próximo. Implementado como "primeira sexta cujo domingo (sexta+2) ≥ hoje": `base = hoje − 2 dias`, depois a
    próxima sexta a partir de `base`. Isso inclui o fim de semana em andamento (útil às quintas/sextas) e pula
    automaticamente os já encerrados (segundas a quartas começam no próximo).
  - **Saída:** lista ordenada do mais próximo ao mais distante, cada item com `friday`, as três `days`, os
    `shows` (ordenados por horário, depois título sem acento) e `open`; mais `openCount`/`bookedCount` e
    `nextOpenFriday` (sexta do primeiro livre, ou null). Genérica em `T extends ConflictShowLike` — reaproveita
    o mesmo tipo de entrada de `findScheduleConflicts`, sem `ShowLike` novo.
- **Por que em `shows.ts` e não `finance.ts`:** é lógica de agenda (datas/dias), não de dinheiro; fica ao lado
  de `findScheduleConflicts`, com quem compartilha tipo de entrada, chave de dia e ordenação.
- **DRY/escopo:** sem schema novo, sem dependência nova, sem server action (página é só leitura). A página
  espelha a UI de `/shows/conflitos` (cards com borda âmbar nos livres, selo "Livre"/"N shows", `Stat`),
  registrada no hub de relatórios (`REPORT_GROUPS`, subtema "Agenda & pipeline") para aparecer na busca e no
  índice automaticamente (D53/D56/D59).
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **695 testes** verdes (+11 puros para
  `findOpenWeekends`: janela vazia, ancoragem corrente/próxima, ocupação por sex/sáb/dom, dia de semana não
  ocupa, cancelado ignorado, agrupamento ordenado, `nextOpenFriday` null, janela padrão de 8, imutabilidade);
  smoke test (app sobe; a rota protegida redireciona p/ login — middleware de auth ok).
- `npm audit` inalterado vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado, correção só via upgrade quebrando para Next 16 — já rastreado nos bloqueios/D6); nenhuma
  dependência nova introduzida.
- **Alternativas consideradas:** (a) parametrizar a janela por query string (`?semanas=`) — adiado: 12 cobre
  ~3 meses, suficiente para prospecção; dá para estender depois sem mudar a lógica pura. (b) definir fim de
  semana só como sexta+sábado (excluir domingo) — descartado: muitos shows acontecem no domingo (matinê,
  brunch), excluí-lo marcaria como "livre" um fim de semana já ocupado. (c) estimar a receita perdida por fim
  de semana livre (cachê médio × livres) — descartado por ora: seria hipótese frágil (cachê médio histórico
  pode não valer para a data futura); o sinal "N de M livres" já basta para priorizar.

## D97 — Card "próximo fim de semana livre" no Painel (Sessão 105)
- **Contexto:** a Sessão 104 (D96) entregou `/shows/fins-de-semana-livres`, mas a oportunidade de booking
  mais próxima só aparecia ao navegar até a página dedicada. O Painel já é o hub de sinais acionáveis
  (pendências vencidas, cachês a receber, conflitos de agenda, custos fixos a lançar); faltava trazer a
  "receita na mesa" para a primeira tela, no mesmo padrão de banner-nudge.
- **Decisão:** card-banner "🎸 Fim de semana livre" no `dashboard/page.tsx` reaproveitando
  `findOpenWeekends` (janela de 12 semanas, igual à página) sobre os **shows já carregados** pelo dashboard —
  sem consulta extra. Mostra o rótulo do próximo fim de semana aberto e, quando há mais de um, o placar
  "N de M fins de semana livres", linkando para a página completa.
  - **Gate anti-ruído:** só aparece quando `nextOpenFriday != null` **E** `upcoming.length > 0` (o artista já
    tem agenda futura). Num cadastro vazio todo fim de semana está livre — o aviso seria ruído, não
    oportunidade; exigir agenda futura garante que um fim de semana aberto é dinheiro deixado na mesa por
    quem está ativamente tocando.
  - **Tom visual:** paleta `brand` (roxo, oportunidade), distinta dos banners âmbar (avisos: conflitos,
    custos fixos) e vermelho (urgência: pendências). Sinaliza "ação positiva/prospecção", não "problema".
- **DRY:** o rótulo compacto do fim de semana (`13–15 de mar` / `27 fev – 1 mar`) e o parsing de chave UTC
  estavam **privados** na página da D96; foram promovidos a `formatWeekendLabel`/`weekendKeyToDate` puros e
  exportados em `src/lib/shows.ts` (uma fonte de verdade), agora reaproveitados pela página e pelo card.
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **700 testes** verdes (+5 puros para os
  helpers extraídos: `weekendKeyToDate` (meia-noite UTC), `formatWeekendLabel` (mesmo mês / vira mês / vira
  ano / casamento com `findOpenWeekends`)); smoke test (app sobe; rota protegida redireciona p/ login).
- `npm audit` inalterado vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; correção só via upgrade quebrando para Next 16 — já rastreado nos bloqueios/D6); nenhuma
  dependência nova.
- **Alternativas consideradas:** (a) mostrar o card sempre que houver fim de semana livre (sem o gate de
  agenda futura) — descartado: poluiria o Painel de contas novas/vazias. (b) parametrizar a janela do card
  separada da página — descartado: 12 semanas mantém placar consistente com a página linkada. (c) estimar a
  receita perdida (cachê médio × livres) no card — descartado pelos mesmos motivos da D96 (hipótese frágil).

## D98 — Janela parametrizável (`?semanas=`) na página de fins de semana livres (Sessão 106)
- **Contexto:** a página `/shows/fins-de-semana-livres` (D96) fixava a janela em 12 fins de semana (~3 meses).
  A própria D96 deixou a parametrização como alternativa adiada (a): para prospecção curta, 12 é ruído (muito
  longe); para quem planeja temporada/turnê, é curto demais. A lógica pura `findOpenWeekends` já aceitava
  `weeks` — só faltava expor o controle na UI sem reabrir a lógica.
- **Decisão:** ler `?semanas=` na página e oferecer presets de janela (4 / 8 / 12 / 26 semanas) como pílulas
  de navegação, mantendo 12 como padrão. Novo helper **puro** `parseWeekendWindow(raw, fallback?)` em
  `src/lib/shows.ts` (ao lado de `findOpenWeekends`) faz o saneamento: ausente/vazio/não numérico → fallback;
  trunca fracionário; grampeia a `[WEEKEND_WINDOW_MIN=1, WEEKEND_WINDOW_MAX=52]`; aceita array (query repetida,
  usa o primeiro). Constantes `WEEKEND_WINDOW_PRESETS`/`WEEKEND_WINDOW_DEFAULT`/`_MIN`/`_MAX` exportadas (uma
  fonte de verdade entre o parser e a UI).
- **Por que parser puro e não inline na página:** o saneamento de query string é exatamente a lógica testável
  (limites, lixo, fracionário, array) — fica coberta sem render. A página vira só fiação: `parseWeekendWindow`
  → `findOpenWeekends({ weeks })` → pílulas. Segue o padrão dos demais parsers de filtro do projeto.
- **UX:** a janela ativa fica destacada (pílula escura, `aria-current="page"`); o cabeçalho passa a dizer
  "Os próximos {weeks} fins de semana" (corrige também a cópia antiga que dizia "noites"). Janela custom fora
  dos presets (ex.: `?semanas=5`) ainda aplica — só não acende nenhuma pílula.
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **709 testes** verdes (+9 puros para
  `parseWeekendWindow`: default ausente, vazio/espaços, não numérico, válido na faixa, truncamento, grampeamento
  min/max, array, fallback custom, integração com `findOpenWeekends`); smoke test (app sobe; rota protegida
  redireciona p/ login — middleware ok).
- `npm audit` inalterado vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; correção só via upgrade quebrando para Next 16 — já rastreado nos bloqueios/D6); nenhuma
  dependência nova.
- **Alternativas consideradas:** (a) campo numérico livre em vez de presets — descartado por ora: presets
  cobrem os casos reais (mês / 2 meses / trimestre / semestre) com um clique e sem teclado; a janela custom via
  URL continua funcionando para quem quiser. (b) parametrizar também o card do Painel (D97) — fora de escopo:
  o card é um nudge de "próxima oportunidade", não uma ferramenta de planejamento; manter 12 fixo lá preserva
  o placar consistente com o link. (c) persistir a última janela escolhida (padrão D23/listFilter) — adiável:
  a escolha de janela é exploratória/efêmera, não um filtro de trabalho recorrente; o default 12 basta.

## D99 — Fôlego de caixa (runway: por quantos meses o caixa cobre os custos fixos) (Sessão 107)
- **Contexto:** o app já media o **fluxo** necessário (ponto de equilíbrio, D40) e o quanto guardar de
  imposto (D41), mas faltava o indicador de **resiliência** mais básico do autônomo: "se as receitas
  parassem hoje, por quanto tempo meu caixa me sustenta?". É o fundo de emergência traduzido em meses.
- **Decisão:** novo helper **puro** `cashRunway(txs, { now?, recurring? })` em `src/lib/finance.ts`, cruzando
  dois números já existentes e testados — `summarizeFinances(txs).cashBalance` (caixa **realizado**:
  recebido − pago) e `recurringExpenses(txs).estimatedMonthlyFixedCost` (custo fixo mensal típico, D39).
  `runwayMonths = currentCash / monthlyFixedCost`. Veredito (`RunwayVerdict`): `no-cost` (sem custo fixo
  recorrente → nada a medir), `negative` (caixa ≤ 0 → já no vermelho), e `critical`/`tight`/`healthy` pelos
  limiares `CRITICAL_RUNWAY_MONTHS=3` e `HEALTHY_RUNWAY_MONTHS=6`. Também devolve uma `depletionDate`
  aproximada (`now + runwayMonths × 30,4375 dias`).
- **Por que só caixa realizado (não pendências):** fôlego é o que você tem **em mãos**, não o que promete
  entrar — incluir contas a receber inflaria o número justamente no cenário que ele simula (as receitas
  pararam). O pessimismo é deliberado, coerente com a leitura conservadora-por-design do projeto (D60).
- **Página** `/financas/folego-de-caixa` (registrada no hub de Relatórios, Finanças → Custos & metas, ícone
  🛟): hero "Meses de fôlego", caixa de veredito colorida (verde/âmbar/vermelho), data estimada de
  esgotamento e os dois números por trás; estados dedicados para `no-cost` (sem custos fixos → atalho para
  Custos fixos) e `negative` (caixa zerado/negativo → foco em recompor o caixa).
- **Limiares 3/6 meses são HIPÓTESE de planejamento** (referência usual de fundo de emergência para autônomos),
  exportados como constantes e sinalizados como ajustáveis na cópia da página — não são premissa contábil.
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **717 testes** verdes (+8 puros para
  `cashRunway`: no-cost, negative, cálculo runway = caixa/custo, verdicts crítico/tight, limiares inclusivos
  no piso 3→tight e 6→healthy, projeção da data de esgotamento, pendências ignoradas no caixa); smoke test
  (app sobe; `/login` e `/` → 200; rota protegida sem sessão → 307→/login).
- `npm audit` inalterado vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; correção só via upgrade quebrando para Next 16 — já rastreado nos bloqueios/D6); nenhuma
  dependência nova.
- **Alternativas consideradas:** (a) somar pendências a receber ao caixa — descartado: contradiz o cenário
  simulado (receitas pararam) e o objetivo de medir resiliência real. (b) usar o resultado médio mensal
  (burn rate) em vez do custo fixo recorrente — adiável: o custo fixo (D39) é a base estável que você precisa
  cobrir mesmo sem tocar; o burn rate completo (incl. custos variáveis de show) varia com a agenda e mistura
  o que é discricionário. (c) card no Painel — próximo passo natural (reusa `cashRunway` sobre as transações
  já carregadas no dashboard), deixado para uma sessão seguinte para manter o escopo fechado.

## D100 — Card "Fôlego de caixa apertado/crítico" no Painel (Sessão 108)
- **Contexto:** a Sessão 107 (D99) entregou `/financas/folego-de-caixa`, mas o alerta de resiliência só
  aparecia ao navegar até a página dedicada — exatamente o sinal que o autônomo precisa ver na primeira tela.
  A própria D99 deixou o card do Painel como alternativa (c)/próximo passo natural. O Painel já é o hub de
  banners-nudge acionáveis (pendências vencidas, cachês a receber, conflitos de agenda, custos fixos a lançar,
  fim de semana livre); faltava o fôlego de caixa.
- **Decisão:** banner-nudge "Fôlego de caixa" no `dashboard/page.tsx` reaproveitando `cashRunway` sobre as
  **transações já carregadas** pelo dashboard (sem consulta extra). Mostra por quantos meses o caixa cobre os
  custos fixos (`runwayMonths`, 1 casa decimal) e o custo fixo mensal, linkando para `/financas/folego-de-caixa`.
  - **Gate anti-ruído:** só aparece quando o veredito **morde** — `tight` ou `critical`. Com fôlego `healthy`
    (≥ 6 meses) o número não é acionável; com `no-cost` (sem custo fixo a medir) ou `negative` (caixa já no
    vermelho, coberto pelo banner de pendências/saldo) o aviso seria ruído. Nesses dois vereditos exibidos
    `runwayMonths` é sempre não-`null` (garantido pelo contrato de `cashRunway`), por isso o acesso com `!`.
  - **Tom visual:** escala como os demais banners financeiros — âmbar para `tight` (🛟, atenção) e vermelho
    para `critical` (🔴, urgência), no mesmo padrão dos cachês a receber (âmbar→vermelho ao encalhar).
- **Sem novos helpers/testes:** mudança puramente de UI; toda a lógica e seus vereditos já são cobertos pelos
  8 testes puros de `cashRunway` (D99). Nada a testar além da composição React, já validada pelo build/typecheck.
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **717 testes** verdes (inalterado — sem nova
  lógica); smoke test (app sobe; `/login` → 200; rota protegida sem sessão → redirect).
- `npm audit` inalterado vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; correção só via upgrade quebrando para Next 16 — já rastreado nos bloqueios/D6); nenhuma
  dependência nova.
- **Alternativas consideradas:** (a) mostrar o card também com fôlego `healthy` — descartado: vira ruído
  permanente; o Painel mostra problema/oportunidade, não confirmação de normalidade (o número saudável está a
  um clique na página). (b) incluir o veredito `negative` no banner — descartado: caixa negativo já é coberto
  pelos cards de saldo/caixa e pelo banner de pendências; duplicar seria redundante. (c) tornar os limiares
  3/6 configuráveis pelo usuário — adiável (continua como próximo possível em D99/próximos passos).

## D101 — Fôlego de caixa pelo burn rate realizado (cenário "completo") (Sessão 109)
- **Contexto:** `cashRunway` (D99) mede o fôlego cobrindo **só o custo fixo recorrente** — um piso deliberado,
  mas que ignora os gastos variáveis e a receita que de fato entra. Os próximos passos (item 7) já apontavam
  "usar o burn rate completo (com custos variáveis) como cenário alternativo do fôlego". Para o autônomo, a
  pergunta complementar é: "ao meu ritmo real de gasto líquido dos últimos meses, por quantos meses o caixa
  dura?" — número mais realista quando há despesas variáveis pesadas, e que também responde algo quando não há
  custo fixo recorrente detectado (onde `cashRunway` retorna `no-cost`).
- **Decisão:** novo helper puro `cashBurnRunway(txs, { now?, months? })` em `src/lib/finance.ts`, ao lado de
  `cashRunway`. Mede o **fluxo de caixa líquido médio** (recebido − pago) sobre uma janela de `months` meses
  **completos anteriores ao mês corrente** (default `DEFAULT_BURN_WINDOW_MONTHS = 6`):
  - `avgMonthlyNet = round((windowReceivedIncome − windowPaidExpense) / windowMonths)`; `monthlyBurn = max(0, −avgMonthlyNet)`.
  - `runwayMonths = currentCash / monthlyBurn`, com `currentCash` = caixa realizado de `summarizeFinances` (paridade com `cashRunway`).
  - Vereditos: `surplus` (caixa cresceu na janela → não queima → fôlego ilimitado, `runwayMonths = null`),
    `negative` (caixa atual ≤ 0), e `critical`/`tight`/`healthy` reusando os **mesmos limiares** 3/6 meses de
    `cashRunway` (`CRITICAL_RUNWAY_MONTHS`/`HEALTHY_RUNWAY_MONTHS`), para consistência conceitual entre os dois cenários.
  - **Por que excluir o mês corrente:** o mês em curso é parcial; contá-lo distorceria a média (uma conta grande
    ainda não compensada por receita do mês inflaria a queima). A janela usa só meses fechados.
  - **Janela saneada** (`sanitizeBurnWindow`): inteiro em [1, 24], trunca fração, default 6 — pronta para um
    seletor de janela na UI no futuro, sem virar premissa rígida agora.
  - Considera só caixa realizado (`received === true`), em paridade com `currentCash` (pendências não contam).
- **UI:** card "Cenário alternativo · ritmo de gasto real" em `/financas/folego-de-caixa`, **sempre visível**
  (fora do `switch` de veredito do custo fixo) — é útil justamente quando o número de cima é `no-cost`/`negative`.
  Reaproveita `formatMoney`/`formatDate`/`formatMonths` e o mesmo vocabulário visual (âmbar/vermelho/verde).
- **Testes:** 11 casos puros novos (`cashBurnRunway`) em `finance.test.ts` cobrindo janela default/custom,
  saneamento, `surplus`/`negative`/`healthy`/`critical`, exclusão do mês corrente e de transações fora da janela,
  pendências ignoradas e data de esgotamento. **728 testes** verdes (eram 717).
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **728 testes**; smoke test **autenticado**
  (sessão semeada): `/login` → 200; `/financas/folego-de-caixa` → 200 renderizando o card "Cenário alternativo"
  (veredito `surplus`/"Caixa crescendo" nos dados do seed). `npm audit` inalterado vs. baseline (10 advisories —
  4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) somar custos variáveis ao custo fixo num único denominador em `cashRunway`
  — descartado: misturaria dois conceitos (piso de resiliência × ritmo real) num número ambíguo; mantê-los como
  dois cards distintos é mais honesto. (b) incluir o mês corrente na janela — descartado pela distorção do mês
  parcial. (c) card no Painel — adiável (próximo possível); manter o escopo da sessão fechado na página dedicada.

## D102 — Seletor de janela (`?meses=`) na página de fôlego de caixa (Sessão 110)
- **Contexto:** `cashBurnRunway` (D101) já aceitava `{ months }` e a janela era saneada por `sanitizeBurnWindow`
  (inteiro em [1, 24], default 6), mas a página `/financas/folego-de-caixa` chamava sempre com o default — sem
  controle na UI. O item 7 dos próximos passos listava como "próximo possível" justamente expor o seletor de
  janela (`?meses=`). Olhar o burn rate por trimestre (3) vs. semestre (6) vs. ano (12) muda a leitura: janela
  curta capta uma virada recente de patamar; janela longa suaviza a sazonalidade de quem tem renda irregular.
- **Decisão:** novo helper puro **`parseBurnWindow(raw, fallback?)`** exportado em `src/lib/finance.ts`,
  espelhando `parseWeekendWindow` (shows.ts, D98) — lê string única ou repetida (usa a primeira), valor ausente/
  vazio/não-numérico cai no `fallback` (default `DEFAULT_BURN_WINDOW_MONTHS`), e reaproveita `sanitizeBurnWindow`
  para o clamp em [`BURN_WINDOW_MIN`=1, `BURN_WINDOW_MAX`=24] truncando fração. As constantes do clamp e o conjunto
  `BURN_WINDOW_PRESETS = [3, 6, 12, 24]` (trimestre/semestre/ano/dois anos) viraram exports, e `sanitizeBurnWindow`
  passou a referenciar `BURN_WINDOW_MIN/MAX` (uma fonte de verdade dos limites).
- **UI:** a página lê `searchParams.meses` via `parseBurnWindow` e passa `{ months }` a `cashBurnRunway`; o card
  "Cenário alternativo · ritmo de gasto real" ganhou uma fileira de pílulas-âncora `3m/6m/12m/24m` (a ativa em
  `bg-brand-600`, `aria-current`), cada uma linkando `?meses=N`. O texto do card já dizia "os últimos {windowMonths}
  meses fechados", então reflete a janela escolhida automaticamente.
- **Testes:** 8 casos puros novos (`parseBurnWindow`) em `finance.test.ts`: default/fallback, leitura válida,
  truncamento de fração, clamp piso/teto, não-numérico, param repetido/vazio e validade de todos os presets.
  **736 testes** verdes (eram 728).
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **736 testes**; smoke test — `npm start`:
  `/login` → 200, `/financas/folego-de-caixa?meses=12` → 307 (redireciona ao login sem sessão, rota compila e
  resolve os searchParams). `npm audit` inalterado vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical,
  todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) seletor de janela só com presets fixos vs. campo numérico livre — escolhido
  presets (menos atrito, cobre os recortes úteis; o `?meses=` cru ainda aceita qualquer valor 1–24 para quem
  digitar na URL). (b) tornar os limiares 3/6 configuráveis e/ou um card de burn rate no Painel — adiados (próximos
  possíveis), mantendo o escopo da sessão fechado e funcional na página dedicada.

## D103 — Card "Ritmo de gasto" (burn rate) no Painel (Sessão 111)
- **Contexto:** `cashBurnRunway` (D101) já media o fôlego pelo ritmo real de gasto (custos variáveis incluídos,
  receita recebida descontada), mas só aparecia na página `/financas/folego-de-caixa`. D101/D102 listaram "card de
  burn rate no Painel" como próximo possível, deliberadamente adiado. O Painel já trazia o nudge de `cashRunway`
  (D100 — só custo fixo); faltava a leitura **completa** ao alcance do olho, na home.
- **Decisão:** novo helper puro **`cashBurnHeadline(burn: CashBurnRunway): CashBurnHeadline`** em
  `src/lib/finance.ts`, espelhando `paymentLagHeadline` (D70): recebe um `cashBurnRunway` já computado e devolve a
  decisão de Painel (`show`, `critical`, `runwayMonths`, `monthlyBurn`, `verdict`). A regra de exibição vive no
  helper (testável), não na página. `show` é `true` só com veredito `tight`/`critical` — mesma disciplina
  "só quando morde" dos demais nudges: `surplus` (caixa cresce, não queima), `healthy` (fôlego folgado) e
  `negative` (caixa já zerado) não geram aviso, para não virar ruído.
- **UI:** segundo banner-nudge em `dashboard/page.tsx`, logo após o nudge de custo fixo (D100), reaproveitando as
  transações já carregadas (sem I/O extra). Ícone 🔥 (âmbar, apertado) / 🔴 (vermelho, crítico < 3 meses), texto
  "No ritmo real o caixa dura N meses (queima de R$X/mês)", linkando para `/financas/folego-de-caixa`. Os dois
  nudges são independentes e complementares — raramente disparam juntos (o de custo fixo costuma dar runway maior;
  o burn rate só morde quando há queima líquida real). Mantidos separados de propósito: misturá-los num número só
  ocultaria qual lente disparou.
- **Testes:** 5 casos puros novos (`cashBurnHeadline`) em `finance.test.ts` cobrindo os cinco vereditos
  (`healthy`/`surplus`/`negative` → não mostra; `tight`/`critical` → mostra, com `critical` distinto). **741 testes**
  verdes (eram 736).
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **741 testes**; smoke test — `npm start`:
  `/` → 200 e `/login` → 200, app sobe. `npm audit` inalterado vs. baseline (10 advisories — 4 moderate / 5 high /
  1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) suprimir o nudge de custo fixo quando o burn rate diz `surplus` (você não está
  realmente queimando, embora o caixa cubra poucos meses de custo fixo) — atraente, mas mudaria o comportamento
  estabelecido da D100 e acopla os dois cálculos; adiado como refinamento futuro. (b) um único card "fôlego" que
  alterna entre as duas métricas — descartado: esconde qual cenário está ativo. (c) reusar a regra inline na página
  em vez de um helper — descartado: o helper puro torna a decisão de Painel testável, como em `paymentLagHeadline`.

## D104 — Detalhamento mês a mês do burn rate (tira de fluxo de caixa na janela) (Sessão 112)
- **Contexto:** a página `/financas/folego-de-caixa` resume o fôlego pelo ritmo real (D101) num único número —
  `avgMonthlyNet`/`monthlyBurn`, a **média** dos meses fechados da janela. Uma média de 6 (ou 24) meses esconde a
  tendência: um caixa positivo no começo da janela e despencando no fim dá a mesma média que uma queima estável,
  mas exige reações opostas. Faltava a textura por trás do número.
- **Decisão:** novo helper puro **`cashFlowByMonth(txs, { now?, months? }): CashFlowMonth[]`** em
  `src/lib/finance.ts`. Usa **exatamente** a mesma janela e o mesmo critério de `cashBurnRunway` (os `months` meses
  completos anteriores ao mês corrente — exclui o mês em curso, parcial; só caixa realizado `received === true`;
  saneada por `sanitizeBurnWindow`), de modo que `soma(net) / windowMonths` reproduz o `avgMonthlyNet` daquele
  helper (a menos do arredondamento). Devolve **sempre uma entrada por mês** da janela em ordem cronológica (mês sem
  movimento vem zerado), cada uma com `received`/`paid`/`net` (centavos). Pura; `now` e janela injetáveis.
- **UI:** `MonthlyFlowStrip` (sub-componente da própria página) renderiza a tira dentro do card "Cenário
  alternativo · ritmo de gasto real", logo abaixo do parágrafo de introdução e acima do veredito — assim a janela
  da tira segue o seletor `?meses=` (D102) sem controle novo. Cada mês é uma coluna: barra **para cima** (verde,
  líquido ≥ 0, o caixa cresceu) ou **para baixo** (vermelho, queimou), altura proporcional ao maior `|net|` da
  janela, com `title` (mês + líquido) e rótulo do mês (pt-BR curto). `role="img"` + `aria-label` para leitor de
  tela. Some quando não há nenhum movimento na janela, para não virar uma régua vazia.
- **Testes:** 6 casos puros novos (`cashFlowByMonth`) em `finance.test.ts`: ordem/chaves da janela e meses zerados;
  agregação received/paid/net por mês; **consistência** com `cashBurnRunway` (soma dos `net` ÷ janela =
  `avgMonthlyNet`); exclusão do mês corrente e do que está fora da janela; ignora pendências (`received=false`);
  janela customizada + saneamento (piso 1 / teto 24 / default). **747 testes** verdes (eram 741).
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **747 testes**; smoke test — `npm start`:
  `/` → 200 e `/login` → 200, app sobe. `npm audit` inalterado vs. baseline (10 advisories — 4 moderate / 5 high /
  1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) reaproveitar a página `/financas/fluxo-de-caixa` — descartado: aquela é a
  projeção **futura** (pendências por vencimento), não o realizado da janela de burn; propósitos distintos.
  (b) calcular a tendência (acelerando × estabilizando) num veredito automático — adiado: exigiria comparar
  sub-janelas e definir limiares (mais hipótese); a tira deixa o músico ler a tendência com o próprio olho, que é
  honesto com poucos meses de dado. (c) sparkline só com o `net` (uma barra por mês acima/abaixo de uma linha) sem
  expor received/paid — mantido assim na UI por simplicidade, mas o helper devolve os três para reuso futuro.

### Infra/ambiente — engines do Prisma via proxy (Sessão 110)
- O `postinstall` do `@prisma/engines` baixa os engines por um downloader Node que, atrás do proxy de egress,
  aborta com `ECONNRESET` (o mesmo host responde 200 via `curl --cacert`). Contorno desta sessão (não commitado):
  `npm install --ignore-scripts`, baixar `libquery_engine`/`schema-engine` (`debian-openssl-3.0.x`,
  commit `605197351a3c8bdd595af2d2a9bc3025bca48ea2`) com `curl` para `node_modules/@prisma/engines/`, e rodar
  `prisma generate`/`db push` com `PRISMA_QUERY_ENGINE_LIBRARY`/`PRISMA_SCHEMA_ENGINE_BINARY` apontando para eles +
  `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`. Não afeta o CI (rede liberada). Anotado para a próxima sessão.

## D105 — Rentabilidade por contratante (P&L agrupado por quem paga) (Sessão 113)
- **Contexto:** a rentabilidade (P&L líquido) já era fatiada por **show** (D17), **local** (D19) e **cidade** (D48),
  e os contatos tinham um **ranking** por cachê **bruto** (D18). Faltava a dimensão de relacionamento sobre o
  **líquido**: "quais clientes realmente dão dinheiro depois dos custos?" — distinta do ranking (bruto, e que conta
  um show para cada contato vinculado) e da geografia.
- **Decisão:** novo helper puro **`rankContactsByProfit(shows, txs, getPayer, opts?)`** em `src/lib/finance.ts`.
  Atribui cada show a **um único** contratante via callback `getPayer` (a UI passa `pickPayerContact` de
  `billing.ts` — prioriza papel BOOKER/PROMOTER/VENUE…, D30/D52), agrega o `computeShowPnL` por contato (cachê,
  extras, despesas, líquido, média/show, margem) e devolve as linhas ordenadas por `totalNet` desc. Como cada show
  pesa para **um** contratante, o `totalNet` **reconcilia** com a soma dos P&L dos shows (ao contrário do ranking).
  Shows sem contato vão para o grupo "Sem contratante" (`contact: null`), sempre **por último** na ordenação;
  `best`/`worst` consideram só os **identificados**. Exclui `CANCELLED` por padrão (como os demais rankings de P&L).
- **Por que um helper dedicado (e não generalizar `aggregateShowProfit`):** a forma da linha é diferente — carrega
  um objeto `contact` ({id,name,role}) em vez de uma grafia/`key` de texto, e a atribuição vem de um callback
  (many-to-many resolvido por papel), não de um campo do próprio show. Mesmo padrão já adotado em
  `outstandingByContact` (D92), que também recebe `getPayer`. Reaproveita `computeShowPnL` (fonte única do cálculo).
- **UI:** página `/contatos/rentabilidade` espelhando o layout de `/shows/locais` (cards de destaque + tabela com
  cachê/extras/despesas/resultado colorido/média), registrada no **hub de Relatórios** (`reports.ts`, área Contatos,
  subtopic "Quem move a carreira", ícone 💸 — D53). Carrega os shows com os contatos vinculados via `select` aninhado
  (`contacts.contact`) e resolve o pagador na página, mantendo `finance.ts` sem dependência de `billing`.
- **Testes:** 6 casos puros novos em `finance.test.ts` (`rankContactsByProfit`): vazio; soma do P&L por contratante
  sem dupla contagem (reconcilia com a soma dos shows); grupo "sem contratante" à parte e por último; ordenação por
  resultado e best/worst só entre identificados; margem agregada; exclusão de cancelados. **753 testes** verdes
  (eram 747).
- **DoD:** build de produção (rota `/contatos/rentabilidade` gerada), typecheck e lint (0 avisos) verdes; **753
  testes**; smoke test — `npm start`: `/login` → 200, `/` → 200, `/contatos/rentabilidade` sem sessão → 307, e
  **render autenticado verificado** (HTTP 200, cards e tabela com os contratantes + grupo "Sem contratante"). `npm
  audit` inalterado vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss
  bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) atribuir o show a **todos** os contatos vinculados (como o ranking, D18) —
  descartado: dupla contagem do líquido e número que não fecha com o total; o foco aqui é "de qual cliente vem o
  lucro", que pede um único dono. (b) incluir "Sem contratante" em best/worst — descartado: não é um cliente
  acionável; melhor/pior devem comparar relacionamentos reais. (c) **cachê médio por contratante** (nível de preço)
  em vez do líquido — adiável: lente útil mas distinta; o líquido responde a decisão de "vale a pena este cliente?".

## D106 — Rentabilidade no detalhe do contato (P&L dos shows que ele traz) (Sessão 114)
- **Contexto:** a rentabilidade por contratante (D105) compara clientes lado a lado em `/contatos/rentabilidade`,
  mas ao abrir UM contato (`/contatos/[id]`) só havia o **cachê bruto total** (`summarizeContactShows.totalFee`) —
  faltava o **líquido depois dos custos** já na ficha do cliente, respondendo "este contato dá dinheiro de verdade?"
  no contexto em que a pessoa está olhando (era um "próximo possível" explícito do passo 8 do PROGRESS).
- **Decisão:** novo helper puro **`summarizeContactProfit(shows, txs)`** em `src/lib/contacts.ts`. Recebe os shows
  **já vinculados ao contato** (o recorte da própria ficha) + as transações vinculadas a esses shows e soma o
  `computeShowPnL` (finance.ts, fonte única) de cada show **não cancelado** → `totalFee`, `totalExtra`,
  `totalExpenses`, `totalNet`, `avgNet`, `margin`. Exclui `CANCELLED` espelhando o `totalFee` de
  `summarizeContactShows` (consistência na mesma tela).
- **Por que NÃO reusar `rankContactsByProfit` (D105):** aquele atribui cada show a **um único** pagador (via
  `getPayer`) para reconciliar o total entre contratantes — necessário numa visão comparativa. Aqui o recorte já é
  "os shows deste contato", então a soma direta é a leitura correta (e mais simples); um show co-atribuído a vários
  contatos conta o líquido na ficha de **cada** um — o número responde "quanto este relacionamento rende", não
  "fatie o lucro total entre clientes". Decisões distintas, helpers distintos; ambos reaproveitam `computeShowPnL`.
- **UI:** card "Rentabilidade" em `/contatos/[id]` (entre "Histórico de shows" e "Shows vinculados"), com 4 Stats —
  resultado líquido (colorido verde/vermelho), despesas, líquido médio/show e margem (`(margin*100).toFixed(0)%`,
  mesmo formato de `/shows/[id]` e `/shows/rentabilidade`), nota de rodapé explicando a fórmula, e link "Comparar
  contratantes →" para `/contatos/rentabilidade`. Só aparece com ≥1 show não cancelado. A página passou a buscar as
  transações dos shows do contato (`transaction.findMany` por `showId in [...]`), sem consulta extra quando o contato
  não tem shows.
- **Testes:** 6 casos puros novos em `contacts.test.ts` (`summarizeContactProfit`): vazio; soma do net com despesas
  vinculadas (média/show); receita extra + margem sobre a bruta; exclusão de cancelados (e da despesa do cancelado);
  filtro por `showId` (ignora transações de outros shows); margem 0 com bruta 0 (prejuízo possível). **759 testes**
  verdes (eram 753).
- **DoD:** build de produção (rota `/contatos/[id]` ok), typecheck e lint (0 avisos) verdes; **759 testes**; smoke
  test — `npm start`: `/login` → 200, `/` → 200, app sobe. `npm audit` inalterado vs. baseline (10 advisories — 4
  moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) reaproveitar `rankContactsByProfit` filtrando por um contato — descartado: a
  atribuição por papel esconderia shows em que o contato não é o pagador escolhido, subnotificando o relacionamento.
  (b) mostrar também a quebra por status — adiável: a ficha já lista os shows; o card é o número-resumo. (c) cachê
  médio (preço) ao lado do líquido — adiável (mesma lente de preço já adiada na D105).

## D107 — Cachê médio por contratante na rentabilidade (nível de preço × líquido) (Sessão 115)
- **Contexto:** `/contatos/rentabilidade` (D105) já mostra cachê somado, despesas, resultado líquido e
  média/show (líquido) por contratante, mas faltava o **nível de preço** praticado: dois contratantes podem
  fechar o mesmo líquido total com cachês muito diferentes (um paga caro mas exige muita despesa; outro paga
  pouco mas é barato de atender). O "cachê médio por contratante" era um "próximo possível" explícito do
  passo 8 do PROGRESS e a alternativa (c) adiada na D106 ("cachê médio (preço) ao lado do líquido").
- **Decisão:** novo campo **`avgFee`** em `ContactProfitRow` (finance.ts) = `round(totalFee / showCount)` —
  o cachê bruto médio por show no grupo, **antes** de extras e despesas. Distinto de `avgNet` (líquido por
  show). Calculado no mesmo `rankContactsByProfit`, zero consulta nova, zero dependência. Nova coluna "Cachê
  médio" na tabela de `/contatos/rentabilidade` (entre "Despesas" e "Resultado") e nota de rodapé contrastando
  cachê médio (preço) × média/show (líquido).
- **Justificativa:** preço e rentabilidade são lentes diferentes — separar o cachê (o que o contratante paga)
  do líquido (o que sobra) deixa visível quem é "caro de atender" (cachê alto, líquido baixo). Reusa `totalFee`
  já agregado; não toca a regra de atribuição (um pagador por show, D105).
- **Testes:** 1 caso puro novo em `finance.test.ts` (`rankContactsByProfit`): cachê médio ≠ líquido quando há
  extras/despesas (Zé: 150 vs avgNet 142,50), cachê médio = líquido quando não há (Ana: 50=50), e grupo "sem
  contratante" (30). **760 testes** verdes (eram 759).
- **DoD:** build de produção (rota `/contatos/rentabilidade` ok), typecheck e lint (0 avisos) verdes; **760
  testes**; smoke test — `npm start`: `/login` → 200, `/` → 200, app sobe. `npm audit` inalterado vs. baseline
  (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios);
  **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) cachê médio bruto incluindo extras (cachê+extras ÷ shows) — descartado:
  "cachê" no domínio é o fee contratado; extras (venda de produto, ajuda de custo) não são preço do contratante.
  (b) também o cachê mediano (robusto a outlier) — adiável: com poucos shows por contratante a mediana fica
  ruidosa (mesma razão da D57); a média basta como leitura de nível de preço.

## D108 — Recorte por período (ano) na rentabilidade por contratante (Sessão 116)
- **Contexto:** `/contatos/rentabilidade` (D105–D107) agregava o P&L por contratante sobre **todos** os shows
  de uma vez, sem como responder "quem deu dinheiro **neste ano**?". Comparar contratantes ao longo do tempo
  (este ano × ano passado) e isolar o desempenho recente eram impossíveis. O recorte por período era o "próximo
  possível" explícito do passo 8 do PROGRESS ("filtrar os shows por ano, espelhando `?meses=`/`?semanas=`").
- **Decisão:** três helpers puros novos em `finance.ts` — `showProfitYears(dates)` (anos UTC presentes, desc,
  dedup), `parseProfitYear(raw, availableYears)` (`?ano=` → `number | "all"`; vazio/"todos"/ano ausente → `"all"`,
  aceita query repetida) e `filterShowsByYear(shows, year)` (filtra por ano UTC; `"all"` devolve a lista intacta).
  A página filtra os shows **antes** de chamar `rankContactsByProfit`, mantendo a regra "um pagador por show" e
  o P&L intocados. UI: `PeriodPicker` com pílula "Todos" + uma por ano com shows (não cancelados), no estilo do
  seletor de janela de fôlego de caixa (D102). Estado vazio passa a ser período-ciente (ano sem shows → link
  "Ver todos os anos").
- **Justificativa:** filtrar fora da função pura mantém o agregador agnóstico ao recorte (uma responsabilidade),
  e os três helpers são triviais de testar isoladamente. Anos derivados só dos shows não cancelados evitam
  oferecer um período que ficaria vazio após a exclusão. Convenção **UTC** alinhada às demais agregações
  financeiras (D29 etc.). Zero consulta nova além de `date` no `select`; zero dependência nova.
- **Testes:** 10 casos puros novos em `finance.test.ts` (`showProfitYears`, `parseProfitYear`, `filterShowsByYear`):
  anos desc/dedup/UTC, parse de vazio/"todos"/ano válido/ano ausente/inválido/query repetida, filtro por ano e
  ano vazio. **770 testes** verdes (eram 760).
- **DoD:** build de produção (rota `/contatos/rentabilidade` ok), typecheck e lint (0 avisos) verdes; **770
  testes**; smoke test — `npm start`: `/` → 200, `/contatos/rentabilidade?ano=2025` → 307 `/login` (sem 500).
  `npm audit` inalterado vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) navegação ←/→ por ano (como `/financas/anual`) — descartado: o caso de uso
  é **comparar** contratantes entre períodos, então "Todos + pílulas" expõe os anos disponíveis de relance e
  permite voltar à visão completa num clique, ao contrário do prev/next. (b) recorte por janela de meses
  (`?meses=`) espelhando o fôlego — descartado aqui: a rentabilidade por contratante é uma leitura por
  exercício/temporada, e o ano é a unidade natural (fechamento fiscal, comparação anual). (c) filtrar dentro de
  `rankContactsByProfit` via `opts` — descartado: acoplaria recorte temporal ao agregador; filtrar antes é mais
  simples e reusável.

## D109 — Concentração de clientes na rentabilidade por contratante (risco de dependência) (Sessão 117)
- **Contexto:** `/contatos/rentabilidade` (D105–D108) já dizia **quanto** cada contratante rende (líquido) e por
  qual **período** (ano). Faltava a leitura de **risco**: o quanto a receita depende de **poucos** contratantes —
  a pergunta de carreira "e se o cliente que paga metade do meu faturamento sumir?". É uma lente distinta da
  rentabilidade (que ranqueia por valor): mede **dispersão**, não tamanho.
- **Decisão:** novo helper puro **`clientConcentration(rows)`** em `finance.ts` que recebe as linhas já
  produzidas por `rankContactsByProfit` e deriva a concentração da **receita bruta** (cachê + extras) entre os
  contratantes **identificados**. Devolve as fatias com participação (`share`), o `topShare`, o `top3Share`, o
  **HHI** (Herfindahl–Hirschman), os **clientes efetivos** (1/HHI) e um veredito `concentrated|moderate|diversified`
  reaproveitando os mesmos limiares de `incomeMix` (`diversificationLevel`, D45). UI: card "Concentração de
  clientes" na página, com selo de veredito (🔴/🟡/🟢), os três números-chave e uma nota acionável; só aparece
  quando há ≥1 contratante identificado com receita.
- **Justificativa — por que receita BRUTA e não o líquido:** a dependência é sobre de onde o dinheiro **entra**;
  se o contratante sair, perde-se o faturamento, não a margem. Além disso o líquido pode ser **negativo**, e
  participações negativas não somam 1 nem formam um HHI válido. Por isso a base é `totalFee + totalExtra`,
  sempre ≥ 0, e descartam-se contratantes sem receita bruta positiva. **Por que reusar as linhas do ranking** (e
  não reagrupar): `rankContactsByProfit` já resolveu "um pagador por show" (D105) e a exclusão de cancelados;
  derivar a concentração das linhas evita duplicar essa lógica e garante consistência com a tabela. **Por que
  reusar `diversificationLevel`:** o vocabulário de concentração (HHI/nº efetivo/nível) já existe para fontes de
  renda (D45); aplicá-lo a contratantes mantém uma linguagem única de "concentração" no app. **Por que ignorar
  "sem contratante":** não é um cliente acionável — o risco que importa é o de depender de um **relacionamento** real.
- **Testes:** 6 casos puros novos em `finance.test.ts` (`clientConcentration`): vazio (veredito concentrado e
  zeros); participação sobre a receita bruta ignorando o grupo sem contratante; extras somados à receita; descarte
  de contratante sem receita positiva; contratante único → HHI 1/concentrado; receita pulverizada em 5
  contratantes → diversificada. **776 testes** verdes (eram 770).
- **DoD:** build de produção (rota `/contatos/rentabilidade` ok), typecheck e lint (0 avisos) verdes; **776
  testes**; smoke test — `npm start`: `/login` → 200, `/` → 200, `/contatos/rentabilidade` sem sessão → 307, e
  **render autenticado verificado** (token de sessão mintado p/ o usuário demo): página 200 e, com dois
  contratantes vinculados, o card "Concentração de clientes" renderiza com veredito "Concentrada", "maior
  contratante", "nos 3 maiores" e "clientes efetivos". `npm audit` inalterado vs. baseline (10 advisories —
  4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma
  dependência nova**.
- **Alternativas consideradas:** (a) concentração sobre o **líquido** — descartado: pode ser negativo (HHI
  indefinido) e mede margem, não dependência de faturamento. (b) **incluir "sem contratante"** na base —
  descartado: dilui o sinal com receita não atribuível a um cliente acionável. (c) um **gráfico de Pareto/curva
  ABC** — adiável: as barras CSS bastam para o MVP e o trio topShare/top3Share/HHI já comunica a dispersão sem
  somar superfície de UI. (d) classificar pelo `topShare` (regra "1 cliente > 50% = risco") em vez do HHI —
  descartado: o HHI captura toda a distribuição (dois clientes de 40%+40% também é risco) e já é o critério de
  `incomeMix`; manter um só método evita vereditos divergentes entre telas.

## D110 — Concentração de clientes no Painel (nudge de risco de dependência) (Sessão 118)
- **Contexto:** a concentração de clientes (D109) vivia só em `/contatos/rentabilidade` — quem não abrisse a
  página de rentabilidade não via o risco. O padrão do app é levar o sinal acionável ao Painel quando ele
  **morde** (custo fixo D100, burn rate D103, DSO D70), via um helper de "headline" puro que decide a exibição.
  Faltava esse atalho para o risco de depender de poucos contratantes.
- **Decisão:** novo helper puro **`clientConcentrationHeadline(concentration)`** em `finance.ts` (espelha
  `cashBurnHeadline`/D103 e `paymentLagHeadline`/D70) que recebe uma `clientConcentration` já computada e devolve
  `{ show, critical, topShare, top, clientCount, level }`. **`show`** só é `true` quando o veredito é
  `concentrated` e há ≥1 contratante com receita; **`critical`** marca o caso extremo — **um único** contratante
  (clientCount 1) ou o maior sozinho com **≥ 2/3** da receita — para o Painel subir o tom. UI: segundo
  banner-nudge no `dashboard/page.tsx`, logo após o de ritmo de gasto (D103), 🔴 (crítico, vermelho) / 🟠
  (concentrado, âmbar), mostrando "X% da receita vem de {maior contratante} (de N contratantes)" e linkando para
  `/contatos/rentabilidade`. A consulta `prisma.show.findMany` do dashboard passou a incluir os `contacts`
  (id/nome/papel) para resolver o pagador via `pickPayerContact` (mesma cadeia da página de rentabilidade); a
  concentração é derivada de `rankContactsByProfit(...).rows` → `clientConcentration` sobre os shows já carregados.
- **Justificativa:** centralizar a **regra de exibição** no helper puro (testável, sem I/O) mantém o dashboard
  como mero consumidor, como nos nudges anteriores. Disparar só em `concentrated` (e não em `moderate`/
  `diversified`) evita nagar quem já diversificou — disciplina dos D100/D103. O corte `critical` em **cliente
  único OU maior ≥ 2/3** distingue o "ovos numa cesta só" do meramente concentrado, sem inventar um novo veredito
  (reusa o `level` da D109). Reusar `pickPayerContact` + `rankContactsByProfit` garante consistência com a página
  e com a regra "um pagador por show" (D105); incluir `contacts` na consulta existente evita um round-trip extra.
- **Testes:** 5 casos puros novos em `finance.test.ts` (`clientConcentrationHeadline`): base vazia → não mostra;
  contratante único → mostra crítico (topShare 1); maior domina ≥ 2/3 com vários clientes → crítico; concentrado
  mas maior < 2/3 → mostra não-crítico; receita diversificada → não mostra. **781 testes** verdes (eram 776).
- **DoD:** build de produção (rota `/dashboard` ok), typecheck e lint (0 avisos) verdes; **781 testes**; smoke
  test — `npm start`: `/login` → 200, `/dashboard` sem sessão → 307 (app sobe). `npm audit` inalterado vs.
  baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver
  D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) mostrar também `moderate` no Painel — descartado: vira ruído permanente, e o
  detalhe já está na página. (b) classificar `critical` pelo HHI em vez do `topShare` — descartado: o HHI já
  define o veredito `concentrated` (gate de exibição); para a **urgência** do nudge o `topShare` ("um cliente
  carrega quase tudo") é a leitura mais direta e humana. (c) um seletor de período (`?ano=`) no nudge, como na
  página — adiável: o Painel usa o retrato corrente (todos os anos), coerente com os demais nudges.

## D111 — Recorte por período (ano) na rentabilidade por local (Sessão 119)
- **Contexto:** o recorte por período (ano) via `?ano=` já existia na rentabilidade **por contratante**
  (`/contatos/rentabilidade`, D108) com três helpers puros reutilizáveis — `showProfitYears` (anos UTC presentes,
  desc/dedup), `parseProfitYear` (`?ano=` → `number | "all"`, saneado contra os anos disponíveis) e
  `filterShowsByYear` (filtra shows pela `date` UTC antes de agregar). A rentabilidade **por local**
  (`/shows/locais`, `rankVenuesByProfit`) ainda mostrava só o retrato acumulado de todos os anos, sem responder
  "quais casas valeram a pena **neste ano**?". O próprio PROGRESS já listava como próximo possível "um recorte por
  período análogo na rentabilidade por local/cidade (reusando os três helpers)".
- **Decisão:** estender o recorte por período à página `/shows/locais` **reutilizando os três helpers da D108**,
  sem lógica nova: a consulta `prisma.show.findMany` passou a incluir `date`; os shows recebem `date` no objeto
  (`VenueShowLike & { date: Date }`) e são filtrados por `filterShowsByYear` **antes** de `rankVenuesByProfit`,
  mantendo intactas a regra de agrupamento por local (venue → city → "Sem local") e o P&L. UI: um `PeriodPicker`
  (pílula "Todos" + uma por ano com shows não cancelados, idêntico ao da D108) acima da tabela; estado vazio
  período-ciente ("Nenhum show em {ano}" com link "Ver todos os anos"). Os anos do seletor saem só dos shows que
  entram na agregação (não cancelados), para não oferecer um ano que ficaria vazio.
- **Justificativa:** a pergunta "quais casas valem a pena?" é naturalmente período-dependente (uma casa pode ter
  sido ótima em 2024 e ruim em 2025); o recorte anual torna a comparação justa. Reutilizar os helpers já testados
  (D108) evita duplicar lógica e garante consistência de semântica (ano UTC, saneamento do `?ano=`) entre as duas
  páginas de rentabilidade. Filtrar **antes** de agregar mantém `rankVenuesByProfit` agnóstico ao recorte (mesma
  disciplina da D108).
- **Testes:** nenhum teste novo — a mudança é wiring de UI sobre helpers puros já cobertos (`showProfitYears`/
  `parseProfitYear`/`filterShowsByYear` têm os 10 casos da D108; `rankVenuesByProfit` é coberto à parte). **781
  testes** verdes (precedente de mudança só-de-UI: D100/D103).
- **DoD:** build de produção (rota `/shows/locais` ok), typecheck e lint (0 avisos) verdes; **781 testes**; smoke
  test — `npm start`: `/` → 200, `/shows/locais` sem sessão → 307 → `/login` (app sobe, auth ativa). `npm audit`
  inalterado vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado;
  ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) recorte também na rentabilidade **por cidade** — não há página de cidade
  separada hoje (`rankCitiesByProfit` existe mas sem rota); fica para quando a página existir, reusando o mesmo
  padrão. (b) comparar dois anos lado a lado (Δ por local) — mais escopo; adiável (espelharia D33). (c) um seletor
  de período também no detalhe do contato (`summarizeContactProfit`) — próximo passo natural, mesmos três helpers.

## D112 — Setup resiliente a proxy: fallback de engines do Prisma via curl (Sessão 120)
- **Contexto:** em sessões remotas o tráfego HTTPS sai por um proxy que reescreve TLS. O downloader
  embutido do Prisma (`@prisma/fetch-engine`) **não** respeita esse proxy: a baixa dos engines
  (`libquery_engine` e `schema-engine` de `binaries.prisma.sh`) falha com `ECONNRESET`. Como `npm install`
  dispara o postinstall do `@prisma/engines`, a instalação inteira abortava e o container ficava **sem
  `node_modules` e sem client gerado** — `build`/`test`/`run` impossíveis na sessão. O mesmo host baixa
  normalmente via `curl` (HTTP 200), confirmando que o problema é só o cliente HTTP do Prisma, não a política
  de egress. Em CI (GitHub Actions, rede aberta) nada disso ocorre: o `session-setup.sh` nem roda lá.
- **Decisão:** tornar `scripts/session-setup.sh` resiliente, sem mudar a stack nem o schema:
  1. instalar deps com `npm install --ignore-scripts` (pula o postinstall que falha);
  2. tentar `npx prisma generate`; **só** se falhar, baixar os engines via `curl` (respeita proxy/CA) para
     `node_modules/@prisma/engines/` com os nomes que o Prisma espera (`libquery_engine-<target>.so.node`,
     `schema-engine-<target>`), derivando o commit de `@prisma/engines-version` e o alvo de
     `@prisma/get-platform` (`getBinaryTargetForCurrentPlatform`) — sem hardcode;
  3. fixar `PRISMA_QUERY_ENGINE_LIBRARY`/`PRISMA_SCHEMA_ENGINE_BINARY` no `.env` (dev-only, fora do git), que o
     próprio Prisma carrega — assim o `prisma generate` de `npm run build` também acha os engines **sem rede**;
  4. `prisma db push` para o SQLite de dev. Tudo idempotente (só baixa o que falta, só anexa a env var uma vez).
- **Justificativa:** o mandato de infra exige que o container efêmero suba pronto para build a cada sessão; o
  hook estava quebrado neste ambiente. O fallback via `curl` usa exatamente o canal que funciona, e fixar os
  caminhos no `.env` (e não exportar em shell volátil) garante que o `generate` embutido no `build` herde a
  correção. Em máquinas/CI com rede aberta o caminho normal vence e o fallback nem executa — zero regressão.
- **Testes:** mudança de infra (shell), sem testes de unidade. Validado manualmente do zero: com os engines
  removidos, `session-setup.sh` cai no fallback, baixa os dois engines, fixa o `.env`, gera o client e sincroniza
  o banco; re-execução é no-op (sem duplicar linhas no `.env`); `npm run build` passa **offline** lendo o `.env`.
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **781 testes**; smoke test — `npm start`:
  `/login` → 200, `/dashboard` sem sessão → 307 (app sobe). `npm audit` inalterado vs. baseline (10 advisories —
  4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma
  dependência nova**.
- **Alternativas consideradas:** (a) `PRISMA_ENGINES_MIRROR` apontando para um mirror — mesmo host/cliente HTTP do
  Prisma, não resolveria o `ECONNRESET`. (b) commitar os binários no repo — pesados (~35 MB), específicos de
  plataforma e versão; poluiriam o git e quebrariam ao bumpar o Prisma. (c) exportar as env vars só na sessão —
  não sobrevive ao subprocesso de `npm run build`; por isso a fixação no `.env`. (d) trocar o provider/engine
  (`binaryTargets`, engine `binary`) — mudança de stack desproporcional a um problema de ambiente.

## D113 — Concentração geográfica na atuação por cidade (risco de depender de poucas praças) (Sessão 121)
- **Contexto:** `/shows/cidades` (Atuação por cidade) já dizia **quais cidades valem a turnê** pelo resultado
  líquido. Faltava a leitura de **risco geográfico**: o quanto a receita depende de **poucas** cidades — a
  pergunta de carreira "e se a cena da cidade que responde por metade dos meus shows esfriar?". É o análogo
  geográfico da concentração de clientes (D109): mesma matemática de **dispersão** (HHI), outro eixo (praça em
  vez de contratante).
- **Decisão:** novo helper puro **`geoConcentration(rows)`** em `finance.ts` que recebe as linhas já produzidas
  por `rankCitiesByProfit` e deriva a concentração da **receita bruta** (cachê + extras) entre as cidades
  **identificadas** (descarta o grupo "Sem cidade", chave `""`). Devolve as fatias com participação (`share`), o
  `topShare`, o `top3Share`, o **HHI**, as **cidades efetivas** (1/HHI) e o veredito
  `concentrated|moderate|diversified` reaproveitando os mesmos limiares de `incomeMix`/`clientConcentration`
  (`diversificationLevel`, D45). UI: card "Concentração geográfica" na página, com selo 🔴/🟡/🟢, os três
  números-chave e uma nota acionável ("abrir praças novas"); só aparece quando há ≥1 cidade identificada com receita.
- **Justificativa — por que receita BRUTA e não o líquido:** idêntica à D109 — a dependência é sobre de onde o
  dinheiro **entra**; o líquido pode ser negativo (HHI indefinido) e mede margem, não dependência de praça. Base
  `totalFee + totalExtra` (≥ 0), descartando cidades sem receita positiva. **Por que reusar as linhas do ranking**
  (e não reagrupar): `rankCitiesByProfit` já resolveu o rollup por cidade e a exclusão de cancelados; derivar a
  concentração das linhas evita duplicar essa lógica e mantém consistência com a tabela. **Por que reusar
  `diversificationLevel`:** mantém uma linguagem única de "concentração" entre fontes de renda (D45), clientes
  (D109) e agora cidades. **Por que ignorar "Sem cidade":** não é uma praça acionável — o risco que importa é o
  de concentrar a agenda numa região real.
- **Testes:** 6 casos puros novos em `finance.test.ts` (`geoConcentration`): vazio (veredito concentrado e zeros);
  participação sobre a receita bruta ignorando o grupo sem cidade; extras somados à receita; descarte de cidade
  sem receita positiva; cidade única → HHI 1/concentrada; atuação pulverizada em 5 cidades → diversificada.
  **787 testes** verdes (eram 781).
- **DoD:** build de produção (rota `/shows/cidades` ok), typecheck e lint (0 avisos) verdes; **787 testes**;
  smoke test — `npm start`: `/` → 200, `/shows/cidades` sem sessão → 307 → `/login` (app sobe, auth ativa).
  `npm audit` inalterado vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) concentração por **local** (`rankVenuesByProfit`) em vez de cidade — adiável:
  a cidade é o eixo de risco mais natural (um músico abre praça nova mudando de cidade, não só de casa) e a página
  de cidades é onde a lente cabe; o mesmo helper aceitaria linhas de local no futuro, pois opera sobre
  `VenueProfitRow`. (b) **nudge no Painel** (espelhando D110) — adiável a uma sessão própria para não inflar o
  Painel sem antes ver o card na página. (c) recorte por **período (ano)** como na D108/D111 — adiável: a página
  de cidades ainda não tem `PeriodPicker`; quando ganhar, `geoConcentration` recompõe sobre as linhas já filtradas
  sem mudança no helper. (d) classificar pelo `topShare` em vez do HHI — descartado pela mesma razão da D109
  (o HHI capta toda a distribuição e unifica o critério entre telas).

## D114 — Concentração geográfica no Painel (nudge de risco de depender de poucas praças) (Sessão 122)
- **Contexto:** a concentração geográfica (D113) vivia só em `/shows/cidades` — quem não abrisse a página de
  atuação por cidade não via o risco. A própria D113 (alternativa b) já tinha **adiado o nudge no Painel a uma
  sessão própria**. O padrão do app é levar o sinal acionável ao Painel quando ele **morde**, via um helper de
  "headline" puro que decide a exibição (custo fixo D100, burn rate D103, DSO D70, clientes D110). Faltava o
  análogo geográfico do nudge de clientes (D110).
- **Decisão:** novo helper puro **`geoConcentrationHeadline(concentration)`** em `finance.ts` (espelha
  `clientConcentrationHeadline`/D110) que recebe uma `geoConcentration` já computada e devolve
  `{ show, critical, topShare, top, placeCount, level }`. **`show`** só é `true` quando o veredito é
  `concentrated` e há ≥1 cidade com receita; **`critical`** marca o caso extremo — **uma única** cidade
  (placeCount 1) ou a maior praça sozinha com **≥ 2/3** da receita — para o Painel subir o tom. UI: novo
  banner-nudge no `dashboard/page.tsx`, logo após o de concentração de clientes (D110), 🔴 (crítico, vermelho) /
  🟠 (concentrado, âmbar), mostrando "X% da receita vem de {maior cidade} (de N cidades)" e linkando para
  `/shows/cidades`. A concentração é derivada de `rankCitiesByProfit(shows, txs).rows` → `geoConcentration` sobre
  os shows e transações **já carregados** no dashboard (a consulta `prisma.show.findMany` não tem `select`, então
  `city`/`fee`/`status` já vêm) — sem round-trip novo.
- **Justificativa:** centralizar a **regra de exibição** no helper puro (testável, sem I/O) mantém o dashboard
  como mero consumidor, como nos nudges anteriores. Disparar só em `concentrated` (e não em `moderate`/
  `diversified`) evita nagar quem já abriu praças — disciplina dos D100/D103/D110. O corte `critical` em **cidade
  única OU maior ≥ 2/3** distingue o "tudo numa praça só" do meramente concentrado, sem inventar veredito novo
  (reusa o `level` da D113). Reusar `rankCitiesByProfit` + `geoConcentration` garante consistência com o card da
  página e com a regra de agrupamento/exclusão de cancelados; reaproveitar os shows já carregados evita custo extra.
- **Testes:** 5 casos puros novos em `finance.test.ts` (`geoConcentrationHeadline`): base vazia → não mostra;
  cidade única → mostra crítico (topShare 1); maior praça domina ≥ 2/3 com várias cidades → crítico; concentrado
  mas maior < 2/3 → mostra não-crítico; atuação espalhada → não mostra. **792 testes** verdes (eram 787).
- **DoD:** build de produção (rota `/dashboard` ok), typecheck e lint (0 avisos) verdes; **792 testes**; smoke
  test — `npm start`: `/login` → 200, `/dashboard` sem sessão → 307 (app sobe). `npm audit` inalterado vs.
  baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver
  D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) mostrar também `moderate` no Painel — descartado: vira ruído permanente, e o
  detalhe já está na página. (b) classificar `critical` pelo HHI em vez do `topShare` — descartado pela mesma
  razão da D110: o HHI já define o veredito (gate de exibição); para a **urgência** do nudge o `topShare` ("uma
  praça carrega quase tudo") é a leitura mais direta. (c) unir os dois nudges de concentração (clientes + cidades)
  num único banner — adiável: são eixos de risco distintos e o usuário pode estar concentrado num sem estar no
  outro; mostrá-los separados deixa claro qual frente abrir.

## D115 — Recorte por período (ano) na atuação por cidade (Sessão 123)
- **Contexto:** `/shows/cidades` (D113) somava o P&L por cidade sobre **todos** os anos, sem como isolar uma
  temporada — diferente da rentabilidade por contratante (D108) e por local (D111), que já tinham `PeriodPicker`.
  A própria D113 (alternativa c) e a D114 já apontavam este recorte como o próximo passo natural, notando que
  `geoConcentration` recompõe sobre as linhas já filtradas **sem mudança no helper**.
- **Decisão:** a página passou a aceitar `searchParams.ano` e ganhou o mesmo `PeriodPicker` (pílula "Todos" + uma
  por ano com shows não cancelados) das outras telas de rentabilidade, **reaproveitando os três helpers puros da
  D108** em `finance.ts`: `showProfitYears` (anos UTC presentes, desc/dedup), `parseProfitYear` (`?ano=` →
  `number | "all"`, saneado contra os anos disponíveis) e `filterShowsByYear` (filtra pelo ano UTC). A consulta
  `prisma.show.findMany` passou a incluir `date`; os shows são filtrados por ano **antes** de `rankCitiesByProfit`,
  então a regra de agrupamento por cidade, o P&L e a exclusão de cancelados seguem intocados. O **card de
  concentração geográfica** (D113), por derivar de `report.rows`, passou a refletir o risco **dentro do período**
  selecionado, de graça. Estado vazio período-ciente ("Nenhum show em {ano}" + atalho "Ver todos os anos").
- **Justificativa:** é o mesmo padrão já validado em duas telas (D108/D111) — reusar os helpers puros evita lógica
  nova e mantém o comportamento de período idêntico entre as telas de rentabilidade. Filtrar **antes** de agregar
  é o ponto de corte correto: nenhuma regra de negócio (agrupamento, P&L, concentração) precisa saber do recorte.
  Recompor a concentração sobre as linhas filtradas responde "estou dependente de poucas praças **neste ano**?",
  que é mais acionável que a leitura histórica acumulada.
- **Testes:** nenhum novo — é wiring de UI sobre helpers já cobertos (`showProfitYears`/`parseProfitYear`/
  `filterShowsByYear` têm testes desde a D108; `geoConcentration` desde a D113), mesmo critério da D111. **792
  testes** verdes (inalterado).
- **DoD:** build de produção (rota `/shows/cidades` ok), typecheck e lint (0 avisos) verdes; **792 testes**; smoke
  test — `npm start`: `/login` → 200, `/shows/cidades` e `/shows/cidades?ano=2025` sem sessão → 307 (app sobe).
  `npm audit` inalterado vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) recorte por **mês** em vez de ano — descartado: o volume de shows por cidade
  é baixo, um corte mensal deixaria quase tudo vazio; o ano é a granularidade já adotada nas telas irmãs. (b) um
  helper de período próprio para cidades — desnecessário: os três da D108 são genéricos (`filterShowsByYear`
  opera sobre `{ date: Date }`). (c) **não** recompor a concentração no recorte (mantê-la histórica) — descartado:
  seria incoerente com a tabela período-ciente logo abaixo e menos útil que a leitura por temporada.

## D116 — Concentração por casa na rentabilidade por local (risco de depender de poucos palcos) (Sessão 124)
- **Contexto:** `/shows/cidades` ganhou o card de **concentração geográfica** (D113) — risco de a receita depender
  de poucas **cidades**. `/shows/locais` (rentabilidade por local) já dizia **quais casas valem a pena** pelo
  resultado líquido, mas não tinha a leitura de risco no eixo mais granular: depender de **poucas casas/palcos**.
  A própria D113 (alternativa a) já antecipava que o mesmo `geoConcentration` aceitaria linhas de **local** sem
  mudança, por operar sobre `VenueProfitRow`; o item 9 dos próximos passos do PROGRESS apontava exatamente este
  recorte como o passo natural.
- **Decisão:** `/shows/locais` passou a computar **`geoConcentration(report.rows)`** sobre as linhas já produzidas
  por `rankVenuesByProfit` (mesmas linhas da tabela, recortadas pelo `PeriodPicker`/`?ano=` da D111) e a renderizar
  um card **"Concentração por casa"** (selo 🔴/🟡/🟢, `topShare`/`top3Share`/casas efetivas, nota acionável
  "prospectar novos palcos"), só quando há ≥1 casa identificada com receita (`placeCount > 0`). **Nenhuma mudança
  no helper** — `geoConcentration` já descarta o grupo de chave `""` ("Sem local") e deriva tudo da receita bruta
  (`totalFee + totalExtra`). A única diferença vs. `/shows/cidades` é a **moldura textual** do card (componente
  `VenueConcentrationCard` + mapa `VENUE_VERDICT` local à página, falando em "casa"/"palco" em vez de "praça"/
  "cidade"); o tipo `GeoConcentration` é genérico (campos `places`/`placeCount`/`top`), então serve aos dois eixos.
- **Justificativa:** o local é o recorte mais granular do mesmo risco geográfico — um músico pode estar
  diversificado entre cidades mas dependente de **uma casa** dentro delas (ou vice-versa). Reusar o helper já
  testado (D113) e as linhas já agregadas (com período aplicado) evita lógica nova, mantém consistência com a
  tabela e dá o recorte de graça quando o usuário troca o ano. Manter o veredito por **HHI** e a base **bruta**
  preserva a linguagem única de concentração entre fontes de renda (D45), clientes (D109) e cidades (D113).
- **Testes:** nenhum novo — wiring de UI sobre um helper já coberto (`geoConcentration` tem 6 casos puros desde a
  D113, agnósticos quanto a o eixo ser cidade ou local), mesmo critério da D111/D115. **792 testes** verdes
  (inalterado).
- **DoD:** build de produção (rota `/shows/locais` ok), typecheck e lint (0 avisos) verdes; **792 testes**; smoke
  test — `npm start`: `/login` → 200 (app sobe). `npm audit` inalterado vs. baseline (10 advisories — 4 moderate /
  5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) **extrair** `VenueConcentrationCard`/`GeoConcentrationCard` para um componente
  compartilhado parametrizado pelo rótulo ("casa" × "cidade") — adiável: as duas cópias são pequenas e o texto
  acionável difere o bastante (prospectar palcos × abrir praças) para uma parametrização não simplificar de fato;
  se surgir um terceiro eixo, vale consolidar. (b) **nudge no Painel** para concentração por casa (espelhando D114)
  — descartado por ora: o Painel já tem o nudge geográfico por **cidade** (D114), que é o eixo de risco mais legível
  ali; somar um por casa inflaria o Painel com um sinal muito correlato. (c) renomear os campos genéricos de
  `GeoConcentration` (`places`→`groups`) para refletir o uso multi-eixo — descartado: mexeria em D113/D114/D115 sem
  ganho funcional; os nomes `places`/`placeCount` já leem bem para "casas" e "cidades".

## D117 — Recorte por período (ano) na rentabilidade do detalhe do contato (Sessão 125)
- **Contexto:** o card **"Rentabilidade"** do detalhe do contato (`/contatos/[id]`, D106) somava o P&L de **todos**
  os shows não cancelados do contato, sem como isolar uma temporada — diferente da rentabilidade por contratante
  (D108), por local (D111) e da atuação por cidade (D115), que já tinham `PeriodPicker`. O item 8 dos próximos
  passos do PROGRESS apontava este recorte como "o caminho mais direto agora", reusando os três helpers da D108
  sobre o `summarizeContactProfit` já existente.
- **Decisão:** `/contatos/[id]` passou a aceitar `searchParams.ano` e ganhou um `ProfitPeriodPicker` (pílula
  "Todos" + uma por ano com shows não cancelados) **ancorado neste contato** (`/contatos/{id}?ano=`),
  **reaproveitando os três helpers puros da D108** em `finance.ts`: `showProfitYears` (anos UTC dos shows não
  cancelados), `parseProfitYear` (`?ano=` → `number | "all"`, saneado contra os anos disponíveis) e
  `filterShowsByYear` (filtra pelo ano UTC). Os shows são filtrados **antes** de `summarizeContactProfit`, então a
  regra de P&L e a exclusão de cancelados (D106) seguem intocadas. O recorte afeta **só** o card de rentabilidade;
  o "Histórico de shows" e a lista "Shows vinculados" continuam mostrando o relacionamento inteiro (o CRM é sobre
  todo o histórico, não sobre um ano). A consulta de transações (`prisma.transaction.findMany` por `showId`) não
  mudou — `computeShowPnL` já filtra por `showId` internamente, então passar todas as txs é seguro com o recorte.
- **Justificativa:** é o mesmo padrão validado em três telas (D108/D111/D115) — reusar os helpers puros evita lógica
  nova e mantém o comportamento de período idêntico. Recortar **só** a rentabilidade (e não o histórico/lista)
  reflete a diferença de intenção: a ficha de relacionamento é cumulativa, mas "este cliente deu dinheiro **neste
  ano**?" é a pergunta acionável de rentabilidade. O card só aparece com ≥1 show não cancelado (em qualquer ano), e
  o seletor fica visível mesmo quando o ano escolhido fica vazio, com um atalho "Ver todos os anos" — para o
  usuário não ficar preso num período sem dados.
- **Testes:** nenhum novo — wiring de UI sobre helpers já cobertos (`showProfitYears`/`parseProfitYear`/
  `filterShowsByYear` têm testes desde a D108; `summarizeContactProfit` desde a D106), mesmo critério da D111/D115.
  **792 testes** verdes (inalterado).
- **DoD:** build de produção (rota `/contatos/[id]` ok), typecheck e lint (0 avisos) verdes; **792 testes**; smoke
  test — `npm start`: `/login` → 200 (app sobe). `npm audit` inalterado vs. baseline (10 advisories — 4 moderate /
  5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) recortar **também** o histórico e a lista de shows pelo ano — descartado: a
  ficha de CRM é sobre todo o relacionamento; esconder shows de outros anos da lista confundiria mais que ajudaria.
  (b) recorte por **mês** — descartado: poucos shows por contato deixariam quase todo mês vazio; o ano é a
  granularidade das telas irmãs. (c) **extrair** o `ProfitPeriodPicker` para um componente compartilhado com o
  `PeriodPicker` de `/contatos/rentabilidade` — adiável: as cópias são pequenas e a única diferença real é o
  `href` base; se surgir um quarto uso com a mesma assinatura, vale consolidar num componente parametrizado pelo
  caminho base.

## D118 — Recorte por período (ano) na rentabilidade por show (Sessão 126)
- **Contexto:** o **ranking de rentabilidade por show** (`/shows/rentabilidade`, F4/Sessão 24) listava o P&L de
  **todos** os shows não cancelados sem como isolar uma temporada — era a única tela de rentabilidade ainda **sem**
  `PeriodPicker`, enquanto a rentabilidade por contratante (D108), por local (D111), a atuação por cidade (D115) e o
  detalhe do contato (D117) já recortavam por ano. Mesma lacuna, mesmos helpers à mão.
- **Decisão:** `/shows/rentabilidade` passou a aceitar `searchParams.ano` e ganhou um `PeriodPicker` (pílula "Todos"
  + uma por ano com shows não cancelados), **reaproveitando os três helpers puros da D108** em `finance.ts`:
  `showProfitYears` (anos UTC dos shows não cancelados), `parseProfitYear` (`?ano=` → `number | "all"`, saneado
  contra os anos disponíveis) e `filterShowsByYear` (filtra pelo ano UTC). Os shows são filtrados **antes** de
  `rankShowsByProfit`, então a exclusão de `CANCELLED` e o cálculo de P&L por show seguem intocados (o ranking
  continua agnóstico ao recorte). A consulta já trazia `date`; a de transações (por `showId`) não mudou —
  `computeShowPnL` filtra por `showId` internamente, então passar todas as txs é seguro com o recorte. Estado vazio
  período-ciente (com atalho "Ver todos os anos" quando o ano escolhido fica sem shows).
- **Justificativa:** mesmo padrão validado em quatro telas (D108/D111/D115/D117) — reusar os helpers puros evita
  lógica nova e mantém o comportamento de período idêntico. "Quais shows deram dinheiro **neste ano**?" é a pergunta
  acionável quando o histórico cresce e o ranking de todos os anos vira ruído.
- **Testes:** nenhum novo — wiring de UI sobre helpers já cobertos (`showProfitYears`/`parseProfitYear`/
  `filterShowsByYear` têm testes desde a D108; `rankShowsByProfit` desde a Sessão 24), mesmo critério da
  D111/D115/D117. **792 testes** verdes (inalterado). Validado por smoke test autenticado: sem `?ano=`/ano inválido
  → todos os anos; `?ano=2026` e `?ano=2025` → só o ano pedido (HTTP 200, picker presente em todos os casos).
- **DoD:** build de produção (rota `/shows/rentabilidade` ok), typecheck e lint (0 avisos) verdes; **792 testes**;
  smoke test autenticado (token de sessão forjado via `createSessionToken`) confirmando o recorte por ano. `npm
  audit` inalterado vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss
  bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) recorte por **mês** — descartado: o ano é a granularidade das telas irmãs e o
  P&L por show já é por gig isolado. (b) **extrair** um `PeriodPicker` compartilhado entre as cinco telas que agora o
  têm — adiável pela mesma razão da D117 alt. (c): as cópias são pequenas e diferem só no `href` base; com cinco
  usos idênticos, porém, a consolidação num componente parametrizado pelo caminho base já tem massa crítica — fica
  registrado como o próximo passo natural de DRY.

## D119 — `PeriodPicker` compartilhado (consolidar as cinco cópias do seletor de período) (Sessão 127)
- **Contexto:** após D108/D111/D115/D117/D118, cinco telas de rentabilidade passaram a repetir **a mesma** pílula
  de período (`/shows/locais`, `/shows/cidades`, `/shows/rentabilidade`, `/contatos/rentabilidade` e
  `/contatos/[id]`). As cópias eram byte-a-byte idênticas exceto pelo `href` base e, no detalhe do contato, pelo
  `aria-label` ("Período da rentabilidade", por haver outro contexto de período na ficha). A D116 (alt. a), a D117
  (alt. c) e a D118 (alt. b) adiaram a extração "até surgir massa crítica" — com cinco usos idênticos, ela chegou.
- **Decisão:** extrair `src/components/PeriodPicker.tsx` — server component puro (só renderiza `Link`s, sem estado
  nem hooks) parametrizado por `basePath` (o href de "Todos"; cada ano vira `${basePath}?ano=${y}`) e um
  `ariaLabel` opcional (default `"Período"`). As cinco páginas passaram a importar e renderizar o componente
  compartilhado, removendo as definições locais de `PeriodPicker`/`ProfitPeriodPicker`. O `ProfitYearFilter`
  (`number | "all"`) tipa o `active`. Nenhuma mudança de comportamento: mesmas classes Tailwind, mesmos `href`,
  mesmo `aria-current` — markup idêntico ao das cópias. Saldo: **−180 linhas** líquidas.
- **Justificativa:** a única variação real entre as cópias era o caminho base, exatamente o eixo que um parâmetro
  resolve; a divergência de texto que motivou adiar (os cards de concentração com notas acionáveis distintas) **não**
  está no seletor — ele sempre foi idêntico. Centralizar evita que um ajuste futuro de estilo/acessibilidade precise
  ser replicado em cinco arquivos (e esquecido em um). Novas telas de rentabilidade já recebem o seletor com um
  import.
- **Testes:** nenhum novo — o projeto testa lógica de negócio pura (ambiente `node`, sem testing-library; não há
  infra para renderizar componentes), e esta é uma consolidação de UI sem nova lógica; os helpers de período
  (`showProfitYears`/`parseProfitYear`/`filterShowsByYear`) seguem cobertos desde a D108. **792 testes** verdes
  (inalterado).
- **DoD:** build de produção (as cinco rotas compilam), typecheck e lint (0 avisos — sem imports órfãos) verdes;
  **792 testes**; smoke test — `npm start`: `/login` → 200, rotas protegidas → 307 (app sobe e roteia). `npm audit`
  inalterado vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado;
  ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) deixar como estava — descartado: cinco cópias idênticas são exatamente o que a
  D118 sinalizou consolidar. (b) também unificar os cards de concentração (`geoConcentration`/`clientConcentration`)
  num componente único — **mantido adiado** (D116 alt. a): ali os textos acionáveis divergem de verdade
  ("prospectar palcos" × "abrir praças" × "diversificar clientes"), então o ganho é menor e o acoplamento, maior.
  (c) embutir o `?ano=` numa querystring genérica com mais filtros — fora de escopo; hoje o único eixo é o ano.

## D120 — Comparação ano a ano da concentração geográfica (vs. ano anterior) (Sessão 128)
- **Contexto:** o card "Concentração geográfica" de `/shows/cidades` (D113) e o recorte por ano (D115) davam um
  **retrato** do risco de depender de poucas praças num período, mas não diziam se a dependência **piorou ou melhorou**
  no tempo. Os próximos passos (itens 8 e 9) sinalizavam repetidamente "comparar a concentração entre dois anos lado a
  lado, espelhando D33" (o comparativo `computeDelta` já usado em outras telas).
- **Decisão:** adicionar `compareGeoConcentration(current, previous)` em `src/lib/finance.ts` — função **pura** que
  recebe duas `GeoConcentration` já computadas (cada uma sobre as linhas de `rankCitiesByProfit` do seu período) e
  devolve `topShareDelta` (variação da participação da maior praça, atual − anterior), `effectivePlacesDelta`
  (variação do nº de cidades efetivas) e um veredito `trend` ("improved" / "worsened" / "stable") decidido pela
  variação de `topShare` contra um limiar `GEO_TREND_EPSILON = 0.05` (5 p.p.). Na UI, `/shows/cidades` renderiza um
  card "Concentração {ano} vs. {ano-1}" **só** quando um ano específico está selecionado e **ambos** os períodos têm
  praça identificada com receita (`placeCount > 0`); reaproveita o mesmo recorte por ano UTC (D108) sobre os shows já
  carregados, sem nova consulta. O card mostra Δ da maior praça (de → para), Δ de cidades efetivas e a nota acionável
  do veredito.
- **Justificativa:** o sinal de risco que importa para booking não é o nível absoluto e sim a **direção** — a carteira
  geográfica está abrindo ou estreitando? `topShare` é a leitura-manchete (a maior praça) e bounded (0..1), o que dá
  um limiar de ruído intuitivo (5 p.p.); as cidades efetivas (1/HHI) complementam mostrando a dispersão. Manter a
  função pura (sem I/O, recebe `GeoConcentration` prontas) segue o padrão de `geoConcentrationHeadline`/D110: a regra
  de tendência vive na lib testável, a página só decide **quando** exibir. O limiar virou `export const` para ficar
  testável na fronteira e reutilizável se um eixo de cliente quiser a mesma comparação.
- **Testes:** **+5** em `finance.test.ts` (cobrindo improved/worsened/stable, a fronteira exata `== ε` e a
  preservação das duas concentrações de origem) — **797 testes** verdes.
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **797 testes**; smoke test — `npm start`: `/login` →
  200, `/shows/cidades?ano=2025` → 307 (rota protegida, redireciona para login). `npm audit` inalterado vs. baseline
  (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios);
  **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) basear o `trend` no HHI/cidades efetivas em vez de `topShare` — descartado: HHI é
  menos intuitivo para o limiar e a maior praça é a leitura que o músico age sobre ("de quem dependo"). (b) comparar
  contra a média dos anos anteriores em vez do ano imediatamente anterior — adiado: com histórico curto (poucos anos)
  o ano anterior é o baseline mais legível; revisitar quando houver muitos anos. (c) estender já o mesmo comparativo a
  `/shows/locais` (por casa) e `/contatos/rentabilidade` (clientes) — fora do escopo desta sessão; o helper já é
  genérico (opera sobre `GeoConcentration`), então o reúso fica barato quando for priorizado.

## D121 — Comparativo ano a ano da concentração por casa em `/shows/locais` (Sessão 129)
- **Contexto:** a D120 entregou o card "Concentração {ano} vs. {ano-1}" só em `/shows/cidades`, deixando explícito
  (alt. c) que o helper `compareGeoConcentration` é genérico e que estendê-lo a `/shows/locais` (por casa) seria
  barato quando priorizado. A página `/shows/locais` já tinha o retrato corrente do risco por casa (card
  "Concentração por casa", D116) e o recorte por ano (D111), mas não dizia se a dependência de poucas casas
  **piorou ou melhorou** no tempo — exatamente a lacuna que a D120 fechou no eixo de cidade.
- **Decisão:** wirear o mesmo `compareGeoConcentration` (D120) em `/shows/locais`: com um ano específico
  selecionado, computa a `geoConcentration` do ano anterior (`rankVenuesByProfit` sobre `filterShowsByYear(..., ano-1)`)
  e renderiza um card "Concentração {ano} vs. {ano-1}" **só** quando ambos os períodos têm casa identificada com
  receita (`placeCount > 0`). Reaproveita o recorte por ano UTC (D108) sobre os shows já carregados, sem nova
  consulta. Os componentes de apresentação (`VenueComparisonCard`, `VENUE_TREND`, `deltaPp`, `deltaPlaces`)
  espelham os de `/shows/cidades`, mudando só a moldura textual para o eixo de casa/palco ("maior casa",
  "casas efetivas", "prospectar palcos novos").
- **Justificativa:** o sinal de direção (carteira de casas abrindo × estreitando) vale o mesmo na granularidade de
  casa que na de cidade, e o helper puro/testável já existia — então o custo é só UI. Manter as cópias de
  apresentação separadas (em vez de unificar num card parametrizado) segue o que a D116 (alt. a)/D119 já decidiram:
  os textos acionáveis divergem de verdade ("prospectar palcos" × "abrir praças"), e as cópias são pequenas.
- **Testes:** **nenhum novo** — mudança UI-only que reutiliza `compareGeoConcentration`, já coberto por **+5** testes
  desde a D120; a lógica de tendência/limiar não foi tocada. **797 testes** verdes.
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **797 testes**; smoke test — `npm start`: `/login` →
  200. `npm audit` inalterado vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) unificar os cards de concentração/comparativo de cidade e casa num componente
  único parametrizado pelo rótulo — mantido **adiado** (D116 alt. a/D119): os textos acionáveis divergem e as cópias
  são curtas. (b) estender já o comparativo a `/contatos/rentabilidade` (clientes) na mesma sessão — fora do escopo;
  fica como próximo passo priorizado (o helper continua genérico).

## D122 — Comparativo ano a ano da concentração de clientes em `/contatos/rentabilidade` (Sessão 130)
- **Contexto:** as D120/D121 entregaram o card "Concentração {ano} vs. {ano-1}" no eixo geográfico (`/shows/cidades`
  e `/shows/locais`), deixando explícito (D121 alt. b / próximos passos itens 8 e 9) que estender o mesmo comparativo
  a `/contatos/rentabilidade` (eixo de **cliente**) era o próximo passo barato. A página já tinha o retrato corrente do
  risco de carteira (card "Concentração de clientes", D109) e o recorte por ano (D108), mas não dizia se a dependência
  de poucos contratantes **piorou ou melhorou** no tempo.
- **Decisão:** como a `ClientConcentration` (D109) é um **tipo distinto** da `GeoConcentration` (`effectiveClients`/
  `clients` em vez de `effectivePlaces`/`places`), o helper geográfico não podia ser reusado literalmente. Em vez de
  forçar uma generalização prematura, extraí a regra de tendência num helper interno `concentrationTrend(topShareDelta)`
  (decide improved/worsened/stable contra `GEO_TREND_EPSILON`) — compartilhado por `compareGeoConcentration` (refatorado
  para chamá-lo) e o novo `compareClientConcentration(current, previous)`, ambos em `src/lib/finance.ts`. O novo helper
  é **puro**: recebe duas `ClientConcentration` já computadas e devolve `topShareDelta`, `effectiveClientsDelta` e o
  `trend`. Na UI, `/contatos/rentabilidade` renderiza um card "Concentração {ano} vs. {ano-1}" **só** quando um ano
  específico está selecionado e **ambos** os períodos têm contratante identificado com receita (`clientCount > 0`);
  reaproveita o recorte por ano UTC (D108) sobre os shows já carregados, sem nova consulta. Os componentes de
  apresentação (`ClientComparisonCard`, `CLIENT_TREND`, `deltaPp`, `deltaClients`) espelham os geográficos, mudando só a
  moldura textual para o eixo de cliente ("maior contratante", "clientes efetivos", "conquistar clientes novos").
- **Justificativa:** o sinal de direção (carteira de clientes abrindo × estreitando) vale o mesmo no eixo de cliente
  que no geográfico, e a `clientConcentration` já existia — o custo foi só um helper puro fino + UI. Reusar o **limiar**
  (`GEO_TREND_EPSILON`) e a **regra** (`concentrationTrend`) em vez de duplicá-los mantém uma fonte única da fronteira de
  ruído; manter os tipos `Geo`/`Client` e os cards de apresentação **separados** (em vez de unificar tudo num genérico)
  segue o que a D116 (alt. a)/D119 já decidiram: os textos acionáveis divergem de verdade ("conquistar clientes" ×
  "abrir praças") e os tipos têm vocabulário próprio (praça × cliente).
- **Testes:** **+5** em `finance.test.ts` (`compareClientConcentration`: improved/worsened/stable, a fronteira exata
  `== ε` e a preservação das duas concentrações de origem, montando a entrada via `rankContactsByProfit` como na UI) —
  **802 testes** verdes.
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **802 testes**; smoke test — `npm start`: `/login` →
  200, `/contatos/rentabilidade?ano=2026` → 307 (rota protegida, redireciona para login). `npm audit` inalterado vs.
  baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios);
  **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) generalizar `compareGeoConcentration` para um tipo estrutural mínimo
  (`{ topShare, effectiveX }`) e reusá-lo literalmente nos dois eixos — descartado: o ganho seria marginal (a regra de
  tendência já é o que importa, e foi essa que extraí) e perderia o vocabulário próprio de cada `*Concentration`
  (`effectivePlaces` × `effectiveClients`), tornando os deltas ambíguos no consumidor. (b) unificar os cards de
  comparativo dos três eixos num componente único parametrizado — mantido **adiado** (D116 alt. a/D119): os textos
  acionáveis divergem e as cópias são curtas.

## D123 — Cachê mediano por contratante em `/contatos/rentabilidade` (Sessão 131)
- **Contexto:** a coluna "Cachê médio" (`avgFee`, D107) mostra o **nível de preço** praticado por contratante (cachê ÷
  shows). Sendo média, ela é sensível a um único show fora da curva — um festival pontual de cachê alto infla o
  "preço típico" e engana na hora de negociar o próximo show com aquele cliente. O **cachê mediano** (metade dos shows
  acima, metade abaixo) é a leitura robusta a esse outlier. O item aparecia nos "próximos passos" (item 8) como
  "próximo possível", mas **adiado** por ser "ruidoso com poucos shows" (mesma ressalva da D57 para a mediana de prazo).
- **Decisão:** resolver a ressalva em vez de manter o adiamento. `rankContactsByProfit` (`src/lib/finance.ts`) passou a
  acumular os cachês individuais de cada grupo (`Acc.fees`) e a expor `medianFee: number` em `ContactProfitRow`,
  reaproveitando o helper interno `median()` já existente (usado por `feeDistribution`/D61-faixas). A leitura ruidosa é
  resolvida na **apresentação**, não no dado: a coluna "Cachê mediano" em `/contatos/rentabilidade` só mostra o valor
  quando o contratante tem `showCount >= MIN_MEDIAN_FEE_SAMPLE` (= 3, nova const exportada); abaixo disso exibe "—" com
  um `title` explicando ("precisa de ao menos 3 shows para a mediana ser confiável"). O helper continua **puro** e
  computa a mediana sempre (1 show → o próprio cachê), deixando o gate de exibição como decisão de UI — assim os testes
  cobrem o cálculo independentemente do limiar.
- **Justificativa:** com 1–2 shows a mediana é igual/quase igual à média e não agrega (pior: parece "típica" sem ser);
  com 3+ ela começa a divergir da média e a revelar o preço habitual descontando o outlier — exatamente o que o
  contratante de carteira longa precisa para negociar. Gatekeepear na UI (e não zerar/ocultar no dado) mantém uma fonte
  única do cálculo e deixa o limiar ajustável num só lugar. Reusar `median()` evita uma segunda implementação de mediana.
- **Testes:** **+3** em `finance.test.ts` (dentro de `rankContactsByProfit`): mediana robusta a outlier (cachês
  100/200/1000 → mediana 200 ≠ média 433,33), nº par de shows (média dos dois centrais) e grupo de 1 show (mediana = o
  próprio cachê). **805 testes** verdes (eram 802).
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **805 testes**; smoke test — `npm start`: `/login` →
  200, `/contatos/rentabilidade` sem sessão → 307 (rota protegida), e render **autenticado** (cookie de sessão emitido
  para o usuário demo) → 200 com a coluna "Cachê mediano" presente. `npm audit` inalterado vs. baseline (10 advisories —
  4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) manter o adiamento (D57/próximos passos) — descartado: a ressalva era de **ruído
  com poucos shows**, resolvível por amostra mínima na exibição, então o motivo do adiamento deixou de valer. (b) gravar
  `null` em `medianFee` quando `showCount < 3` — descartado: misturaria a regra de exibição na lógica pura e perderia o
  dado para outros consumidores/testes; o gate é presentacional. (c) estender a mesma coluna à rentabilidade por
  casa/cidade — **adiável**: mesma mecânica, mas fica para uma sessão própria para manter o escopo fechado.

## D124 — Cachê mediano por casa/cidade em `/shows/locais` e `/shows/cidades` (Sessão 132)
- **Contexto:** a D123 entregou o **cachê mediano** por contratante em `/contatos/rentabilidade` (preço típico, robusto a
  um show fora da curva) e deixou explícito na alternativa (c) que estender a mesma coluna à rentabilidade por
  casa/cidade seria "mesma mecânica, mas fica para uma sessão própria para manter o escopo fechado". As duas telas
  (`/shows/locais`/D111 e `/shows/cidades`/D115) já mostram o cachê **somado** (`totalFee`) e a **média/show** do líquido
  (`avgNet`), mas não o preço típico por show — útil para saber quanto um palco/praça costuma pagar antes de fechar a
  próxima data, sem o viés de um festival pontual de cachê alto.
- **Decisão:** fechar o item (c). O agregador genérico `aggregateShowProfit` (`src/lib/finance.ts`, fonte única de
  `rankVenuesByProfit` e `rankCitiesByProfit`) passou a acumular os cachês individuais de cada grupo (`Acc.fees`) e a
  expor `medianFee: number` em `VenueProfitRow` (logo, também em `CityProfitRow`, que é o mesmo tipo), reaproveitando o
  helper interno `median()` — exatamente o mesmo padrão da D123, agora no eixo geográfico. As duas páginas ganharam a
  coluna "Cachê mediano" (entre "Cachê" e "Extras"), exibida só com `showCount >= MIN_MEDIAN_FEE_SAMPLE` (= 3, a const
  já exportada da D123, reusada sem duplicar o limiar); abaixo disso "—" com `title` explicativo. Rodapé de cada tela
  ganhou a nota do "preço típico do palco/da praça". O helper segue **puro** e computa a mediana sempre; o gate é decisão
  de UI (mesma disciplina da D123).
- **Justificativa:** reaproveitar `aggregateShowProfit` (em vez de tocar `rankVenuesByProfit`/`rankCitiesByProfit`
  separadamente) mantém uma fonte única e faz a cidade herdar o campo de graça (é rollup acima do local). Reusar
  `MIN_MEDIAN_FEE_SAMPLE` e a mesma mecânica de gate da D123 mantém o comportamento consistente entre as três telas de
  rentabilidade (contratante/casa/cidade) e o limiar ajustável num só lugar.
- **Testes:** **+3** em `finance.test.ts`: dentro de `rankVenuesByProfit` (mediana robusta a outlier 100/200/1000 → 200 ≠
  média; nº par de shows → média dos dois centrais) e `rankCitiesByProfit` (mediana por cidade robusta a outlier). **808
  testes** verdes (eram 805).
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **808 testes**; smoke test — `npm start`: `/login` →
  200, `/shows/locais` sem sessão → 307 (rota protegida). `npm audit` inalterado vs. baseline (10 advisories — 4 moderate
  / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) adicionar `medianFee` direto em `rankVenuesByProfit` e `rankCitiesByProfit`
  separadamente — descartado: ambas delegam a `aggregateShowProfit`, então o ponto único é o agregador. (b) também expor
  o cachê **médio** por show (`avgFee`, como em `ContactProfitRow`) nas duas telas — descartado por ora: a média implícita
  já é derivável de `totalFee ÷ shows` e o foco do item era o preço **típico** (mediano); manter o escopo fechado. (c)
  gravar `null` em `medianFee` abaixo do limiar — descartado pelo mesmo motivo da D123 (gate é presentacional).

## D125 — Exportação CSV das quatro telas de rentabilidade (Sessão 133)
- **Contexto:** as Finanças já exportavam CSV (transações/`/financas/export`, resumo anual/`/financas/anual/export`,
  trimestral/`/financas/trimestral/export`) e a lista de shows (`/shows/export`), mas as **quatro telas de rentabilidade**
  — por show (`/shows/rentabilidade`/F4), por local (`/shows/locais`/D111), por cidade (`/shows/cidades`/D115) e por
  contratante (`/contatos/rentabilidade`/D105) — só mostravam tabelas na tela, sem como levar os números para uma
  planilha (fechar o mês com o contador, montar um pitch, cruzar com outras fontes). Era a lacuna mais óbvia do acervo de
  relatórios.
- **Decisão:** três serializadores **puros** novos em `src/lib/csv.ts`, seguindo a mesma convenção pt-BR já estabelecida
  (delimitador `;`, decimal com vírgula, datas em UTC, BOM UTF-8 prefixado na camada HTTP): `showProfitToCsv` (consome
  `ShowProfitRow[]`; colunas Show/Data/Status/Cachê/Extras/Despesas/Resultado/Margem), `venueProfitToCsv` (consome
  `VenueProfitRow[]`, **serve local e cidade** — `CityProfitRow` é o mesmo tipo — com a 1ª coluna rotulada por um
  `groupLabel` "Local"/"Cidade") e `contactProfitToCsv` (consome `ContactProfitRow[]`; grupo "Sem contratante" com papel
  em branco). O **cachê mediano** sai em branco abaixo de `MIN_MEDIAN_FEE_SAMPLE` (espelha o "—" da UI/D123/D124) e a
  **margem** sai vazia sem receita bruta (espelha o "—" da página). Quatro route handlers `*/export/route.ts` espelham
  exatamente o carregamento e o recorte por ano (`?ano=`) de cada página (reusando `showProfitYears`/`parseProfitYear`/
  `filterShowsByYear`/D108 e, no de contratante, `pickPayerContact`/D30), e cada página ganhou um botão "⬇ CSV" (só com
  `report.count > 0`) que propaga o `?ano=` ativo; o nome do arquivo leva o ano ou "todos".
- **Justificativa:** manter a serialização **pura e testável** (lógica em `csv.ts`, I/O fino no route) é a mesma
  disciplina das exportações anteriores. Reusar um único `venueProfitToCsv` parametrizado pelo rótulo (em vez de dois
  serializadores quase idênticos) aproveita que local e cidade compartilham o tipo de linha. Os route handlers
  reaproveitam os helpers de período já cobertos, então o CSV reflete fielmente o que o usuário vê na tela (mesmo recorte,
  mesma ordenação, mesmos gates de mediana/margem).
- **Testes:** **+12** em `csv.test.ts` (cabeçalho, formatação pt-BR, rótulo de status/papel, gate de mediana em branco,
  margem vazia sem receita, escape de `;`, preservação de ordem, grupo "Sem contratante"). **820 testes** verdes (eram
  808).
- **DoD:** build de produção (as quatro rotas `*/export` aparecem no manifesto), typecheck e lint (0 avisos) verdes; **820
  testes**; smoke test autenticado (`npm start` + cookie de sessão real): as quatro rotas devolvem `200` com
  `Content-Type: text/csv`, `Content-Disposition: attachment` e CSV correto (BOM, vírgula decimal, mediana em branco com 1
  show), e `?ano=2026` recorta + nomeia o arquivo; sem sessão → 307 para `/login`. `npm audit` **inalterado** vs. baseline
  (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma
  dependência nova**.
- **Alternativas consideradas:** (a) um único serializador genérico para os quatro rankings — descartado: as colunas
  diferem de verdade (show tem Data/Status/Margem; contratante tem Papel/Cachê médio; local/cidade têm Cachê mediano), o
  que viraria um monstro de flags. (b) exportar a mediana/margem cruas (sem o gate da UI) — descartado: o CSV deve
  espelhar o que a tela mostra para não confundir (um número "típico" com 1 show engana tanto na planilha quanto na tela).
  (c) reaproveitar `showsToCsv` para a rentabilidade por show — descartado: aquele serializa o **cadastro** do show
  (local/cidade/observações), não o **P&L** (cachê/extras/despesas/resultado/margem).

## D126 — Veredito de tendência da queima de caixa em `/financas/folego-de-caixa` (Sessão 134)
- **Contexto:** o card "Cenário alternativo · ritmo de gasto real" (D101) reduz a janela de burn rate a **um número**
  (`avgMonthlyNet`/runway), e a tira mês a mês (`MonthlyFlowStrip`/D104) mostra a textura, mas ambos deixam a **direção**
  implícita: um caixa que estava positivo e despencou no fim da janela tem a mesma média de outro que vem se recompondo.
  O item ficara adiado na D104 "por ser mais hipótese"; revisto: comparar duas sub-janelas é um cálculo **factual** (não
  uma premissa de mercado), bastando uma moldura textual honesta.
- **Decisão:** novo helper **puro** `cashFlowTrend(months: CashFlowMonth[])` em `src/lib/finance.ts` que consome a saída
  de `cashFlowByMonth` (cronológica), parte a janela em **metade antiga × metade recente** (descarta o mês do meio quando
  o nº é ímpar, p/ manter as metades simétricas) e compara o fluxo líquido médio mensal de cada uma. Classifica em
  `accelerating` (recente ≥ `EPSILON` abaixo da antiga — queima piorando), `easing` (recente ≥ `EPSILON` acima — caixa
  recompondo), `stable` (dentro do limiar) ou `insufficient` (< 2 meses em alguma metade → janela curta demais). O limiar
  é **relativo** (`CASH_FLOW_TREND_EPSILON = 0,15`) sobre a maior das duas médias em módulo, com **piso**
  `CASH_FLOW_TREND_FLOOR = R$ 500/mês` no denominador p/ não estourar a razão sobre médias quase nulas. Surface: badge
  `CashFlowTrendBadge` no card do Cenário alternativo, logo abaixo da tira (some quando `insufficient`).
- **Justificativa:** mantém a disciplina do acervo (lógica pura/testável em `finance.ts`, UI fina na página) e espelha a
  mecânica de limiar de `concentrationTrend` (`GEO_TREND_EPSILON`/D120), aqui adaptada a centavos via razão relativa com
  piso (concentração compara frações 0..1; fluxo compara dinheiro, daí o piso). Reusa o `cashFlowByMonth` já computado na
  página — zero consulta nova, mesma janela `?meses=` (D102), então o veredito acompanha o recorte que o usuário escolhe.
- **Testes:** **+7** em `finance.test.ts` (acelerando/aliviando/estável, piso sobre médias quase nulas, descarte do mês do
  meio em janela ímpar, `insufficient` p/ janela curta, integração com `cashFlowByMonth`). **827 testes** verdes (eram 820).
- **DoD:** build de produção, typecheck e lint (0 avisos) verdes; **827 testes**; smoke test (`npm start`): a página
  responde e, sem sessão, 307 → `/login` (auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate
  / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) regressão linear sobre os meses (slope) — descartada por overkill: duas médias de
  sub-janela são mais legíveis e robustas a um mês-outlier no meio. (b) limiar absoluto em centavos (ex.: R$ 1.000) —
  descartado: não escala entre um músico que move R$ 2 mil/mês e outro que move R$ 30 mil/mês; o relativo+piso cobre os
  dois. (c) também levar o veredito ao nudge de burn do Painel (D103) — adiado: o Painel já tem dois nudges de caixa; um
  terceiro eixo de texto ali pede um corte de relevância à parte (só quando `accelerating` e o fôlego morde), fica p/ uma
  próxima sessão.

## D127 — Exportação CSV do ranking de contatos por atividade em `/contatos/ranking` (Sessão 135)
- **Contexto:** a D125 fechou a exportação CSV das quatro telas de **rentabilidade**, mas os "próximos passos" do
  PROGRESS já apontavam estender o botão "⬇ CSV" às demais telas tabulares que ainda só mostram tabela na tela. O
  **ranking de contatos por atividade** (`/contatos/ranking`/CRM, D27) é a candidata mais óbvia: é uma tabela de quem
  mais movimenta a agenda (shows ativos/total, próximos, cachê total, último show) que um músico naturalmente quer levar
  para uma planilha (priorizar quem reativar, montar um relatório de relacionamento, cruzar com outras fontes).
- **Decisão:** um serializador **puro** novo `contactActivityToCsv` em `src/lib/csv.ts`, na mesma convenção pt-BR já
  estabelecida (delimitador `;`, decimal com vírgula, datas em UTC via `csvDate`, BOM UTF-8 prefixado na camada HTTP).
  Consome uma forma mínima `ContactActivityCsvRow` (`{ contact: { name, role }, totalShows, activeShows, upcomingShows,
  totalFee, lastShowDate }`) — declarada em `csv.ts` em vez de importar `ContactRankRow` de `@/lib/contacts`, mantendo
  `csv.ts` sem nova dependência de tipo, e estruturalmente compatível com a linha real do ranking. Colunas:
  Contato/Papel/**Shows ativos**/**Shows (total)**/Próximos/Cachê total/Último show — a tabela exibe "ativos / total"
  numa célula só; no CSV viram duas colunas separadas, mais úteis para ordenar/filtrar em planilha. Papel passa pelo
  `contactRoleLabel` já existente (rótulo legível; desconhecido → "Outro"); último show vazio quando `null`. Um route
  handler fino `contatos/ranking/export/route.ts` espelha exatamente a query e a ordenação da página (mesma
  `rankContactsByActivity` sobre os contatos do usuário); a página ganhou o botão "⬇ CSV" (só com `ranking.count > 0`),
  sem `?ano=` (a tela não tem recorte por período).
- **Justificativa:** mantém a disciplina serializador-puro + route fino da D125 (lógica testável em `csv.ts`, I/O no
  route). Declarar a forma mínima local em vez de reusar o tipo de `contacts.ts` evita acoplar a serialização ao módulo
  de CRM (o mesmo padrão de `CsvTransaction`/`CsvShow`), e o route entrega a compatibilidade estrutural na prática.
- **Testes:** **+4** em `csv.test.ts` (só-cabeçalho, formatação pt-BR com papel legível e ativos/total separados, último
  show vazio sem data, preservação de ordem). **831 testes** verdes (eram 827).
- **DoD:** build de produção (a rota `/contatos/ranking/export` aparece no manifesto), typecheck (`tsc --noEmit`) e lint
  (0 avisos) verdes; **831 testes**; smoke test (`npm start`): `/contatos/ranking` e `/contatos/ranking/export` sem
  sessão → 307 para `/login` (auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high /
  1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) manter "ativos / total" numa coluna só (espelho fiel da tela) — descartado: numa
  planilha duas colunas numéricas são mais úteis (ordenar por ativos, somar totais) e o cabeçalho deixa o significado
  claro. (b) reusar `ContactRankRow` importando de `@/lib/contacts` — descartado p/ não acoplar `csv.ts` ao módulo de CRM;
  a forma mínima local segue o padrão dos demais serializadores. (c) também exportar retenção/fontes de renda/sazonalidade
  nesta sessão — adiado: cada uma tem forma de linha distinta e merece seu próprio serializador puro + testes; uma tela
  por sessão mantém o escopo fechado e mergeável (seguem nos próximos passos).

## D128 — Exportação CSV dos cachês a receber em `/shows/a-receber` (Sessão 136)
- **Contexto:** seguindo a linha das D125 (rentabilidade) e D127 (ranking de contatos), os "próximos passos" pediam
  estender o botão "⬇ CSV" às demais telas tabulares. A tela **Cachês a receber** (`/shows/a-receber`, D25/D31/D94) é a
  candidata mais valiosa que ainda faltava: é a lista de dinheiro **na mesa** (recebíveis em aberto, aging por idade do
  atraso e promessas de pagamento) que um músico naturalmente quer levar para uma planilha — montar uma régua de
  cobrança, cruzar com extrato, priorizar quem está mais velho. Era a única das telas de dinheiro sem exportação.
- **Decisão:** serializador **puro** novo `receivablesToCsv` em `src/lib/csv.ts`, na mesma convenção pt-BR já firmada
  (delimitador `;`, decimal com vírgula, datas em UTC via `csvDate`, BOM UTF-8 prefixado na camada HTTP). Consome uma
  forma mínima `ReceivableCsvRow` (`{ show: { title, date, venue, city }, fee, collected, outstanding, daysOutstanding,
  unregistered, registeredPending, promiseStatus, promisedAt }`) declarada em `csv.ts` — não importa `ShowReceivableRow`
  de `@/lib/finance` (que só carrega `id`/`fee`/`status`, sem título/local), mantendo o mesmo padrão dos demais
  serializadores. Colunas: Show/Data/Local/Cidade/**Dias em atraso**/Cachê/Recebido/A receber/**Situação**/Promessa/
  **Status promessa**. A coluna **Situação** consolida os textos da tela ("Receita não lançada" / "Lançada pendente" /
  "Parcial recebido") derivados de `unregistered`/`registeredPending`; **Status promessa** mapeia `paymentPromiseStatus`
  (broken→"Vencida", pending→"No prazo", none→vazio) e a data prometida sai por `csvDate` (vazia sem promessa). O route
  `shows/a-receber/export/route.ts` espelha a query da página (shows PLAYED/CONFIRMED + receitas INCOME vinculadas) e
  reusa `reconcileShowFees`/`bucketReceivablesByAge`/`paymentPromiseStatus`; ordena pelo **atraso mais longo** (como o
  aging prioriza a cobrança, em vez da ordem cronológica da tabela) e nomeia o arquivo `caches-a-receber.csv` (ASCII, sem
  acento no header HTTP). A página ganhou o botão "⬇ CSV" (só com `result.count > 0`).
- **Justificativa:** mantém a disciplina serializador-puro + route fino das D125/D127 (lógica testável em `csv.ts`, I/O
  no route). A ordenação por atraso (não cronológica) torna o CSV imediatamente acionável como fila de cobrança. Levar
  aging (dias), situação e promessa em colunas próprias dá numa planilha o que na tela está espalhado em selos/subtextos.
- **Testes:** **+7** em `csv.test.ts` (só-cabeçalho; formatação pt-BR com dias/situação; "Receita não lançada"; "Lançada
  pendente"; data + status de promessa vencida; promessa/status vazios sem data; preservação de ordem). **838 testes**
  verdes (eram 831).
- **DoD:** build de produção (a rota `/shows/a-receber/export` aparece no manifesto), typecheck (`tsc --noEmit`) e lint
  (0 avisos) verdes; **838 testes**; smoke test (`npm start`): sem sessão `/shows/a-receber` e `/shows/a-receber/export`
  → 307 para `/login`; **com** sessão forjada (lib própria) sobre o seed, o route devolve 200 + `text/csv` + CSV correto
  ("Show no Bar do Zé;16/06/2026;Bar do Zé;São Paulo;10;1500,00;250,00;1250,00;Parcial recebido;;"). `npm audit`
  **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado;
  ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) preservar a ordem cronológica da tabela — descartado: o valor do CSV é ser uma fila
  de cobrança, e o aging já define a prioridade certa (mais velho primeiro). (b) uma coluna numérica "Pendente lançado
  (R$)" em vez do texto "Situação" — descartado: a categoria textual (não lançada / lançada pendente / parcial) é mais
  legível para filtrar numa planilha e espelha os subtextos da tela. (c) incluir o recorte de aging (balde) como coluna
  — adiado: redundante com "Dias em atraso", que já permite recortar; mantém o cabeçalho enxuto. (d) também exportar
  a visão por contratante (`/shows/a-receber/por-contratante`) nesta sessão — adiado: forma de linha distinta (agregada
  por devedor), merece seu próprio serializador + testes; uma tela por sessão mantém o escopo fechado.

## D129 — Exportação CSV dos cachês a receber por contratante em `/shows/a-receber/por-contratante` (Sessão 137)
- **Contexto:** a D128 trouxe a exportação CSV dos **cachês a receber** (`/shows/a-receber`, visão por show) e deixou
  explícito na alternativa (d) que a visão **por contratante** (`/shows/a-receber/por-contratante`, D92/D93/D95) ficaria
  para uma sessão própria por ter forma de linha distinta (agregada por **devedor**, não por show). Esta é a tela de
  "de quem cobrar primeiro": uma linha por contratante com o saldo em aberto, nº de shows, pior atraso, atraso médio
  ponderado e promessas vencidas. É exatamente o recorte que um músico quer levar para uma planilha para montar a régua
  de cobrança por cliente. Era a última tela de recebíveis sem exportação.
- **Decisão:** serializador **puro** novo `receivablesByContactToCsv` em `src/lib/csv.ts`, na mesma convenção pt-BR já
  firmada (delimitador `;`, decimal com vírgula, BOM UTF-8 prefixado na camada HTTP). Consome uma forma mínima
  `ReceivableByContactCsvRow` (`{ contact: { name, role } | null, outstanding, showCount, maxDaysOutstanding,
  weightedAvgDays, share, brokenCount, brokenOutstanding }`) declarada em `csv.ts` — **não** importa
  `ContactReceivableRow` de `@/lib/finance`, mantendo o mesmo padrão de desacoplamento dos demais serializadores (como
  `ReceivableCsvRow`/D128, `ContactActivityCsvRow`/D127). Colunas: Contratante/**Papel**/A receber/Shows/**Pior atraso
  (dias)**/**Atraso médio (dias)**/**Participação**/**Promessas vencidas**/**A receber vencido**. O grupo "Sem
  contratante" (`contact: null`) sai com nome fixo e papel em branco (como `contactProfitToCsv`/D125); a participação
  vira porcentagem inteira (`csvShare`, espelha o `pct` da página). O route `por-contratante/export/route.ts` espelha a
  query da página (shows PLAYED/CONFIRMED + `contacts` + receitas INCOME vinculadas) e reusa **toda** a camada pura já
  testada: `reconcileShowFees` → `pickPayerContact` (atribuição por papel) → `outstandingByContact` (agregação por
  devedor, que já ordena pelo maior saldo e joga "Sem contratante" por último) e `summarizePaymentPromises` por grupo
  para `brokenCount`/`brokenOutstanding`. Arquivo `caches-a-receber-por-contratante.csv` (ASCII no header HTTP). A página
  ganhou o botão "⬇ CSV" (só com `byContact.count > 0`).
- **Justificativa:** mantém a disciplina serializador-puro + route fino das D125/D127/D128 (lógica testável em `csv.ts`,
  I/O no route). A ordenação por maior devedor (herdada de `outstandingByContact`, sem reordenar no route) torna o CSV
  imediatamente acionável como fila de cobrança por cliente. Levar pior atraso, atraso médio ponderado, participação e
  promessas vencidas em colunas próprias dá numa planilha o que na tela está espalhado em selos/subtextos.
- **Testes:** **+6** em `csv.test.ts` (só-cabeçalho; formatação pt-BR com atrasos/participação/papel; arredondamento da
  participação; grupo "Sem contratante" com papel em branco; promessas vencidas contagem+valor; preservação de ordem
  maior→menor). **844 testes** verdes (eram 838).
- **DoD:** build de produção (a rota `/shows/a-receber/por-contratante/export` aparece no manifesto), typecheck
  (`tsc --noEmit`) e lint (0 avisos) verdes; **844 testes**; smoke test (`npm start`): sem sessão a rota → 307 para
  `/login`; **com** sessão forjada (lib própria) sobre o seed, o route devolve 200 + `text/csv` + CSV correto (cabeçalho
  + linha "Sem contratante;;1250,00;1;10;10;100%;0;0,00"). `npm audit` **inalterado** vs. baseline (10 advisories — 4
  moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) reordenar as linhas no route — descartado: `outstandingByContact` já entrega a
  ordem certa (maior devedor primeiro, "Sem contratante" por último), espelhando a tabela; preservar a ordem mantém o
  route fino e o CSV idêntico à tela. (b) incluir uma coluna por show (detalhe) — descartado: essa granularidade já é a
  da exportação por show (D128); aqui o valor é a linha **agregada por devedor**. (c) uma coluna de balde de aging em vez
  de "Pior atraso (dias)" — descartado: os dias permitem recortar/ordenar na planilha e são mais precisos que o rótulo
  do balde.

## D130 — Prazo MEDIANO de recebimento por contratante em `/shows/prazo-recebimento/por-contratante` (Sessão 138)
- **Contexto:** a tela "Prazo de recebimento por contratante" (D52) mostra, por quem paga, o **prazo médio**
  ponderado pelo valor (`avgDays`) e o pior prazo (`lastDays`). Sendo média, `avgDays` é puxada por um único show
  pago muito atrasado — um contratante que costuma pagar em ~10 dias mas teve um show perdido por 90 aparece "lento"
  e engana na hora de decidir de quem cobrar primeiro. O **prazo mediano** (dia em que metade do que o contratante
  pagou já tinha entrado) é a leitura robusta a esse outlier — o mesmo que `paymentLag.medianDays` (D57) já dá no
  agregado global, mas que faltava por contratante. O item estava **adiado na D57/próximos passos** ("com poucos
  shows por contratante fica ruidosa"), a mesma ressalva que a D123 resolveu para o cachê mediano.
- **Decisão:** resolver a ressalva como na D123, em vez de manter o adiamento. `paymentLagByContact`
  (`src/lib/finance.ts`) passou a expor `medianDays: number` em `ContactPaymentLagRow`, computado por
  `weightedMedian(shows.map(s => ({ value: s.avgDays, weight: s.received })))` — exatamente os mesmos insumos do
  `avgDays` do grupo e espelhando o `medianDays` global de `paymentLag`. A leitura ruidosa é resolvida na
  **apresentação**: a coluna "Prazo mediano" (entre "Prazo médio" e "Pior prazo") só mostra o valor quando o
  contratante tem `showCount >= MIN_MEDIAN_LAG_SAMPLE` (= 3, nova const exportada); abaixo disso exibe "—" com um
  `title` explicando ("Mediana exige ao menos 3 shows pagos"). O helper continua **puro** e computa a mediana sempre
  (1 show → o próprio prazo), deixando o gate como decisão de UI — os testes cobrem o cálculo independentemente do
  limiar. Rodapé da página passou a explicar a leitura mediana e o gate.
- **Justificativa:** com 1–2 shows pagos a mediana é igual/quase igual à média e não agrega (pior: parece "típica"
  sem ser); com 3+ ela diverge da média e revela o prazo habitual descontando o show perdido — o que importa para
  priorizar cobrança e renegociar condições com um cliente de carteira longa. Gatekeepear na UI (e não zerar no dado)
  mantém uma fonte única do cálculo, o limiar ajustável num só lugar, e reusa o `weightedMedian` já existente — nenhuma
  segunda implementação de mediana ponderada. Coerente com `MIN_MEDIAN_FEE_SAMPLE` (=3, D123): mesma constante semântica
  para "amostra mínima de mediana", mas separada por eixo (cachê × prazo) para poder evoluir independente.
- **Testes:** **+4** em `finance.test.ts` (dentro de `paymentLagByContact`): mediana robusta a outlier (prazos
  5/10/90 d → mediana 10 d, com `avgDays > medianDays`), nº par de shows (mediana ponderada bate na metade do peso →
  média dos dois centrais = 15 d), grupo de 1 show (mediana = o próprio prazo, 7 d). **847 testes** verdes (eram 844).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **847 testes**
  (`vitest run`); smoke test — `npm start`: rota sem sessão → 307 (`/login`), e render **autenticado** (cookie de
  sessão emitido para o usuário demo) → 200 com a coluna "Prazo mediano" presente e ambos os ramos do gate exercitados
  (2 contratantes com < 3 shows pagos mostram "—" com o tooltip). `npm audit` inalterado vs. baseline (10 advisories —
  4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) manter o adiamento (D57) — descartado: a ressalva era de **ruído com poucos
  shows**, resolvível por amostra mínima na exibição (como na D123), então o motivo deixou de valer. (b) reusar
  `MIN_MEDIAN_FEE_SAMPLE` em vez de criar `MIN_MEDIAN_LAG_SAMPLE` — descartado: acoplaria o limiar do eixo de prazo ao
  do eixo de cachê (mesmo valor hoje, mas semânticas distintas que podem divergir). (c) gravar `null` em `medianDays`
  quando `showCount < 3` — descartado: misturaria regra de exibição na lógica pura e perderia o dado para outros
  consumidores/testes; o gate é presentacional. (d) levar o prazo mediano também ao card do Painel (`paymentLagHeadline`
  já expõe o `medianDays` global) — **adiável**: o Painel já mostra o DSO mediano global; o recorte por contratante é
  granularidade de tela, não de Painel.

## D131 — Exportação CSV do prazo de recebimento por contratante em `/shows/prazo-recebimento/por-contratante` (Sessão 139)
- **Contexto:** todas as telas tabulares de análise já exportam CSV (rentabilidade D125, ranking de contatos D127,
  recebíveis D128/D129) **exceto** as duas de "prazo de recebimento" (`/shows/prazo-recebimento` e a sua quebra
  `.../por-contratante`). A visão por contratante é a mais rica: uma linha por quem paga, com recebido, nº de shows,
  prazo médio ponderado, **prazo mediano** (D130, robusto a outlier) e pior prazo — exatamente o recorte que um músico
  leva para uma planilha ao decidir de quem cobrar primeiro e com quem renegociar prazo. Era uma lacuna óbvia de
  exportação no acervo de análise.
- **Decisão:** serializador **puro** novo `paymentLagByContactToCsv` em `src/lib/csv.ts`, na mesma convenção pt-BR já
  firmada (delimitador `;`, decimal com vírgula, BOM UTF-8 prefixado na camada HTTP). Consome uma forma mínima
  `PaymentLagByContactCsvRow` (`{ contact: { name, role } | null, received, showCount, avgDays, medianDays, lastDays,
  share, bucket }`) declarada em `csv.ts` — **não** importa `ContactPaymentLagRow` de `@/lib/finance`, mantendo o mesmo
  desacoplamento dos demais serializadores (como `ReceivableByContactCsvRow`/D129). Colunas:
  Contratante/**Papel**/Recebido/Shows/**Prazo médio (dias)**/**Prazo mediano (dias)**/**Pior prazo (dias)**/
  **Participação**/**Velocidade**. Os prazos saem como inteiros (negativos = adiantado) — mais úteis para ordenar/filtrar
  numa planilha que o rótulo textual da tela. O **prazo mediano** só sai a partir de `MIN_MEDIAN_LAG_SAMPLE` (=3) shows
  pagos — abaixo disso, célula em branco, espelhando o "—" da UI (D130) na **apresentação**, sem mexer no dado puro. A
  "Velocidade" usa `PAYMENT_SPEED_BUCKET_LABELS` (o mesmo balde derivado de `avgDays`). O grupo "Sem contratante"
  (`contact: null`) sai com nome fixo e papel em branco; a participação vira porcentagem inteira (`csvShare`). O route
  `por-contratante/export/route.ts` espelha a query da página (shows não cancelados + `contacts` + receitas INCOME
  recebidas vinculadas) e reusa **toda** a camada pura já testada: `pickPayerContact` (atribuição por papel) →
  `paymentLagByContact` (agregação e prazos ponderados, que já ordena do mais lento ao mais rápido e joga "Sem
  contratante" por último). Arquivo `prazo-recebimento-por-contratante.csv` (ASCII no header HTTP). A página ganhou o
  botão "⬇ CSV" (só com `lag.rows.length > 0`).
- **Justificativa:** mantém a disciplina serializador-puro + route fino das D125/D127/D128/D129 (lógica testável em
  `csv.ts`, I/O no route). A ordem herdada de `paymentLagByContact` (mais lento primeiro) torna o CSV imediatamente
  acionável como fila de cobrança/renegociação. Repetir o gate da mediana (em branco abaixo de 3 shows) na exportação
  evita oferecer um número ruidoso como se fosse típico — coerente com a tela (D130) e com a exportação de cachê
  mediano (D125, que também deixa o mediano em branco abaixo da amostra).
- **Testes:** **+7** em `csv.test.ts` (só-cabeçalho; formatação pt-BR com recebido/prazos/participação/velocidade;
  arredondamento da participação; mediana em branco abaixo da amostra mínima; preservação de prazos negativos
  adiantados; grupo "Sem contratante" com papel em branco; preservação de ordem lento→rápido). **854 testes** verdes
  (eram 847).
- **DoD:** build de produção (a rota `/shows/prazo-recebimento/por-contratante/export` aparece no manifesto), typecheck
  (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **854 testes** (`vitest run`); smoke test (`npm start`): sem
  sessão a rota → 307 para `/login`; **com** sessão forjada (lib própria) sobre o seed, o route devolve 200 +
  `text/csv` + `content-disposition` correto + CSV correto (cabeçalho + linha "Sem contratante;;250,00;1;0;;0;100%;No
  dia ou adiantado" — mediana em branco com 1 show, batendo o gate); a página renderiza 200 com o botão "⬇ CSV". `npm
  audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss
  bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) exportar os prazos como texto ("22 dias"/"3 d adiantado") espelhando a tela —
  descartado: inteiros ordenam/filtram melhor numa planilha e o sinal já carrega o "adiantado". (b) também exportar a
  tela-mãe `/shows/prazo-recebimento` (agregado global, sem quebra por contratante) — **adiável**: tem forma de linha
  distinta (baldes de velocidade, não devedores) e menor valor de planilha; fica como próximo passo. (c) gravar `null`
  no `medianDays` quando `showCount < 3` no serializador — descartado: o gate é presentacional (como na D130), então o
  serializador apenas omite na exibição, recebendo o `medianDays` cru.

## D132 — Exportação CSV do prazo de recebimento por show em `/shows/prazo-recebimento` (Sessão 140)
- **Contexto:** a quebra por contratante de "prazo de recebimento" já exporta CSV (D131), mas a **tela-mãe**
  `/shows/prazo-recebimento` (uma linha por show, do prazo mais lento ao mais rápido) ainda não — era a alternativa (b)
  explicitamente adiada na D131. Era a última tela tabular de análise do acervo sem exportação. A tabela por show é o
  recorte que um músico leva para uma planilha ao auditar *quais shows* demoraram a pagar (não *quem* — isso é a visão
  por contratante), p.ex. ordenar pelo pior prazo, cruzar com local/cidade ou filtrar por período manualmente.
- **Decisão:** serializador **puro** novo `paymentLagToCsv` em `src/lib/csv.ts`, na mesma convenção pt-BR já firmada
  (delimitador `;`, decimal com vírgula, datas UTC via `csvDate`, BOM UTF-8 prefixado na camada HTTP). Consome uma forma
  mínima `PaymentLagCsvRow` (`{ show: { title, date, venue?, city? }, received, paymentCount, avgDays, lastDays,
  bucket }`) declarada em `csv.ts` — **não** importa `PaymentLagShowRow` de `@/lib/finance` (que carrega o show inteiro),
  mantendo o mesmo desacoplamento dos demais serializadores (como `ReceivableCsvRow`/D128). Colunas:
  Show/**Data**/**Local**/**Cidade**/Recebido/**Recebimentos**/**Prazo médio (dias)**/**Pior prazo (dias)**/**Velocidade**.
  Os prazos saem como inteiros (negativos = adiantado); título/data/local/cidade saem explícitos (a planilha quer
  identificar o show, ao contrário de `PaymentLagShowRow` que só referencia o objeto). A "Velocidade" usa
  `PAYMENT_SPEED_BUCKET_LABELS` (o mesmo balde por show derivado de `avgDays`). Diferente da visão por contratante (D131),
  **não há prazo mediano** por linha — a mediana só faz sentido sobre um grupo de shows; por show o par médio+pior já
  descreve a linha. O route `prazo-recebimento/export/route.ts` espelha a query da página (shows não cancelados +
  receitas INCOME recebidas vinculadas) e reusa **toda** a camada pura já testada: `paymentLag` (agregação e prazos
  ponderados, que já ordena do mais lento ao mais rápido). Arquivo `prazo-recebimento.csv`. A página ganhou o botão
  "⬇ CSV" (só com `lag.rows.length > 0`), ao lado de "Por contratante" e "← Shows".
- **Justificativa:** mantém a disciplina serializador-puro + route fino das D125/D127/D128/D129/D131 (lógica testável em
  `csv.ts`, I/O no route). A ordem herdada de `paymentLag` (mais lento primeiro) torna o CSV imediatamente útil para
  auditar os piores pagamentos. Fecha a última lacuna de exportação do acervo de análise (era a alternativa (b) da D131).
- **Testes:** **+5** em `csv.test.ts` (só-cabeçalho; formatação pt-BR com data/local/cidade/recebido/prazos/velocidade;
  local/cidade em branco quando ausentes; preservação de prazos negativos adiantados; preservação de ordem
  lento→rápido). **859 testes** verdes (eram 854).
- **DoD:** build de produção (a rota `/shows/prazo-recebimento/export` aparece no manifesto), typecheck (`tsc --noEmit`)
  e lint (`next lint`, 0 avisos) verdes; **859 testes** (`vitest run`); smoke test (`npm start`): sem sessão a rota → 307
  para `/login`; **com** sessão forjada (lib própria) sobre o seed, o route devolve 200 + `text/csv` +
  `content-disposition` correto + CSV correto (cabeçalho + linha "Show no Bar do Zé;17/06/2026;Bar do Zé;São
  Paulo;250,00;1;0;0;No dia ou adiantado"); a página renderiza 200 com o botão "⬇ CSV". `npm audit` **inalterado** vs.
  baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios);
  **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) exportar o agregado por baldes de velocidade (a forma de "linha distinta" citada na
  D131) em vez da tabela por show — descartado: são só 5 linhas-resumo (pouco valor de planilha) e o usuário já vê os
  baldes na tela; a tabela por show é o artefato natural e consistente com todas as outras exportações (cada uma exporta
  o detalhe tabular, não o resumo). (b) exportar os prazos como texto ("22 dias") espelhando a tela — descartado pelo
  mesmo motivo da D131(a): inteiros ordenam/filtram melhor. (c) incluir o prazo mediano por show — descartado: a mediana
  é uma propriedade de um conjunto de recebimentos de vários shows, não de um show isolado (cujo `avgDays` já pondera os
  recebimentos próprios); manter por contratante (D131).

## D133 — Sazonalidade de shows por mês do ano em `/shows/sazonalidade` (Sessão 141)
- **Contexto:** o acervo de "Agenda & pipeline" já respondia *quando* (por dia da semana, `weekdayPerformance`/`/shows/dias-semana`)
  e *quanto ao longo do tempo* (cadência mês a mês, `/shows/cadencia`), mas faltava o eixo de **sazonalidade**: quais
  **meses do calendário** (jan→dez), somando todos os anos, historicamente rendem mais shows e maiores cachês. O
  `monthlySeasonality` que existia em `finance.ts` opera sobre **transações** (receita/despesa lançadas), não sobre os
  cachês dos shows realizados — é outra pergunta (fluxo de caixa vs. agenda de palco). Sem isso, o músico não tinha como
  ver os picos e vales da temporada para planejar prospecção e preço.
- **Decisão:** novo helper puro `gigSeasonality(shows, { now? })` em `src/lib/finance.ts`, espelhando integralmente a
  mecânica de `weekdayPerformance` (D próximo do eixo dia-da-semana) num eixo de 12 meses: agrega os **shows já realizados**
  (`isHappenedGig` — PLAYED, ou CONFIRMED com data passada; propostos/cancelados/futuros fora) e **com cachê > 0** por
  `getUTCMonth()`, **colapsando todos os anos** no mesmo balde (jan/2023 e jan/2024 → "Janeiro"). Devolve sempre 12
  entradas `GigMonthStat` (mês, label, count, totalFee, avgFee, countShare, feeShare) — inclusive meses zerados, para o
  gráfico/tabela não "pular" meses e revelar os vales — mais os destaques `busiest` (mais shows), `bestByVolume` (maior
  faturamento) e `bestByAvg` (maior cachê médio), com o mesmo desempate determinístico do `weekdayPerformance` (mês mais
  cedo vence). Constantes de rótulo exportadas: `GIG_MONTH_LABELS` (Janeiro…Dezembro) e `GIG_MONTH_SHORT` (jan…dez) —
  definidas localmente em `finance.ts`, que é um módulo sem imports (não reusa `MONTH_NAMES_LONG` de `calendar.ts`, como
  já faz com seu próprio `WEEKDAY_LABELS`). Nova página `/shows/sazonalidade` (server component) que carrega os shows do
  usuário e renderiza três cards de destaque + uma tabela "Shows por mês do ano" com barra proporcional ao nº de shows,
  espelhando o layout de `/shows/dias-semana`. Registrada no hub de relatórios (`REPORT_GROUPS`, subtema "Agenda &
  pipeline", após "Cadência de shows").
- **Justificativa:** reusa um padrão já testado e validado (mesma forma do `weekdayPerformance`), mantendo a lógica pura e
  testável em `finance.ts` e a página fina. O eixo "mês do ano" é distinto de "dia da semana" e de "cadência no tempo":
  responde à pergunta de planejamento de temporada (dezembro/junho cheios? fevereiro morto?) que nenhuma tela cobria.
  A barra usa o nº de shows (não o cachê) por ser a leitura primária de sazonalidade — "quando há trabalho"; o cachê
  médio e o faturamento ficam nas colunas ao lado.
- **Testes:** **+6** em `finance.test.ts` (12 meses zerados sem dados; colapso de anos no mesmo mês com média/total/
  participações; só realizados; ignora fee≤0; destaques por média/volume/movimento; desempate pelo mês mais cedo).
- **DoD:** build de produção (a rota `/shows/sazonalidade` aparece no manifesto), typecheck (`tsc --noEmit`) e lint
  (`next lint`, 0 avisos) verdes; **865 testes** (`vitest run`, eram 859); smoke test (`npm start`) com sessão forjada
  (lib própria) sobre o seed → a página devolve 200, renderiza os destaques, os rótulos de mês e o selo "mais cheio", e o
  hub de relatórios lista a entrada. `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1
  critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) estender o `monthlySeasonality` de transações em vez de um helper novo — descartado:
  são fontes (shows vs. transações) e perguntas diferentes; acoplar distorceria ambos. (b) parametrizar por ano (`?ano=`)
  como as telas de rentabilidade — adiado: a sazonalidade ganha sentido **somando** os anos (a amostra de um ano só é
  rala); um recorte por ano pode vir depois se houver demanda. (c) usar o cachê na barra em vez do nº de shows —
  descartado: "quando há trabalho" é a leitura primária de temporada; o dinheiro fica nas colunas. (d) exportação CSV —
  adiada: a tela é um resumo de 12 linhas que o usuário já lê inteiro; sem o atrito de planilha das tabelas longas.

## D134 — Nudge "próximo mês forte" no Painel a partir da sazonalidade (Sessão 142)
- **Contexto:** a sazonalidade dos shows (D133, `/shows/sazonalidade`) revela os picos da temporada, mas só para quem
  abre a tela. O Painel já traz uma família de nudges acionáveis derivados de helpers puros — concentração de clientes
  (D110), concentração geográfica (D114), DSO (D70), fôlego de caixa (D103) e a oportunidade de "fim de semana livre"
  (D97). Faltava transformar a sazonalidade em **antecedência**: avisar, na primeira tela, qual é o **próximo mês forte
  chegando** para que o músico comece a prospectar/precificar com tempo. Era o "próximo possível" registrado na D133/item
  2c dos próximos passos.
- **Decisão:** novo helper puro `gigSeasonalityHeadline(seasonality, { now? })` em `src/lib/finance.ts`, espelhando a
  disciplina de `geoConcentrationHeadline`/`cashBurnHeadline` (a regra de exibição vive no helper; o Painel só consome).
  Recebe uma `GigSeasonality` já computada e devolve `{ show, month, monthsAhead, lift }`. Varre **só para frente** — do
  mês seguinte (`monthsAhead` 1) até `STRONG_MONTH_HORIZON` (=4) meses à frente, **excluindo o mês corrente** (já é tarde
  para prospectá-lo; o valor do aviso é o lead time) — e escolhe o **mês forte mais cedo** que qualifica, definido por
  `feeShare ≥ STRONG_MONTH_FACTOR/12` (=1.25/12, i.e. ≥ 25% acima do faturamento do mês médio uniforme). Só dispara
  (`show: true`) com amostra mínima `totalShows ≥ STRONG_MONTH_MIN_SHOWS` (=6) — abaixo disso a "temporada" é ruído. O
  `lift` (= `feeShare × 12`) é exposto como múltiplo da média; o Painel mostra `(lift − 1) × 100`% "acima do mês médio".
  Novo banner-nudge 📈 "Mês forte chegando" em `dashboard/page.tsx` (estilo brand, como o de fim de semana livre),
  reaproveitando os `shows` já carregados via `gigSeasonality(shows)` — **zero consulta nova** — linkando para
  `/shows/sazonalidade`.
- **Justificativa:** usa **faturamento** (`feeShare`), não nº de shows, porque o nudge é sobre **onde priorizar esforço
  de venda/preço**, não só onde há volume. Escolher o mês forte **mais cedo** (não o maior) casa com o nome "próximo mês
  forte" e maximiza o lead time acionável; se um pico maior vier depois, ainda assim o próximo a preparar é o mais
  iminente. A janela de 4 meses e o piso de 6 shows espelham a economia dos outros nudges: alto o bastante para ser sinal,
  não ruído.
- **Testes:** **+5** em `finance.test.ts` (não aparece sem amostra mínima; aponta o próximo mês forte com lift > 1.25;
  escolhe o mais cedo na janela e não o maior; ignora meses fortes atrás/além do horizonte; não aparece em temporada
  plana). 870 testes no total (eram 865).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **870 testes**
  (`vitest run`); smoke test (`npm start`) com sessão forjada sobre o seed → `/dashboard` devolve 200; com dados forjados
  de um pico em agosto, o banner renderiza com o mês, o lead time ("daqui a 2 meses") e o "% acima". `npm audit`
  **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver
  D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) basear o "forte" no nº de shows (`countShare`) em vez do faturamento — descartado: o
  card é sobre priorizar receita; volume sem cachê não move a agulha. (b) surfar o **maior** pico da janela em vez do mais
  cedo — descartado: contraria o "próximo" e desperdiça lead time do mês iminente. (c) incluir o mês corrente — descartado:
  prospectar/precificar o mês que já começou é tarde demais para o que o nudge propõe. (d) um card cheio (mini-gráfico dos
  12 meses no Painel) — adiado: o Painel já é denso; o detalhe vive em `/shows/sazonalidade`, o nudge só puxa para lá.

---

## D135 — Nudge "mês fraco à frente" (vale da temporada) no Painel a partir da sazonalidade (Sessão 143)
- **Contexto:** a D134 entregou o lado do **pico** da sazonalidade no Painel (📈 "Mês forte chegando" via
  `gigSeasonalityHeadline`): antecedência para precificar/prospectar um mês que historicamente rende mais. Falta o
  lado simétrico e, em muitos casos, **mais acionável**: o **vale** da temporada. Um pico tende a se encher sozinho;
  já um mês historicamente fraco precisa de prospecção ativa *antes* da baixa para não virar agenda vazia. O nudge de
  pico era o "próximo possível" óbvio; o de vale é o seu espelho natural, fechando o par "onde cobrar mais × onde
  correr atrás de show".
- **Decisão:** novo helper puro `gigSeasonalityLull(seasonality, { now? })` em `src/lib/finance.ts`, **espelho exato**
  de `gigSeasonalityHeadline` no sentido oposto: mesma janela (`STRONG_MONTH_HORIZON` = 4 meses à frente, excluindo o
  mês corrente), mesma amostra mínima (`STRONG_MONTH_MIN_SHOWS` = 6) e mesmo `now` injetável. Devolve
  `{ show, month, monthsAhead, shortfall }` e escolhe o **mês fraco mais cedo** que qualifica, definido por
  `feeShare ≤ WEAK_MONTH_FACTOR/12` (nova const `WEAK_MONTH_FACTOR` = 0.75, i.e. ≥ 25% **abaixo** do faturamento do mês
  médio uniforme). `shortfall` (= `1 − feeShare × 12`) é a fração abaixo da média; o Painel mostra
  `shortfall × 100`% "abaixo do mês médio". **Exige `count > 0`** no mês candidato (simétrico ao mês forte): o sinal é
  "neste mês, em que você historicamente toca, costuma render menos" — não "você ainda não tem dados desse mês" (isso
  seria ausência de história, não sazonalidade). Novo banner-nudge 🍂 "Mês fraco à frente" em `dashboard/page.tsx`
  (estilo âmbar), reaproveitando a **mesma** `gigSeasonality(shows)` já computada para o nudge de pico — **zero consulta
  nova** — linkando para `/shows/sazonalidade`.
- **Justificativa:** usa **faturamento** (`feeShare`), não nº de shows, pela mesma razão da D134 — o card é sobre **onde
  faltará receita** se a agenda não for trabalhada. Para **não adensar o Painel** (a ressalva recorrente, ver D134(d)), o
  nudge de vale **cede a vez** ao de pico: só aparece quando `!seasonHeadline.show`. Assim há **no máximo um** nudge de
  sazonalidade por vez — o pico tem prioridade por ser também oportunidade de preço, e o vale preenche o slot quando não
  há pico iminente. Os limiares/horizonte/amostra são reusados do mês forte (sem novas constantes além do fator), mantendo
  a economia coerente entre os dois lados.
- **Testes:** **+5** em `finance.test.ts` (não aparece sem amostra mínima; aponta o próximo mês fraco com shortfall >
  0.25; escolhe o mais cedo na janela e não o mais fundo; exige `count > 0` — mês sem história não vira vale; não aparece
  em temporada plana). 875 testes no total (eram 870).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **875 testes**
  (`vitest run`); smoke test (`next start`) com sessão forjada → `/dashboard` devolve 200 e, com dados forjados de um vale
  em agosto (grosso do faturamento em janeiro, fora da janela), renderiza o banner 🍂 com o mês ("Agosto"), o lead time
  ("daqui a 2 meses") e o "% abaixo" (95%), **sem** o nudge de pico (regra de prioridade confirmada). `npm audit`
  **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver
  D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) mostrar pico **e** vale ao mesmo tempo (meses distintos) — descartado: dois nudges
  de sazonalidade adensam o Painel (D134(d)); o vale ceder a vez ao pico mantém um único slot. (b) incluir meses de
  `count = 0` como vale — descartado: ausência de história ≠ sazonalidade de baixa, e já há o nudge de "fim de semana
  livre" (D97) para agenda futura vazia; o `count > 0` mantém o sinal *histórico*. (c) dar prioridade ao vale sobre o pico
  (por ser mais urgente) — descartado: o pico também é janela de preço e é o nudge já estabelecido; o vale como fallback é
  menos surpreendente. (d) surfar o vale **mais fundo** da janela em vez do mais cedo — descartado: espelha a escolha do
  mês forte (D134(b)) e maximiza o lead time do mês iminente.

## D136 — Rentabilidade por papel do contratante (`/contatos/rentabilidade/por-papel`) (Sessão 144)
- **Contexto:** o acervo de rentabilidade já cobre as dimensões *por show* (D-F4), *por local/cidade* (D105/geo) e *por
  contratante individual* (D105). Falta o **rollup por tipo de comprador**: agrupar os shows pelo **papel** de quem paga
  (Casa de show, Produtor/Promoter, Contratante, Produtor musical, Imprensa, Outro). É uma pergunta de estratégia distinta
  da rentabilidade por pessoa — "que *categoria* de comprador rende mais por show?" orienta **onde investir prospecção**
  (ex.: se produtores pagam consistentemente mais que reservas diretas com a casa, vale priorizar produtores), enquanto a
  visão por contratante orienta o relacionamento com clientes específicos.
- **Decisão:** novo helper puro `rankRolesByProfit(shows, txs, getPayer, opts?)` em `src/lib/finance.ts`, **espelho de
  `rankContactsByProfit`** (mesma atribuição de **um** pagador por show via `getPayer`/`pickPayerContact` para não contar o
  resultado em dobro; mesmos campos por linha: `showCount`/`totalFee`/`totalExtra`/`totalExpenses`/`totalNet`/`avgNet`/
  `avgFee`/`medianFee`/`margin`; exclui `CANCELLED` por padrão), só que a **chave de grupo é o `role` do pagador** — vários
  contratantes do mesmo papel somam num só grupo. Shows sem contato atribuído caem em "Sem contratante" (`role: null`,
  sempre por último, fora de `best`/`worst`/`roleCount`). Devolve `RolesProfitability` (`rows: RoleProfitRow[]`). Página
  server component `/contatos/rentabilidade/por-papel` espelha o layout da tela por contratante (cards de destaque +
  `PeriodPicker`/`?ano=` reusando os três helpers da D108 + tabela com cachê médio/mediano, mediano só ≥
  `MIN_MEDIAN_FEE_SAMPLE`=3), com **badge** de papel por linha (sem link — papel não é entidade navegável) e cross-link
  recíproco "Por papel" ↔ "Por contratante". Registrada no hub (`REPORT_GROUPS`, área Contatos, subtema "Quem move a
  carreira", após "Rentabilidade por contratante").
- **Justificativa:** um helper paralelo (não uma generalização de `rankContactsByProfit`) porque a chave, a forma da linha
  (`role` vs. `contact`) e os agregados de cabeçalho (`roleCount`/`best`/`worst`) diferem o bastante para que parametrizar
  custasse mais clareza do que duplicar ~70 linhas de mecânica já testada — mesma decisão da D122 (concentração de cliente
  vs. geográfica como helpers paralelos). A atribuição de pagador é idêntica à D30/D105, então a leitura reconcilia com a
  soma do P&L dos shows (sem dupla contagem). O recorte por ano reusa exatamente os helpers da D108 (zero lógica nova de
  período).
- **Testes:** **+5** em `finance.test.ts` (estrutura vazia; dois contratantes do mesmo papel somam num grupo e reconciliam
  com a soma dos shows + cachê médio ≠ líquido; "Sem contratante" à parte e por último; ordena por resultado e aponta
  melhor/pior só entre identificados; cachê mediano robusto a outlier + exclui cancelado). 880 testes no total (eram 875).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **880 testes**
  (`vitest run`); smoke test (`next start`) com sessão forjada → `/contatos/rentabilidade/por-papel` devolve 200 e, com
  dois produtores distintos (mesmo papel PROMOTER), uma casa de show e um show sem contratante, renderiza os rótulos de
  papel, o grupo "Sem contratante", o seletor de período e o cross-link "Por contratante". `npm audit` **inalterado** vs.
  baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios);
  **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) generalizar `rankContactsByProfit` com um `keyer` genérico (como `aggregateShowProfit`
  faz para local/cidade) — descartado: a forma da linha e os agregados de cabeçalho diferem (papel é `string|null` sem
  nome/id), e o ganho de DRY não compensava o acoplamento; (b) exportação CSV junto — adiada (são poucas linhas; pode casar
  com o acervo de exportações numa sessão futura, registrado nos próximos passos); (c) card de concentração por papel
  (quanto a receita depende de um único tipo de comprador) — adiado: o nº de papéis é pequeno e fixo (6), então a
  concentração é menos informativa que nos eixos cliente/cidade; (d) link da linha para uma lista de contatos daquele papel
  — descartado por ora: a tela de Contatos já filtra por papel e a badge mantém a tabela enxuta.

## D137 — Exportação CSV da rentabilidade por papel (`/contatos/rentabilidade/por-papel/export`) (Sessão 145)
- **Contexto:** a tela de rentabilidade por papel (D136) era a única das telas de rentabilidade por contratante sem
  exportação CSV — todas as irmãs (por contratante D105, por show, por local/cidade) já oferecem "⬇ CSV". Era o próximo
  passo registrado na D136 (alt. b, adiada) e casa com o acervo de exportações (`@/lib/csv`).
- **Decisão:** novo serializador puro `roleProfitToCsv(rows, delimiter?)` + `ROLE_PROFIT_CSV_HEADERS` em `src/lib/csv.ts`,
  **espelho de `contactProfitToCsv`** (mesma convenção pt-BR: delimitador ";", decimal com vírgula, BOM UTF-8 na camada
  HTTP), mas **sem a coluna "Contratante"**: a 1ª coluna é "Papel" (rótulo legível via `CONTACT_ROLE_LABELS`), o grupo
  `role: null` sai como "Sem contratante", e o cachê mediano é gated por `MIN_MEDIAN_FEE_SAMPLE` (em branco abaixo de 3,
  reusando `csvMedianFee`, mesma regra de apresentação da UI/D123). Nova rota `/contatos/rentabilidade/por-papel/export`
  que reusa **exatamente** a mesma consulta, atribuição de pagador (`pickPayerContact`), recorte por ano (`?ano=`, helpers
  D108) e `rankRolesByProfit` da página, devolvendo o CSV com nome `rentabilidade-papeis-<ano|todos>.csv`. Botão "⬇ CSV"
  no cabeçalho da página, exibido só quando há linhas (`report.count > 0`), idêntico ao da tela por contratante.
- **Justificativa:** reuso máximo — o serializador difere do `contactProfitToCsv` só na 1ª coluna (papel vs. contratante+
  papel), e a route é uma cópia mecânica da `/contatos/rentabilidade/export` trocando `rankContactsByProfit`/
  `contactProfitToCsv` por `rankRolesByProfit`/`roleProfitToCsv`. Mantém a planilha consistente com o que a página mostra
  (mesmos campos, mesma ordem, mesmo recorte de período).
- **Testes:** **+4** em `csv.test.ts` (só cabeçalho quando vazio; papel com rótulo legível e valores com vírgula sem
  coluna de contratante; `role: null` → "Sem contratante"; cachê mediano vazio abaixo da amostra mínima). 884 testes no
  total (eram 880).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **884 testes**
  (`vitest run`); smoke test (`next start`) → `/` 200 e `/contatos/rentabilidade/por-papel/export?ano=2025` devolve 307
  (redireciona ao login sem sessão, rota auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate
  / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) generalizar `contactProfitToCsv` para aceitar a 1ª coluna como parâmetro — descartado:
  a diferença é uma coluna e o ganho de DRY não compensava o acoplamento entre dois serializadores de tipos distintos
  (`ContactProfitRow` × `RoleProfitRow`); (b) incluir uma coluna "Contratantes" listando os nomes do grupo — descartado:
  a tela por papel é deliberadamente um rollup (papel não é entidade), e quem quiser o detalhe usa a exportação por
  contratante.

## D138 — Concentração por papel em `/contatos/rentabilidade/por-papel` (Sessão 146)
- **Contexto:** a tela de rentabilidade por papel (D136) responde "que tipo de comprador rende mais", mas não dizia o
  quanto a receita **depende** de um único tipo de comprador — o risco de canal ("e se as casas de show, que pagam a
  maior fatia, secarem?"). Os eixos de cliente (D109) e geográfico (D113) já tinham seu card de concentração; o eixo de
  papel era o "próximo possível" registrado na D136/seção 8 do PROGRESS.
- **Decisão:** novo helper puro `roleConcentration(rows: RoleProfitRow[])` em `src/lib/finance.ts`, **espelho de
  `clientConcentration`/`geoConcentration`**: opera sobre as linhas de `rankRolesByProfit`, considera só papéis
  **identificados** (descarta `role: null`, "sem contratante") com **receita bruta** positiva (cachê + extras), e deriva
  `topShare`/`top3Share`/`hhi`/`effectiveRoles` + veredito reusando os mesmos limiares (`diversificationLevel`/D45).
  Devolve `RoleConcentration` (com `RoleShareSlice[]`). Card "Concentração por papel" em
  `/contatos/rentabilidade/por-papel`, exibido só com `roleCount > 0`, idêntico em layout ao card de concentração de
  clientes (3 métricas + badge de veredito 🔴/🟡/🟢 + nota acionável), com os rótulos de papel resolvidos via
  `CONTACT_ROLE_LABELS` (o maior papel não é link — papel não é entidade).
- **Justificativa:** reuso máximo — o helper difere de `clientConcentration`/`geoConcentration` só no eixo (papel × pessoa
  × cidade) e na chave de empate; o card é uma cópia do `ConcentrationCard` da tela por contratante trocando o rótulo. Usa
  receita **bruta** (não o líquido, que pode ser negativo e não forma participações válidas que somam 1), coerente com os
  outros dois eixos de concentração. Como os papéis são poucos e fixos (~6), a concentração tende a ser naturalmente mais
  alta; o card deixa isso explícito na nota ("vale prospectar outros tipos de contratante").
- **Testes:** **+6** em `finance.test.ts` (`describe("roleConcentration")`: estrutura vazia; participação sobre receita
  bruta com dois VENUE somando num grupo e o grupo sem contratante ignorado; extras na receita bruta; descarte de papel
  sem receita positiva; papel único sempre concentrado; cinco papéis equidistribuídos → diversificada). **890 testes** no
  total (eram 884).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **890 testes**
  (`vitest run`); smoke test autenticado (`next start` + cookie de sessão forjado do usuário demo): `/contatos/
  rentabilidade/por-papel` 200, sem vínculos o card some (roleCount 0, comportamento correto), e com contatos de papéis
  distintos vinculados aos shows o card renderiza "Concentração por papel" + veredito "Moderada" + "maior papel" +
  "papéis efetivos". `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do
  Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) generalizar `clientConcentration`/`geoConcentration`/`roleConcentration` num único
  helper parametrizado pelo eixo — descartado por ora: os tipos de fatia divergem (`ClientShareSlice` carrega o `contact`,
  `GeoShareSlice` a chave/nome, `RoleShareSlice` o papel) e a regra de empate difere; o ganho de DRY não compensa o
  acoplamento (mesma decisão que manteve os dois helpers existentes paralelos); (b) um nudge de concentração por papel no
  Painel (espelhando `clientConcentrationHeadline`/D110) — adiado: o Painel já tem dois nudges de concentração (cliente
  D110 + geográfica D114) e um terceiro do mesmo tema seria ruído; (c) comparativo ano a ano da concentração por papel
  (espelhando D122/D121) — adiado até haver demanda, pelo nº pequeno e fixo de papéis tornar o sinal anual fraco.

## D139 — Exportação CSV da sazonalidade de shows (`/shows/sazonalidade/export`) (Sessão 147)
- **Contexto:** a tela de sazonalidade de shows por mês do ano (D133, `gigSeasonality`) era a única tela de análise
  recente (criada na Sessão 141, depois da onda de exportações CSV das Sessões 134–146) sem botão "⬇ CSV". Era a última
  tabela de "Agenda & pipeline" sem exportação, e casa com o acervo já consolidado em `@/lib/csv`.
- **Decisão:** novo serializador puro `gigSeasonalityToCsv(season: GigSeasonality, delimiter?)` + `GIG_SEASONALITY_CSV_HEADERS`
  em `src/lib/csv.ts`, na mesma convenção pt-BR dos irmãos (delimitador ";", decimal com vírgula, BOM UTF-8 na camada HTTP).
  Recebe o objeto `GigSeasonality` inteiro (já tipado em `@/lib/finance`, importado como os demais row-types do csv.ts) e
  emite **sempre as 12 linhas de mês** (jan→dez, inclusive meses zerados — preserva os vales da temporada que a tela
  destaca) + uma linha **"Total"**. Colunas: Mês / Shows / Cachê médio (R$) / Faturamento (R$) / % dos shows / % do
  faturamento; as duas participações reusam o helper interno `csvShare`. Diferente da UI (que mostra "—" nos meses vazios),
  o CSV registra `0` e `0,00` para ficar legível por máquina; as participações da linha Total ficam **em branco** (são
  sempre 100% por construção). Nova rota `/shows/sazonalidade/export` que reusa **exatamente** a mesma consulta da página
  (`prisma.show.findMany` → `gigSeasonality`), nome de arquivo fixo `sazonalidade-shows.csv` (sem `?ano=`: a sazonalidade
  por design soma todos os anos). Botão "⬇ CSV" no cabeçalho da página, exibido só quando há dados (`season.totalShows > 0`).
- **Justificativa:** reuso máximo — a route é uma cópia mecânica das demais rotas de export (só muda o helper de domínio e o
  nome do arquivo), e o serializador segue a forma dos irmãos. Receber a `GigSeasonality` inteira (em vez de uma forma
  mínima local como `paymentLagToCsv`) é seguro aqui porque o tipo é leve (12 stats + agregados) e já vive no `@/lib/finance`
  importado; permite emitir a linha Total a partir dos agregados sem recomputar.
- **Testes:** **+3** em `csv.test.ts` (`describe("gigSeasonalityToCsv")`: sempre 14 linhas — cabeçalho + 12 meses + Total —
  mesmo sem shows, com Total zerado e shares em branco; contagem/cachê médio/faturamento/participações por mês com dois anos
  colapsados no mesmo balde "Março" + linha Total; meses sem shows saem como `0`/`0,00`/`0%`, não "—"). 893 testes no total
  (eram 890).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **893 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/shows/sazonalidade/export` 307 (redireciona ao login sem sessão, rota
  auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) uma coluna a mais para a barra/percentual relativo ao mês de pico — descartado: o pico é
  contexto visual da tela, não dado tabular; (b) omitir os meses zerados para encurtar o arquivo — descartado: os vales são
  parte do sinal de sazonalidade (onde prospectar/ajustar preço), então o CSV os mantém explícitos como a tela faz.

## D140 — Exportação CSV do desempenho por dia da semana (`/shows/dias-semana/export`) (Sessão 148)
- **Contexto:** a tela "Por dia da semana" (`weekdayPerformance`, `/shows/dias-semana`) é a irmã direta da sazonalidade de
  shows — mesma família "Agenda & pipeline", mesmo eixo Stat (label/count/totalFee/avgFee/countShare/feeShare). A irmã
  ganhou "⬇ CSV" na Sessão 147 (D139); a de dia da semana era a tabela vizinha mais óbvia ainda sem exportação.
- **Decisão:** novo serializador puro `weekdayPerformanceToCsv(wp: WeekdayPerformance, delimiter?)` +
  `WEEKDAY_PERFORMANCE_CSV_HEADERS` em `src/lib/csv.ts`, **cópia estrutural** de `gigSeasonalityToCsv` (D139): recebe o
  objeto `WeekdayPerformance` inteiro (tipo leve já em `@/lib/finance`, importado como os demais row-types do csv.ts) e
  emite **sempre as 7 linhas de dia** (domingo→sábado, na ordem do array de `weekdayPerformance`, inclusive dias zerados —
  preserva as lacunas da agenda que a tela destaca) + uma linha **"Total"**. Colunas idênticas às da irmã: Dia / Shows /
  Cachê médio (R$) / Faturamento (R$) / % dos shows / % do faturamento; as duas participações reusam o helper interno
  `csvShare`. Como na irmã, dias sem shows saem como `0`/`0,00`/`0%` (a UI usa "—") para ficar legível por máquina, e as
  participações da linha Total ficam **em branco** (sempre 100% por construção). Nova rota `/shows/dias-semana/export` que
  reusa **exatamente** a mesma consulta da página (`prisma.show.findMany` → `weekdayPerformance`), nome de arquivo fixo
  `shows-por-dia-da-semana.csv` (sem `?ano=`: a leitura por dia da semana, como a sazonalidade, soma todos os anos por
  design). Botão "⬇ CSV" no cabeçalho da página (header reembrulhado num `flex gap-2` como o da irmã), exibido só quando há
  dados (`wp.totalShows > 0`).
- **Justificativa:** reuso máximo — a route é uma cópia mecânica das demais rotas de export (muda só o helper de domínio e o
  nome do arquivo) e o serializador segue a forma da irmã linha a linha. Manter a ordem domingo→sábado (não reordenar por
  faturamento) espelha a tabela da tela e mantém a planilha previsível; receber o `WeekdayPerformance` inteiro permite emitir
  o Total a partir dos agregados sem recomputar.
- **Testes:** **+3** em `csv.test.ts` (`describe("weekdayPerformanceToCsv")`: sempre 9 linhas — cabeçalho + 7 dias + Total —
  mesmo sem shows, com Total zerado e shares em branco; contagem/cachê médio/faturamento/participações por dia com dois anos
  colapsados no mesmo balde "Domingo" + linha Total; dias sem shows saem como `0`/`0,00`/`0%`, não "—"). 896 testes no total
  (eram 893).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **896 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/shows/dias-semana/export` 307 (redireciona ao login sem sessão, rota
  auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) ordenar as linhas por cachê médio (como os destaques da tela) — descartado: a tabela da
  página mantém a ordem natural dom→sáb e a planilha deve ser previsível/comparável; (b) omitir os dias zerados — descartado:
  as lacunas da agenda são sinal (que dias ainda não rendem shows), então o CSV as mantém explícitas como a tela faz;
  (c) generalizar `gigSeasonalityToCsv`/`weekdayPerformanceToCsv` num serializador de "eixo Stat" parametrizado — adiado: são
  só duas cópias curtas e o ganho de DRY não paga a indireção (mesma postura da D116 alt. a sobre os cards de concentração).

## D141 — Comparativo ano a ano da concentração por papel (`/contatos/rentabilidade/por-papel`) (Sessão 149)
- **Contexto:** o eixo de **papel do comprador** ganhou concentração (HHI/topShare/papéis efetivos) na Sessão 146 (D138),
  mas era o único dos três eixos de concentração sem comparativo de tendência ano a ano: o de praça já tinha
  `compareGeoConcentration` (D120) e o de cliente `compareClientConcentration` (D139-família/Sessão da rentabilidade por
  contratante). A página por papel já carrega o seletor `?ano=` (D136) e computa a `roleConcentration` do período, então o
  ano anterior estava a um recorte de distância — a lacuna era só o helper + o card.
- **Decisão:** novo helper puro `compareRoleConcentration(current, previous): RoleConcentrationComparison` em
  `src/lib/finance.ts`, **cópia estrutural** de `compareClientConcentration`/`compareGeoConcentration` num eixo de papel:
  recebe duas `RoleConcentration` já computadas (cada uma sobre as linhas de `rankRolesByProfit` do seu período) e devolve
  `topShareDelta` (variação da participação do maior papel, −1..1), `effectiveRolesDelta` (variação do nº de papéis
  efetivos, índice de Simpson) e `trend` ("improved"/"worsened"/"stable") via o **mesmo** `concentrationTrend` compartilhado
  (limiar `GEO_TREND_EPSILON` = 0,05). Na página `/contatos/rentabilidade/por-papel`, o comparativo só é computado/exibido
  com um ano específico selecionado **e** papel identificado nos dois períodos (`roleCount > 0` em ambos) — reaproveitando o
  recorte por ano UTC (D108) sobre os shows já carregados, **sem nova consulta**. Novo `RoleComparisonCard` (espelha o
  `ClientComparisonCard` da rentabilidade por contratante): badge de tendência (🟢 mais distribuída / 🔴 mais concentrada /
  ⚪ estável), variação do maior papel em p.p. (com os dois valores ano→ano) e variação de papéis efetivos, renderizado logo
  abaixo do card de concentração por papel.
- **Justificativa:** simetria — o eixo de papel passa a ter o mesmo trio (concentração + headline-de-card + comparativo) que
  os outros eixos, com reuso máximo (`concentrationTrend`/`GEO_TREND_EPSILON` já existiam; o card é uma cópia mecânica do de
  cliente trocando "contratante"→"papel" e removendo o link para a entidade, já que papel não é entidade clicável). A guarda
  "papel identificado nos dois anos" evita a leitura enganosa de "melhorou/piorou" quando um dos lados está vazio, igual à do
  comparativo por contratante.
- **Testes:** **+5** em `finance.test.ts` (`describe("compareRoleConcentration")`, espelhando o bloco do comparativo de
  cliente sobre o eixo de papel): 'improved' quando o maior papel encolhe além do limiar (topShare 0,8→0,2, efetivos sobem),
  'worsened' no sentido oposto, 'stable' dentro do limiar (ruído), a fronteira exata (+0,05 == ε vira "worsened") e a
  preservação das duas concentrações de origem para o detalhe. 901 testes no total (eram 896).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **901 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/contatos/rentabilidade/por-papel?ano=2025` 307 (redireciona ao login sem
  sessão, rota auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos
  do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.
- **Alternativas consideradas:** (a) levar o comparativo também ao Painel — descartado: o Painel já é denso e o comparativo
  pede um ano selecionado (não há recorte de período no dashboard); fica na página, como os comparativos de praça e cliente;
  (b) generalizar os três `compare*Concentration` num só helper genérico sobre `topShare`/`effective*` — adiado: são três
  cópias curtas de ~10 linhas e a indireção (tipos genéricos sobre slices diferentes) não paga o DRY, mesma postura da D140
  alt. c; (c) um `roleConcentrationHeadline` para nudge de Painel (espelho do `clientConcentrationHeadline`) — adiado pela
  mesma razão de densidade do Painel, pode vir depois se houver demanda.

---

## D142 — Exportação CSV da distribuição por faixa de cachê (`/shows/faixas-de-cache`) (Sessão 150)
- **Contexto:** a tela `/shows/faixas-de-cache` (D53) mostra em que faixa de preço o músico mais toca e onde está
  concentrado o faturamento — o "formato da tabela de cachês" —, mas era uma das poucas telas com tabela densa do acervo
  ainda sem botão de exportação. As irmãs do mesmo eixo "balde → linhas + Total" (sazonalidade por mês/D139 e desempenho
  por dia da semana/D140) já exportavam; faltava só o serializador + a rota + o botão para esta.
- **Decisão:** novo serializador puro `feeDistributionToCsv(dist): string` + `FEE_DISTRIBUTION_CSV_HEADERS` em
  `src/lib/csv.ts`, irmão direto de `gigSeasonalityToCsv`/`weekdayPerformanceToCsv`: recebe o objeto `FeeDistribution`
  (importado de `@/lib/finance`, não reconstruído) e emite sempre as 6 linhas de faixa (na ordem de `FEE_BANDS`, da mais
  barata à mais cara, inclusive faixas zeradas — o gráfico/tabela não pode pular degraus) + uma linha "Total". Colunas
  **Faixa / Shows / % dos shows / Faturamento (R$) / % do faturamento**, espelhando a tabela da página (participações via
  o `csvShare` compartilhado, valores via `centsToCsvAmount`). Diferente da UI (que mostra "—" nas faixas vazias), o CSV
  registra `0`/`0%`/`0,00` para ficar legível por máquina; os shares do Total ficam em branco (são sempre 100% por
  construção). Rota `/shows/faixas-de-cache/export/route.ts` espelha a consulta da página e reusa a camada pura testada
  (`feeDistribution`); arquivo `faixas-de-cache.csv` + BOM UTF-8 na camada HTTP. Botão "⬇ CSV" no cabeçalho só com
  `dist.totalShows > 0`.
- **Justificativa:** simetria e reuso máximo — fecha a lacuna de exportação desta tela com o mesmo padrão (serializador
  puro testável + rota fina que só consulta e embrulha no HTTP) já consolidado em ~16 outras exportações; mantém a
  convenção pt-BR (delimitador ";", decimal com vírgula, BOM) para abrir direto no Excel/Sheets pt-BR.
- **Alternativas consideradas:** (a) incluir uma coluna "Cachê médio (R$)" por faixa como nas irmãs — descartado:
  `FeeBandStat` não computa média por faixa (faixa é um **intervalo de preço**, não um balde de tempo; a média intra-faixa
  diz pouco e a página não a mostra), então o CSV espelha exatamente as 5 colunas da tela; (b) recorte por ano (`?ano=`)
  no export — adiado: a página-mãe ainda soma todos os anos (a distribuição ganha sentido com o acervo inteiro), o export
  acompanha; quando/se a página ganhar `?ano=`, o export herda o mesmo recorte.
- **Testes:** **+3** em `csv.test.ts` (`describe("feeDistributionToCsv")`, espelhando os blocos de sazonalidade/dia-da-semana
  sobre o eixo de faixa): sempre 6 faixas + Total mesmo sem shows (cabeçalho + 8 linhas, Total `Total;0;;0,00;`),
  serialização de contagem/participações/faturamento por faixa (dois shows somados na faixa "R$ 1.000 – 2.000" → 67% dos
  shows, R$ 3.300, 80% do faturamento) e o registro de `0`/`0%`/`0,00` nas faixas vazias (não o "—" da UI). 904 testes no
  total (eram 901).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **904 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/shows/faixas-de-cache/export` 307 (redireciona ao login sem sessão, rota
  auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.

## D143 — Recorte por ano (`?ano=`) na distribuição por faixa de cachê (`/shows/faixas-de-cache`) (Sessão 151)
- **Contexto:** a tela `/shows/faixas-de-cache` (D53) e seu export (D142) somavam **todos os anos** num retrato único do
  "formato da tabela de cachês". As telas irmãs do eixo de rentabilidade (`/shows/rentabilidade`, `/shows/locais`,
  `/shows/cidades`, `/contatos/rentabilidade`, `.../por-papel`) já oferecem o seletor de período por ano (`PeriodPicker` +
  helpers da D108) há várias sessões; faixas de cachê era a última tela tabular de análise de shows sem esse recorte.
- **Decisão:** adicionar o recorte por ano à página e ao export, reusando integralmente os três helpers da D108
  (`showProfitYears`/`parseProfitYear`/`filterShowsByYear` — só os dois últimos, mais um novo derivador de anos) e o
  componente compartilhado `PeriodPicker` (D119), exatamente como a rentabilidade por show. Novo helper puro
  `feeDistributionYears(shows, { now? }): number[]` em `src/lib/finance.ts` que devolve os anos (UTC, decrescente) **só**
  dos shows que de fato entram na distribuição — i.e. realizados (`isHappenedGig`) com cachê > 0, o **mesmo** gate de
  `feeDistribution`. Filtra-se por ano **antes** de mapear para `ReceivableShowLike` e chamar `feeDistribution`, que segue
  puro e agnóstico ao recorte. O botão "⬇ CSV" e a rota `/shows/faixas-de-cache/export` propagam o `?ano=` ativo; o arquivo
  passou de `faixas-de-cache.csv` (fixo) para `faixas-de-cache-{ano|todos}.csv` (mesma convenção de sufixo das D125).
- **Justificativa:** reverte conscientemente o adiamento da D142(b) ("a distribuição ganha sentido com o acervo inteiro").
  Revisão: a **evolução do posicionamento de preço** é justamente uma leitura por ano — em que faixa eu mais toquei *neste
  ano* vs. o histórico, para onde meu faturamento migrou. Manter só o agregado escondia essa trajetória, e a assimetria com
  as telas de rentabilidade (todas com `?ano=`) não tinha razão de ser. O acervo inteiro continua disponível na pílula
  "Todos" (default), então nada se perde. Diferente da **sazonalidade por mês** (D133(b)), que colapsa os anos *por design*
  (jan→dez de todos os anos juntos): ali o ano é o eixo a achatar; aqui o ano é um recorte legítimo do mesmo retrato.
- **Por que um helper novo (`feeDistributionYears`) e não `showProfitYears`:** `showProfitYears` parte de uma lista de datas
  já filtrada pela própria tela (ex.: rentabilidade passa os shows não-CANCELLED) e pode oferecer um ano sem shows
  *priced/realizados* — aceitável lá porque o estado-vazio cobre. Aqui o gate da distribuição é mais estrito (realizado **e**
  cachê > 0) e quis-se um seletor **honesto** que não ofereça anos que renderiam tabela vazia; `feeDistributionYears` aplica
  exatamente o gate de `feeDistribution`, então toda pílula de ano tem dados.
- **Alternativas consideradas:** (a) exportar `isHappenedGig` e derivar os anos inline nas duas rotas — descartado: duplicaria
  o gate (status + cachê) em page e route e acoplaria a UI ao detalhe interno; um helper puro nomeado é testável e DRY.
  (b) derivar os anos com `showProfitYears` sobre todas as datas — descartado por oferecer anos vazios (ver acima).
  (c) recorte por intervalo de datas livre em vez de por ano — descartado: as outras telas usam ano e o `PeriodPicker`
  compartilhado fala em ano; consistência > flexibilidade aqui.
- **Testes:** **+4** em `finance.test.ts` (`describe("feeDistributionYears")`): anos UTC decrescentes e deduplicados só de
  realizados com cachê > 0; ignora propostos/cancelados/futuros/sem-cachê; usa o ano **UTC** na virada do dia
  (`2025-12-31T23:00Z` → 2025); lista vazia sem shows elegíveis. O recorte em si reusa `parseProfitYear`/`filterShowsByYear`
  (já testados) e `feeDistribution` (idem), então a composição não duplica cobertura. **908 testes** no total (eram 904).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **908 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/shows/faixas-de-cache?ano=2025` + `/shows/faixas-de-cache/export?ano=2025`
  307 (auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do
  Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.

## D144 — Exportação CSV das fontes de renda (`/financas/fontes-de-renda/export`) (Sessão 152)
- **Contexto:** a tela `/financas/fontes-de-renda` (mix de receitas por categoria, `incomeMix`/D45) mostra de onde vem o
  dinheiro e o quanto a renda depende de uma só fonte, mas era uma das telas tabulares de análise das **Finanças** ainda sem
  exportação CSV. O acervo de exportação já cobre praticamente todo o eixo de shows/rentabilidade/recebíveis (D125–D143);
  do lado financeiro havia transações (D14), resumo anual (D47) e trimestral, mas não as fontes de renda — útil para levar a
  composição de receita a uma planilha/contador (apuração, declaração).
- **Decisão:** adicionar um botão "⬇ CSV" ao cabeçalho da página (só com `mix.sourceCount > 0`) + a rota
  `/financas/fontes-de-renda/export`, espelhando a mesma consulta/`incomeMix` da página. Novo serializador puro
  `incomeMixToCsv(mix)` + `INCOME_MIX_CSV_HEADERS` em `src/lib/csv.ts`, irmão direto de `feeDistributionToCsv` (D142):
  recebe o objeto `IncomeMix` (importado de `@/lib/finance`) e emite uma linha por fonte na **mesma ordem da página**
  (valor decrescente, empate por nome pt-BR) — colunas Fonte / Lançamentos / Total (R$) / Participação — seguida de uma
  linha "Total". Mesma convenção pt-BR dos irmãos (delimitador `;`, decimal com vírgula via `centsToCsvAmount`, participação
  inteira via `csvShare`, BOM UTF-8 na camada HTTP). A participação do "Total" fica em branco (é sempre 100% por construção,
  como nas D142/D139); o "Total" não traz contagem de lançamentos (a soma de lançamentos entre categorias não é uma métrica
  acionável — espelha o "Total" das telas de mix, que só somam valor).
- **Justificativa:** fecha uma lacuna real de exportação do lado das Finanças com o padrão já consolidado (serializador puro
  testado + route handler fino que só consulta e embrulha no HTTP), zero dependência nova, zero mudança na camada de cálculo.
  Categorias em branco já caem em "Sem categoria" no próprio `incomeMix`, então o CSV herda esse rótulo sem caso especial.
- **Por que sem `?ano=`:** a página `/financas/fontes-de-renda` ainda não tem recorte por período (opera sobre todas as
  receitas lançadas); o export espelha exatamente a consulta da página. Um recorte por ano nas fontes de renda seria uma
  unidade de trabalho à parte (página + export juntos), não embutida aqui — registrado nos próximos passos.
- **Alternativas consideradas:** (a) importar `IncomeSourceSlice[]` em vez do objeto `IncomeMix` inteiro — descartado: o
  serializador também emite a linha "Total" (`mix.total`), então receber o objeto agregado é mais coeso e evita o caller
  recomputar o total. (b) incluir o HHI / nº efetivo de fontes / veredito no CSV — descartado: são métricas de leitura na
  tela, não de planilha; o CSV é a composição linha-a-linha (a concentração se recalcula trivialmente de uma planilha).
  (c) somar a contagem de lançamentos no "Total" — descartado por não ser acionável (ver Decisão).
- **Testes:** **+3** em `csv.test.ts` (`describe("incomeMixToCsv")`): só cabeçalho + linha "Total" zerada sem receita; uma
  linha por fonte em ordem decrescente com participação correta + "Total" com participação em branco; ignora despesas e
  agrupa receita sem categoria em "Sem categoria". A composição reusa `incomeMix` (já testado em `finance.test.ts`) e os
  helpers puros de CSV (idem), então não duplica cobertura. **911 testes** no total (eram 908).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **911 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/financas/fontes-de-renda` + `/financas/fontes-de-renda/export` 307
  (auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.

## D145 — Exportação CSV da composição de despesas (`/financas/composicao-despesas/export`) (Sessão 153)
- **Contexto:** a tela `/financas/composicao-despesas` ("Para onde vai o dinheiro", `expenseMix`/D45) é o **espelho exato**
  de `/financas/fontes-de-renda` no eixo de gastos — mostra a composição das despesas por rubrica e o quanto um único gasto
  domina o orçamento. Quando as fontes de renda ganharam exportação CSV na Sessão 152 (D144), a composição de despesas ficou
  como a última das duas telas-irmãs de mix das Finanças ainda sem CSV — uma assimetria gratuita. Levar o detalhamento de
  despesas a uma planilha/contador é tão útil quanto o de receitas (apuração, declaração, revisão de orçamento).
- **Decisão:** adicionar um botão "⬇ CSV" ao cabeçalho da página (só com `mix.categoryCount > 0`) + a rota
  `/financas/composicao-despesas/export`, espelhando a mesma consulta/`expenseMix` da página. Novo serializador puro
  `expenseMixToCsv(mix)` + `EXPENSE_MIX_CSV_HEADERS` em `src/lib/csv.ts`, espelho direto de `incomeMixToCsv` (D144) no eixo
  de despesas: recebe o objeto `ExpenseMix` (importado de `@/lib/finance`) e emite uma linha por rubrica na **mesma ordem da
  página** (valor decrescente, empate por nome pt-BR) — colunas Categoria / Lançamentos / Total (R$) / Participação —
  seguida de uma linha "Total". Mesma convenção pt-BR dos irmãos (delimitador `;`, decimal com vírgula via `centsToCsvAmount`,
  participação inteira via `csvShare`, BOM UTF-8 na camada HTTP). A participação do "Total" fica em branco (sempre 100% por
  construção); o "Total" não traz contagem de lançamentos (espelha D144 — a soma de lançamentos entre rubricas não é
  acionável).
- **Justificativa:** fecha a assimetria com D144 reusando o padrão já consolidado (serializador puro testado + route handler
  fino que só consulta e embrulha no HTTP), zero dependência nova, zero mudança na camada de cálculo. Despesas sem categoria
  já caem em "Sem categoria" no próprio `expenseMix`, então o CSV herda esse rótulo sem caso especial. A 1ª coluna é
  "Categoria" (não "Fonte" como em D144), refletindo o vocabulário da tela de despesas.
- **Por que sem `?ano=`:** a página `/financas/composicao-despesas` ainda não tem recorte por período (opera sobre todas as
  despesas lançadas); o export espelha exatamente a consulta da página, como em D144. Um recorte por ano seria uma unidade de
  trabalho à parte (página + export juntos, idealmente nas duas telas-irmãs ao mesmo tempo), registrada nos próximos passos.
- **Alternativas consideradas:** (a) generalizar um único `categoryMixToCsv` para receita e despesa em vez de dois
  serializadores quase idênticos — descartado: os cabeçalhos diferem (Fonte vs. Categoria) e os campos de origem diferem
  (`mix.sources` vs. `mix.categories`); a duplicação é mínima (~12 linhas) e a clareza de ter um serializador por tela,
  nomeado pelo domínio, vale mais que a fatoração — segue a convenção dos demais serializadores de csv.ts. (b) incluir o
  HHI / nº efetivo de rubricas / veredito no CSV — descartado pelo mesmo motivo de D144: são leituras de tela, recalculáveis
  trivialmente de uma planilha. (c) somar a contagem de lançamentos no "Total" — descartado por não ser acionável (espelha
  D144).
- **Testes:** **+3** em `csv.test.ts` (`describe("expenseMixToCsv")`): só cabeçalho + linha "Total" zerada sem despesa; uma
  linha por rubrica em ordem decrescente com participação correta + "Total" com participação em branco; ignora receitas e
  agrupa despesa sem categoria em "Sem categoria". A composição reusa `expenseMix` (já testado em `finance.test.ts`) e os
  helpers puros de CSV (idem), então não duplica cobertura. **914 testes** no total (eram 911).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **914 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/financas/composicao-despesas` + `/financas/composicao-despesas/export` 307
  (auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.

## D146 — Recorte por ano (`?ano=`) no desempenho por dia da semana (`/shows/dias-semana`) (Sessão 154)
- **Contexto:** a tela `/shows/dias-semana` (desempenho por dia da semana, `weekdayPerformance`) e seu export (D140) somavam
  **todos os anos** num retrato único de "quais dias pagam melhor". A irmã `/shows/faixas-de-cache` acabara de ganhar o
  seletor de período (D143), e as telas de rentabilidade (`/shows/rentabilidade`, `/shows/locais`, `/shows/cidades`,
  `/contatos/rentabilidade`, `.../por-papel`) já oferecem `?ano=` há várias sessões. O dia da semana era a última tela
  tabular de análise de shows sem esse recorte.
- **Decisão:** adicionar o recorte por ano à página e ao export, exatamente como na D143: reusar o `PeriodPicker` (D119) e os
  helpers `parseProfitYear`/`filterShowsByYear` (D108), mais um novo derivador de anos `weekdayPerformanceYears(shows, { now? })`
  em `src/lib/finance.ts`. Filtra-se por ano **antes** de mapear para `ReceivableShowLike` e chamar `weekdayPerformance`, que
  segue puro e agnóstico ao recorte. O botão "⬇ CSV" e a rota `/shows/dias-semana/export` propagam o `?ano=` ativo; o arquivo
  passou de `shows-por-dia-da-semana.csv` (fixo) para `shows-por-dia-da-semana-{ano|todos}.csv` (mesma convenção de sufixo da
  D143/D125). Estado-vazio da página agora é ciente do período (mensagem distinta "Nenhum show realizado com cachê em {ano}"
  vs. o convite a cadastrar quando não há nenhum show).
- **Justificativa:** **qual dia paga melhor varia com o ano** — mudei de público/segmento, comecei a tocar em casas que pagam
  bem na sexta, etc.; ver só o agregado escondia essa evolução. Fecha a assimetria com as telas de rentabilidade e com a
  faixa de cachê (D143). O acervo inteiro continua na pílula "Todos" (default), então nada se perde.
- **Por que um helper novo (`weekdayPerformanceYears`) e não reusar `feeDistributionYears`:** o gate das duas telas é hoje
  **idêntico** (realizado via `isHappenedGig` **e** cachê > 0), então `feeDistributionYears` devolveria exatamente o mesmo
  conjunto. Mesmo assim manteve-se uma função própria, nomeada pela tela, para (a) não acoplar o seletor de dias-semana ao
  detalhe interno da distribuição de cachês (se um gate evoluir, o outro não quebra silenciosamente) e (b) seguir a convenção
  já estabelecida na D143 de "um `*Years` por tela cujo gate espelha o cálculo daquela tela". A duplicação é de ~10 linhas
  triviais; um teste de invariante (abaixo) protege a equivalência de gate enquanto ela existir.
- **Alternativas consideradas:** (a) reusar `feeDistributionYears` diretamente nas duas rotas — descartado pelos motivos
  acima (acoplamento + nome enganoso na tela de dias-semana). (b) `showProfitYears` sobre todas as datas — descartado por
  oferecer anos vazios (mesmo argumento da D143: o gate de `weekdayPerformance` é mais estrito). (c) recorte por intervalo de
  datas livre — descartado por consistência com o `PeriodPicker` por ano das demais telas.
- **Testes:** **+5** em `finance.test.ts` (`describe("weekdayPerformanceYears")`): anos UTC decrescentes e deduplicados só de
  realizados com cachê > 0; ignora propostos/cancelados/futuros/sem-cachê; ano **UTC** na virada do dia (`2025-12-31T23:00Z`
  → 2025); lista vazia sem elegíveis; e um teste de **invariante de gate compartilhado** — para todo ano oferecido, o recorte
  daquele ano rende `weekdayPerformance(...).totalShows > 0` (o seletor nunca oferece um ano de tabela vazia). O recorte em si
  reusa `parseProfitYear`/`filterShowsByYear` (já testados) e `weekdayPerformance` (idem). **919 testes** no total (eram 914).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **919 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/shows/dias-semana?ano=2025` + `/shows/dias-semana/export?ano=2025` 307
  (auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.

## D147 — Exportação CSV da variação por categoria (`/financas/variacao/export`) (Sessão 155)
- **Contexto:** a tela `/financas/variacao` (variação por categoria, mês de referência vs. mês anterior, `compareCategoryReports`)
  era a última tela tabular das Finanças sem exportação CSV. As telas-irmãs de análise financeira já exportavam há sessões
  (resumo anual/D47, trimestral, transações/D14, fontes de renda/D144, composição de despesas/D145). A tela mostra duas
  tabelas (despesas e receitas por categoria, cada linha com o valor dos dois meses e a variação) — formato naturalmente
  tabular, pedindo exportação para acompanhamento offline.
- **Decisão:** novo serializador puro `categoryVariationToCsv(cmp)` + `CATEGORY_VARIATION_CSV_HEADERS` em `src/lib/csv.ts`,
  recebendo a `CategoryReportComparison` já computada (`compareCategoryReports`, importada de `@/lib/finance`). Emite as **duas
  seções da tela num único arquivo**, cada linha marcada pela coluna `Tipo` (Despesa/Receita): primeiro as despesas, depois as
  receitas, preservando a ordem da comparação (maior movimento absoluto primeiro). Cada seção termina numa linha "Total" com os
  somatórios do mês e a variação do total — de modo que o arquivo sempre traz pelo menos as duas linhas de Total, mesmo sem
  categorias. Colunas: Tipo / Categoria / Mês anterior (R$) / Este mês (R$) / Variação (R$) / Variação (%). A variação relativa
  usa um helper local novo `csvDeltaPct(delta)`: "+25%"/"-30%"/"0%" (com sinal, legível por máquina) — ou "novo" quando o mês
  anterior é 0 (espelhando o "novo" da página), e "0%" quando a variação absoluta é 0 (inclui o total zerado de um mês vazio).
  Rota `/financas/variacao/export?mes=YYYY-MM` reusa a mesma leitura de mês (`parseMonthKey`/`shiftMonth`/`monthKey`), a mesma
  consulta e o mesmo `compareCategoryReports` da página, com BOM UTF-8 na camada HTTP; nome `variacao-por-categoria-{mes}.csv`.
  Botão "⬇ CSV" no cabeçalho só com `hasData` (alguma transação em qualquer um dos dois meses), propagando o `?mes=` ativo.
- **Justificativa:** fecha a última lacuna de exportação tabular das Finanças. O eixo de **variação** (não só o retrato de um
  mês, mas o que mudou em relação ao anterior) é exatamente o que se quer levar para uma planilha de acompanhamento — qual
  categoria de gasto subiu, qual receita caiu — para anotar causas e metas. Um único arquivo com a coluna `Tipo` (em vez de
  dois downloads separados) mantém despesas e receitas juntas no mesmo recorte, como a tela.
- **Por que `csvDeltaPct` com sinal (e não `csvShare`):** `csvShare` formata uma participação sempre positiva (0–100%); aqui a
  variação pode ser negativa e o **sinal é a informação** (gasto subiu vs. caiu). O helper distingue três casos que a página
  também distingue: variação 0 → "0%" (a página mostra "→ sem variação"); base 0 com valor novo → "novo" (a página mostra
  "novo"); demais → percentual com sinal explícito (`+`/`-`). A coluna "Variação (R$)" já traz o valor absoluto com sinal via
  `centsToCsvAmount`, então as duas colunas são redundantes-por-construção mas complementares na leitura (uma em reais, outra
  em %), como na própria tela.
- **Alternativas consideradas:** (a) dois arquivos separados (despesas / receitas) — descartado: a tela trata os dois eixos
  como um só recorte; um arquivo com coluna `Tipo` é mais fiel e evita dois cliques. (b) emitir a variação % sem sinal (como
  `csvShare`) e deixar a direção implícita no sinal do valor em reais — descartado: a coluna de % isolada ficaria ambígua
  (subiu ou caiu 30%?) numa planilha ordenada por ela. (c) recorte por ano (`?ano=`) — não se aplica: a tela é comparação
  mês a mês, não soma anual; o seletor de mês (`?mes=`) já é o recorte natural, e o export o propaga.
- **Testes:** **+3** em `csv.test.ts` (`describe("categoryVariationToCsv")`): só o cabeçalho + as duas linhas Total zeradas
  sem transação ("0%", não "novo"); despesas e receitas marcadas por Tipo com variação e Totais, incluindo categoria nova
  ("novo") e ordenação por maior movimento; quedas com porcentagem negativa e categoria que sumiu do mês como queda de −100%.
  O serializador é puro; o recorte de mês reusa `compareCategoryReports`/`parseMonthKey`/`shiftMonth` (já testados). **922
  testes** no total (eram 919).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **922 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/financas/variacao?mes=2026-06` + `/financas/variacao/export?mes=2026-06` 307
  (auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.

## D148 — Recorte por ano (`?ano=`) nas Fontes de renda (`/financas/fontes-de-renda`) (Sessão 156)
- **Contexto:** a tela `/financas/fontes-de-renda` (mix de receitas por categoria, `incomeMix`/D45) e seu export (D144)
  somavam **todas as receitas lançadas** num retrato único de diversificação de renda. As telas de rentabilidade
  (`/shows/rentabilidade`, `/shows/locais`, `/shows/cidades`, `/contatos/rentabilidade`, `.../por-papel`) e, desde a D143/D146,
  também faixas de cachê e dias da semana já oferecem o seletor de período por ano (`PeriodPicker`/D119 + helpers da D108).
  Fontes de renda era uma das telas de análise financeira ainda sem esse recorte.
- **Decisão:** adicionar o recorte por ano à página e ao export, reusando o componente compartilhado `PeriodPicker` (D119) e os
  helpers da D108 — `parseProfitYear` (resolve o `?ano=`) e o genérico `filterShowsByYear<S extends { date: Date }>` (apesar do
  nome "shows", opera sobre qualquer objeto com `date: Date`, e a transação crua do Prisma tem `date: Date`). Novo derivador
  puro `incomeMixYears(txs): number[]` em `src/lib/finance.ts` devolve os anos UTC (decrescente) **só** das transações de
  receita (`type === "INCOME"`), o **mesmo** gate de `incomeMix`, para o seletor nunca oferecer um ano sem fonte de renda.
  Filtra-se por ano **antes** de mapear para `TxLike` e chamar `incomeMix`, que segue puro e agnóstico ao recorte. O botão
  "⬇ CSV" e a rota `/financas/fontes-de-renda/export` propagam o `?ano=`; o arquivo passou de `fontes-de-renda.csv` (fixo)
  para `fontes-de-renda-{ano|todos}.csv` (mesma convenção de sufixo das D125/D143). Estado-vazio e nota de rodapé agora
  cientes do período.
- **Justificativa:** a **evolução da composição de renda** é uma leitura por ano — de onde veio o dinheiro *neste ano* vs. o
  histórico, se a dependência de uma única fonte aumentou ou diminuiu ao longo do tempo. Manter só o agregado escondia essa
  trajetória, e a assimetria com as demais telas de análise (todas com `?ano=`) não tinha razão de ser. O acervo inteiro
  continua disponível na pílula "Todos" (default), então nada se perde.
- **Por que um helper novo (`incomeMixYears`) e não `showProfitYears`:** `showProfitYears(dates)` parte de uma lista de datas
  já filtrada e poderia oferecer um ano sem receita (ex.: um ano com só despesas). Quis-se um seletor **honesto** que não
  ofereça anos que renderiam mix vazio; `incomeMixYears` aplica exatamente o gate de `incomeMix` (`type === "INCOME"`), então
  toda pílula de ano tem ao menos uma fonte. É o espelho direto de `feeDistributionYears`/`weekdayPerformanceYears` (D143/D146)
  no eixo de transação.
- **Por que reusar `filterShowsByYear` (e não criar `filterTxByYear`):** o helper já é genérico (`<S extends { date: Date }>`)
  e a única regra é "ano UTC da `date`", idêntica para shows e transações. Criar um alias seria duplicação trivial; reusar o
  genérico mantém uma única implementação testada. O nome ("shows") é histórico (D108) — documentado aqui para o próximo leitor.
- **Alternativas consideradas:** (a) derivar os anos com `showProfitYears` sobre todas as datas — descartado por oferecer anos
  sem receita (ver acima). (b) recorte por intervalo de datas livre — descartado: as outras telas usam ano e o `PeriodPicker`
  compartilhado fala em ano; consistência > flexibilidade. (c) generalizar agora `incomeMixYears` para também a composição de
  despesas — adiado: `expenseMix` precisaria do gate `type === "EXPENSE"`, então seria um `expenseMixYears` paralelo (como
  income/expense já são funções irmãs, não uma só); fica como próximo passo natural quando a composição de despesas ganhar o
  recorte, evitando abstração prematura sobre um único caso.
- **Testes:** **+5** em `finance.test.ts` (`describe("incomeMixYears")`): anos UTC decrescentes e deduplicados; ignora
  despesas (só anos com receita); ano **UTC** na virada do dia; aceita `date` como `Date` e como string ISO; lista vazia sem
  receita. O recorte em si reusa `parseProfitYear`/`filterShowsByYear` (já testados) e `incomeMix` (idem), então a composição
  não duplica cobertura. **927 testes** no total (eram 922).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **927 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/financas/fontes-de-renda?ano=2026` + `/financas/fontes-de-renda/export?ano=2026`
  307 (auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14
  / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.

## D149 — Recorte por ano (`?ano=`) na Composição de despesas (`/financas/composicao-despesas`) (Sessão 157)
- **Contexto:** a tela `/financas/composicao-despesas` (mix de gastos por rubrica, `expenseMix`/D45) e seu export (D145)
  somavam **todas as despesas lançadas** num retrato único de concentração de gasto. Sua tela-irmã `/financas/fontes-de-renda`
  acabara de ganhar o seletor de período por ano na D148, que registrou explicitamente este recorte como "próximo passo
  natural" (alternativa c). Composição de despesas era a última das telas-irmãs de mix das Finanças sem o `?ano=`.
- **Decisão:** adicionar o recorte por ano à página e ao export, espelho direto da D148 no eixo de despesa: reusa o
  `PeriodPicker` (D119) e os helpers da D108 — `parseProfitYear` (resolve o `?ano=`) e o genérico
  `filterShowsByYear<S extends { date: Date }>` (opera sobre a transação crua do Prisma, que tem `date: Date`). Novo
  derivador puro `expenseMixYears(txs): number[]` em `src/lib/finance.ts` devolve os anos UTC (decrescente) **só** das
  transações de despesa (`type === "EXPENSE"`), o **mesmo** gate de `expenseMix`, para o seletor nunca oferecer um ano sem
  despesa. Filtra-se por ano **antes** de mapear para `TxLike` e chamar `expenseMix`, que segue puro e agnóstico ao recorte.
  O botão "⬇ CSV" e a rota `/financas/composicao-despesas/export` propagam o `?ano=`; o arquivo passou de
  `composicao-despesas.csv` (fixo) para `composicao-despesas-{ano|todos}.csv` (mesma convenção de sufixo das D125/D143/D148).
  Estado-vazio e nota de rodapé agora cientes do período.
- **Justificativa:** a **evolução da composição de gasto** é uma leitura por ano — para onde foi o dinheiro *neste ano* vs. o
  histórico, se a dependência de uma rubrica cara (transporte, equipamento) cresceu ou diminuiu. Manter só o agregado escondia
  essa trajetória, e a assimetria com a tela-irmã (e demais telas de análise, todas com `?ano=`) não tinha razão de ser.
  Fecha o par income/expense de mix das Finanças no eixo de período.
- **Por que um helper novo (`expenseMixYears`) e não generalizar `incomeMixYears`:** income e expense já são funções **irmãs
  paralelas** (mesma matemática, gate oposto: `INCOME` vs. `EXPENSE`), não uma só parametrizada. Um `expenseMixYears` espelho
  mantém a simetria e o seletor **honesto** (toda pílula de ano tem ao menos uma despesa que entra em `expenseMix`); unificar
  num único `mixYears(txs, type)` acoplaria duas telas independentes por ganho nulo. É exatamente o desfecho previsto na
  alternativa (c) da D148.
- **Alternativas consideradas:** (a) derivar os anos com `showProfitYears`/`incomeMixYears` sobre todas as datas — descartado
  por oferecer anos sem despesa (mesma razão da D148). (b) recorte por intervalo de datas livre — descartado por consistência
  com o `PeriodPicker` por ano das demais telas. (c) parametrizar `incomeMixYears`/`expenseMixYears` numa só função — ver
  acima (acoplamento sem ganho).
- **Testes:** **+6** em `finance.test.ts` (`describe("expenseMixYears")`): anos UTC decrescentes e deduplicados; ignora
  receitas (só anos com despesa); ano **UTC** na virada do dia; aceita `date` como `Date` e como string ISO; lista vazia sem
  despesa; invariante de gate compartilhado com `expenseMix` (todo ano oferecido rende mix não vazio). O recorte em si reusa
  `parseProfitYear`/`filterShowsByYear`/`expenseMix` (já testados), então a página/route não duplicam cobertura. **933 testes**
  no total (eram 927).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **933 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/financas/composicao-despesas?ano=2026` +
  `/financas/composicao-despesas/export?ano=2026` 307 (auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories —
  4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.

## D150 — Exportação CSV da cadência de shows (`/shows/cadencia/export`) (Sessão 158)
- **Contexto:** a tela `/shows/cadencia` (volume de shows realizados mês a mês ao longo do tempo, `gigCadence`/D-cadência)
  exibia uma tabela "Shows mês a mês" + cards de destaque (média por mês ativo, mês mais cheio, meses parados, tendência),
  mas era a última das telas de análise de shows **sem** botão de exportação — as irmãs sazonalidade (D139), dia da semana
  (D140) e faixa de cachê (D142) já exportavam.
- **Decisão:** novo serializador puro `gigCadenceToCsv(cadence)` + `GIG_CADENCE_CSV_HEADERS` em `src/lib/csv.ts`, espelhando
  a tabela: uma linha por **mês ativo** (com ao menos um show realizado), em ordem cronológica crescente, com a contagem de
  shows, seguida de uma linha "Total". Colunas Mês/Shows. Rota `/shows/cadencia/export` reusa a mesma consulta/`gigCadence`
  da página (sem `?ano=`: a cadência é uma série temporal completa, não um recorte por ano) + BOM UTF-8; nome fixo
  `cadencia-shows.csv`; botão "⬇ CSV" no cabeçalho só com `cadence.totalShows > 0`.
- **Justificativa:** a cadência é um histórico de atividade que o músico pode querer levar para planilha (cruzar com receita,
  marcar meses parados, montar gráfico próprio). Fecha a última lacuna de exportação tabular das telas de análise de shows.
- **Por que a chave ISO "YYYY-MM" na coluna Mês (e não o rótulo "Jan 2026" da UI):** o CSV é leitura por máquina/planilha; a
  chave ISO ordena lexicograficamente igual à cronológica e é inambígua entre anos. A UI mantém o rótulo amigável; o CSV
  registra a divergência no docstring.
- **Por que só meses ativos (e não preencher os parados como em sazonalidade/dia-da-semana):** ao contrário daqueles baldes
  fixos (12 meses / 7 dias, que existem por definição), a janela da cadência é aberta e pode abranger anos — preencher todos
  os meses parados inflaria o arquivo sem ganho; o eixo é atividade e `idleMonths` já resume o vazio. Espelha exatamente o que
  a tabela da página mostra ("meses sem nenhum show não aparecem").
- **Alternativas consideradas:** (a) anexar as estatísticas agregadas (média por mês ativo, meses parados, tendência) ao CSV —
  descartado por baixo valor de planilha e por já estarem na tela; o CSV é a série crua, da qual a planilha deriva o que
  quiser. (b) recorte por ano `?ano=` — não se aplica: a cadência é a série temporal inteira por design.
- **Testes:** **+3** em `csv.test.ts` (`describe("gigCadenceToCsv")`): só cabeçalho + Total zerado sem shows; uma linha por
  mês ativo (chave ISO, ordem cronológica, mês parado não vira linha) + Total; ignora propostos/cancelados/futuros (só
  realizados, via gate de `gigCadence`). **936 testes** no total (eram 933).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **936 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/shows/cadencia` + `/shows/cadencia/export` 307 (auth-gated). `npm audit`
  **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver
  D6/bloqueios); **nenhuma dependência nova**.

## D151 — Exportação CSV da evolução do cachê (`/shows/evolucao-cache/export`) (Sessão 159)
- **Contexto:** a tela `/shows/evolucao-cache` ("Evolução do cachê", `feeTrend`) exibe a tabela "Cachê médio mês a mês"
  (Mês / Cachê médio / Faixa mín–máx / Shows) + cards de destaque (cachê médio geral, maior/menor cachê, shows
  considerados, tendência), mas era uma das poucas telas de análise de shows ainda **sem** botão de exportação — as irmãs
  cadência (D150), sazonalidade (D139), dia da semana (D140) e faixa de cachê (D142) já exportavam.
- **Decisão:** novo serializador puro `feeTrendToCsv(trend)` + `FEE_TREND_CSV_HEADERS` em `src/lib/csv.ts`, espelhando a
  tabela: uma linha por **mês ativo** (com show realizado e cachê registrado), em ordem cronológica crescente, com cachê
  médio, mínimo e máximo do mês e a contagem de shows, seguida de uma linha "Total" cujos valores são os agregados gerais da
  tela (cachê médio geral, menor cachê, maior cachê, total de shows). Colunas Mês/Cachê médio (R$)/Cachê mínimo (R$)/Cachê
  máximo (R$)/Shows. Rota `/shows/evolucao-cache/export` reusa a mesma consulta/`feeTrend` da página + BOM UTF-8; nome fixo
  `evolucao-cache.csv`; botão "⬇ CSV" no cabeçalho só com `trend.totalShows > 0`.
- **Justificativa:** a série de cachê médio é um histórico de posicionamento de preço que o músico pode querer levar para
  planilha (montar gráfico próprio, cruzar com inflação, marcar quando reajustou). Fecha mais uma lacuna de exportação
  tabular das telas de análise de shows.
- **Por que a chave ISO "YYYY-MM" na coluna Mês (e não o rótulo "Jan 2026" da UI):** mesma postura de D150 — o CSV é leitura
  por máquina/planilha; a chave ISO ordena lexicograficamente igual à cronológica e é inambígua entre anos. A UI mantém o
  rótulo amigável; o CSV registra a divergência no docstring.
- **Por que a "Faixa" da tela vira duas colunas (mínimo/máximo):** a UI compacta a faixa num só campo ("R$ 800 – R$ 1.200")
  por densidade; no CSV, colunas separadas abrem limpas na planilha (filtráveis/ordenáveis numericamente) sem o usuário ter
  de quebrar a string. Mesma decomposição usada por outros serializadores que partem de um intervalo.
- **Por que o Total carrega os agregados gerais (e não a soma das colunas mês a mês):** a média geral é ponderada por show
  (`avgFee = totalFee/totalShows`), e o menor/maior são os extremos individuais entre todos os shows — não a média das médias
  nem o min/máx das médias mensais. Reusar os campos já computados por `feeTrend` (`avgFee`/`lowestFee`/`highestFee`/
  `totalShows`) garante que a linha "Total" do CSV bata exatamente com os cards de destaque da tela.
- **Por que só meses ativos (e não preencher os parados):** mesma postura de D150 — a janela é aberta e pode abranger anos;
  meses sem show realizado com cachê não entram (a tela também não os mostra). Distinto de sazonalidade/dia-da-semana
  (baldes fixos).
- **Alternativas consideradas:** (a) anexar a tendência (variação 1º↔último mês) ao CSV — descartado por baixo valor de
  planilha e por já estar na tela; o CSV é a série crua, da qual a planilha deriva o que quiser. (b) recorte por ano `?ano=` —
  adiado: a evolução do cachê ganha sentido como série temporal contínua (o ponto é ver o preço subir ao longo dos anos),
  não como recorte de um único ano; se surgir demanda, segue o padrão `PeriodPicker`/D119 das telas de rentabilidade.
- **Testes:** **+3** em `csv.test.ts` (`describe("feeTrendToCsv")`): só cabeçalho + Total zerado sem shows com cachê; uma
  linha por mês ativo (média/mín/máx, ordem cronológica, mês parado fora) + Total com agregados gerais; ignora
  propostos/cancelados/futuros/sem-cachê (só realizados com cachê, via gate de `feeTrend`). **939 testes** no total (eram 936).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **939 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/shows/evolucao-cache` + `/shows/evolucao-cache/export` 307 (auth-gated).
  `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss
  bundlado; ver D6/bloqueios); **nenhuma dependência nova**.

## D152 — Exportação CSV da sazonalidade financeira (`/financas/sazonalidade/export`) (Sessão 160)
- **Contexto:** a tela `/financas/sazonalidade` ("Média por mês do ano", `monthlySeasonality`) exibe a tabela
  Mês / Receita média / Despesa média / Resultado médio / Anos (a média por ano-ativo de cada mês do calendário) + cards
  "Melhor mês típico" / "Mês mais fraco", mas era uma das telas de análise das Finanças ainda **sem** botão de exportação.
  Existe há tempo o irmão no eixo dos shows (`gigSeasonalityToCsv`/D139, `/shows/sazonalidade/export`); faltava o reflexo no
  eixo financeiro (receita × despesa).
- **Decisão:** novo serializador puro `monthlySeasonalityToCsv(seasonality)` + `MONTHLY_SEASONALITY_CSV_HEADERS` em
  `src/lib/csv.ts`, espelhando a tabela: **sempre as 12 linhas** de mês (janeiro→dezembro, inclusive meses sem movimento —
  para preservar os vales da temporada que a tela destaca), com receita média, despesa média, resultado médio e o nº de
  anos-ativos do mês, seguida de uma linha "Total". Colunas Mês/Receita média (R$)/Despesa média (R$)/Resultado médio (R$)/
  Anos. Rota `/financas/sazonalidade/export` reusa a mesma consulta/`monthlySeasonality` da página + BOM UTF-8; nome fixo
  `sazonalidade-financeira.csv`; botão "⬇ CSV" no cabeçalho só com `hasActivity` (algum mês com ano-ativo).
- **Justificativa:** o padrão sazonal de caixa (em que época do ano costuma sobrar/faltar) é exatamente o tipo de série que
  o músico leva para planilha — montar gráfico próprio, cruzar com a agenda de shows, planejar reserva nos meses fracos.
  Fecha a assimetria com o eixo dos shows e mais uma lacuna de exportação tabular das Finanças.
- **Por que o nome completo do mês (e não a chave ISO "YYYY-MM"):** diferente das séries temporais (cadência/D150,
  evolução do cachê/D151, que usam ISO por serem janelas abertas que abrangem anos), a sazonalidade colapsa **todos os anos**
  num só ciclo de 12 meses do calendário — não há ano a desambiguar. Mantém-se o nome completo da UI ("Janeiro"…"Dezembro",
  via `MONTH_NAMES_LONG`), espelhando `annualSummaryToCsv`/`gigSeasonalityToCsv`.
- **Por que registrar 0,00/0 nos meses sem movimento (e não o "—" da UI):** mesma postura dos irmãos
  (gig/dia-da-semana/faixa) — o CSV é leitura por máquina; manter as 12 linhas com zeros explícitos deixa a planilha pronta
  para gráfico/filtro sem o usuário ter de tratar o traço.
- **Por que o "Total" é o ano típico composto (soma das médias mensais), e não a soma dos totais brutos:** a tela é sobre o
  **mês típico** (média por ano-ativo); somar essas médias dá "o ano típico" — receita/despesa/resultado de um ano em que
  cada mês rende o seu valor típico, um número de planejamento coerente com a leitura da página. A coluna "Anos" do Total
  traz `yearsObserved` (amplitude do histórico, anos distintos com qualquer transação), conceitualmente distinta dos
  anos-ativos por mês — documentado no docstring. Diferente dos irmãos dos shows, cujo Total reusa agregados já computados
  na estrutura; aqui `MonthlySeasonality` não traz um total pronto, então o serializador o compõe a partir das médias.
- **Alternativas consideradas:** (a) anexar as colunas de total bruto (`totalIncome`/`totalExpense`/`net`, soma de todos os
  anos) ao lado das médias — descartado por poluir a tabela com um eixo que a tela não mostra; a média por ano-ativo é a
  leitura canônica da sazonalidade (o total bruto favorece meses de histórico mais longo). (b) recorte por ano `?ano=` —
  não se aplica: a sazonalidade ganha sentido **somando** os anos (D133(b), mesma postura do gig).
- **Testes:** **+3** em `csv.test.ts` (`describe("monthlySeasonalityToCsv")`): só cabeçalho + 12 meses zerados + Total
  zerado sem transações; média por ano-ativo (receita/despesa/resultado) por mês + Total composto com `yearsObserved`;
  registra 0,00/0 nos meses sem movimento. **942 testes** no total (eram 939).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **942 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/financas/sazonalidade` + `/financas/sazonalidade/export` 307 (auth-gated).
  `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss
  bundlado; ver D6/bloqueios); **nenhuma dependência nova**.

## D153 — Exportação CSV da fidelização de contratantes (`/contatos/retencao/export`) (Sessão 161)
- **Contexto:** a tela `/contatos/retencao` ("Fidelização de contratantes", `clientRetention`) mede a recompra (quem volta a
  te contratar) e mostra cards (taxa de recompra, receita de recorrentes, contratantes únicos, shows por contratante) + uma
  tabela de **contratantes recorrentes**. Era uma das telas de análise dos Contatos ainda **sem** botão de exportação — do
  lado Contatos só ranking (D127) e rentabilidade (D105/D137) exportavam.
- **Decisão:** novo serializador puro `clientRetentionToCsv(retention)` + `CLIENT_RETENTION_CSV_HEADERS` em `src/lib/csv.ts`,
  recebendo a `ClientRetention` já computada (`clientRetention`, importada de `@/lib/contacts`). Colunas
  Contratante/Papel/Shows/Cachê total (R$)/Último show/Recorrente, encerradas numa linha "Total" (soma de shows e cachê da
  carteira; na coluna "Recorrente", "recorrentes/total", ex.: "1/2"). Rota `/contatos/retencao/export` reusa a mesma
  consulta/`clientRetention` da página + BOM UTF-8; nome fixo `fidelizacao-contratantes.csv`; botão "⬇ CSV" no cabeçalho só
  com `retention.totalClients > 0`.
- **Por que exportar TODAS as linhas (`retention.rows`) e não só os recorrentes da tela:** a tabela da página lista apenas os
  recorrentes, mas o valor de levar a carteira para planilha é justamente ver os dois lados — os fiéis **e** os de um show só
  (candidatos a follow-up, que a tela só conta no card "Contratantes únicos"). A coluna "Recorrente" (Sim/Não) preserva a
  distinção da tela e deixa o usuário filtrar/ordenar no Excel. Espelha a postura do `categoryVariationToCsv` (D147), que
  também leva ao CSV mais do que a tela isola visualmente.
- **Semântica herdada de `clientRetention` (D47):** cachê é por contato (um show com vários contatos conta para cada);
  CANCELLED ficam de fora; shows futuros não cancelados contam (uma re-contratação já agendada também é fidelização);
  contratantes só com shows cancelados não entram em `rows`. O serializador é fino e não reinterpreta nada disso.
- **Por que sem `?ano=`:** a fidelização é uma leitura **acumulada** da carteira (recompra ao longo da relação); recortar por
  ano quebraria o próprio conceito de "voltou a contratar". Mesma postura de ranking de atividade (D127).
- **Nota de arquitetura:** primeiro import de tipo de `@/lib/contacts` dentro de `csv.ts` (antes só de `@/lib/finance`,
  `@/lib/domain`, `@/lib/calendar`). Sem ciclo de import: `contacts.ts` não importa `csv.ts` (verificado). Apenas `import type`.
- **Alternativas consideradas:** (a) exportar só os recorrentes, espelhando 1:1 a tabela — descartado: perde os one-time, que
  são exatamente quem o músico quer reativar. (b) acrescentar os agregados dos cards (repeatRate/recurringFeeShare) como
  metalinhas no topo do CSV — descartado por poluir a leitura tabular; os cards são derivados triviais das colunas exportadas.
- **Testes:** **+3** em `csv.test.ts` (`describe("clientRetentionToCsv")`): só cabeçalho + Total zerado sem contratantes; uma
  linha por contratante (ordem shows desc) com Recorrente Sim/Não + Total "1/2"; exclui contratantes só-cancelados e conta
  futuro confirmado na recorrência. **945 testes** no total (eram 942).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **945 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/contatos/retencao` + `/contatos/retencao/export` 307 (auth-gated). `npm audit`
  **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver
  D6/bloqueios); **nenhuma dependência nova**.

## D154 — Exportação CSV do crescimento ano a ano (`/financas/crescimento/export`) (Sessão 162)
- **Contexto:** a tela `/financas/crescimento` ("Crescimento ano a ano", `yearlyHistory`) responde "minha carreira está
  faturando mais com o tempo?" — cards (resultado acumulado, média por ano, melhor/pior ano), card de tendência de longo prazo
  e a tabela "Ano a ano" (receitas/despesas/resultado por ano + a variação do resultado frente ao ano anterior). Era uma das
  telas de análise das Finanças ainda **sem** botão de exportação, irmã das já-exportáveis anual (D40)/trimestral
  (D40b)/sazonalidade (D152)/variação (D147)/fontes (D144)/composição (D146).
- **Decisão:** novo serializador puro `yearlyHistoryToCsv(history)` + `YEARLY_HISTORY_CSV_HEADERS` em `src/lib/csv.ts`,
  recebendo a `YearlyHistory` já computada (`yearlyHistory`, de `@/lib/finance`). Colunas
  Ano/Receitas (R$)/Despesas (R$)/Resultado (R$)/Variação do resultado (%): uma linha por **ano com movimento** (receita ou
  despesa > 0), em ordem cronológica crescente, encerrada numa linha "Total" com os somatórios da série (espelha o `<tfoot>` da
  tabela). Rota `/financas/crescimento/export` reusa a mesma consulta/`yearlyHistory` da página + BOM UTF-8; nome fixo
  `crescimento-ano-a-ano.csv`; botão "⬇ CSV" no cabeçalho só com `history.years.length > 0`.
- **Variação do resultado (`netDelta`) na coluna 5:** reusa `csvDeltaPct` (D147) — "+25%"/"-30%"/"0%"/"novo". O primeiro ano da
  série não tem base de comparação (`netDelta === null`) → célula vazia. A linha "Total" também fica com a coluna de variação
  vazia: a tendência de longo prazo (`trend`, último vs. primeiro ano) é uma comparação **distinta** da variação ano a ano, e
  misturá-la na mesma coluna confundiria a leitura; quem quiser a trajetória tem os cards/tendência na própria tela.
- **Divergência deliberada da página (emite "novo"):** a tabela oculta a variação quando o ano anterior teve resultado 0
  (`y.netDelta.previous !== 0`) para não exibir "novo"/sem-base na UI; o CSV emite "novo" nesses casos, mantendo a convenção
  legível por máquina de `categoryVariationToCsv` (D147), que também leva ao CSV mais do que a tela isola visualmente.
- **Por que sem `?ano=`:** é a série inteira por definição (a trajetória entre anos); recortar por um ano só anularia o sentido.
  Mesma postura de cadência (D150) e evolução do cachê (D151).
- **Semântica herdada de `yearlyHistory`:** só anos com movimento entram em `years` (anos vazios não viram linha nem base de
  comparação); resultado em regime de competência (income − expense); deltas comparam com o ano ativo **imediatamente
  anterior** na série. O serializador é fino e não reinterpreta nada disso.
- **Alternativas consideradas:** (a) acrescentar uma coluna "Variação receitas (%)" e "Variação despesas (%)" (a estrutura tem
  `incomeDelta`/`expenseDelta`) — descartado por ora: a tela só destaca a variação do resultado; pode-se acrescentar se houver
  pedido. (b) levar a tendência de longo prazo como metalinha no topo do CSV — descartado por poluir a leitura tabular.
- **Testes:** **+3** em `csv.test.ts` (`describe("yearlyHistoryToCsv")`): só cabeçalho + Total zerado sem transações; uma linha
  por ano ativo em ordem crescente com a variação do resultado (+100%) + Total; emite "novo" quando o ano anterior teve
  resultado 0 e ignora anos sem movimento. **948 testes** no total (eram 945).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **948 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/financas/crescimento` + `/financas/crescimento/export` 307 (auth-gated).
  `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss
  bundlado; ver D6/bloqueios); **nenhuma dependência nova**.

## D155 — Exportação CSV do fluxo de caixa mês a mês (`/financas/folego-de-caixa/export`) (Sessão 163)
- **Contexto:** o card "Cenário alternativo · ritmo de gasto real" de `/financas/folego-de-caixa` (D101) traz a tira
  `MonthlyFlowStrip` (D104) com o fluxo de caixa realizado mês a mês na janela de burn rate — a textura por trás da média de
  queima (`avgMonthlyNet`). O item 10 dos próximos passos (PROGRESS) já apontava o fluxo de caixa mês a mês como o **candidato
  natural** a exportação tabular entre as telas de Finanças que ainda não exportavam (a maioria das demais são cards de
  cenário/projeção de número único, menos óbvias como planilha).
- **Decisão:** novo serializador puro `cashFlowToCsv(months)` + `CASH_FLOW_CSV_HEADERS` em `src/lib/csv.ts`, recebendo a saída
  de `cashFlowByMonth` (`CashFlowMonth[]`, de `@/lib/finance`). Colunas Mês/Recebido (R$)/Pago (R$)/Líquido (R$): uma linha por
  mês da janela, em ordem cronológica crescente, encerrada numa linha "Total" com os somatórios da janela (recebido/pago/líquido
  agregados; o `net ÷ janela` reproduz o `avgMonthlyNet` de `cashBurnRunway`). Rota `/financas/folego-de-caixa/export` reusa a
  mesma consulta/`cashFlowByMonth` da página + BOM UTF-8; botão "⬇ CSV" no card "Cenário alternativo", ao lado das pílulas de
  janela, só com movimento de caixa na janela (`months.some(...)`, mesmo gate da tira).
- **Janela parametrizável (`?meses=`):** diferente dos exports de série temporal sem recorte (cadência D150, evolução do cachê
  D151, crescimento D154), aqui a janela **é** o eixo (3/6/12/24 meses, `BURN_WINDOW_PRESETS`/D102). A rota lê `?meses=` e o
  sanea com `parseBurnWindow` (a mesma da página), e o botão propaga a janela ativa; o nome do arquivo carrega a janela
  (`fluxo-de-caixa-mensal-{n}m.csv`) para distinguir downloads de janelas diferentes.
- **Emite todos os meses da janela, inclusive zerados:** distinto de `gigCadenceToCsv`/`feeTrendToCsv` (só meses ativos), o CSV
  emite a janela inteira — `cashFlowByMonth` já pré-popula meses sem movimento como zerados. Numa série de caixa um mês de
  líquido 0 é informação (preserva a textura da tira, que mostra a janela completa); é a mesma postura de
  `monthlySeasonalityToCsv` (12 meses sempre, D152). A coluna "Mês" usa a chave ISO "YYYY-MM" (ordenável por máquina), não o
  rótulo curto "jan" da UI.
- **Semântica herdada de `cashFlowByMonth`:** só caixa realizado (`received === true`); a janela são os meses **completos**
  anteriores ao mês corrente (exclui o mês em curso); INCOME soma em "recebido", EXPENSE em "pago", líquido = recebido − pago. O
  serializador é fino e não reinterpreta nada disso; `now`/janela são injetáveis (puro, testável).
- **Alternativas consideradas:** (a) levar também o veredito de tendência (`cashFlowTrend`/D126) como metalinha — descartado por
  poluir a leitura tabular; quem quiser a direção tem o badge na tela. (b) exportar o número de fôlego/burn agregado (cenário de
  card único) — descartado: cabe melhor na tela; o valor de planilha está na série mês a mês, não no número-resumo.
- **Testes:** **+3** em `csv.test.ts` (`describe("cashFlowToCsv")`): só cabeçalho + todos os meses da janela zerados + Total
  zerado sem movimento; uma linha por mês da janela (recebido/pago/líquido, mês parado zerado) em ordem cronológica + Total;
  ignora não-recebidos e movimento fora da janela (mês corrente e anterior à janela). **951 testes** no total (eram 948).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **951 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/financas/folego-de-caixa` + `/financas/folego-de-caixa/export?meses=12` 307
  (auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 /
  postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.

## D156 — Exportação CSV da receita agendada (`/shows/receita-agendada/export`) (Sessão 164)
- **Contexto:** `/shows/receita-agendada` (D31) mostra a tabela "Receita agendada" — o pipeline de cachês de shows futuros
  agregados por mês, decomposto em confirmado (CONFIRMED/PLAYED) × a confirmar (PROPOSED/sem status), com cards de destaque
  (total/confirmado/a confirmar/nº de shows). Era uma das telas tabulares de Shows que ainda não exportava (ao lado das já
  exportáveis cadência/evolução-cachê/sazonalidade/faixas/dias-semana/locais/cidades/rentabilidade/a-receber). O pipeline de
  cachês futuros é justamente o número que o músico leva para o contador/planejamento — candidato direto a planilha.
- **Decisão:** novo serializador puro `bookedRevenueToCsv(forecast)` + `BOOKED_REVENUE_CSV_HEADERS` em `src/lib/csv.ts`,
  recebendo a `BookedRevenueForecast` já computada (`forecastBookedRevenue`, de `@/lib/finance`). Colunas
  Mês/Shows/Confirmado (R$)/A confirmar (R$)/Total do mês (R$): uma linha por mês com shows futuros (`forecast.months`, em ordem
  cronológica crescente), encerrada numa linha "Total" com os agregados da tela (`count`/`confirmedTotal`/`tentativeTotal`/
  `total` — os mesmos números dos cards de destaque). Rota `/shows/receita-agendada/export` reusa a mesma consulta (só shows
  `date >= hoje`) e o mesmo `forecastBookedRevenue` da página + BOM UTF-8; nome fixo `receita-agendada.csv`; botão "⬇ CSV" no
  cabeçalho só com `forecast.count > 0`.
- **Só meses com shows viram linha:** como em `gigCadenceToCsv`/`feeTrendToCsv` (séries de eixo aberto), e diferente de
  `cashFlowToCsv`/`monthlySeasonalityToCsv` (baldes fixos). A janela da receita agendada é aberta (do mês corrente em diante,
  pode abranger vários meses futuros); meses sem show simplesmente não aparecem (`forecast.months` já só traz meses povoados). A
  coluna "Mês" usa a chave ISO "YYYY-MM" (ordenável por máquina), não o rótulo "Jul 2026" da UI.
- **Semântica herdada de `forecastBookedRevenue`:** "futuro" = dia do show `>= hoje` (UTC); cancelados ignorados; confirmado =
  CONFIRMED/PLAYED, a confirmar = PROPOSED/sem status; total do mês = confirmado + a confirmar (invariante). O serializador é
  fino e não reinterpreta nada; `now` é injetável (puro, testável). Sem `?ano=`: por design a tela olha sempre da data corrente
  em diante (pipeline futuro), não há recorte por ano a propagar.
- **Alternativas consideradas:** (a) emitir também a barra confirmado/total (a `confirmedPct` da tela) como coluna de
  porcentagem — descartado: é informação visual, e as colunas Confirmado/A confirmar já decompõem o total numericamente. (b)
  uma linha por show (granularidade de gig, não de mês) — descartado: a tela é mês a mês e os shows individuais já têm sua
  própria lista/export em `/shows`; o valor aqui é o resumo do pipeline por mês.
- **Testes:** **+3** em `csv.test.ts` (`describe("bookedRevenueToCsv")`): só cabeçalho + Total zerado sem shows agendados; uma
  linha por mês com shows (confirmado/a confirmar/total) em ordem crescente + Total; ignora cancelados e shows passados, status
  ausente conta como a confirmar. **954 testes** no total (eram 951).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **954 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/shows/receita-agendada` + `/shows/receita-agendada/export` 307 (auth-gated).
  `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss
  bundlado; ver D6/bloqueios); **nenhuma dependência nova**.

## D157 — Exportação CSV da agenda de contas a pagar/receber (`/financas/agenda/export`) (Sessão 165)
- **Contexto:** `/financas/agenda` ("A pagar e receber", F3) lista as pendências (`received: false`) distribuídas em janelas de
  vencimento por `buildDueAgenda` — vencidas / hoje / próximos 7 dias / mais tarde — com cards "A receber"/"A pagar"/"Saldo
  pendente". Era uma das telas tabulares das Finanças que ainda não exportava (ao lado das já exportáveis transações/anual/
  trimestral/sazonalidade/variação/fontes/composição/crescimento/fluxo-de-caixa). A agenda de vencimentos é exatamente o que o
  músico leva para planejar o caixa do mês / negociar prazos — candidato direto a planilha.
- **Decisão:** novo serializador puro `dueAgendaToCsv(agenda)` + `DUE_AGENDA_CSV_HEADERS` em `src/lib/csv.ts`, recebendo a
  `DueAgenda` já computada (`buildDueAgenda`, de `@/lib/finance`). Achata as quatro janelas na ordem canônica
  (`DUE_BUCKET_ORDER`: vencidas → hoje → próximos 7 dias → mais tarde) e, dentro de cada uma, por vencimento crescente (a ordem
  que `buildDueAgenda` já produz). Colunas Vencimento/Descrição/Categoria/Janela/Tipo/Dias até vencer/Show/A receber (R$)/A
  pagar (R$), encerradas numa linha "Total" com `totalIncome`/`totalExpense` (batem com os cards "A receber"/"A pagar" da tela).
  Rota `/financas/agenda/export` reusa a mesma consulta (`received: false`, `include: show.title`) e o mesmo `buildDueAgenda` da
  página + BOM UTF-8; nome fixo `agenda-pagar-receber.csv`; botão "⬇ CSV" no cabeçalho só com `agenda.count > 0`.
- **Valor decomposto em duas colunas (A receber / A pagar):** cada linha preenche só uma conforme o tipo, de modo que cada
  coluna some direto na planilha e os totais batam com os cards da tela — mesma filosofia de `bookedRevenueToCsv`
  (confirmado/a confirmar). A coluna "Tipo" (A receber / A pagar) fica redundante com a coluna preenchida, mas mantém a linha
  legível isoladamente (filtro/leitura rápida).
- **"Dias até vencer" cru:** a coluna traz o `daysUntil` inteiro (negativo = vencida há N dias; 0 = hoje), legível por máquina e
  ordenável, e não o texto relativo da UI ("venceu há 2 dias"/"vence amanhã"). A coluna "Janela" carrega o rótulo amigável.
- **Rótulos de janela compartilhados (DRY):** extraído `DUE_BUCKET_LABELS: Record<DueBucketKey, string>` para `@/lib/finance`
  (ao lado de `DUE_BUCKET_ORDER`), consumido tanto pelo `dueAgendaToCsv` quanto pelo `BUCKET_META` da página — antes os rótulos
  ("Vencidas"/"Hoje"/...) viviam só no `page.tsx`. Evita divergência entre a tela e o CSV.
- **Semântica herdada de `buildDueAgenda`:** só pendências (`received === false`); janelas comparadas por dia UTC; `weekHorizon`
  padrão 7. O serializador é fino e não reinterpreta nada; `now`/`weekHorizon` são injetáveis (puro, testável). Sem `?ano=`: a
  agenda é uma visão "o que vence quando" a partir de hoje, não tem recorte por ano.
- **Alternativas consideradas:** (a) um único valor com sinal (+receber/−pagar) numa coluna só — descartado: duas colunas somam
  melhor na planilha e refletem os dois cards da tela. (b) omitir a coluna "Janela" e deduzir pela ordem — descartado: a
  planilha perde a textura ao ser reordenada/filtrada; o rótulo explícito custa pouco. (c) uma linha de subtotal por janela
  (espelhando o cabeçalho de cada seção da tela) — descartado por ora: a coluna "Janela" já permite o subtotal via tabela
  dinâmica; um único "Total" basta para o uso típico.
- **Testes:** **+3** em `csv.test.ts` (`describe("dueAgendaToCsv")`): só cabeçalho + Total zerado sem pendências; uma linha por
  pendência nas quatro janelas (ordem canônica) + Total; ignora pendências já realizadas, ordena por vencimento dentro da
  janela e trata descrição ausente (`null` → ""). **957 testes** no total (eram 954).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **957 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/financas/agenda` + `/financas/agenda/export` 307 (auth-gated). `npm audit`
  **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver
  D6/bloqueios); **nenhuma dependência nova**.
- **Nota de consolidação (Sessão 167):** esta decisão nasceu na PR paralela #180 (autoria concorrente) e foi **consolidada** na
  `main` por cherry-pick sobre a Sessão 166, conforme a regra de ouro de não abrir linha concorrente. Os números de teste do
  registro original (957/954) eram relativos ao ponto de origem (#179); após a consolidação sobre D158 (ritmo-do-mês) e D159
  (reativar/export) o total passou a **970** (`vitest run`). DoD re-verificado verde na `main` consolidada (build, typecheck,
  lint, 970 testes, smoke `/financas/agenda` + `/financas/agenda/export` 307, `npm audit` inalterado). PR #180 fechada como
  superada por esta consolidação.

## D158 — Ritmo do mês corrente (`/financas/ritmo-do-mes` + `currentMonthPace`) (Sessão 165)
- **Contexto:** o acervo respondia bem a "como fechei o mês/ano?" (fechamentos, projeção do ano, sazonalidade) e a "por quantos
  meses o caixa dura?" (fôlego/burn rate), mas faltava a pergunta do **dia a dia**: "estou faturando no ritmo de um mês normal,
  ou este mês está atrasado?". É a leitura que o músico quer no meio do mês para decidir se empurra prospecção/cobrança — distinta
  da projeção do ano (D60, horizonte anual) e do burn rate (D101, fôlego de caixa). O Painel já está denso (≈15 cards/nudges,
  novos nudges repetidamente adiados por densidade — D126/D138/D141), então o lar natural é uma página dedicada, não mais um card.
- **Decisão:** novo helper puro `currentMonthPace(txs, { now?, months? })` em `src/lib/finance.ts` + tipo `MonthPace` +
  `MonthPaceVerdict` + `MONTH_PACE_EPSILON` (=0.1), e a página `/financas/ritmo-do-mes`. O helper soma o que já foi **lançado**
  no mês corrente (regime de **competência**, pela `date` — a mesma base de `summarizeFinances`/`monthlySeasonality`, e a mesma
  dos números de receita do Painel), projeta o fechamento por extrapolação **pro-rata** (valor ÷ fração do mês decorrida =
  `dayOfMonth/daysInMonth`, UTC) e compara a projeção de receita com o **"mês típico"**: a média dos meses **completos com
  movimento** dentro de uma janela (default `DEFAULT_BURN_WINDOW_MONTHS`=6, mesma família de janela do burn rate, saneada por
  `sanitizeBurnWindow`; `?meses=` lido com `parseBurnWindow`/`BURN_WINDOW_PRESETS` 3/6/12/24, D102). Veredito pela **receita**
  (sinal mais limpo; despesas são esporádicas): `ahead`/`onPace`/`behind` conforme a projeção fica ±`MONTH_PACE_EPSILON` do mês
  típico; `insufficient` sem histórico de receita na janela.
- **Regime de competência (não caixa):** a pergunta "como vai o mês" casa com o que foi *agendado/realizado no mês* (lançamentos
  por data), não só com o que pingou no caixa — e mantém paridade com o headline de receita do app e com a sazonalidade.
  Alternativa caixa (`received`) descartada para v1: introduziria assimetria com o resto e dependeria do hábito de marcar
  recebimentos em dia.
- **Baseline = meses completos COM movimento (D35):** o mês corrente (parcial) e os meses parados ficam de fora, para a referência
  ser "um mês típico em que houve trabalho", não diluída por meses vazios de um histórico curto — mesmo critério de
  `monthlySeasonality`. `baselineMonths`/`baselineIncome` ficam expostos para a UI explicar a base.
- **Projeção pro-rata é hipótese frágil cedo no mês:** lançamentos não são uniformes (shows concentram em fins de semana). Cedo
  no mês a projeção é sensível a um único cachê. Aceito para v1 por ser transparente e barato; a página **sinaliza** o caráter de
  estimativa (texto + barra de "% do mês decorrido") e expõe `expectedIncomeByNow` (baseline × elapsed) como leitura alternativa
  ("quanto se esperaria a esta altura"). Refinamentos futuros: ponderar por dia-da-semana/sazonalidade do mês.
- **Alternativas consideradas:** (a) mais um card no Painel — descartado pela densidade já registrada; a página é cross-linkada
  pelo hub de relatórios (`/relatorios`), registrada em `REPORT_GROUPS` sob Finanças/"Fechamentos". (b) comparar contra o mês
  imediatamente anterior em vez da média — descartado: um mês pode ser atípico (um show grande), a média é mais estável (mesma
  motivação de `averageSummaries`). (c) veredito pelo resultado líquido — descartado: despesas esporádicas embaralhariam o sinal;
  o líquido ainda aparece na tabela, só não decide o veredito.
- **Testes:** **+10** em `finance.test.ts` (`describe("currentMonthPace")`): agregação do mês corrente + elapsed/projeção pro-rata;
  filtro do mês corrente; baseline só com meses ativos da janela; `onPace`/`ahead`/`behind` e a fronteira de `MONTH_PACE_EPSILON`;
  `insufficient` sem histórico; janela parametrizável; baseline ignorando o mês corrente e meses parados; projeção de despesa/
  líquido. **964 testes** no total (eram 954).
- **DoD:** build de produção, typecheck (`tsc --noEmit` via `next build`) e lint (`next lint`, 0 avisos) verdes; **964 testes**
  (`vitest run`); smoke test (`next start`) → `/login` 200 e `/financas/ritmo-do-mes` (+ `?meses=12`) 307 (auth-gated). `npm audit`
  **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver
  D6/bloqueios); **nenhuma dependência nova**.
- **Nota de concorrência:** o número de decisão **D157** foi deixado para a PR paralela #180 (export CSV da agenda) em andamento;
  esta sessão usa **D158** para evitar colisão de numeração na `main`.

## D159 — Exportação CSV dos contatos para reativar (`/contatos/reativar/export`) (Sessão 166)
- **Contexto:** a tela `/contatos/reativar` (`findContactsToReengage`) lista os contatos **dormentes** — quem já tocou com você,
  está sem nada agendado e há mais de `staleDays` (=60) dias sem show — ordenados pelos mais esquecidos primeiro. É exatamente a
  **fila de follow-up** de uma campanha de reativação, mas era uma das poucas telas tabulares de Contatos ainda sem exportação
  (ao lado de ranking/rentabilidade/retenção, que já exportavam). Levar a lista para a planilha permite trabalhá-la como
  campanha de prospecção (mala direta, divisão por responsável, anotações de contato).
- **Decisão:** novo serializador puro `reengageToCsv(list)` + `REENGAGE_CSV_HEADERS` em `src/lib/csv.ts` (espelho direto de
  `clientRetentionToCsv`/D153: genérico `<C extends ContactRankLike & { role: string }>`, reusa `contactRoleLabel`/`csvDate`/
  `centsToCsvAmount`) recebe a `ReengageList` já computada por `findContactsToReengage` e emite uma linha por dormente em
  `list.rows`, na **mesma ordem da página** (mais esquecidos primeiro, desempate por cachê histórico, depois nome pt-BR),
  encerrada numa linha "Total" com a soma de shows passados e do cachê histórico da fila. Rota `/contatos/reativar/export` reusa
  a **mesma consulta** da página (`findContactsToReengage` sobre os contatos do usuário) + BOM UTF-8; nome fixo
  `contatos-para-reativar.csv`; botão "⬇ CSV" no cabeçalho só com `list.count > 0`.
- **Colunas:** Contato / Papel / Último show / Dias sem contato / Shows / Cachê histórico (R$). A coluna "Dias sem contato" traz
  o `daysSinceLastShow` **cru** (inteiro, legível por máquina), não o "há 2 meses" relativo da UI — mesma filosofia de
  `paymentLagToCsv` (D132) e da coluna "Dias até vencer" da agenda (D157/#180). Adiciona "Papel" (ausente da tabela da tela, mas
  presente como badge) para a planilha abrir auto-suficiente, como `clientRetentionToCsv`. O cachê é por contato (um show com
  vários contatos conta para cada), herdando a semântica de `findContactsToReengage`; cancelados ficam de fora.
- **Sem recorte por `?ano=`:** por design a tela é uma fotografia do estado dormente **agora** (depende de `now` e de não haver
  nada agendado adiante); um recorte por ano não faria sentido — segue o mesmo princípio de `clientRetentionToCsv`.
- **Testes:** **+3** em `csv.test.ts` (`describe("reengageToCsv")`): só cabeçalho + Total zerado sem dormentes; uma linha por
  dormente (mais esquecido primeiro, `daysSinceLastShow` cru) + Total; ignora quem tem show futuro, só-cancelado ou ainda
  recente (< `staleDays`). **967 testes** no total (eram 964).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **967 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/contatos/reativar` + `/contatos/reativar/export` 307 (auth-gated). `npm audit`
  **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver
  D6/bloqueios); **nenhuma dependência nova**.
- **Nota de concorrência:** **D157** segue reservado à PR paralela #180 (export CSV da agenda) ainda em aberto; esta sessão usa
  **D159** (após o D158 já mergeado da Sessão 165) para evitar colisão de numeração na `main`.

## D160 — Exportação CSV do funil de propostas (`/shows/funil/export`) (Sessão 167)
- **Contexto:** a tela `/shows/funil` (`showPipeline`) é o **retrato do estado atual** dos shows por etapa (proposto →
  confirmado → realizado → cancelado), com contagem e cachê somado por etapa + a taxa de concretização. Era uma das poucas
  telas tabulares de Shows ainda **sem** exportação (ao lado de cadência/sazonalidade/locais/cidades/receita-agendada, que já
  exportavam). Levar a distribuição do funil para a planilha permite acompanhar o pipeline fora do app (relatório de status,
  divisão por responsável, série histórica manual mês a mês).
- **Decisão:** novo serializador puro `pipelineToCsv(pipeline)` + `PIPELINE_CSV_HEADERS` em `src/lib/csv.ts` recebe a
  `ShowPipeline` já computada por `showPipeline` (de `@/lib/finance`) e emite **uma linha por etapa** em `pipeline.stages` (na
  ordem canônica `PIPELINE_STAGE_ORDER`: proposto → confirmado → realizado → cancelado), com contagem de shows, participação no
  total (o mesmo `pct` da barra da página, via `csvShare`) e cachê somado da etapa, encerrada numa linha "Total" com o total de
  shows e a soma de **todos** os cachês. Rota `/shows/funil/export` reusa a **mesma consulta** da página (todos os shows do
  usuário, `select` id/status/fee) + BOM UTF-8; nome fixo `funil-de-propostas.csv`; botão "⬇ CSV" no cabeçalho só com
  `pipeline.total > 0` (mesmo gate do estado vazio "Nenhum show para analisar").
- **Colunas:** Etapa / Shows / Participação / Cachê (R$). A participação do "Total" fica **em branco** (é 100% por construção,
  como em `incomeMixToCsv`/D144). Todas as **quatro** etapas viram linha — inclusive cancelados, presentes na tela, porque o
  funil é um retrato, não um histórico de conversão. A **taxa de concretização** (`conversionRate`) é um escalar de destaque
  (card), não tabular, e não vira coluna — as colunas Shows/Participação já decompõem cada etapa (mesma filosofia de deixar a
  barra confirmado/total fora do `bookedRevenueToCsv`/D156).
- **Sem recorte por `?ano=`:** a página em si não tem `PeriodPicker` (o funil é o estado corrente de todos os shows), então o
  export herda o mesmo escopo — coerente com a tela.
- **Testes:** **+3** em `csv.test.ts` (`describe("pipelineToCsv")`): sem shows → cabeçalho + as quatro etapas zeradas + Total
  zerado; uma linha por etapa com contagem/participação/cachê + Total somando todas as etapas; cancelados viram linha e shows
  **sem status** ficam de fora do funil (herdado de `showPipeline`). **973 testes** no total (eram 970).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **973 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/shows/funil` + `/shows/funil/export` 307 (auth-gated). `npm audit` **inalterado**
  vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios);
  **nenhuma dependência nova**.
- **Nota de concorrência:** numeração **D160** após D159 (Sessão 166, já mergeado); **D157** segue reservado à PR paralela #180.

## D161 — Comparativo sazonal do mês corrente vs. mesmo mês do ano anterior (`/financas/ritmo-do-mes` + `monthYoYPace`) (Sessão 168)
- **Contexto:** a tela "Ritmo do mês" (`currentMonthPace`/D158) responde "estou faturando no ritmo de um mês normal?" comparando
  a projeção pro-rata do mês corrente contra o **mês típico** — a média móvel dos meses fechados com movimento na janela. Essa
  baseline é cega à **sazonalidade**: para um músico, dezembro não se compara à média de set–nov, e sim a dezembro do ano
  passado. O item 6b dos próximos passos já apontava "comparar contra o mesmo mês do ano anterior (eixo sazonal)" como evolução.
- **Decisão:** novo helper puro `monthYoYPace(txs, { now? })` em `src/lib/finance.ts` (logo após `currentMonthPace`). Reaproveita
  `currentMonthPace` para a projeção pro-rata do fechamento do mês corrente e a compara com o **mesmo mês do calendário um ano
  antes**, já fechado (mês **inteiro**, regime de competência pela `date`, UTC via `monthKey`). É comparação igual-com-igual —
  mês cheio projetado × mês cheio realizado —, distinta da média móvel: não há fração nem pro-rata do lado de referência (o ano
  passado já fechou). Devolve `MonthYoYPace` com a projeção (income/expense/net), os totais do ano anterior, três `MetricDelta`
  (`incomeVsLastYear`/`expenseVsLastYear`/`netVsLastYear`, via `computeDelta`) e um `verdict`.
- **Veredito pela receita** (mesmo critério/limiar de `currentMonthPace`): `ahead`/`onPace`/`behind` conforme a projeção fica
  ±`MONTH_PACE_EPSILON` (10%) do mesmo mês do ano anterior; `insufficient` quando o mês de referência **não teve receita** (sem
  âncora sazonal — primeiro ano de operação naquele mês). Reusa a constante `MONTH_PACE_EPSILON` (D158), sem novo limiar.
- **UI:** card "Mesmo mês no ano passado" em `/financas/ritmo-do-mes`, abaixo da tabela "Projeção do mês × mês típico", com selo
  de veredito (`YOY_META`) e uma tabela de três linhas (Receitas/Despesas/Resultado) projeção × `{mês do ano anterior}` ×
  variação, reusando o componente `Row` já existente da página. Sem movimento no mês de referência → mensagem de estado vazio
  ("aparece assim que houver um ano de histórico no mesmo mês") em vez da tabela. Não lê `?meses=` (a janela é do mês típico; o
  eixo sazonal é sempre o mesmo mês −1 ano), mantendo a pílula de janela atuando só sobre a baseline.
- **Alternativas consideradas:** (a) ponderar a projeção por dia-da-semana/sazonalidade intra-mês — **adiado**, é hipótese frágil
  e ortogonal a este eixo; (b) um nudge no Painel quando `behind` no eixo sazonal — **adiado** (o Painel já tem vários nudges; o
  card na página dedicada basta por ora); (c) comparar mês corrente *parcial* vs. ano anterior *parcial até o mesmo dia* — **descartado**:
  exigiria recortar o mês de referência por dia, e a projeção pro-rata já normaliza o mês corrente para mês cheio, então cheio×cheio
  é a comparação mais limpa.
- **Testes:** **+5** em `finance.test.ts` (`describe("monthYoYPace")`): compara projeção com o mês inteiro do ano anterior; isola o
  mesmo mês (ignora meses vizinhos de 2025 e o mesmo mês de 2024); classifica `ahead`/`behind`; `insufficient` sem receita no mês
  de referência (`pct` nulo); projeta despesas/líquido e compara. **978 testes** no total (eram 973).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **978 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/financas/ritmo-do-mes` 307 (auth-gated). `npm audit` **inalterado** vs. baseline
  (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma
  dependência nova**.

## D162 — Ritmo do ano: acumulado vs. mesmo período do ano anterior (`/financas/ritmo-do-ano` + `yearToDatePace`) (Sessão 169)
- **Contexto:** o eixo "ano" já tinha três telas, mas nenhuma respondia "estou à frente de onde eu estava nesta época do ano
  passado?". `yearlyHistory`/`crescimento` (D154) comparam anos **fechados** inteiros — inúteis no meio do ano corrente, que
  ainda está aberto; `projectYearEnd`/`projecao-ano` (D60) **projeta** o fechamento (estimativa, não fato consumado); e
  `monthYoYPace`/`ritmo-do-mes` (D161) cobre só o mês corrente. Faltava o acumulado ano-a-ano (year-to-date) lado a lado: o
  número que um freelancer olha no meio do ano para saber se está adiante ou atrás do ano anterior.
- **Decisão:** novo helper puro `yearToDatePace(txs, { now? })` em `src/lib/finance.ts` (logo após `monthYoYPace`). Soma o
  acumulado do ano corrente de 1º de janeiro até o **fim do dia do corte** (`now`, competência pela `date`, UTC) e o compara
  com o acumulado do ano anterior até o **mesmo mês/dia**. É comparação igual-com-igual — a mesma fração do ano percorrida dos
  dois lados, ambos números **reais** (sem projeção, ao contrário de `currentMonthPace`/`monthYoYPace`, que extrapolam o mês
  corrente). Devolve `YearToDatePace` com `dayOfYear`/`daysInYear`/`elapsed`, os acumulados dos dois anos (income/expense/net),
  três `MetricDelta` (via `computeDelta`) e um `verdict`.
- **Veredito pela receita** (mesmo limiar da família de ritmo): `ahead`/`onPace`/`behind` conforme o acumulado do ano corrente
  fica ±`MONTH_PACE_EPSILON` (10%) do mesmo período do ano anterior; `insufficient` quando o período de referência **não teve
  receita** (primeiro ano de operação). Reusa `MONTH_PACE_EPSILON` (D158), sem novo limiar.
- **Alinhamento de calendário:** o dia do corte no ano anterior é limitado ao último dia do mês daquele ano —
  `min(cutoffDay, diasDoMês(year−1, cutoffMonth))` — para que 29/fev recue para 28/fev e a janela continue alinhada. `dayOfYear`
  e `daysInYear` são derivados por diferença de `Date.UTC` (lida com anos bissextos sem tabela fixa).
- **UI:** página dedicada `/financas/ritmo-do-ano` (não um card no Painel, que já é denso) — barra de "% do ano decorrido",
  selo de veredito (`VERDICT_META`), dois cards de receita acumulada (ano corrente × mesmo ponto do ano anterior) e tabela de
  três linhas (Receitas/Despesas/Resultado) ano × ano × variação. Espelha o layout de `ritmo-do-mes` (mesmo padrão de
  `Row`/`Metric`/`formatPct`/`deltaTone`), com estado vazio quando não há ano corrente lançado. Registrada no hub
  (`REPORT_GROUPS`, Finanças/"Fechamentos", ao lado de "Ritmo do mês"). Sem `?ano=`: por design o eixo é sempre ano corrente ×
  anterior, no ponto de hoje.
- **Alternativas consideradas:** (a) também projetar o fechamento do ano nesta tela — **descartado**, é trabalho de
  `projecao-ano`; aqui o valor é justamente comparar dois acumulados **reais**; (b) recorte por dia-do-ano em vez de mês/dia —
  **descartado**, mês/dia é mais legível ("até 29 de junho") e o clamp de fim-de-mês já resolve o desalinhamento bissexto; (c)
  um nudge no Painel quando `behind` — **adiado** (o Painel já tem vários nudges; a página dedicada basta por ora); (d)
  exportação CSV — **adiada**, são poucas linhas (dois acumulados) e a tela é leitura de tela, não planilha.
- **Testes:** **+6** em `finance.test.ts` (`describe("yearToDatePace")`): acumula o ano corrente até o corte e calcula
  `dayOfYear`/`elapsed`; compara com o mesmo período do ano anterior (ignora o que vem depois do corte); classifica
  `onPace`/`behind`; `insufficient` sem receita de referência (`pct` nulo); acumula despesa/líquido; alinha o ano bissexto
  (29/fev → 28/fev). **984 testes** no total (eram 978).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **984 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/financas/ritmo-do-ano` 307 (auth-gated). `npm audit` **inalterado** vs. baseline
  (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma
  dependência nova**.

## D163 — Nudge de ritmo do ano no Painel (`yearToDatePaceHeadline`) (Sessão 170)
- **Contexto:** a D162 entregou `yearToDatePace` + a página `/financas/ritmo-do-ano`, mas deixou o nudge no Painel
  **adiado** (alt. (c), "o Painel já tem vários nudges; a página dedicada basta por ora"). O ponto fraco de só ter a
  página dedicada é que o sinal "estou atrás de onde eu estava nesta época do ano passado?" só aparece se o músico
  **navegar até a tela** — exatamente o sinal que ele deveria ver de relance ao abrir o app. Os demais alertas de risco
  (fôlego de caixa, concentração de carteira/geográfica, atraso de recebimento) já vivem como manchete no Painel; faltava
  este, no eixo "ano".
- **Decisão:** novo helper puro `yearToDatePaceHeadline(pace: YearToDatePace)` em `src/lib/finance.ts` (logo após
  `yearToDatePace`), espelhando a forma de `cashBurnHeadline`/`geoConcentrationHeadline` (recebe um veredito já computado
  e decide só a **exibição**, sem I/O). O nudge aparece **somente** quando `verdict === "behind"` — com `ahead`/`onPace`
  (ritmo bom/em linha) ou `insufficient` (primeiro ano, sem base) seria ruído, não alerta. Mesma disciplina dos outros
  headlines: a regra de exibição mora no helper testável, o `dashboard/page.tsx` só consome.
- **Limiar crítico:** `YTD_PACE_CRITICAL_RATIO = 0.75` — quando a receita acumulada do ano cai a ≤ 75% da do mesmo período
  do ano passado (≥ 25% de atraso), o nudge vira `critical` (vermelho 🔴 em vez de âmbar 🐢), espelhando a escala
  crítica dos demais headlines. Reaproveita as transações já carregadas no Painel (zero I/O extra) e linka para
  `/financas/ritmo-do-ano`.
- **Alternativas consideradas:** (a) mostrar o nudge também quando `ahead` (reforço positivo) — **descartado**, o Painel é
  para o que **pede ação**; ritmo bom não exige nada do músico e adensaria a régua de manchetes; (b) um guard de fração
  mínima do ano decorrido para evitar ruído em janeiro — **descartado**, a comparação já é apples-to-apples (mesmo mês/dia
  nos dois anos) e o veredito só dispara com ≥ 10% de gap real sobre um ano anterior **com receita**, então não é volátil
  por ser cedo; (c) generalizar um componente de nudge único para todas as manchetes — **adiado**, fora de escopo desta
  sessão e as molduras textuais divergem.
- **Testes:** **+4** em `finance.test.ts` (`describe("yearToDatePaceHeadline")`): mostra não-crítico quando atrás mas acima
  de 75%; vira crítico em ≤ 75%; não mostra quando à frente/em linha; não mostra (e `pct` nulo) quando `insufficient`.
  **988 testes** no total (eram 984).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **988 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/dashboard` 307 (auth-gated). `npm audit` **inalterado** vs. baseline
  (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma
  dependência nova**.

## D164 — Exportação CSV da projeção de caixa (`/financas/fluxo-de-caixa/export` + `cashflowProjectionToCsv`) (Sessão 171)
- **Contexto:** a tela "Fluxo de caixa projetado" (`/financas/fluxo-de-caixa`, `projectCashflow`, F3) mostra uma tabela
  mês a mês (Mês / A receber / A pagar / Variação / Saldo ao fim) do saldo de caixa projetado a partir do caixa realizado
  atual, com horizonte parametrizável (`?meses=` 3/6/12/24, default 6) — mas era a última tela de **projeção tabular** das
  Finanças sem exportação CSV (suas irmãs anual/trimestral/sazonalidade/variação/fontes/composição/crescimento/fôlego já
  exportavam). Item 10 dos próximos passos: as telas sem export que sobram são sobretudo painéis de cenário de número único;
  esta é a exceção — uma série multi-linha que abre limpa como planilha de planejamento.
- **Decisão:** novo serializador puro `cashflowProjectionToCsv(projection)` + `CASHFLOW_PROJECTION_CSV_HEADERS` em
  `src/lib/csv.ts` (recebe a `CashflowProjection` já computada por `projectCashflow`, de `@/lib/finance`); emite uma linha por
  mês do horizonte (cronológica crescente), com a receber/a pagar/variação/saldo ao fim, encerrada numa linha "Total". Rota
  `/financas/fluxo-de-caixa/export` reusa a mesma consulta e o mesmo horizonte da página + BOM UTF-8; nome
  `fluxo-de-caixa-projetado-{n}m.csv`; botão "⬇ CSV" no cabeçalho da página (ao lado de "← Finanças"), propagando o horizonte
  ativo, exibido com `hasPending || startBalance !== 0` (há algo a projetar ou um caixa de fato).
- **Saldo no "Total":** diferente de `cashFlowToCsv`/D155 (caixa realizado, sem saldo acumulado), a coluna "Saldo ao fim"
  carrega o saldo **corrente** projetado de cada mês. Por isso o "Total" traz a soma do a receber/a pagar/variação do
  horizonte e, na última coluna, o **saldo projetado final** (= "Saldo ao fim" do último mês = caixa atual + Σ variações),
  não uma soma de saldos (que seria sem sentido). Como em `cashFlowToCsv`, emite **todos** os meses do horizonte, inclusive
  os sem pendência (variação 0): num runway de caixa um mês parado ainda move a linha do tempo do saldo. Mês na chave ISO
  "YYYY-MM" (ordenável), não o rótulo curto da UI.
- **Horizonte compartilhado (DRY):** extraído `CASHFLOW_HORIZON_PRESETS`/`CASHFLOW_HORIZON_DEFAULT` + parser puro
  `parseCashflowHorizon(raw)` para `@/lib/finance` (logo após `projectCashflow`), e a página passou a importá-los no lugar
  do `resolveHorizon`/`HORIZON_OPTIONS` locais — assim página e export honram exatamente o mesmo conjunto de horizontes.
  **Diferente de `parseBurnWindow`** (que clampa qualquer inteiro para [1,24]), `parseCashflowHorizon` é **preset-only**:
  valor fora de {3,6,12,24} cai no default — fiel ao comportamento que a página já tinha (`.includes(n)`).
- **Alternativas consideradas:** (a) reusar `parseBurnWindow` no export — **descartado**, mudaria a semântica preset-only
  da página (ex.: `?meses=5` viraria 5 em vez de 6); (b) inserir uma linha "Caixa atual" no corpo do CSV para tornar o
  saldo inicial explícito — **descartado**, quebra o padrão "uma linha por mês + Total" dos irmãos; o saldo inicial é
  recuperável do primeiro mês (Saldo ao fim − Variação) e o "Total" já entrega o saldo final; (c) gate só por `hasPending`
  — **ajustado** para `hasPending || startBalance !== 0`, para um músico com caixa de fato mas sem pendências ainda poder
  exportar o runway plano.
- **Testes:** **+3** em `csv.test.ts` (`describe("cashflowProjectionToCsv")`: sem movimento → saldo constante por mês +
  Total; acumula o saldo a partir do caixa atual e o Total soma fluxos e traz o saldo final; saldo final negativo) e **+4**
  em `finance.test.ts` (`describe("parseCashflowHorizon")`: aceita cada preset; default p/ ausente/vazio/não-numérico;
  default p/ inteiro fora dos presets, distinto do clamp de `parseBurnWindow`; usa o primeiro de um param repetido).
  **995 testes** no total (eram 988).
- **DoD:** build de produção, typecheck (`tsc --noEmit`) e lint (`next lint`, 0 avisos) verdes; **995 testes** (`vitest run`);
  smoke test (`next start`) → `/login` 200 e `/financas/fluxo-de-caixa` + `/financas/fluxo-de-caixa/export` (+ `?meses=12`)
  307 (auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do
  Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.

## D165 — Exportação CSV da concentração de contratantes (`/contatos/concentracao/export` + `clientConcentrationToCsv`) (Sessão 172)
- **Contexto:** a tela "Concentração de contratantes" (`/contatos/concentracao`, `clientConcentration`, o risco de
  dependência: quanto do cachê total vem de poucos contratantes — topShare/top3Share/HHI/nº efetivo de contratantes)
  exibe uma tabela "Composição por contratante" (Contratante / Shows / Cachê / Participação) mas era uma das telas
  tabulares dos Contatos ainda sem exportação CSV (suas irmãs ranking/rentabilidade/retenção/reativar já exportavam).
  Distinta da concentração **geográfica** (cidades/locais): aqui o eixo é o pagador, não o lugar.
- **Decisão:** novo serializador puro `clientConcentrationToCsv(concentration)` + `CLIENT_CONCENTRATION_CSV_HEADERS`
  em `src/lib/csv.ts` (recebe a `ClientConcentration<C>` já computada por `clientConcentration`, de `@/lib/contacts`,
  genérico em `C extends ContactRankLike & { role: string }`, como `clientRetentionToCsv`/D153). Emite uma linha por
  contratante com faturamento (`concentration.rows`, já ordenado por cachê desc / nome pt-BR), com nº de shows não
  cancelados, cachê somado (por contato) e a participação no cachê total (`csvShare`, "37%", como na página), encerrada
  numa linha "Total" com a soma de shows e o cachê total da carteira. Colunas Contratante/Papel/Shows/Cachê (R$)/
  Participação (%). Rota `/contatos/concentracao/export` reusa a mesma consulta/`clientConcentration` da página + BOM
  UTF-8; nome fixo `concentracao-contratantes.csv`; botão "⬇ CSV" no cabeçalho só com `conc.clientCount > 0` (mesmo gate
  do estado-vazio da tela).
- **Papel na planilha; participação do Total em branco:** a coluna "Papel" entra para o arquivo abrir auto-suficiente
  (a tela mostra o papel como selo abaixo do nome, não como coluna), espelhando `clientRetentionToCsv`. A participação
  da linha "Total" fica em branco — é 100% por construção (o denominador é a soma das participações), mesma convenção de
  `clientRetentionToCsv`/`incomeMixToCsv`. O nº de shows do Total é a soma dos `activeShows` das linhas (um show com
  vários contatos conta para cada contato, herdando a semântica por-contato de `clientConcentration`).
- **Alternativas consideradas:** (a) incluir colunas de HHI / topShare / nº efetivo no CSV — **descartado**: são escalares
  de carteira (um valor só), não propriedades de linha; já estão nos cards de destaque da página e poluiriam o "uma linha
  por contratante + Total"; (b) emitir só os contratantes "concentradores" (acima de algum corte) — **descartado**: o CSV
  abre a carteira inteira por design (como `clientRetentionToCsv` emite todas as linhas), o recorte é leitura da tela.
- **Testes:** **+3** em `csv.test.ts` (`describe("clientConcentrationToCsv")`: só cabeçalho + Total zerado sem
  faturamento; uma linha por contratante em ordem de cachê desc com participação (75%/25%) + Total com participação em
  branco; ignora shows cancelados e contratantes sem faturamento). **998 testes** no total (eram 995).
- **DoD:** build de produção e lint (`next lint`, 0 avisos) verdes; typecheck (`tsc --noEmit`) limpo; **998 testes**
  (`vitest run`); smoke test (`next start`) → `/login` 200 e `/contatos/concentracao` + `/contatos/concentracao/export`
  307 (auth-gated). `npm audit` **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do
  Next 14 / postcss bundlado; ver D6/bloqueios); **nenhuma dependência nova**.

## D166 — Exportação CSV do ritmo do ano (`/financas/ritmo-do-ano/export` + `yearPaceToCsv`) (Sessão 173)
- **Contexto:** a tela "Ritmo do ano" (`/financas/ritmo-do-ano`, `yearToDatePace`, D162 — o acumulado do ano corrente de
  1º/jan até hoje vs. o mesmo ponto do ano passado, comparação igual-com-igual) exibe a tabela "{ano} × {ano-1} (mesmo
  período)" com três linhas (Receitas / Despesas / Resultado), cada uma com o acumulado dos dois anos e a variação
  relativa — mas era uma das poucas telas tabulares das Finanças ainda sem exportação CSV (suas irmãs
  fluxo-de-caixa/trimestral/anual/sazonalidade/composição já exportavam). Sua gêmea mensal `/financas/ritmo-do-mes`
  (`monthYoYPace`/`currentMonthPace`) também segue sem export, mas é mais densa (vários cards/projeção pro-rata) — fica
  para outra sessão.
- **Decisão:** novo serializador puro `yearPaceToCsv(pace)` + `YEAR_PACE_CSV_HEADERS` em `src/lib/csv.ts` (recebe a
  `YearToDatePace` já computada por `yearToDatePace`, de `@/lib/finance`). Emite **uma linha por métrica** na ordem da
  página (Receitas → Despesas → Resultado), com o acumulado do ano corrente (`delta.current`), o do mesmo período do ano
  anterior (`delta.previous`) e a variação relativa (`delta.pct`). Colunas Métrica / Ano corrente (R$) / Mesmo período do
  ano anterior (R$) / Variação (%). Rota `/financas/ritmo-do-ano/export` reusa a mesma consulta/`yearToDatePace` da página
  + BOM UTF-8; nome `ritmo-do-ano-{ano}.csv` (o ano concreto vai no nome, como o horizonte em
  `fluxo-de-caixa-projetado-{n}m.csv`); botão "⬇ CSV" no cabeçalho só com `hasData` (= movimento no ano corrente **ou** no
  mesmo período do ano anterior — não exporta um quadro todo-zero).
- **Variação com sinal; sem linha Total:** novo helper local `csvSignedPct(pct)` serializa o `pct` do MetricDelta como
  "+25%" / "-50%" / "0%", e **em branco quando `pct` é `null`** (base anterior 0 → porcentagem indefinida), espelhando o
  "—" que a UI mostra no veredito "insufficient". Distinto de `csvShare` (participação 0..1 sem sinal): aqui o sinal
  carrega a leitura "subiu/caiu". **Não** há linha "Total": as três métricas não somam entre si (Resultado já é
  Receitas − Despesas), diferente dos exports "uma linha por fatia + Total" (`incomeMixToCsv` etc.).
- **Colunas de ano genéricas:** os cabeçalhos ficam "Ano corrente"/"Mesmo período do ano anterior" (não "2026"/"2025")
  porque os anos concretos vão no nome do arquivo e o `*_CSV_HEADERS` é um const estático (os testes comparam a 1ª linha a
  ele). É a mesma escolha do `cashflowProjectionToCsv` (horizonte no nome, não no cabeçalho). O corte ("até 15 de junho") é
  contexto da tela, não da planilha de 3 linhas; o filename já ancora o ano.
- **Alternativas consideradas:** (a) formato "tidy" com uma linha por período (ano corrente / ano anterior) e colunas
  Receitas/Despesas/Resultado — **descartado**: a tela mostra métrica × período, e a variação não caberia limpa nesse
  recorte; (b) embutir o corte (mês/dia) numa coluna ou linha de contexto — **descartado**: polui o quadro de 3 linhas,
  e o ano (a informação que muda) já está no nome do arquivo; (c) `?ano=` para exportar anos anteriores — **descartado**:
  a tela é fotografia do estado "agora" (sem seletor de ano, como em D162), o export herda essa semântica.
- **Testes:** **+3** em `csv.test.ts` (`describe("yearPaceToCsv")`: só cabeçalho + 3 métricas zeradas (sem Total) e
  variação em branco sem base; acumulado dos dois anos com variação assinada +25%/−50%/+100%; variação em branco quando o
  ano anterior não teve movimento). **1001 testes** no total (eram 998).
- **DoD:** build de produção (`✓ Compiled successfully`, rota `/financas/ritmo-do-ano/export` registrada) e lint
  (`next lint`, 0 avisos) verdes; typecheck (`tsc --noEmit`) limpo; **1001 testes** (`vitest run`); smoke test
  (`next start`) → `/login` 200 e `/financas/ritmo-do-ano` + `/financas/ritmo-do-ano/export` 307 (auth-gated). `npm audit`
  **inalterado** vs. baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver
  D6/bloqueios); **nenhuma dependência nova**.

## D167 — Exportação CSV da meta de faturamento por mês (`/financas/metas/export` + `monthlyGoalProgressToCsv`) (Sessão 174)
- **Contexto:** a tela "Meta de faturamento" (`/financas/metas`) tem um card "Meta por mês" (`monthlyGoalProgress`, D87)
  que quebra a meta anual em 12 alvos iguais e cruza cada um com o recebido (caixa) do mês — genuinamente tabular
  (12 linhas: alvo × recebido × situação). Era a quebra mensal mais detalhada da página e a candidata mais óbvia das
  telas de Finanças "de cenário" ainda sem CSV (a ressalva apontada no item 10 dos próximos passos: "metas… menos
  óbvias como planilha; avaliar caso a caso se o tabular agrega"). Os outros quadros da página (progresso anual, ritmo
  necessário, comparativo de cenários) são número-único/destaque — não tabulares — então ficam de fora; o trimestral
  (`quarterlyGoalProgress`) é a mesma quebra mais grossa e cabe num mesmo padrão se pedir.
- **Decisão:** novo serializador puro `monthlyGoalProgressToCsv(monthly)` + `MONTHLY_GOAL_CSV_HEADERS` em `src/lib/csv.ts`
  (recebe a `MonthlyGoalProgress` já computada por `monthlyGoalProgress`, de `@/lib/finance`). Emite **uma linha por mês**
  (jan→dez), com o alvo do mês (`target`), o recebido (`realized`), quanto falta (`remaining`), o percentual atingido
  (`ratio` via `csvShare`, como na página) e a situação rotulada em pt-BR (Batido/Abaixo/Em andamento/A seguir, espelhando
  o `GOAL_STATUS` da tela via novo mapa local `MONTH_GOAL_STATUS_LABELS`). Colunas Mês / Alvo (R$) / Recebido (R$) /
  Falta (R$) / Atingido (%) / Situação. Rota `/financas/metas/export?ano=YYYY` reusa a mesma consulta da página (meta do
  ano + transações) + BOM UTF-8; nome `metas-mensal-{ano}.csv` (o ano concreto vai no nome, como em D166); botão "⬇ CSV"
  no cabeçalho do card "Meta por mês" — surge na mesma condição que renderiza o card (`monthly.goal > 0`).
- **Linha Total:** encerra com "Total" cujo alvo é a meta anual (`monthly.goal`), recebido é a soma dos 12 meses
  (`monthly.realized`) e falta é `max(0, goal − realized)`; a coluna Atingido (%) do Total fica **em branco** (100% por
  construção, como em `clientConcentrationToCsv`/`incomeMixToCsv`) e a Situação resume os meses batidos ("N/12 batidos",
  espelhando o "N de 12 batidos" da página). Distinto de D166 (`yearPaceToCsv`, sem Total) porque aqui as 12 linhas
  somam de fato na meta anual.
- **`?ano=` herdado da página:** ao contrário de D166 (tela "fotografia do agora", sem seletor de ano), a página de metas
  já navega por ano (`?ano=`), então o export herda o mesmo `parseYear` (1970–2999, fallback ao ano atual) e exporta o ano
  visível. Sem meta definida no ano, a planilha sai com alvos zerados (meta 0) e Total "0/12 batidos", espelhando o estado
  "sem meta" — sem caso especial na rota.
- **Alternativas consideradas:** (a) exportar também o resumo anual/ritmo necessário em linhas de contexto — **descartado**:
  são número-único, não tabular, e polui o quadro de 12 linhas (mesma escolha de D166 quanto ao corte); (b) coluna "Mês"
  numérica (1..12) em vez do rótulo "jan" — **descartado**: o rótulo curto pt-BR é o que a tela mostra e abre legível na
  planilha; (c) exportar o trimestral junto — **adiado**: é a mesma quebra mais grossa, vale uma rota irmã própria se pedir.
- **Testes:** **+4** em `csv.test.ts` (`describe("monthlyGoalProgressToCsv")`: cabeçalho + 12 meses jan→dez + Total;
  alvo/recebido/falta/percentual/situação por mês cobrindo Batido/Abaixo/Em andamento/A seguir; linha Total com meta anual,
  recebido somado e "N/12 batidos"; sem meta (0) → alvos zerados e "0/12 batidos"). **1005 testes** no total (eram 1001).
- **DoD:** build de produção (`✓ Compiled successfully`, rota `/financas/metas/export` registrada) e lint (`next lint`,
  0 avisos) verdes; typecheck (`tsc --noEmit`) limpo; **1005 testes** (`vitest run`). `npm audit` **inalterado** vs.
  baseline (10 advisories — 4 moderate / 5 high / 1 critical, todos do Next 14 / postcss bundlado; ver D6/bloqueios);
  **nenhuma dependência nova**.
