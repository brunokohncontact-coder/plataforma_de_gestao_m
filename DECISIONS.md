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
