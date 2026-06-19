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
