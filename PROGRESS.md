# PROGRESS — Plataforma de Gestão de Carreira para Músicos (Palco)

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 (MVP) — núcleo funcional + ciclos de CRUD completos + agenda em calendário
+ testes de integração de posse por usuário + ESLint no CI + filtros nas Finanças
(incl. categoria) + confirmação antes de excluir + página de Conta (perfil/senha).**
O app builda (`npm run build`), roda e passa nos testes (`npm test`, **83 testes**),
no typecheck e no **lint** (`npm run lint` → 0 warnings/erros). As cinco funcionalidades
do MVP (F1–F5 de `docs/mvp-scope.md`) estão implementadas e navegáveis. **978 testes** verdes após adicionar o **comparativo sazonal
"mesmo mês do ano passado"** na página Ritmo do mês (Sessão 167, D160 — novo helper puro `currentMonthVsLastYear(txs, { now? })`
em `src/lib/finance.ts` + tipo `MonthYoY`/`MonthYoYVerdict`: projeta o mês corrente por pro-rata (competência) e compara com o
total **fechado** do mesmo mês um ano atrás — o eixo sazonal que a média móvel do "mês típico" não captura; também expõe o mesmo
mês do ano anterior recortado **até o mesmo dia** (`lastYearIncomeToDate`, maçã-com-maçã) e o veredito `ahead`/`onPace`/`behind`/
`insufficient` pela receita, reusando `MONTH_PACE_EPSILON`. Nova seção "Mesmo mês do ano passado" em
`/financas/ritmo-do-mes/page.tsx` com card de veredito, tabela projeção × ano anterior e linha "até hoje vs. mesmo dia do ano
passado"; sem `?meses=` (a comparação é ponto a ponto). **+8 testes**). Vinha de **970** após consolidar a **exportação CSV da agenda de contas a pagar/receber** em `/financas/agenda/export` (PR #180, D157 — a tela "A pagar e receber"/`buildDueAgenda` ganhou botão "⬇ CSV"; serializador puro `dueAgendaToCsv` + `DUE_AGENDA_CSV_HEADERS` em `src/lib/csv.ts`, rótulos de janela extraídos para `DUE_BUCKET_LABELS` em `@/lib/finance` (DRY com a página); **+3 testes**) sobre a Sessão 166. Segue 967 da Sessão 166
(**exportação CSV dos contatos para reativar** em `/contatos/reativar/export` — a tela "Contatos para reativar"
(`findContactsToReengage`, a fila de follow-up dos dormentes: quem já tocou, está sem nada agendado e há mais de `staleDays`=60
dias sem show) ganhou botão de exportação, fechando mais uma lacuna tabular do lado Contatos (ao lado de
ranking/rentabilidade/retenção). Novo serializador puro `reengageToCsv(list)` + `REENGAGE_CSV_HEADERS` em `src/lib/csv.ts`
(espelho de `clientRetentionToCsv`/D153: genérico, reusa `contactRoleLabel`/`csvDate`/`centsToCsvAmount`) recebe a `ReengageList`
já computada e emite uma linha por dormente em `list.rows`, na mesma ordem da página (mais esquecidos primeiro, desempate por
cachê histórico, depois nome pt-BR), encerrada numa linha "Total" com a soma de shows passados e do cachê histórico da fila.
Colunas Contato/Papel/Último show/Dias sem contato/Shows/Cachê histórico (R$). A coluna "Dias sem contato" traz o
`daysSinceLastShow` cru (legível por máquina), não o "há 2 meses" relativo da UI; "Papel" entra para a planilha abrir
auto-suficiente. Sem `?ano=` (a tela é fotografia do estado dormente agora). Rota `/contatos/reativar/export` reusa a mesma
consulta/`findContactsToReengage` da página + BOM UTF-8; nome fixo `contatos-para-reativar.csv`; botão "⬇ CSV" no cabeçalho só
com `list.count > 0`. Herda a semântica de `findContactsToReengage`: cancelados de fora, cachê por contato. **+3 testes**
(`describe("reengageToCsv")`: só cabeçalho + Total zerado sem dormentes; uma linha por dormente em ordem de defasagem + Total;
ignora quem tem show futuro, só-cancelado ou ainda recente). Smoke test (`next start`) → `/login` 200 e `/contatos/reativar` +
`/contatos/reativar/export` 307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6). Ver
D159 — D157 segue reservado à PR paralela #180 (export da agenda). Segue 964 da Sessão 165
(**ritmo do mês corrente** em `/financas/ritmo-do-mes` — novo helper puro `currentMonthPace(txs, { now?, months? })` em
`src/lib/finance.ts` responde "estou faturando no ritmo de um mês normal?": soma o que já foi lançado no mês corrente (regime de
competência, pela `date`), projeta o fechamento por extrapolação pro-rata (valor ÷ fração do mês decorrida, UTC) e compara a
projeção de receita com o "mês típico" — a média dos meses **completos com movimento** numa janela `?meses=` (3/6/12/24, default
6, reusa `parseBurnWindow`/`sanitizeBurnWindow`/`BURN_WINDOW_PRESETS` da D102). Veredito pela receita (sinal mais limpo;
despesas são esporádicas): `ahead`/`onPace`/`behind` conforme a projeção fica ±`MONTH_PACE_EPSILON` (=10%) do mês típico,
`insufficient` sem histórico de receita. A página dedicada (não mais um card — o Painel já está denso) mostra barra de "% do mês
decorrido", veredito com tom/ícone, cards Receita até agora / Projeção / Mês típico (com `expectedIncomeByNow` = baseline ×
elapsed como leitura alternativa) e tabela projeção × mês típico (receitas/despesas/resultado). Registrada no hub
(`REPORT_GROUPS`, Finanças/"Fechamentos"). Projeção pro-rata é hipótese frágil cedo no mês (lançamentos não-uniformes) — a UI
sinaliza o caráter de estimativa. **+10 testes** (`describe("currentMonthPace")`). Smoke test (`next start`) → `/login` 200 e
`/financas/ritmo-do-mes` (+ `?meses=12`) 307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss
da D6). Ver D158 — número D157 deixado para a PR paralela #180 (export da agenda). Segue 954 da Sessão 164 (**exportação CSV da receita agendada** em `/shows/receita-agendada/export` — a tela "Receita
agendada" (`forecastBookedRevenue`, o pipeline de cachês de shows futuros agregado por mês: quanto já está agendado para
receber) ganhou botão de exportação, fechando mais uma lacuna de exportação tabular do lado Shows. Novo serializador puro
`bookedRevenueToCsv(forecast)` + `BOOKED_REVENUE_CSV_HEADERS` em `src/lib/csv.ts` recebe a `BookedRevenueForecast` já computada
(`forecastBookedRevenue`, de `@/lib/finance`) e emite uma linha por **mês com shows futuros** (`forecast.months`, ordem
cronológica crescente), com nº de shows, valor confirmado (CONFIRMED/PLAYED), a confirmar (PROPOSED/sem status) e o total do mês
(confirmado + a confirmar), encerrada numa linha "Total" com os agregados da tela (`count`/`confirmedTotal`/`tentativeTotal`/
`total` — batem com os cards de destaque). Colunas Mês/Shows/Confirmado (R$)/A confirmar (R$)/Total do mês (R$). Como em
`gigCadenceToCsv`/`feeTrendToCsv` (séries de eixo aberto), só meses com shows viram linha e a coluna "Mês" usa a chave ISO
"YYYY-MM" (ordenável), não o "Jul 2026" da UI. Sem `?ano=`: por design a tela olha sempre da data corrente em diante. Rota
`/shows/receita-agendada/export` reusa a mesma consulta (shows `date >= hoje`) e o `forecastBookedRevenue` da página + BOM
UTF-8; nome fixo `receita-agendada.csv`; botão "⬇ CSV" no cabeçalho só com `forecast.count > 0`. Herda a semântica de
`forecastBookedRevenue`: cancelados ignorados, "futuro" = dia `>= hoje` (UTC). **+3 testes** (`describe("bookedRevenueToCsv")`:
só cabeçalho + Total zerado sem shows; uma linha por mês com shows em ordem crescente + Total; ignora cancelados/passados,
status ausente conta como a confirmar). Smoke test (`next start`) → `/login` 200 e `/shows/receita-agendada` +
`/shows/receita-agendada/export` 307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da
D6). Ver D156; segue 951 da Sessão 163 (**exportação CSV do fluxo de caixa mês a mês** em `/financas/folego-de-caixa/export` — a tira
"Cenário alternativo · ritmo de gasto real" (`cashFlowByMonth`, o fluxo de caixa realizado por trás da média de queima/burn
rate) ganhou botão de exportação — o **candidato natural** apontado no item 10 dos próximos passos. Novo serializador puro
`cashFlowToCsv(months)` + `CASH_FLOW_CSV_HEADERS` em `src/lib/csv.ts` recebe a saída de `cashFlowByMonth` (`CashFlowMonth[]`, de
`@/lib/finance`) e emite uma linha por **mês da janela** (cronológica crescente), com recebido, pago e líquido (recebido − pago)
do mês, encerrada numa linha "Total" com os somatórios da janela (o `net ÷ janela` reproduz o `avgMonthlyNet` de
`cashBurnRunway`). Colunas Mês/Recebido (R$)/Pago (R$)/Líquido (R$). **Diferente de cadência/evolução do cachê** (sem recorte),
a janela **é** o eixo: a rota lê `?meses=` (saneada por `parseBurnWindow`, pílulas 3/6/12/24 da D102), o botão propaga a janela
ativa e o nome do arquivo a carrega (`fluxo-de-caixa-mensal-{n}m.csv`). **Diferente de cadência/evolução** (só meses ativos), o
CSV emite a janela inteira, inclusive meses zerados — numa série de caixa um líquido 0 é informação (preserva a textura da
tira), como `monthlySeasonalityToCsv`. Mês na chave ISO "YYYY-MM" (ordenável), não o "jan" da UI. Herda de `cashFlowByMonth`: só
caixa realizado (`received`), meses **completos** anteriores ao mês corrente (exclui o em curso). Botão "⬇ CSV" no card, ao lado
das pílulas, só com movimento na janela (`months.some(...)`, mesmo gate da tira). **+3 testes** (`describe("cashFlowToCsv")`: só
cabeçalho + meses da janela zerados + Total zerado sem movimento; uma linha por mês (mês parado zerado) em ordem cronológica +
Total; ignora não-recebidos e movimento fora da janela). Smoke test (`next start`) → `/login` 200 e `/financas/folego-de-caixa`
+ `/financas/folego-de-caixa/export?meses=12` 307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories
Next/postcss da D6). Ver D155; segue 948 da Sessão 162 (**exportação CSV do crescimento ano a ano** em `/financas/crescimento/export` — a tela
"Crescimento ano a ano" (`yearlyHistory`, a trajetória de longo prazo: a carreira está faturando mais com o tempo?) ganhou
botão de exportação, mais uma lacuna de exportação tabular das Finanças fechada (irmã das já-exportáveis
anual/trimestral/sazonalidade/variação/fontes/composição). Novo serializador puro `yearlyHistoryToCsv(history)` +
`YEARLY_HISTORY_CSV_HEADERS` em `src/lib/csv.ts` espelha a tabela "Ano a ano": uma linha por **ano com movimento** (receita ou
despesa > 0), em ordem cronológica crescente, com receitas, despesas e resultado (regime de competência) do ano + a variação
relativa do resultado frente ao ano ativo anterior (`netDelta` via `csvDeltaPct`: "+25%"/"-30%"/"0%"/"novo"), encerrada numa
linha "Total" com os somatórios da série (os números do rodapé `<tfoot>` da tabela). Colunas
Ano/Receitas (R$)/Despesas (R$)/Resultado (R$)/Variação do resultado (%). O primeiro ano não tem base de comparação → célula de
variação vazia; o "Total" também (a `trend` de longo prazo, último vs. primeiro ano, é comparação distinta da variação ano a
ano, então não vai na coluna). **Diferente da página** (que oculta a variação quando o ano anterior teve resultado 0, para não
exibir "novo"), o CSV emite "novo" nesses casos, mantendo a convenção legível por máquina de `categoryVariationToCsv`. Rota
`/financas/crescimento/export` reusa a mesma consulta/`yearlyHistory` da página (série inteira por design, sem `?ano=`) +
BOM UTF-8; nome fixo `crescimento-ano-a-ano.csv`; botão "⬇ CSV" no cabeçalho só com `history.years.length > 0`. **+3 testes**
(`describe("yearlyHistoryToCsv")`: só cabeçalho + Total zerado sem transações; uma linha por ano ativo em ordem crescente com a
variação do resultado (+100%) + Total; emite "novo" quando o ano anterior teve resultado 0 e ignora anos sem movimento). Smoke
test (`next start`) → `/login` 200 e `/financas/crescimento` + `/financas/crescimento/export` 307 (auth-gated). `npm audit` sem
novas vulnerabilidades (mesmos advisories Next/postcss da D6). Ver D154; segue 945 da
Sessão 161 (**exportação CSV da fidelização de contratantes** em `/contatos/retencao/export` — a tela
"Fidelização de contratantes" (`clientRetention`, quem volta a te contratar) ganhou botão de exportação, mais uma lacuna de
exportação tabular fechada (do lado Contatos, onde só ranking/rentabilidade exportavam). Novo serializador puro
`clientRetentionToCsv(retention)` + `CLIENT_RETENTION_CSV_HEADERS` em `src/lib/csv.ts` recebe a `ClientRetention` já computada
(`clientRetention`, de `@/lib/contacts`). **Diferente da tela** (cuja tabela lista só os recorrentes), o CSV emite **todas** as
linhas — `retention.rows`, todos os contratantes com ≥1 show não cancelado, na mesma ordem da página (shows desc, cachê desc,
nome pt-BR) — marcando cada uma com a coluna "Recorrente" (Sim/Não), de modo que a planilha abra tanto os fiéis quanto os de
um show só (candidatos a follow-up, que a tela só conta no card "Contratantes únicos"). Colunas
Contratante/Papel/Shows/Cachê total (R$)/Último show/Recorrente, encerradas numa linha "Total" com a soma de shows e cachê de
toda a carteira e, na coluna "Recorrente", "recorrentes/total" (ex.: "1/2"). Cachê é por contato (um show com vários contatos
conta para cada); cancelados ficam de fora; futuros confirmados contam (re-contratação agendada também é fidelização). Rota
`/contatos/retencao/export` reusa a mesma consulta/`clientRetention` da página + BOM UTF-8; nome fixo
`fidelizacao-contratantes.csv`; botão "⬇ CSV" no cabeçalho só com `retention.totalClients > 0`. Primeiro import de tipo de
`@/lib/contacts` em `csv.ts` (sem ciclo: `contacts.ts` não importa `csv.ts`). **+3 testes**
(`describe("clientRetentionToCsv")`: só cabeçalho + Total zerado sem contratantes; uma linha por contratante em ordem de shows
desc com Recorrente Sim/Não + Total "1/2"; exclui contratantes só-cancelados e conta futuro confirmado na recorrência). Smoke
test (`next start`) → `/login` 200 e `/contatos/retencao` + `/contatos/retencao/export` 307 (auth-gated). `npm audit` sem novas
vulnerabilidades (mesmos advisories Next/postcss da D6). Ver D153; segue 942 da
Sessão 160 (**exportação CSV da sazonalidade financeira** em `/financas/sazonalidade/export` — a tela
"Média por mês do ano" (`monthlySeasonality`, receita/despesa/resultado médios por mês do calendário) ganhou botão de
exportação, fechando a assimetria com o eixo dos shows (`gigSeasonalityToCsv`/D139, que já exportava) e mais uma lacuna de
exportação tabular das Finanças. Novo serializador puro `monthlySeasonalityToCsv(seasonality)` +
`MONTHLY_SEASONALITY_CSV_HEADERS` em `src/lib/csv.ts` espelha a tabela: **sempre as 12 linhas** de mês (janeiro→dezembro,
inclusive meses sem movimento — preserva os vales que a tela destaca), com receita média, despesa média e resultado médio
(a média por ano-ativo de cada mês) + o nº de anos-ativos, seguida de uma linha "Total". Colunas
Mês/Receita média (R$)/Despesa média (R$)/Resultado médio (R$)/Anos. O Total é o **ano típico composto** (soma das médias
mensais — receita/despesa/resultado de um ano em que cada mês rende o seu valor típico, número de planejamento), com a
coluna "Anos" trazendo `yearsObserved` (amplitude do histórico, distinta dos anos-ativos por mês). Usa o nome completo do
mês (não a chave ISO das séries temporais: a sazonalidade colapsa todos os anos num só ciclo de 12 meses, sem ano a
desambiguar) e registra 0,00/0 nos meses parados (não o "—" da UI). Rota `/financas/sazonalidade/export` reusa a mesma
consulta/`monthlySeasonality` da página + BOM UTF-8; nome fixo `sazonalidade-financeira.csv`; botão "⬇ CSV" no cabeçalho só
com `hasActivity`. **+3 testes** (`describe("monthlySeasonalityToCsv")`: só cabeçalho + 12 meses zerados + Total zerado sem
transações; média por ano-ativo por mês + Total composto com `yearsObserved`; registra 0,00/0 nos meses sem movimento).
Smoke test (`next start`) → `/login` 200 e `/financas/sazonalidade` + `/financas/sazonalidade/export` 307 (auth-gated).
`npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6). Ver D152; segue 939 da
Sessão 159 (**exportação CSV da evolução do cachê** em `/shows/evolucao-cache/export` — a tela "Evolução do
cachê" (`feeTrend`, cachê médio realizado mês a mês) ganhou botão de exportação, mais uma lacuna fechada após
cadência/sazonalidade/dia-da-semana/faixa-de-cachê. Novo serializador puro `feeTrendToCsv(trend)` + `FEE_TREND_CSV_HEADERS`
em `src/lib/csv.ts` espelha a tabela "Cachê médio mês a mês": uma linha por **mês ativo** (show realizado com cachê), em ordem
cronológica crescente, com cachê médio/mínimo/máximo do mês e a contagem de shows, seguida de uma linha "Total" cujos valores
são os agregados gerais da tela (cachê médio geral, menor/maior cachê, total de shows — batem com os cards de destaque).
Colunas Mês/Cachê médio (R$)/Cachê mínimo (R$)/Cachê máximo (R$)/Shows. A coluna "Mês" usa a chave ISO "YYYY-MM" (ordenável
por máquina), não o rótulo "Jan 2026" da UI; a "Faixa" da tela vira duas colunas (mín/máx) para abrir limpo na planilha. Só
meses ativos viram linha (janela aberta, pode abranger anos). Rota `/shows/evolucao-cache/export` reusa a mesma
consulta/`feeTrend` da página + BOM UTF-8; nome fixo `evolucao-cache.csv`; botão "⬇ CSV" no cabeçalho só com
`trend.totalShows > 0`. **+3 testes** (`describe("feeTrendToCsv")`: só cabeçalho + Total zerado sem shows com cachê; uma
linha por mês ativo (média/mín/máx, ordem cronológica, mês parado fora) + Total com agregados gerais; ignora
propostos/cancelados/futuros/sem-cachê). Smoke test (`next start`) → `/login` 200 e `/shows/evolucao-cache` +
`/shows/evolucao-cache/export` 307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da
D6). Ver D151; segue 936 da Sessão 158 (**exportação CSV da cadência de shows** em `/shows/cadencia/export` — a última tela de análise de
shows sem botão de exportação ganhou o seu, fechando a lacuna após sazonalidade/dia-da-semana/faixa-de-cachê. Novo
serializador puro `gigCadenceToCsv(cadence)` + `GIG_CADENCE_CSV_HEADERS` em `src/lib/csv.ts` espelha a tabela "Shows mês a
mês": uma linha por **mês ativo** (com ao menos um show realizado), em ordem cronológica crescente, com a contagem de shows,
seguida de uma linha "Total" — colunas Mês/Shows. A coluna "Mês" usa a chave ISO "YYYY-MM" (ordenável por máquina, inambígua
entre anos), e não o rótulo "Jan 2026" da UI. Diferente de sazonalidade/dia-da-semana (baldes fixos de 12 meses / 7 dias), só
emite meses ativos — a janela da cadência é aberta e pode abranger anos; `idleMonths` já resume o vazio. Rota
`/shows/cadencia/export` reusa a mesma consulta/`gigCadence` da página (sem `?ano=`: é a série temporal inteira por design) +
BOM UTF-8; nome fixo `cadencia-shows.csv`; botão "⬇ CSV" no cabeçalho só com `cadence.totalShows > 0`. **+3 testes**
(`describe("gigCadenceToCsv")`: só cabeçalho + Total zerado sem shows; uma linha por mês ativo em ordem cronológica com mês
parado fora + Total; ignora propostos/cancelados/futuros). Smoke test (`next start`) → `/login` 200 e `/shows/cadencia` +
`/shows/cadencia/export` 307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6). Ver
D150; segue 933 da Sessão 157 (**recorte por ano (`?ano=`) na Composição de despesas** em `/financas/composicao-despesas` — a tela
e seu export deixaram de somar só "todos os anos" e ganharam o seletor de período (`PeriodPicker`/D119), espelho direto da
Sessão 156 (Fontes de renda/D148) no eixo de despesa. Novo derivador puro `expenseMixYears(txs)` em `src/lib/finance.ts`
devolve os anos UTC (decrescente) **só** das transações de despesa (`type === "EXPENSE"`), o **mesmo** gate de `expenseMix`,
para o seletor nunca oferecer um ano sem despesa — irmão paralelo de `incomeMixYears`. O recorte reusa os helpers da D108
(`parseProfitYear` + o genérico `filterShowsByYear<{date: Date}>` sobre as transações cruas): filtra-se ANTES de
mapear/`expenseMix` (que segue puro, agnóstico ao recorte). Botão "⬇ CSV" e a rota `/financas/composicao-despesas/export`
propagam o `?ano=`; arquivo passou de fixo para `composicao-despesas-{ano|todos}.csv`; estado-vazio e nota de rodapé agora
cientes do período. Fecha o par income/expense de mix das Finanças no eixo de período. **+6 testes**
(`describe("expenseMixYears")`: anos UTC decrescentes/dedup; ignora receitas; ano UTC na virada do dia; aceita `Date`|string;
vazio sem despesa; invariante de gate compartilhado). Smoke test (`next start`) → `/login` 200 e
`/financas/composicao-despesas?ano=2026` + `/financas/composicao-despesas/export?ano=2026` 307 (auth-gated). `npm audit` sem
novas vulnerabilidades (mesmos advisories Next/postcss da D6). Ver D149; segue 927 da
Sessão 156 (**recorte por ano (`?ano=`) nas Fontes de renda** em `/financas/fontes-de-renda` — a tela e seu
export deixaram de somar só "todos os anos" e ganharam o seletor de período (`PeriodPicker`/D119). Novo derivador puro
`incomeMixYears(txs)` em `src/lib/finance.ts` devolve os anos UTC (decrescente) **só** das transações de receita
(`type === "INCOME"`), o **mesmo** gate de `incomeMix`, para o seletor nunca oferecer um ano sem fonte de renda — espelho de
`feeDistributionYears`/`weekdayPerformanceYears` no eixo de transação. O recorte reusa os helpers da D108
(`parseProfitYear` + o genérico `filterShowsByYear<{date: Date}>`, aplicado às transações cruas, que têm `date: Date`):
filtra-se ANTES de mapear/`incomeMix` (que segue puro, agnóstico ao recorte). Botão "⬇ CSV" e a rota
`/financas/fontes-de-renda/export` propagam o `?ano=`; arquivo passou de fixo para `fontes-de-renda-{ano|todos}.csv`;
estado-vazio e nota de rodapé agora cientes do período. **+5 testes** (`describe("incomeMixYears")`: anos UTC
decrescentes/dedup; ignora despesas; ano UTC na virada do dia; aceita `Date`|string; vazio sem receita). Smoke test
(`next start`) → `/login` 200 e `/financas/fontes-de-renda?ano=2026` + `/financas/fontes-de-renda/export?ano=2026` 307
(auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6). Ver D148; segue 922 da
Sessão 155 (**exportação CSV da variação por categoria** em `/financas/variacao/export` — novo serializador
puro `categoryVariationToCsv(cmp)` + `CATEGORY_VARIATION_CSV_HEADERS` em `src/lib/csv.ts`, recebendo a `CategoryReportComparison`
já computada (`compareCategoryReports`, de `@/lib/finance`) e emitindo as **duas tabelas da tela num único arquivo** — cada
linha marcada pela coluna `Tipo` (Despesa/Receita), despesas primeiro, na ordem da comparação (maior movimento absoluto
primeiro), cada seção terminando numa linha "Total" com somatórios + variação do total (sempre presente, mesmo sem
categorias). Colunas Tipo/Categoria/Mês anterior (R$)/Este mês (R$)/Variação (R$)/Variação (%); a variação relativa usa o
helper local novo `csvDeltaPct` ("+25%"/"-30%"/"0%" com sinal, ou "novo" quando o mês anterior é 0, espelhando a página).
Rota `/financas/variacao/export?mes=YYYY-MM` reusa a mesma leitura de mês (`parseMonthKey`/`shiftMonth`/`monthKey`), consulta
e `compareCategoryReports` da página + BOM UTF-8; nome `variacao-por-categoria-{mes}.csv`; botão "⬇ CSV" no cabeçalho só com
`hasData`, propagando o `?mes=` ativo. Fecha a última lacuna de exportação tabular das Finanças. **+3 testes**
(`describe("categoryVariationToCsv")`: cabeçalho + duas linhas Total zeradas sem transação; despesas/receitas por Tipo com
variação e Totais incluindo categoria "novo"; quedas com % negativa e categoria sumida como −100%). Smoke test (`next start`)
→ `/login` 200 e `/financas/variacao?mes=2026-06` + `/financas/variacao/export?mes=2026-06` 307 (auth-gated). Ver D147;
segue 919 da Sessão 154 (**recorte por ano (`?ano=`) no desempenho por dia da semana** em `/shows/dias-semana` — a tela e
seu export deixaram de somar só "todos os anos" e ganharam o seletor de período (`PeriodPicker`/D119), reusando os helpers da
D108 (`parseProfitYear`/`filterShowsByYear`) + novo derivador puro `weekdayPerformanceYears(shows, { now? })` em
`src/lib/finance.ts` que devolve os anos UTC (decrescente) **só** dos shows que entram no cálculo — realizados
(`isHappenedGig`) com cachê > 0, o **mesmo** gate de `weekdayPerformance`, para o seletor nunca oferecer um ano de tabela
vazia. Filtra-se ANTES de mapear/`weekdayPerformance` (que segue puro). Espelho direto da D143 (faixas de cachê) no eixo de
dia da semana; mantido como função própria — e não reuso de `feeDistributionYears`, hoje de gate idêntico — para não acoplar
as duas telas. Botão "⬇ CSV" e a rota `/shows/dias-semana/export` propagam o `?ano=`; arquivo passou de fixo para
`shows-por-dia-da-semana-{ano|todos}.csv`; estado-vazio agora é ciente do período. **+5 testes**
(`describe("weekdayPerformanceYears")`: anos UTC decrescentes/dedup só de realizados com cachê > 0; ignora
propostos/cancelados/futuros/sem-cachê; ano UTC na virada do dia; vazio sem elegíveis; invariante de gate compartilhado).
Smoke test (`next start`) → `/login` 200 e `/shows/dias-semana?ano=2025` + `/shows/dias-semana/export?ano=2025` 307
(auth-gated). Ver D146; segue 914 da Sessão 153 (**exportação CSV da composição de despesas** em `/financas/composicao-despesas/export` — novo
serializador puro `expenseMixToCsv(mix)` + `EXPENSE_MIX_CSV_HEADERS` em `src/lib/csv.ts`, espelho direto de `incomeMixToCsv`
(D144) no eixo de gastos: recebe o objeto `ExpenseMix` (`expenseMix`/D45, importado de `@/lib/finance`) e emite uma linha
por rubrica na mesma ordem da página (valor decrescente, empate por nome pt-BR) — colunas Categoria/Lançamentos/Total
(R$)/Participação — seguida de uma linha "Total" (participação em branco, sempre 100% por construção, e sem contagem de
lançamentos). Mesma convenção pt-BR do irmão (delimitador `;`, decimal com vírgula, BOM UTF-8 na camada HTTP). Rota
`/financas/composicao-despesas/export` reusa a mesma consulta/`expenseMix` da página (sem `?ano=`: a tela ainda não tem
recorte por período), nome fixo `composicao-despesas.csv`; botão "⬇ CSV" no cabeçalho só com `mix.categoryCount > 0`. Fecha
a assimetria com D144: as duas telas-irmãs de mix das Finanças (fontes de renda × composição de despesas) agora exportam.
**+3 testes** (`describe("expenseMixToCsv")`: só cabeçalho + Total zerado sem despesa; uma linha por rubrica em ordem
decrescente + Total com participação em branco; ignora receitas e agrupa sem categoria em "Sem categoria"). Smoke test
(`next start`) → `/login` 200 e `/financas/composicao-despesas` + `/financas/composicao-despesas/export` 307 (auth-gated).
Ver D145; segue 911 da Sessão 152 (**exportação CSV das fontes de renda** em `/financas/fontes-de-renda/export` — novo serializador
puro `incomeMixToCsv(mix)` + `INCOME_MIX_CSV_HEADERS` em `src/lib/csv.ts`, irmão direto de `feeDistributionToCsv` (D142):
recebe o objeto `IncomeMix` (`incomeMix`/D45, importado de `@/lib/finance`) e emite uma linha por fonte na mesma ordem da
página (valor decrescente, empate por nome pt-BR) — colunas Fonte/Lançamentos/Total (R$)/Participação — seguida de uma linha
"Total" (com a participação em branco, sempre 100% por construção, e sem contagem de lançamentos). Mesma convenção pt-BR dos
irmãos (delimitador `;`, decimal com vírgula, BOM UTF-8 na camada HTTP). Rota `/financas/fontes-de-renda/export` reusa a mesma
consulta/`incomeMix` da página (sem `?ano=`: a tela ainda não tem recorte por período), nome fixo `fontes-de-renda.csv`; botão
"⬇ CSV" no cabeçalho só com `mix.sourceCount > 0`. Fecha uma lacuna de exportação do lado das Finanças (até então só
transações/D14, resumo anual/D47 e trimestral exportavam). **+3 testes** (`describe("incomeMixToCsv")`: só cabeçalho + Total
zerado sem receita; uma linha por fonte em ordem decrescente + Total com participação em branco; ignora despesas e agrupa sem
categoria em "Sem categoria"). Smoke test (`next start`) → `/login` 200 e `/financas/fontes-de-renda` +
`/financas/fontes-de-renda/export` 307 (auth-gated). Ver D144; segue 908 da Sessão 151 (**recorte por ano (`?ano=`) na distribuição por faixa de cachê** em `/shows/faixas-de-cache` —
a tela e seu export deixaram de somar só "todos os anos" e ganharam o seletor de período (`PeriodPicker`/D119) das telas de
rentabilidade, reusando os helpers da D108 (`parseProfitYear`/`filterShowsByYear`) + novo derivador puro
`feeDistributionYears(shows, { now? })` em `src/lib/finance.ts` que devolve os anos UTC (decrescente) **só** dos shows que
entram na distribuição — realizados (`isHappenedGig`) com cachê > 0, o **mesmo** gate de `feeDistribution` — para o seletor
nunca oferecer um ano que renderia tabela vazia (ao contrário de `showProfitYears`, que parte de uma lista já filtrada pela
tela). Filtra-se por ano **antes** de mapear/`feeDistribution` (que segue puro e agnóstico ao recorte). Botão "⬇ CSV" e a
rota `/shows/faixas-de-cache/export` propagam o `?ano=` ativo; arquivo passou de fixo para `faixas-de-cache-{ano|todos}.csv`.
Reverte conscientemente o adiamento da D142(b): a distribuição por faixa **por ano** mostra a evolução do posicionamento de
preço (em que faixa toquei *neste ano* vs. o histórico), e fecha a assimetria com as telas de rentabilidade (todas já tinham
`?ano=`); distinto da sazonalidade por mês (D133(b)), que colapsa os anos por design. **+4 testes**
(`describe("feeDistributionYears")`: anos UTC decrescentes/dedup só de realizados com cachê > 0; ignora
propostos/cancelados/futuros/sem-cachê; ano UTC na virada do dia; vazio sem elegíveis). Smoke test (`next start`) →
`/login` 200 e `/shows/faixas-de-cache?ano=2025` + `/shows/faixas-de-cache/export?ano=2025` 307 (auth-gated). Ver D143;
segue 904 da Sessão 150 (**exportação CSV da distribuição por faixa de cachê** em `/shows/faixas-de-cache/export` — novo
serializador puro `feeDistributionToCsv(dist)` + `FEE_DISTRIBUTION_CSV_HEADERS` em `src/lib/csv.ts`, irmão direto de
`gigSeasonalityToCsv`/`weekdayPerformanceToCsv` (D139/D140): recebe o objeto `FeeDistribution` (`feeDistribution`, importado
de `@/lib/finance`) e emite sempre as 6 linhas de faixa (Até R$ 500 → Acima de R$ 5.000, na ordem de `FEE_BANDS`, inclusive
faixas zeradas — preserva o "formato da tabela de cachês" sem pular degraus) + linha "Total", colunas
Faixa/Shows/% dos shows/Faturamento/% do faturamento (participações via `csvShare`); como nos irmãos, o CSV registra
`0`/`0%`/`0,00` nas faixas vazias (a UI usa "—") e os shares do Total ficam em branco (sempre 100%). Diferente da
sazonalidade/dia-da-semana, **não** traz cachê médio por linha (faixa é um intervalo de preço, não um balde de tempo;
`FeeBandStat` não computa média por faixa). Rota `/shows/faixas-de-cache/export` reusa a mesma consulta/`feeDistribution`
da página, nome fixo `faixas-de-cache.csv`; botão "⬇ CSV" no cabeçalho só com `dist.totalShows > 0`. **+3 testes**; smoke
test (`next start`) → `/login` 200 e a rota 307 (auth-gated). Ver D142; segue 901 da Sessão 149 (**comparativo ano a ano da concentração por papel** em `/contatos/rentabilidade/por-papel` — novo
helper puro `compareRoleConcentration(current, previous)` + tipo `RoleConcentrationComparison` em `src/lib/finance.ts`,
cópia estrutural de `compareClientConcentration`/`compareGeoConcentration` (D120) num eixo de **papel do comprador**:
recebe duas `roleConcentration` já computadas (cada uma sobre `rankRolesByProfit` do seu período) e devolve `topShareDelta`,
`effectiveRolesDelta` e `trend` ("improved"/"worsened"/"stable") via o **mesmo** `concentrationTrend` compartilhado
(`GEO_TREND_EPSILON`=0,05). Fecha a última lacuna de simetria entre os três eixos de concentração (praça/cliente já tinham
comparativo; papel só ganhou concentração na D138). Card `RoleComparisonCard` (espelha o `ClientComparisonCard`) com badge
🟢/🔴/⚪ + variação do maior papel em p.p. (com os dois valores ano→ano) + variação de papéis efetivos, exibido só com um
ano específico selecionado **e** papel identificado nos dois períodos (`roleCount > 0` em ambos), reaproveitando o recorte
por ano UTC (D108) sobre os shows já carregados (**sem nova consulta**). **+5 testes**; smoke test (`next start`) →
`/login` 200 e `/contatos/rentabilidade/por-papel?ano=2025` 307 (auth-gated). Ver D141; segue 896 da Sessão 148 (**exportação CSV do desempenho por dia da semana** em `/shows/dias-semana/export` — novo
serializador puro `weekdayPerformanceToCsv(wp)` + `WEEKDAY_PERFORMANCE_CSV_HEADERS` em `src/lib/csv.ts`, irmão direto de
`gigSeasonalityToCsv` (D139): recebe o objeto `WeekdayPerformance` (`weekdayPerformance`, importado de `@/lib/finance`) e
emite sempre as 7 linhas de dia (domingo→sábado, inclusive dias zerados — preserva as lacunas da agenda que a tela
destaca) + linha "Total", colunas Dia/Shows/Cachê médio/Faturamento/% dos shows/% do faturamento (participações via
`csvShare`); como na irmã, o CSV registra `0`/`0,00` nos dias vazios (a UI usa "—") e os shares do Total ficam em branco
(sempre 100%). Rota `/shows/dias-semana/export` reusa a mesma consulta da página (`weekdayPerformance`), nome fixo
`shows-por-dia-da-semana.csv`; botão "⬇ CSV" no cabeçalho só com `wp.totalShows > 0`. **+3 testes**; smoke test
(`next start`) → `/login` 200 e a rota 307 (auth-gated). Ver D140; segue 893 da Sessão 147 (**exportação CSV da sazonalidade de shows** em `/shows/sazonalidade/export` — novo
serializador puro `gigSeasonalityToCsv(season)` + `GIG_SEASONALITY_CSV_HEADERS` em `src/lib/csv.ts`, na mesma convenção
pt-BR dos irmãos (delimitador `;`, decimal com vírgula, BOM UTF-8 na camada HTTP): recebe o objeto `GigSeasonality` (D133)
e emite sempre as 12 linhas de mês (jan→dez, inclusive meses zerados — preserva os vales que a tela destaca) + linha
"Total", colunas Mês/Shows/Cachê médio/Faturamento/% dos shows/% do faturamento (participações via `csvShare`); diferente
da UI (que mostra "—" nos meses vazios), o CSV registra `0`/`0,00` para ficar legível por máquina, e os shares do Total
ficam em branco (sempre 100%). Rota `/shows/sazonalidade/export` reusa a mesma consulta da página (`gigSeasonality`), nome
fixo `sazonalidade-shows.csv` (sem `?ano=`: a sazonalidade soma todos os anos por design); botão "⬇ CSV" no cabeçalho só
com `season.totalShows > 0`. **+3 testes**; smoke test (`next start`) → `/login` 200 e a rota 307 (auth-gated). Ver D139;
segue 890 da Sessão 146 (**concentração por papel** em `/contatos/rentabilidade/por-papel` — novo helper puro
`roleConcentration(rows)` em `src/lib/finance.ts` espelhando `clientConcentration`/D109 e `geoConcentration`/D113 num eixo
de papel: sobre as linhas de `rankRolesByProfit`, considera só papéis identificados (descarta `role: null`) com receita
bruta positiva e deriva `topShare`/`top3Share`/`hhi`/`effectiveRoles` + veredito via `diversificationLevel`; card
"Concentração por papel" (3 métricas + badge 🔴/🟡/🟢) exibido só com `roleCount > 0`, rótulos via `CONTACT_ROLE_LABELS`.
**+6 testes**; smoke test autenticado renderizou o card com veredito "Moderada". Ver D138; segue 884 da Sessão 145
(**exportação CSV da rentabilidade por papel** em `/contatos/rentabilidade/por-papel/export` —
`roleProfitToCsv`/`ROLE_PROFIT_CSV_HEADERS` em `src/lib/csv.ts` espelhando `contactProfitToCsv`/D105 sem a coluna
"Contratante" (1ª coluna "Papel", grupo `role: null` → "Sem contratante", cachê mediano gated por `MIN_MEDIAN_FEE_SAMPLE`);
rota `/contatos/rentabilidade/por-papel/export?ano=` reusa a mesma consulta/recorte da página + BOM UTF-8; botão "⬇ CSV"
no cabeçalho. +4 testes. Ver D137; segue a Sessão 144 (**rentabilidade por papel do contratante em
`/contatos/rentabilidade/por-papel`** — rollup
acima da rentabilidade por contratante (D105): agrupa os shows pelo **papel** de quem paga (Casa de show / Produtor /
Promoter / Contratante…) em vez de por pessoa, respondendo "que tipo de comprador rende mais por show?" — útil para
decidir onde investir prospecção. Novo helper puro `rankRolesByProfit(shows, txs, getPayer, opts?)` em `src/lib/finance.ts`
espelhando `rankContactsByProfit` (mesma atribuição de **um** pagador por show via `pickPayerContact`, mesmos campos
`showCount`/`totalFee`/`totalExtra`/`totalExpenses`/`totalNet`/`avgNet`/`avgFee`/`medianFee`/`margin`, exclui `CANCELLED`
por padrão), só que a chave de grupo é o `role` do pagador — vários contratantes do mesmo papel somam num só grupo; shows
sem contato vão para "Sem contratante" (`role: null`, sempre por último); `best`/`worst`/`roleCount` ignoram o grupo sem
contratante. Devolve `RolesProfitability` (`rows: RoleProfitRow[]`). Página server component `/contatos/rentabilidade/por-papel`
espelhando o layout da tela por contratante (cards de destaque + `PeriodPicker`/`?ano=` reusando os três helpers da D108 +
tabela com cachê médio/mediano), com badge de papel por linha (sem link, papel não é entidade) e cross-link "Por papel"
↔ "Por contratante"; registrada no hub (`REPORT_GROUPS`, área Contatos, subtema "Quem move a carreira", após "Rentabilidade
por contratante"). **+5 testes**; validado por smoke test autenticado (200 + dois produtores agrupados no papel PROMOTER +
rótulos de papel + "Sem contratante" + seletor de período). Ver D136; segue 875 da Sessão 143 (**nudge "mês fraco à frente" (vale da temporada) no Painel** — espelho simétrico do nudge de
mês forte (D134): novo helper puro `gigSeasonalityLull(seasonality, { now? })` em `src/lib/finance.ts`, idêntico a
`gigSeasonalityHeadline` no sentido oposto (mesma janela `STRONG_MONTH_HORIZON`=4, mesma amostra mínima
`STRONG_MONTH_MIN_SHOWS`=6, mesmo `now` injetável), que varre **só para frente** e escolhe o **mês fraco mais cedo** com
`feeShare ≤ WEAK_MONTH_FACTOR/12` (=0.75/12, ≥25% **abaixo** do mês médio), exigindo `count > 0` (vale histórico, não
ausência de dados). Devolve `{ show, month, monthsAhead, shortfall }` (`shortfall` = `1 − feeShare×12`). Banner-nudge 🍂
"Mês fraco à frente" (estilo âmbar) em `dashboard/page.tsx`, reaproveitando a **mesma** `gigSeasonality(shows)` já
computada para o nudge de pico (**zero consulta nova**) e **cedendo a vez** ao nudge de mês forte (só aparece quando
`!seasonHeadline.show` → no máximo um nudge de sazonalidade por vez, respeitando a densidade do Painel/D134(d)); mostra o
mês, o lead time e `shortfall×100`% "abaixo do mês médio", linkando para `/shows/sazonalidade`. **+5 testes**; validado
por smoke test autenticado (200 + banner 🍂 com mês/lead time/% abaixo sobre dados forjados de vale, sem o nudge de pico).
Ver D135; segue 870 da Sessão 142 (**nudge "próximo mês forte" no Painel a partir da sazonalidade** — transforma a sazonalidade
dos shows (D133) em **antecedência**: novo helper puro `gigSeasonalityHeadline(seasonality, { now? })` em
`src/lib/finance.ts` (espelha a disciplina de `geoConcentrationHeadline`/`cashBurnHeadline` — regra de exibição no helper,
Painel só consome) que varre **só para frente**, do mês seguinte até `STRONG_MONTH_HORIZON` (=4) meses à frente
(excluindo o mês corrente), e escolhe o **mês forte mais cedo** que qualifica (`feeShare ≥ STRONG_MONTH_FACTOR/12`, =1.25/12,
i.e. ≥25% acima do faturamento do mês médio), só com amostra mínima `totalShows ≥ STRONG_MONTH_MIN_SHOWS` (=6). Devolve
`{ show, month, monthsAhead, lift }` (`lift` = `feeShare × 12`, múltiplo da média). Banner-nudge 📈 "Mês forte chegando"
em `dashboard/page.tsx` (estilo brand, como o de fim de semana livre), reaproveitando os `shows` já carregados via
`gigSeasonality(shows)` — zero consulta nova — exibindo o mês, o lead time ("mês que vem"/"daqui a N meses") e `(lift−1)×100`%
"acima do mês médio", linkando para `/shows/sazonalidade`. **+5 testes**; validado por smoke test autenticado (200 + banner
com mês/lead time/% acima sobre dados forjados de pico). Ver D134; segue 865 da Sessão 141 (**sazonalidade de shows por mês do ano em `/shows/sazonalidade`** —
fecha a lacuna do eixo "mês do calendário" em "Agenda & pipeline": já havia *quando na semana* (`weekdayPerformance`/
`/shows/dias-semana`) e *cadência no tempo* (`/shows/cadencia`), mas não *quais meses do ano* (jan→dez, somando todos os
anos) historicamente rendem mais shows e maiores cachês. Novo helper puro `gigSeasonality(shows, { now? })` em
`src/lib/finance.ts` espelhando integralmente `weekdayPerformance` num eixo de 12 meses: agrega os shows realizados
(`isHappenedGig`) com cachê > 0 por `getUTCMonth()`, colapsando todos os anos no mesmo balde; sempre 12 entradas
`GigMonthStat` (mês/label/count/totalFee/avgFee/countShare/feeShare, inclusive meses zerados) + destaques `busiest`/
`bestByVolume`/`bestByAvg` com o mesmo desempate determinístico (mês mais cedo vence). Rótulos exportados
`GIG_MONTH_LABELS`/`GIG_MONTH_SHORT` definidos localmente (finance.ts não tem imports, como já faz com `WEEKDAY_LABELS`).
Página `/shows/sazonalidade` (server component) com três cards de destaque + tabela "Shows por mês do ano" (barra
proporcional ao nº de shows), espelhando o layout de `/shows/dias-semana`; registrada no hub (`REPORT_GROUPS`, subtema
"Agenda & pipeline", após "Cadência"). **+6 testes**; validado por smoke test autenticado (200 + destaques + rótulos de
mês + selo "mais cheio" + entrada no hub). Distinto do `monthlySeasonality` (que opera sobre transações, não cachês de
shows). Ver D133; segue 859 da Sessão 140 (**exportação CSV do prazo de recebimento por show em `/shows/prazo-recebimento`** —
fecha a alternativa (b) adiada na D131 e a última lacuna de exportação tabular do acervo: a tela-mãe (uma linha por show,
do prazo mais lento ao mais rápido) ainda não exportava. Serializador puro novo `paymentLagToCsv` em `src/lib/csv.ts` na
mesma convenção pt-BR (delimitador `;`, decimal com vírgula, datas UTC, BOM), consumindo a forma mínima local
`PaymentLagCsvRow` (não importa `PaymentLagShowRow` de `@/lib/finance`, que carrega o show inteiro). Colunas
Show/**Data**/**Local**/**Cidade**/Recebido/**Recebimentos**/**Prazo médio (dias)**/**Pior prazo (dias)**/**Velocidade**;
prazos como inteiros (negativo = adiantado), "Velocidade" via `PAYMENT_SPEED_BUCKET_LABELS`. Sem prazo mediano por linha
(a mediana é propriedade de um grupo de shows, não de um show isolado — fica na visão por contratante/D131). Route
`prazo-recebimento/export/route.ts` espelha a query da página e reusa a camada pura testada `paymentLag` (que já ordena do
mais lento ao mais rápido); arquivo `prazo-recebimento.csv`. Botão "⬇ CSV" só com `lag.rows.length > 0`. **+5 testes**;
validado por smoke test autenticado (200 + `text/csv` + CSV correto + página com o botão). Ver D132; segue 854 da Sessão 139 (**exportação CSV do prazo de recebimento por contratante em `/shows/prazo-recebimento/por-contratante`** —
fecha a última lacuna de exportação do acervo de análise (as duas telas de "prazo de recebimento" eram as únicas sem CSV):
serializador puro novo `paymentLagByContactToCsv` em `src/lib/csv.ts` na mesma convenção pt-BR (delimitador `;`, decimal com
vírgula, BOM), consumindo a forma mínima local `PaymentLagByContactCsvRow` (não importa `ContactPaymentLagRow` de
`@/lib/finance`). Colunas Contratante/**Papel**/Recebido/Shows/**Prazo médio (dias)**/**Prazo mediano (dias)**/**Pior prazo
(dias)**/**Participação**/**Velocidade**; prazos como inteiros (negativo = adiantado), prazo mediano só a partir de
`MIN_MEDIAN_LAG_SAMPLE` (=3) shows pagos (abaixo disso em branco, espelha o "—" da UI/D130), "Velocidade" via
`PAYMENT_SPEED_BUCKET_LABELS`. Route `por-contratante/export/route.ts` espelha a query da página e reusa a camada pura testada:
`pickPayerContact`→`paymentLagByContact` (que já ordena do mais lento ao mais rápido e joga "Sem contratante" por último);
arquivo `prazo-recebimento-por-contratante.csv`. Botão "⬇ CSV" só com `lag.rows.length > 0`. **+7 testes**; validado por smoke
test autenticado (200 + CSV correto + página com o botão). Ver D131; segue 847 da Sessão 138 (**prazo MEDIANO de recebimento por contratante em `/shows/prazo-recebimento/por-contratante`** —
fecha o item adiado na D57/próximos passos (item 5) com a mesma mecânica da D123 (cachê mediano): `paymentLagByContact`
em `src/lib/finance.ts` passou a expor `medianDays` em `ContactPaymentLagRow`, via `weightedMedian` sobre os shows do
grupo (`value=avgDays`, `weight=received`) — os mesmos insumos do `avgDays`, espelhando o `medianDays` global de
`paymentLag`. A coluna "Prazo mediano" (entre "Prazo médio" e "Pior prazo") só aparece com `showCount >=
MIN_MEDIAN_LAG_SAMPLE` (=3, nova const exportada); abaixo disso "—" com `title` ("Mediana exige ao menos 3 shows pagos").
O helper segue puro e computa sempre; o gate é decisão de UI. Resolve na apresentação a ressalva de "ruidoso com poucos
shows por contratante" (D57). **+4 testes** (mediana vs. outlier 5/10/90→10 com avg>mediana; nº par→15; 1 show→o próprio
prazo); validado por smoke test autenticado (200 + coluna e ambos os ramos do gate). Ver D130; segue 844 da Sessão 137 (**exportação CSV dos cachês a receber por contratante em `/shows/a-receber/por-contratante`** —
fecha a alternativa (d) adiada na D128: estende o botão "⬇ CSV" à visão "de quem cobrar primeiro" (agregada por **devedor**,
não por show). Serializador puro novo `receivablesByContactToCsv` em `src/lib/csv.ts` na mesma convenção pt-BR (delimitador
`;`, decimal com vírgula, BOM), consumindo uma forma mínima local `ReceivableByContactCsvRow` (não importa
`ContactReceivableRow` de `@/lib/finance`). Colunas Contratante/**Papel**/A receber/Shows/**Pior atraso (dias)**/**Atraso
médio (dias)**/**Participação**/**Promessas vencidas**/**A receber vencido**; "Sem contratante" com papel em branco,
participação em % inteira. Route `por-contratante/export/route.ts` espelha a query da página e reusa **toda** a camada pura
testada: `reconcileShowFees`→`pickPayerContact`→`outstandingByContact` (que já ordena pelo maior devedor e joga "Sem
contratante" por último) + `summarizePaymentPromises` por grupo; arquivo `caches-a-receber-por-contratante.csv`. Botão só
com `byContact.count > 0`. **+6 testes**; validado por smoke test autenticado (200 + CSV correto). Ver D129; segue 838 da
Sessão 136 (**exportação CSV dos cachês a receber em `/shows/a-receber`** — estende o botão "⬇ CSV" das
D125/D127 à tela de dinheiro na mesa: serializador puro novo `receivablesToCsv` em `src/lib/csv.ts` na mesma convenção
pt-BR (delimitador `;`, decimal com vírgula, datas UTC, BOM), consumindo uma forma mínima local `ReceivableCsvRow` (não
importa `ShowReceivableRow` de `@/lib/finance`, que não carrega título/local). Colunas Show/Data/Local/Cidade/**Dias em
atraso**/Cachê/Recebido/A receber/**Situação**/Promessa/**Status promessa**: "Situação" consolida os textos da tela
(não lançada / lançada pendente / parcial) e "Status promessa" mapeia `paymentPromiseStatus` (Vencida/No prazo/vazio).
Route `shows/a-receber/export/route.ts` espelha a query da página e reusa `reconcileShowFees`/`bucketReceivablesByAge`/
`paymentPromiseStatus`, ordenando pelo **atraso mais longo** (fila de cobrança, não a ordem cronológica da tabela);
arquivo `caches-a-receber.csv` (ASCII no header). Botão só com `result.count > 0`. **+7 testes**; validado por smoke
test autenticado (200 + CSV correto). Ver D128; segue 831 da Sessão 135 (**exportação CSV do ranking de contatos por atividade em `/contatos/ranking`** — estende o
botão "⬇ CSV" da D125 (rentabilidade) à primeira tela tabular de **CRM**: serializador puro novo `contactActivityToCsv`
em `src/lib/csv.ts` na mesma convenção pt-BR (delimitador `;`, decimal com vírgula, datas UTC via `csvDate`, BOM UTF-8),
consumindo uma forma mínima local `ContactActivityCsvRow` (não importa `ContactRankRow` de `@/lib/contacts` — evita
acoplar `csv.ts` ao CRM, como `CsvTransaction`/`CsvShow`; estruturalmente compatível). Colunas
Contato/Papel/**Shows ativos**/**Shows (total)**/Próximos/Cachê total/Último show — a célula "ativos / total" da tela
vira duas colunas separadas no CSV (mais útil p/ ordenar/filtrar em planilha); papel via `contactRoleLabel`, último show
vazio quando `null`. Route fino `contatos/ranking/export/route.ts` espelha a query e a ordenação da página
(`rankContactsByActivity`), sem `?ano=` (a tela não tem recorte por período); botão só com `ranking.count > 0`. **+4
testes**; ver D127; segue 827 da Sessão 134 (**veredito de tendência da queima de caixa em `/financas/folego-de-caixa`** — novo helper
puro `cashFlowTrend` em `src/lib/finance.ts` parte a janela do `cashFlowByMonth` em metade antiga × metade recente e
compara o fluxo líquido médio mensal de cada uma, classificando em acelerando/aliviando/estável (ou `insufficient` se
a janela for curta demais para duas metades de ≥ 2 meses; descarta o mês do meio quando ímpar). O limiar é relativo
(`CASH_FLOW_TREND_EPSILON`=15% sobre a maior das médias em módulo) com piso (`CASH_FLOW_TREND_FLOOR`=R$500/mês no
denominador) para não acusar tendência sobre médias quase nulas — espelha a mecânica de `concentrationTrend`/`GEO_TREND_EPSILON`
(D120) adaptada a centavos. Badge `CashFlowTrendBadge` abaixo da tira `MonthlyFlowStrip` no card "Cenário alternativo",
reusando o `cashFlowByMonth` já computado (zero consulta nova, mesmo recorte `?meses=`). Dá a **direção** que a média de
burn esconde (um caixa que despencou no fim tem a mesma média de outro se recompondo). **+7 testes**; ver D126; segue 820
da Sessão 133 (**exportação CSV das quatro telas de rentabilidade** — três serializadores puros novos em
`src/lib/csv.ts` na mesma convenção pt-BR das exportações anteriores (delimitador `;`, decimal com vírgula, datas UTC,
BOM): `showProfitToCsv` (`ShowProfitRow[]`: Show/Data/Status/Cachê/Extras/Despesas/Resultado/Margem), `venueProfitToCsv`
(`VenueProfitRow[]`, **serve local e cidade** — mesmo tipo — com a 1ª coluna rotulada por `groupLabel` "Local"/"Cidade")
e `contactProfitToCsv` (`ContactProfitRow[]`; "Sem contratante" com papel em branco). O cachê mediano sai em branco
abaixo de `MIN_MEDIAN_FEE_SAMPLE` e a margem vazia sem receita bruta — espelham o "—" da UI (D123/D124). Quatro route
handlers `*/export/route.ts` espelham o carregamento e o recorte por ano (`?ano=`) de cada página (reusando
`showProfitYears`/`parseProfitYear`/`filterShowsByYear`/D108 e, no de contratante, `pickPayerContact`/D30); cada página
ganhou botão "⬇ CSV" (só com `report.count > 0`) que propaga o `?ano=` ativo e nomeia o arquivo com o ano ou "todos".
Fecha a lacuna de exportação do acervo de rentabilidade. **+12 testes**; ver D125; segue 808 da Sessão 132
(**cachê mediano por casa/cidade em `/shows/locais` e `/shows/cidades`** — o agregador genérico
`aggregateShowProfit` (fonte única de `rankVenuesByProfit`/`rankCitiesByProfit`) passou a acumular os cachês de cada grupo
(`Acc.fees`) e expor `medianFee` em `VenueProfitRow` (e logo `CityProfitRow`, mesmo tipo), reusando o helper interno
`median()` — mesma mecânica da D123, agora no eixo geográfico; nova coluna "Cachê mediano" (entre "Cachê" e "Extras") nas
duas telas, exibida só com `showCount >= MIN_MEDIAN_FEE_SAMPLE` (=3, const reusada da D123) — abaixo disso "—" com `title`
explicativo. Fecha a alternativa (c) adiada na D123. **+3 testes** (mediana vs. outlier por local; nº par; mediana por
cidade); ver D124; segue 805 da Sessão 131 (**cachê mediano por contratante em `/contatos/rentabilidade`** — `rankContactsByProfit`
passou a acumular os cachês de cada grupo (`Acc.fees`) e expor `medianFee` em `ContactProfitRow`, reusando o helper
interno `median()` (de `feeDistribution`); o **preço típico** (metade dos shows acima, metade abaixo) é robusto a um
show fora da curva que infla a média (`avgFee`/D107). Nova coluna "Cachê mediano" entre "Cachê médio" e "Resultado",
exibida só com `showCount >= MIN_MEDIAN_FEE_SAMPLE` (=3, const exportada) — abaixo disso "—" com `title` explicativo,
resolvendo na **apresentação** a ressalva de "ruidoso com poucos shows" que mantinha o item adiado (D57/próximos passos).
O helper segue puro e computa a mediana sempre; o gate é decisão de UI. **+3 testes** (mediana vs. outlier, nº par,
1 show); ver D123; segue 802 da Sessão 130 (**comparativo ano a ano da concentração de clientes em `/contatos/rentabilidade`** —
estende o card "Concentração {ano} vs. {ano-1}" das D120/D121 ao eixo de **cliente**: novo helper puro
`compareClientConcentration(current, previous)` em `src/lib/finance.ts` (recebe duas `ClientConcentration` já
computadas e devolve `topShareDelta`, `effectiveClientsDelta` e o veredito `trend`), reaproveitando a regra de
tendência extraída para o helper interno `concentrationTrend` (compartilhado com `compareGeoConcentration`, mesmo
limiar `GEO_TREND_EPSILON`); como `ClientConcentration` é tipo distinto de `GeoConcentration`, foi um helper paralelo
(não generalização) — ver D122. `/contatos/rentabilidade` ganhou o card, exibido só com um ano específico selecionado
e ambos os períodos com contratante (`clientCount > 0`), reaproveitando o recorte por ano UTC da D108 sobre os shows já
carregados (sem nova consulta); só os rótulos mudam ("maior contratante"/"clientes efetivos"/"conquistar clientes").
**+5 testes**; ver D122; segue 797 da Sessão 129 (**comparativo ano a ano da concentração por casa em `/shows/locais`** — o mesmo card
"Concentração {ano} vs. {ano-1}" da atuação por cidade (D120), reaproveitando o `compareGeoConcentration` genérico
sobre as linhas de `rankVenuesByProfit` do ano selecionado × ano anterior, exibido só com um ano específico e ambos
os períodos com casa; só os rótulos diferem ("maior casa"/"casas efetivas"/"prospectar palcos"); UI-only, sem nova
lógica (helper já coberto desde a D120), sem testes novos; ver D121; segue 797 da Sessão 128 (**comparação ano a ano da concentração geográfica** — `compareGeoConcentration(current, previous)`
+ `GEO_TREND_EPSILON` em `src/lib/finance.ts` derivam, de duas `GeoConcentration` já computadas, a variação de
`topShare` (maior praça) e de cidades efetivas + um veredito de tendência (improved/worsened/stable, limiar 5 p.p.);
`/shows/cidades` ganhou o card "Concentração {ano} vs. {ano-1}", exibido só com um ano específico selecionado e
ambos os períodos com praça (reaproveita o recorte por ano UTC da D108 sobre os shows já carregados, sem nova
consulta); **+5 testes**; ver D120; segue 792 da Sessão 127 (**`PeriodPicker` compartilhado — DRY das cinco cópias do seletor de período** — extraído
`src/components/PeriodPicker.tsx` (server component puro, só `Link`s) parametrizado por `basePath` (href de "Todos";
cada ano → `${basePath}?ano=${y}`) e `ariaLabel` opcional; as cinco telas de rentabilidade que repetiam o mesmo
seletor (`/shows/locais`, `/shows/cidades`, `/shows/rentabilidade`, `/contatos/rentabilidade`, `/contatos/[id]`)
passaram a importá-lo, removendo as definições locais `PeriodPicker`/`ProfitPeriodPicker` — markup idêntico (mesmas
classes, `href`, `aria-current`), **−180 linhas líquidas**, sem mudança de comportamento. Fecha o item de DRY
sinalizado na D118 (alt. b)/D116 (alt. a)/D117 (alt. c). Sem testes novos — consolidação de UI sem nova lógica (não
há infra de render de componente; ambiente `node`); helpers de período seguem cobertos desde a D108; ver D119; segue
792 da Sessão 126 (**recorte por período (ano) na rentabilidade por show** — a página
`/shows/rentabilidade` (ranking de P&L por show, F4) ganhou o mesmo `PeriodPicker` (pílula "Todos" + uma por ano com
shows não cancelados) das telas de rentabilidade irmãs, **reaproveitando os três helpers puros da D108**
(`showProfitYears`/`parseProfitYear`/`filterShowsByYear` em `src/lib/finance.ts`): a consulta já trazia `date`, os
shows são filtrados por ano UTC **antes** de `rankShowsByProfit`, sem tocar a exclusão de cancelados nem o cálculo de
P&L por show; era a única tela de rentabilidade ainda sem recorte por período (depois de contratante/D108, local/D111,
cidade/D115 e detalhe do contato/D117). Estado vazio período-ciente, com atalho "Ver todos os anos". Sem testes novos
— wiring de UI sobre helpers já cobertos (como D111/D115/D117); validado por smoke test autenticado (ano filtra o
ranking corretamente); ver D118; eram 792 na Sessão 125 (**recorte por período (ano) na rentabilidade do detalhe do contato** — o card
"Rentabilidade" de `/contatos/[id]` (D106) ganhou um `ProfitPeriodPicker` (pílula "Todos" + uma por ano com shows
não cancelados) ancorado no próprio contato (`/contatos/{id}?ano=`), **reaproveitando os três helpers puros da D108**
(`showProfitYears`/`parseProfitYear`/`filterShowsByYear` em `src/lib/finance.ts`): os shows são filtrados por ano UTC
**antes** de `summarizeContactProfit`, sem tocar a regra de P&L nem a exclusão de cancelados (D106). O recorte afeta
**só** a rentabilidade — o "Histórico de shows" e a lista "Shows vinculados" seguem mostrando o relacionamento
inteiro (CRM é cumulativo). O seletor fica visível mesmo num ano vazio, com atalho "Ver todos os anos", e o card só
aparece com ≥1 show não cancelado. A consulta de transações não mudou (`computeShowPnL` já filtra por `showId`). Sem
testes novos — wiring de UI sobre helpers já cobertos (como D111/D115); ver D117; eram 792 na Sessão 124
(**concentração por casa na rentabilidade por local** — `/shows/locais` ganhou o card
"Concentração por casa" (selo 🔴/🟡/🟢, participação da maior casa, das 3 maiores, casas efetivas e nota acionável
"prospectar novos palcos"), **reaproveitando o mesmo helper puro `geoConcentration`** (D113) sobre as linhas já
produzidas por `rankVenuesByProfit` (recortadas pelo `PeriodPicker`/`?ano=` da D111) — é o recorte mais granular do
mesmo risco geográfico já visível por cidade: depender de **poucos palcos**. `geoConcentration` opera sobre
`VenueProfitRow` e já descarta o grupo "Sem local" (chave ""), então **nenhuma mudança no helper** foi precisa — só
a moldura textual do card (`VenueConcentrationCard`/`VENUE_VERDICT`, "casa/palco" em vez de "praça/cidade"). Card só
aparece com ≥1 casa identificada com receita; recompõe ao trocar o ano, de graça. Sem testes novos — wiring de UI
sobre helper já coberto (como D111/D115); ver D116; eram 792 na Sessão 123 (**recorte por período (ano) na atuação por cidade** — a página `/shows/cidades`
ganhou o mesmo `PeriodPicker` (pílula "Todos" + uma por ano com shows não cancelados) da rentabilidade por
local/contratante, **reutilizando os três helpers puros da D108** (`showProfitYears`/`parseProfitYear`/`filterShowsByYear`
em `src/lib/finance.ts`): a consulta passou a incluir `date`, os shows são filtrados por ano UTC **antes** de
`rankCitiesByProfit` (agrupamento por cidade e P&L intactos) e, de quebra, a **concentração geográfica** (D113)
recompõe sobre as linhas já filtradas — vendo o risco de depender de poucas praças por ano. Estado vazio
período-ciente. Sem testes novos — wiring de UI sobre helpers já cobertos (como D111); ver D115; eram 792 na Sessão 122
(**concentração geográfica no Painel — nudge de risco de depender de poucas praças** —
helper puro `geoConcentrationHeadline(concentration)` em `src/lib/finance.ts` (espelha `clientConcentrationHeadline`/D110)
decide, de uma `geoConcentration` já computada, se o nudge aparece (`show` só quando o veredito é `concentrated` e há
≥1 cidade com receita) e com que urgência (`critical` quando uma única cidade carrega tudo ou a maior tem ≥ 2/3 da
receita); novo banner-nudge 🔴/🟠 em `dashboard/page.tsx`, após o de concentração de clientes, "X% da receita vem de
{maior cidade} (de N cidades)" linkando para `/shows/cidades`. A concentração é derivada de
`rankCitiesByProfit(shows, txs).rows` sobre os shows (com `city`) e transações já carregados no dashboard — sem
round-trip novo. Fecha o item adiado da D113 (alternativa b). +5 testes puros, ver D114; eram 787 na Sessão 121
(**concentração geográfica na atuação por cidade — risco de depender de poucas praças** —
helper puro `geoConcentration(rows)` em `src/lib/finance.ts` deriva, das linhas de `rankCitiesByProfit`, o risco de
a receita depender de **poucas cidades**: participação da maior praça, das 3 maiores, HHI, cidades efetivas (1/HHI)
e veredito `concentrated|moderate|diversified` reaproveitando os limiares de `incomeMix`/`clientConcentration`
(`diversificationLevel`, D45); usa **receita bruta** (cachê + extras) e ignora o grupo "Sem cidade". Card
"Concentração geográfica" (selo 🔴/🟡/🟢 + nota acionável "abrir praças novas") em `/shows/cidades`, só com ≥1
cidade identificada com receita. É o análogo geográfico da concentração de clientes (D109). +6 testes puros, ver
D113; eram 781 na Sessão 120, **setup resiliente a proxy — fallback dos engines do Prisma via curl** —
`scripts/session-setup.sh` deixou de quebrar quando o downloader embutido do Prisma esbarra no proxy das sessões
remotas (`ECONNRESET` ao baixar `libquery_engine`/`schema-engine`): instala deps com `--ignore-scripts`, tenta o
`prisma generate` normal e **só no fallback** baixa os engines via `curl` (que respeita o proxy/CA) para
`node_modules/@prisma/engines/`, derivando commit (`@prisma/engines-version`) e alvo
(`@prisma/get-platform`/`getBinaryTargetForCurrentPlatform`) sem hardcode, e fixa
`PRISMA_QUERY_ENGINE_LIBRARY`/`PRISMA_SCHEMA_ENGINE_BINARY` no `.env` (dev-only) para que o `generate` de
`npm run build` também ache os engines offline; idempotente. Mantém a `main` buildável no container efêmero.
Sem testes novos (infra/shell), validado do zero manualmente; ver D112; segue 781 da Sessão 119
(**recorte por período (ano) na rentabilidade por local** — a página `/shows/locais`
ganhou o mesmo `PeriodPicker` (pílula "Todos" + uma por ano com shows não cancelados) da rentabilidade por
contratante, **reutilizando os três helpers puros da D108** (`showProfitYears`/`parseProfitYear`/`filterShowsByYear`
em `src/lib/finance.ts`): a consulta passou a incluir `date`, os shows são filtrados por ano UTC **antes** de
`rankVenuesByProfit` (regra de agrupamento por local e P&L intactos), com estado vazio período-ciente. Sem testes
novos — wiring de UI sobre helpers já cobertos; ver D111; segue 781 da Sessão 118,
**concentração de clientes no Painel (nudge de risco de dependência)** — helper puro
`clientConcentrationHeadline(concentration)` em `src/lib/finance.ts` (espelha `cashBurnHeadline`/D103) decide, de uma
`clientConcentration` já computada, se o nudge aparece (`show` só quando o veredito é `concentrated` e há ≥1
contratante) e com que urgência (`critical` quando um único contratante carrega tudo ou o maior tem ≥ 2/3 da
receita); segundo banner-nudge 🔴/🟠 em `dashboard/page.tsx`, após o de ritmo de gasto, "X% da receita vem de
{maior contratante} (de N contratantes)" linkando para `/contatos/rentabilidade`. A consulta `prisma.show.findMany`
do dashboard passou a incluir os `contacts` para resolver o pagador (`pickPayerContact`) e derivar a concentração de
`rankContactsByProfit(...).rows`. +5 testes puros, ver D110; eram 776 na Sessão 117,
**concentração de clientes na rentabilidade por contratante** — helper puro
`clientConcentration(rows)` em `src/lib/finance.ts` deriva, das linhas de `rankContactsByProfit`, o **risco de
dependência** de poucos contratantes sobre a **receita bruta** (cachê + extras): participação do maior, dos 3
maiores, HHI, clientes efetivos (1/HHI) e veredito `concentrated|moderate|diversified` reaproveitando os limiares
de `incomeMix` (`diversificationLevel`, D45); usa receita bruta — não o líquido, que pode ser negativo — e ignora
o grupo "sem contratante"; card "Concentração de clientes" (selo 🔴/🟡/🟢 + nota acionável) em
`/contatos/rentabilidade`, só com ≥1 contratante identificado. +6 testes puros, ver D109; eram 770 na Sessão 116,
**recorte por período (ano) na rentabilidade por contratante** — três helpers
puros em `src/lib/finance.ts`: `showProfitYears` (anos UTC presentes, desc/dedup), `parseProfitYear`
(`?ano=` → `number | "all"`; vazio/"todos"/ano ausente → "all") e `filterShowsByYear` (filtra shows pelo ano
UTC antes de agregar, `"all"` = lista intacta); `/contatos/rentabilidade` ganhou um `PeriodPicker` (pílula
"Todos" + uma por ano com shows não cancelados, estilo do seletor de fôlego D102) que recorta o P&L por
contratante sem tocar a regra "um pagador por show" (D105); estado vazio período-ciente. +10 testes puros,
ver D108; eram 760 na Sessão 115, **cachê médio por contratante** — campo puro `avgFee` em `ContactProfitRow`
(`src/lib/finance.ts`, calculado em `rankContactsByProfit` = `round(totalFee / showCount)`) expõe o **nível de
preço** praticado por contratante, distinto do líquido (`avgNet`); nova coluna "Cachê médio" em
`/contatos/rentabilidade` (entre Despesas e Resultado) deixa visível quem paga caro mas é caro de atender.
+1 teste puro, ver D107; eram 759 na Sessão 114, **rentabilidade no detalhe do contato** — helper puro `summarizeContactProfit`
em `src/lib/contacts.ts` soma o `computeShowPnL` dos shows não cancelados do contato (cachê/extras/despesas/
líquido/média/margem) e o card "Rentabilidade" em `/contatos/[id]` mostra o líquido depois dos custos já na
ficha do cliente — diferente da D105 (que atribui cada show a um pagador para comparar contratantes), aqui o
recorte já é "os shows deste contato", então a soma é direta; link "Comparar contratantes →". +6 testes puros,
ver D106; eram 753 na Sessão 113, **rentabilidade por contratante** — helper puro `rankContactsByProfit`
em `src/lib/finance.ts` atribui cada show a **um único** contratante (via `pickPayerContact`, por papel) e agrega o
`computeShowPnL` por quem paga: cachê/extras/despesas/líquido/média/margem, ordenado por resultado, com grupo "Sem
contratante" por último; como cada show pesa para um só contratante, o `totalNet` reconcilia com a soma dos P&L dos
shows (≠ ranking, que é bruto e conta um show para cada contato). Nova página `/contatos/rentabilidade` (layout de
`/shows/locais`, registrada no hub de Relatórios em Contatos → "Quem move a carreira", 💸) responde "quais clientes
dão dinheiro de verdade depois dos custos?". +6 testes puros, ver D105; eram 747 na Sessão 112,
**detalhamento mês a mês do burn rate** — helper puro `cashFlowByMonth`
em `src/lib/finance.ts` devolve o fluxo de caixa realizado (received/paid/net) por mês na **mesma janela** de
`cashBurnRunway` (soma dos `net` ÷ janela = `avgMonthlyNet`), com mês sem movimento zerado e em ordem cronológica;
a página `/financas/folego-de-caixa` ganhou uma tira `MonthlyFlowStrip` (barras ↑ verde / ↓ vermelho por mês) dentro
do card "Cenário alternativo", revelando a tendência que a média esconde — segue o seletor `?meses=` (D102) sem
controle novo. +6 testes puros, ver D104; eram 741 na Sessão 111,
**card "Ritmo de gasto" (burn rate) no Painel** — helper puro `cashBurnHeadline`
em `src/lib/finance.ts` (espelha `paymentLagHeadline`/D70) deriva de um `cashBurnRunway` já computado se o
nudge deve aparecer e com que urgência; `dashboard/page.tsx` ganhou um segundo banner-nudge 🔥/🔴 logo após o
de custo fixo (D100), surgindo só quando o caixa de fato queima no ritmo real (`tight`/`critical`), linkando
para `/financas/folego-de-caixa`. +5 testes puros, ver D103; eram 736 na Sessão 110,
**seletor de janela `?meses=` no fôlego de caixa** — helper puro `parseBurnWindow`
em `src/lib/finance.ts` espelha `parseWeekendWindow` e reaproveita `sanitizeBurnWindow` (clamp 1–24); a página
`/financas/folego-de-caixa` ganhou pílulas 3m/6m/12m/24m (`BURN_WINDOW_PRESETS`) que passam `{ months }` a
`cashBurnRunway`, lendo `?meses=` saneado. +8 testes puros, ver D102; eram 728 na Sessão 109,
**fôlego de caixa pelo burn rate realizado** — helper puro `cashBurnRunway`
em `src/lib/finance.ts` mede o fluxo de caixa líquido médio dos últimos 6 meses fechados (gastos variáveis
incluídos, receita recebida descontada) → por quantos meses o caixa dura no ritmo real; veredito
`surplus`/`negative`/`critical`/`tight`/`healthy` (limiares 3/6 reusados de `cashRunway`); card "Cenário
alternativo · ritmo de gasto real" sempre visível em `/financas/folego-de-caixa`, útil até quando não há
custo fixo detectado (onde `cashRunway` é `no-cost`). +11 testes puros, ver D101; eram 717 na Sessão 108,
**card "Fôlego de caixa" no Painel** — banner-nudge em
`dashboard/page.tsx` reaproveitando `cashRunway` (D99) sobre as transações já carregadas: mostra por
quantos meses o caixa cobre os custos fixos, linkando para `/financas/folego-de-caixa`; só aparece
quando o veredito morde (tight→âmbar 🛟 / critical→vermelho 🔴), para não virar ruído com fôlego saudável
ou caixa zerado; mudança de UI, sem novos testes — ver D100; eram 717 na Sessão 107, **fôlego de caixa /
runway** — helper puro `cashRunway` em
`src/lib/finance.ts` cruza o caixa realizado (`summarizeFinances().cashBalance`) com o custo fixo
mensal (`recurringExpenses().estimatedMonthlyFixedCost`, D39) → `runwayMonths = caixa / custo`, com
veredito (no-cost/negative/critical/tight/healthy pelos limiares 3 e 6 meses) e data estimada de
esgotamento; nova página `/financas/folego-de-caixa` (hub → Custos & metas, 🛟) responde "se as
receitas parassem hoje, por quantos meses meu caixa me sustenta?". +8 testes puros, ver D99; eram
709 na Sessão 106, **janela parametrizável na página de fins de semana livres** —
helper puro `parseWeekendWindow` em `src/lib/shows.ts` lê e saneia `?semanas=` (default 12,
grampeado a 1–52, trunca fracionário, aceita query repetida) e a página
`/shows/fins-de-semana-livres` ganhou pílulas de janela 4/8/12/26 semanas com a ativa em
destaque; a lógica `findOpenWeekends` já aceitava `weeks`, só faltava expor o controle. +9 testes
puros, ver D98; eram 700 na Sessão 105, **card "próximo fim de semana livre" no Painel** —
`dashboard/page.tsx` reaproveita `findOpenWeekends` sobre os shows já carregados e exibe um
banner-nudge "🎸 Fim de semana livre" com o próximo aberto + placar "N de M livres", linkando
para `/shows/fins-de-semana-livres`; aparece só com agenda futura, para não virar ruído em conta
vazia. Os helpers de rótulo `formatWeekendLabel`/`weekendKeyToDate` foram extraídos da página da
D96 para `src/lib/shows.ts` (DRY); +5 testes puros, ver D97; eram
695 na Sessão 104, **fins de semana livres** — `findOpenWeekends` em `src/lib/shows.ts` +
`/shows/fins-de-semana-livres`: lista os próximos 12 fins de semana sexta→domingo e marca os sem
show como oportunidade de booking, registrado no hub de relatórios; +11 testes puros, ver D96; eram
684 na Sessão 103, promessas furadas no recorte por contratante — banner + selo ⚠ por
devedor e por show em `/shows/a-receber/por-contratante`, reaproveitando `summarizePaymentPromises`;
mudança de UI, sem novos testes — eram 684 na Sessão 102, data prometida de pagamento + promessas
furadas nos cachês a receber — campo `Show.paymentPromisedAt`; eram 668 na Sessão 101, cobrança consolidada por contratante —
e-mail/WhatsApp na página "por contratante";
eram 660 na Sessão 100, cachês a receber por contratante — de quem cobrar primeiro; eram 655 na
Sessão 99, contas fixas a lançar no mês; eram 648 na Sessão 98,
variação por categoria; eram 125 na Sessão 14, exportação CSV das Finanças). Sessão 4 entregou
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
Sessão 41 trouxe o **aging dos recebíveis para o Painel**: o alerta "🎤 Cachês a receber" do
dashboard passa a destacar, com escalonamento para vermelho, o dinheiro **parado há mais de 90
dias** (balde "older" de `bucketReceivablesByAge`, reaproveitado), mostrando o valor encalhado e
a contagem — o sinal de cobrança urgente aparece já na primeira tela (ver D32). **358 testes**
verdes (mudança de UI, reaproveita lógica pura já testada).
Sessão 42 entregou o **comparativo mês a mês no Relatório mensal** (`/financas/relatorio`):
as funções puras `computeDelta` e `compareSummaries` (em `src/lib/finance.ts`) calculam a
variação (absoluta + %, com sentido up/down/flat) das quatro métricas do mês frente ao mês
anterior, e cada card de número ganha uma linha "▲/▼ R$ X (Y%)" colorida por bom/ruim
(receita/saldo/caixa subindo = verde; despesa subindo = vermelho), respondendo "estou melhor
que o mês passado?" (ver D33). **366 testes** verdes. Sessão 67 entregou o **sumário de salto
rápido por subtema** no hub de Relatórios (`/relatorios`): `subtopicSlug` + `reportsNavIndex`
em `src/lib/reports.ts` geram âncoras estáveis e o índice navegável, e o `<nav>` "Ir para um tema"
no topo lista cada subtema como pílula-âncora com contagem (ver D59). **521 testes** verdes.
Sessão 68 entregou a **projeção de fechamento do ano** (`/financas/projecao-ano`): a função pura
`projectYearEnd` (em `src/lib/finance.ts`) soma o **caixa realizado** do ano, as **pendências já
lançadas** e os **cachês de shows futuros do ano ainda não lançados** nas finanças — abatendo de cada
cachê a receita já vinculada ao show, para não contar duas vezes — projetando o resultado do ano
inteiro ("vou fechar no azul?"). De propósito a projeção é assimétrica: projeta a receita futura (a
agenda é compromisso firme) mas **não inventa despesas futuras** (só realizado + pendência lançada;
custos recorrentes não lançados ficam de fora — ver Custos fixos). Página com navegação por ano,
hero do resultado projetado e a composição de receitas/despesas em barras (ver D60). Registrado no
hub de Relatórios (Finanças → Fechamentos). **527 testes** verdes.
Sessão 69 trouxe a **projeção de fechamento do ano para o Painel** (`dashboard/page.tsx`): um card
"Projeção de {ano}" que chama `projectYearEnd` com as transações e shows já carregados pelo dashboard
(zero consulta extra) e mostra o **resultado projetado do ano** com a composição (receitas − despesas,
caixa realizado hoje, e o destaque do cachê agendado de shows futuros), linkando para
`/financas/projecao-ano`. Só aparece quando há um componente futuro que muda o caixa realizado
(`scheduledIncome > 0 || pendingIncome > 0 || pendingExpense > 0`), evitando redundância com os cards
de resumo (ver D61). **527 testes** verdes (mudança de UI, reaproveita lógica pura já testada).
Sessão 70 entregou o **cenário "com custos fixos" na projeção de fechamento do ano**
(`/financas/projecao-ano`): a função pura `projectYearEndWithFixedCosts` (em `src/lib/finance.ts`)
camada por cima do `YearEndForecast` somando o **custo fixo mensal típico**
(`recurringExpenses.estimatedMonthlyFixedCost`, D39) aos meses futuros do ano que ainda não têm
despesa lançada — só ano corrente, só meses estritamente após o mês atual, e pulando meses com despesa
já lançada para não contar duas vezes — fechando a assimetria deliberada da D60 sem mexer no número
projetado cru (que segue como principal). A página ganhou um card opcional "Cenário com custos fixos"
com o resultado mais conservador (ver D62). **533 testes** verdes.
Sessão 43 entregou o **comparativo ano a ano (YoY) no Resumo anual** (`/financas/anual`): a função
pura `compareAnnualSummaries` (em `src/lib/finance.ts`) aplica `computeDelta` aos três totais do ano
e a cada mês casado por `monthIndex` ao mesmo mês do ano anterior; a página computa o resumo do ano
anterior sobre o mesmo conjunto já carregado (sem consulta extra) e renderiza a linha "▲/▼ R$ X (Y%)"
sob cada card de total e um selo compacto "▲/▼ Y%" na coluna Resultado do mês a mês — só quando o ano
anterior teve movimento (ver D34). **369 testes** verdes.
Sessão 44 entregou o **comparativo com a média móvel no Relatório mensal** (`/financas/relatorio`):
a função pura `averageSummaries` (em `src/lib/finance.ts`) calcula o "mês típico" — a média campo a
campo dos resumos dos últimos meses com movimento (componentes arredondados ao centavo, saldos
derivados deles), reaproveitando `compareSummaries`/`computeDelta`. A página agora compara o mês
corrente contra a média dos últimos 3 meses **com movimento** (denominador = meses ativos; só aparece
quando há ≥2, pois com 1 a média = o mês anterior), exibindo em cada card uma segunda linha de delta
("vs. média") sob a já existente "vs. mês ant.", suavizando um mês anterior atípico (ver D35).
**373 testes** verdes.
Sessão 45 entregou a **quebra por categoria no Resumo anual** (`/financas/anual`): a função pura
`annualCategoryReport(txs, year)` (em `src/lib/finance.ts`) filtra as transações do ano e delega ao
`categoryReport` já existente (uma só fonte de verdade da agregação por categoria), e a página
renderiza dois cards — Receitas/Despesas por categoria, com valor, participação (%) e barra —
reaproveitando o padrão visual do relatório mensal (D21), respondendo "para onde foi o dinheiro no
ano?" sem consulta extra ao banco (ver D36). **376 testes** verdes.
Sessão 46 entregou a **sazonalidade das Finanças** (`/financas/sazonalidade`): a função pura
`monthlySeasonality(txs)` (em `src/lib/finance.ts`) agrega as transações por mês do calendário
(jan→dez) somando todos os anos do histórico e calcula a **média por ano-ativo** de cada mês — o
"mês típico" —, mais o melhor/pior mês por resultado médio; a página renderiza os cards de destaque
e a tabela com barras (mesmo padrão do Resumo anual), respondendo "qual época do ano costuma render
mais?" para planejar o ano. Denominador = anos com movimento naquele mês (não a amplitude do
histórico), coerente com a média móvel (D35); link na barra de Finanças (ver D37). **381 testes** verdes.
Sessão 47 entregou a **exportação CSV do Resumo anual** (`/financas/anual/export?ano=YYYY`): a função
pura `annualSummaryToCsv(summary)` (em `src/lib/csv.ts`) serializa um `AnnualSummary` já computado
(cabeçalho + 12 meses + total do ano) e um route handler espelha o de `/financas/export`, devolvendo
CSV com BOM UTF-8; botão "⬇ CSV" no resumo anual. `MONTH_NAMES_LONG` virou export de `calendar.ts`
(fonte única dos nomes pt-BR). **385 testes** verdes (ver D38).
Sessão 48 entregou os **custos fixos recorrentes** (`/financas/custos-fixos`): a função pura
`recurringExpenses(txs, options)` (em `src/lib/finance.ts`) agrupa as despesas por categoria, marca
como recorrente a que aparece em ≥3 meses distintos e calcula a **conta típica/mês** (total /
meses-ativos) e o **custo fixo mensal estimado** (soma das contas típicas das categorias ainda
ativas) — respondendo "quanto preciso faturar todo mês só para me manter?". A página mostra o custo
estimado em destaque + tabela de categorias com barras (encerradas marcadas e fora do total); link na
barra de Finanças quando há despesas (ver D39). **396 testes** verdes.
Sessão 49 entregou o **ponto de equilíbrio em shows** (`/financas/ponto-de-equilibrio`): a função pura
`computeBreakEven(shows, txs)` (em `src/lib/finance.ts`) compõe o custo fixo mensal (D39) com o
resultado líquido médio dos shows **realizados** (média do `computeShowPnL().net`) e responde "quantos
shows por mês preciso fazer só para cobrir os custos fixos?" — `showsNeeded = ceil(custoFixo/netMédio)`,
mais o ritmo atual (`avgShowsPerMonth`) e o selo verde/âmbar `covered`. A página mostra a meta em
destaque + os três números por trás; link na barra de Finanças quando há despesas (ver D40).
**401 testes** verdes (medição real `vitest run`; eram 394 na main).
Sessão 50 entregou a **reserva para impostos** (`/financas/reserva-impostos`): a função pura
`taxReserve(txs, { year, rate })` (em `src/lib/finance.ts`) aplica uma alíquota sobre as receitas
**efetivamente recebidas** (caixa de entrada) do ano e responde "quanto devo guardar de cada cachê
para o imposto?" — mês a mês + total do ano, com seletor de alíquota (atalhos 6/11/15/27,5%, query
`?aliquota=`), navegação por ano e aviso de que a alíquota padrão (6%) é hipótese a confirmar com
contador; link na barra de Finanças quando há receitas (ver D41). **407 testes** verdes (medição
real `vitest run`; eram 401 na main).
Sessão 51 entregou o **funil de propostas / pipeline de shows** (`/shows/funil`): a função pura
`showPipeline(shows)` (em `src/lib/finance.ts`) agrupa os shows pelo `status` nas quatro etapas
(proposto→confirmado→realizado→cancelado), somando contagem e cachê por etapa, e deriva o **cachê em
aberto** (proposto + confirmado — dinheiro ainda não realizado), os recortes por etapa e a **taxa de
concretização** (PLAYED / (PLAYED+CANCELLED), `null` sem shows decididos) — respondendo "quanto tenho
na mesa e quantas propostas viram show?". A página mostra cards de destaque, barras por etapa (cor de
`SHOW_STATUS_DOT`) e atalhos para a lista filtrada por status; é um **retrato** do estado atual, não
um histórico de conversão (o schema não registra transições). Link "Funil" na barra de `/shows` (ver
D42). **413 testes** verdes (medição real `vitest run`; eram 407 na main).
Sessão 52 trouxe o **funil de propostas para o Painel**: uma seção "Funil de propostas" no
dashboard (renderizada só quando há shows) com três blocos derivados de `showPipeline` (D42,
reaproveitada) — **cachê em aberto** (`openValue`/`openCount`, link para `/shows/funil`), **em
negociação** (`proposedValue`/`proposedCount`, link para `/shows?status=PROPOSED`) e **taxa de
concretização** (`conversionRate`, "—" sem decididos) — para o sinal de booking aparecer já na
primeira tela; cabeçalho com link "Ver funil" (ver D43). **413 testes** verdes (mudança de UI,
reaproveita lógica pura já testada).
Sessão 53 entregou a **evolução do cachê ao longo do tempo** (`/shows/evolucao-cache`): a função pura
`feeTrend(shows, { now? })` (em `src/lib/finance.ts`) agrega o **cachê médio por mês** dos shows já
realizados (mesmo critério `isHappenedGig` — PLAYED ou CONFIRMED com data passada — e só `fee > 0`),
em ordem cronológica, e deriva cachê médio geral, maior/menor cachê, melhor/pior mês e a **tendência**
(variação do mês mais recente vs. o primeiro, reaproveitando `computeDelta`) — respondendo "estou
cobrando mais com o tempo?". É a evolução do **preço** (só `show.fee`), complementar à Rentabilidade
(que mede o líquido). A página mostra cards de destaque, o card de tendência ("Seu cachê médio
subiu/caiu") e a tabela mês a mês com barras; link "Evolução do cachê" na barra de `/shows`. Sem
schema, sem dependência, sem server action (ver D44). **420 testes** verdes (medição real `vitest
run`; eram 413 na main).
Sessão 54 entregou o **mix de receitas / fontes de renda** (`/financas/fontes-de-renda`): a função
pura `incomeMix(txs)` (em `src/lib/finance.ts`) agrupa as receitas (`INCOME`) por categoria (= fonte
de renda) e deriva participação por fonte, concentração nas maiores (`topShare`/`top3Share`), o
índice **HHI** (Herfindahl–Hirschman), o **número efetivo de fontes** (1/HHI) e um **veredito de
diversificação** (concentrada/moderada/diversificada) — respondendo "de onde vem minha renda e o
quanto dependo de uma única fonte?". Considera todas as receitas lançadas (recebidas e a receber);
categoria em branco → "Sem categoria" (mesma norma de `categoryReport`). A página mostra o veredito,
cards de destaque (receita total, maior fonte, nº de fontes) e a tabela de composição com barras de
participação; link "Fontes de renda" na barra de `/financas` quando há receitas. Distinta do ranking
de contatos (cliente × fonte) e dos relatórios mês a mês. Sem schema, sem dependência, sem server
action (ver D45). **429 testes** verdes (medição real `vitest run`; eram 420 na main).
Sessão 55 entregou o **desempenho por dia da semana** (`/shows/dias-semana`, `weekdayPerformance`,
ver D46). Sessão 56 entregou a **fidelização / retenção de contratantes** (`/contatos/retencao`):
a função pura `clientRetention` (em `src/lib/contacts.ts`) mede a taxa de recompra (contratantes
com ≥2 shows) e a fatia da receita vinda de quem volta — distinta do ranking (por contato) e do
reativar (dormentes), ver D47. Sessão 57 entregou a **atuação por cidade** (`/shows/cidades`): a função
pura `rankCitiesByProfit` (em `src/lib/finance.ts`) agrega o P&L por cidade — rollup acima da
rentabilidade por local (D19), reaproveitando o helper `aggregateShowProfit` extraído de
`rankVenuesByProfit` —, respondendo "quais cidades valem a turnê?", ver D48. **448 testes** verdes
(medição real `vitest run`; eram 443 na main).
Sessão 58 entregou os **conflitos de agenda** (`/shows/conflitos`): a função pura
`findScheduleConflicts(shows, { now? })` (em `src/lib/shows.ts`) agrupa os shows por dia (`dayKey`,
UTC) e devolve apenas os dias com **2+ shows não cancelados** (sobreposições na agenda), em ordem
cronológica, marcando cada dia como `upcoming` (hoje ou no futuro) — respondendo "fechei dois
compromissos para o mesmo dia sem querer?". A página lista cada dia com os shows envolvidos
(horário/local/cidade/status, link de detalhe e cachê); o **Painel** mostra um alerta âmbar só
quando há conflitos acionáveis (`upcomingDayCount > 0`); a lista `/shows` ganhou um selo
"Conflitos N". É um **sinal**, não um bloqueio (double-header é legítimo); cancelados não conflitam;
sem schema, sem dependência, sem server action (ver D49). **455 testes** verdes (medição real
`vitest run`; eram 448 na main).
Sessões 59–61 entregaram o **prazo de recebimento / DSO** (`/shows/prazo-recebimento`, `paymentLag`,
D51), o **prazo por contratante** (`/shows/prazo-recebimento/por-contratante`, D52) e a **distribuição
de cachês por faixa de preço** (`/shows/faixas-de-cache`). Sessão 62 entregou o **hub de Relatórios**
(`/relatorios`): um índice central dos 24 relatórios/análises do app, antes só alcançáveis por barras
de botões espalhadas em `/shows` e `/financas`. O catálogo virou dado puro e testável em
`src/lib/reports.ts` (`REPORT_GROUPS` agrupados por área Shows/Finanças/Contatos + `allReports`/
`reportCount`), a página renderiza cards com ícone/título/descrição por grupo, e o item **Relatórios**
entrou na navegação principal (desktop + mobile). Resolve a discoverability do acervo de análises:
adicionar um relatório novo passa a ser registrá-lo num único lugar (ver D53). **495 testes** verdes
(medição real `vitest run`; eram 486 na main — 9 testes novos de invariantes do catálogo).
Próxima sessão: continuar o polimento de UX (acessibilidade, mensagens vazias, estados de erro
inline dos server actions), evoluções de calendário (arrastar/soltar para remarcar), ou ligar os
relatórios novos ao hub à medida que surgirem. **Exportação CSV** entregue para as quatro telas de
rentabilidade na Sessão 133 (D125) e estendida ao **ranking de contatos** (`/contatos/ranking`) na
Sessão 135 (D127); próximo possível no mesmo tema — levar o botão "⬇ CSV" às demais telas tabulares
que ainda não exportam (ex.: sazonalidade, fontes de renda, retenção/fidelização, faixas de cachê,
prazo de recebimento), reaproveitando a mesma disciplina serializador-puro + route fino.

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

### Sessão 41 — 2026-06-18 (Fase 1 — aging dos recebíveis no Painel)
- **UI Painel** (`src/app/(app)/dashboard/page.tsx`): o alerta "🎤 Cachês a receber" passou a
  computar o aging dos recebíveis com `bucketReceivablesByAge(receivables)` (lógica pura já testada
  na Sessão 40) e a destacar o **balde "older"** (parado **há mais de 90 dias**). Quando há dinheiro
  encalhado, o banner **escala de âmbar para vermelho** e ganha um segmento "🚨 R$ X parado há mais
  de 90 dias (N)" — o sinal de cobrança urgente aparece já na primeira tela, sem precisar abrir
  `/shows/a-receber`. Sem novas dependências, sem mudança de schema, sem novo server action.
- Decisão registrada em **DECISIONS.md D32** (limiar >90 dias = balde "older"; escalonamento de cor
  no banner existente em vez de um segundo alerta).
- Definition of Done verde: build (25 rotas), typecheck (`tsc --noEmit`) limpo, lint (0),
  **358 testes** (`vitest run`; inalterado — mudança de UI que reaproveita lógica pura já coberta),
  smoke test ao vivo (`next start`): `/dashboard` sem sessão → 307; `/login` → 200. `npm audit`
  inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 42 — 2026-06-18 (Fase 1 — comparativo mês a mês no Relatório mensal)
- **Lógica pura** (`src/lib/finance.ts`): `computeDelta(current, previous)` → `MetricDelta`
  (`{ current, previous, delta, pct, direction }`): `delta` absoluto, `pct` relativo (à base
  anterior; `null` quando a base é 0; usa `|previous|` para base negativa) e `direction`
  (`up`/`down`/`flat`, só o sinal do delta). `compareSummaries(current, previous)` →
  `FinanceComparison`: aplica `computeDelta` às quatro métricas de `FinanceSummary` (receitas,
  despesas, saldo de competência, caixa realizado). A semântica de bom/ruim fica na UI (a função
  é neutra). **8 testes** novos em `finance.test.ts` (subida/queda/flat, base zero→null, base
  negativa, preserva current/previous; `compareSummaries` com quatro métricas e base zerada) —
  total do projeto **366** (eram 358). Ver **DECISIONS.md D33**.
- **Página** (`src/app/(app)/financas/relatorio/page.tsx`): computa o resumo do **mês anterior**
  reaproveitando `filterTransactions({ month: prevKey })` + `summarizeFinances` (mesma fonte de
  verdade do mês corrente) e passa `compareSummaries(...)` aos cards. Cada `Stat` ganhou props
  `delta`/`upIsGood` e um sub-componente `DeltaLine` que mostra "▲/▼ R$ X (Y%)" — verde quando a
  variação é boa (receita/saldo/caixa subindo; despesa caindo), vermelha caso contrário, e
  "→ sem variação" no empate; `pct` nulo vira "novo". O comparativo só aparece quando o mês
  anterior tem transações (`hasPrevData`), com a legenda "Comparado a <mês anterior>". Sem novas
  dependências, sem mudança de schema nem server action.
- Definition of Done verde: build (25 rotas; `/financas/relatorio` inalterado), typecheck
  (`tsc --noEmit`) limpo, lint (0), **366 testes** (`vitest run`), smoke test ao vivo
  (`next start`): `/financas/relatorio` sem sessão → 307, `/login` → 200; **e2e autenticado com
  cookie de sessão real** (seed demo + transações de maio inseridas) → junho renderiza o
  comparativo "Comparado a Maio de 2026" com Receitas ▲ +100% (verde), Despesas ▲ +150% (vermelho),
  Saldo ▲ +79% (verde) e Caixa ▼ −171% (vermelho) — verificado. `npm audit` inalterado
  (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova — ver D6/D8).

### Sessão 47 — 2026-06-19 (Fase 1 — exportação CSV do Resumo anual)
- **Lógica pura** (`src/lib/csv.ts`): nova `annualSummaryToCsv(summary)` que serializa um
  `AnnualSummary` (D16/D34) em CSV — cabeçalho `Mês;Receitas (R$);Despesas (R$);Resultado (R$)`,
  os 12 meses (jan→dez, zeros inclusive, rótulo "Mês AAAA") e uma linha "Total do ano (AAAA)",
  espelhando a tabela "Mês a mês" da página. Mesma convenção pt-BR de `transactionsToCsv`
  (delimitador `;`, decimal com vírgula via `centsToCsvAmount`). Para os nomes dos meses,
  `MONTH_NAMES_LONG` passou a ser **exportado** de `src/lib/calendar.ts` (era privado) e
  reaproveitado aqui — uma só fonte de verdade dos rótulos. **4 testes** novos em `csv.test.ts`
  (cabeçalho+12 meses+total = 14 linhas; agrega no mês certo e totaliza o ano; resultado negativo
  preservado; ignora outros anos) — total do projeto **385** (eram 381). Ver **DECISIONS.md D38**.
- **Route handler** `src/app/(app)/financas/anual/export/route.ts`: GET que lê `?ano=YYYY`
  (mesma `parseYear` da página, fallback ao ano atual), carrega as transações do usuário,
  computa `annualSummary` e devolve o CSV com BOM UTF-8, `Content-Type text/csv` e
  `Content-Disposition` (`financas-anual-AAAA.csv`) — espelha o handler de `/financas/export`.
- **UI** (`src/app/(app)/financas/anual/page.tsx`): botão **⬇ CSV** na barra de ações (só quando
  há atividade no ano), apontando para `/financas/anual/export?ano=<year>`.
- Definition of Done verde: build (**26 rotas**; nova `/financas/anual/export`), typecheck
  (`tsc --noEmit`) limpo, lint (0), **385 testes** (`vitest run`), smoke test ao vivo
  (`next start`): `/financas/anual/export` sem sessão → 307, `/financas/anual` → 307, `/login` →
  200; **e2e autenticado com cookie de sessão real** (seed demo) → download `financas-anual-2026.csv`
  com `Content-Type text/csv`, BOM e `Total do ano (2026);2000,00;750,00;1250,00` — verificado.
  `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência
  nova nem mudança de schema — ver D6/D8).

### Sessão 49 — 2026-06-19 (Fase 1 — ponto de equilíbrio em shows)
- **Lógica pura** (`src/lib/finance.ts`): nova `computeBreakEven(shows, txs, options)` que compõe
  o custo fixo mensal (`recurringExpenses(...).estimatedMonthlyFixedCost`, D39) com a média do
  `computeShowPnL().net` dos shows **realizados** (PLAYED ou CONFIRMED com data passada — mesmo
  critério de `isHappenedGig`/`reconcileShowFees`). Expõe `monthlyFixedCost`, `avgNetPerShow`,
  `showsConsidered`, `avgShowsPerMonth` (shows realizados ÷ amplitude em meses), `showsNeeded`
  (`ceil(custoFixo / netMédio)`, ou `null` quando não há custo fixo ou o net médio ≤ 0) e
  `covered` (`avgShowsPerMonth >= showsNeeded`). Reaproveita `computeShowPnL`/`recurringExpenses`/
  `monthsBetween`/`monthKey` (sem duplicar regra). **7 testes** novos em `finance.test.ts` (vazio→
  nulls; cálculo da meta; desconto de despesa vinculada no P&L; só shows realizados; net médio
  negativo→null; sem custo fixo→null; `covered` quando o ritmo bate a meta) — total do projeto
  **401** (eram 394 na main). Ver **DECISIONS.md D40**.
- **Página** (`src/app/(app)/financas/ponto-de-equilibrio/page.tsx`): server component que carrega
  transações + shows do usuário, chama `computeBreakEven` e renderiza a meta de shows/mês em
  destaque, um selo verde/âmbar comparando com o ritmo atual e três cards (custo fixo, resultado
  médio por show, ritmo). Estados honestos quando `showsNeeded` é `null` (sem custo fixo → aponta
  para Custos fixos; sem shows realizados ou net médio ≤ 0 → orienta rever cachê/custos). Link
  **Ponto de equilíbrio** na barra de `/financas` quando há despesas. Sem schema, sem dependência,
  sem server action.
- Definition of Done verde: build (**27 rotas**; nova `/financas/ponto-de-equilibrio`), typecheck
  (`tsc --noEmit`) limpo, lint (0), **401 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/financas/ponto-de-equilibrio` sem sessão → 307, `/login` → 200; **e2e autenticado com cookie de
  sessão real** (seed demo + custos recorrentes de "Sala de ensaio" e 2 shows PLAYED inseridos) →
  página renderiza "1 show/mês" de meta, ritmo "1,5 shows/mês" e o selo verde "já cobre o custo
  fixo" — verificado. `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical;
  nenhuma dependência nova nem mudança de schema — ver D6/D8).

### Sessão 53 — 2026-06-19 (Fase 1 — evolução do cachê ao longo do tempo)
- **Lógica pura** (`src/lib/finance.ts`): nova `feeTrend(shows, { now? })` que agrega o cachê médio
  por mês dos shows **realizados** (`isHappenedGig` — PLAYED, ou CONFIRMED com data passada) e com
  cachê registrado (`fee > 0`), em ordem cronológica. Retorna `months[]` (com `count`/`totalFee`/
  `avgFee`/`minFee`/`maxFee`), `totalShows`, `totalFee`, `avgFee`, `highestFee`/`lowestFee`,
  `bestMonth`/`worstMonth` (empate no melhor → mais recente; no pior → mais antigo) e `trend`
  (`computeDelta` do mês mais recente vs. o primeiro; `null` com < 2 meses). Mede **preço** (só
  `show.fee`, sem despesas), complementar à Rentabilidade. Reaproveita `isHappenedGig`/`monthKey`/
  `computeDelta` (sem duplicar regra). **7 testes** novos em `finance.test.ts` (vazio→zerado/nulo;
  agrupamento cronológico com média/total/min/max; só realizados; ignora `fee<=0`; tendência último
  vs primeiro; `null` com 1 mês; desempate melhor/pior). Total do projeto **420** (eram 413). Ver
  **DECISIONS.md D44**.
- **Página** (`src/app/(app)/shows/evolucao-cache/page.tsx`): server component que carrega os shows do
  usuário, chama `feeTrend` e renderiza 4 cards de destaque (cachê médio geral, maior/menor, shows
  considerados), um card de **tendência** ("Seu cachê médio subiu/caiu ▲/▼ R$ X (Y%)", comparando o
  primeiro e o último mês) e a tabela "Cachê médio mês a mês" com barras (escala pelo pico) e a faixa
  min–max por mês. Estado vazio honesto quando não há shows realizados com cachê. Link **Evolução do
  cachê** na barra de `/shows` (ao lado de Por local). Sem schema, sem dependência, sem server action.
- Definition of Done verde: build (**28 rotas**; nova `/shows/evolucao-cache`), typecheck
  (`tsc --noEmit`) limpo, lint (0), **420 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/shows/evolucao-cache` sem sessão → 307, `/shows` → 307, `/login` → 200; **e2e autenticado com
  cookie de sessão real** (seed demo + 2 shows PLAYED inseridos em jan/mar) → página renderiza a
  tabela Jan/Mar/Jun, o card "Seu cachê médio subiu" e "Comparando Jan 2026 (R$ 800,00) com Jun 2026
  (R$ 1.500,00)" — verificado. `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1
  critical; nenhuma dependência nova nem mudança de schema — ver D6/D8).

### Sessão 54 — 2026-06-19 (Fase 1 — mix de receitas / fontes de renda)
- **Lógica pura** (`src/lib/finance.ts`): nova `incomeMix(txs)` que agrega as transações `INCOME`
  por categoria (fonte de renda) e retorna `sources[]` (`category`/`amount`/`share`/`count`, ordem
  decrescente, desempate por nome pt-BR), `total`, `sourceCount`, `top`, `topShare`, `top3Share`,
  `hhi` (Herfindahl–Hirschman: Σ share²), `effectiveSources` (1/HHI) e `level`
  (`concentrated`/`moderate`/`diversified`). O veredito vem do helper privado `diversificationLevel`
  (thresholds: 1 fonte ou HHI ≥ 0,45 → concentrada; HHI ≥ 0,25 → moderada; senão diversificada —
  marcados como hipótese). Despesas ignoradas; categoria em branco → "Sem categoria" (mesma norma de
  `categoryReport`); considera receitas recebidas e a receber. **9 testes** novos em `finance.test.ts`
  (vazio; ignora despesas/agrupa; "Sem categoria"; ordenação+desempate; top3/HHI/efetivas; fonte
  única→concentrada; dominante→concentrada; distribuída→diversificada; intermediária→moderada). Total
  do projeto **429** (eram 420). Ver **DECISIONS.md D45**.
- **Página** (`src/app/(app)/financas/fontes-de-renda/page.tsx`): server component que carrega as
  transações do usuário, chama `incomeMix` e renderiza o veredito de diversificação (faixa colorida
  com mensagem por nível), três cards de destaque (receita total, maior fonte com %, nº de fontes +
  top3) e a tabela de composição por fonte com barra de participação. Estado vazio honesto quando não
  há receitas. Link **Fontes de renda** na barra de `/financas` quando há receita. Sem schema, sem
  dependência, sem server action.
- Definition of Done verde: build (**29 rotas**; nova `/financas/fontes-de-renda`), typecheck
  (`tsc --noEmit`) limpo, lint (0), **429 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/financas/fontes-de-renda` sem sessão → 307, `/login` → 200; **e2e autenticado com cookie de sessão
  real** (seed demo) → página renderiza "Renda concentrada", a maior fonte "cachê" com 88% e os cards
  de destaque — verificado. `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical;
  nenhuma dependência nova nem mudança de schema — ver D6/D8).

### Sessão 55 — 2026-06-20 (Fase 1 — desempenho por dia da semana)
- **Lógica pura** (`src/lib/finance.ts`): nova `weekdayPerformance(shows, { now? })` que agrega os shows
  já realizados com cachê (`isHappenedGig` + `fee > 0`, mesma regra de `feeTrend`) por dia da semana
  (0=domingo..6=sábado, em UTC). Retorna `days[]` (sempre os 7 dias, mesmo zerados, cada um com
  `count`/`totalFee`/`avgFee`/`countShare`/`feeShare`), `totalShows`, `totalFee`, `avgFee` e três
  destaques — `bestByAvg` (maior cachê médio), `bestByVolume` (maior faturamento) e `busiest` (mais
  shows) — com desempate determinístico via helper interno `pick(rank, tiebreak)` (empate → nº de shows;
  empate total → dia mais cedo). Também exporta `WEEKDAY_LABELS`/`WEEKDAY_SHORT`. **7 testes** novos em
  `finance.test.ts`. Total do projeto **436** (eram 429). Ver **DECISIONS.md D46**.
- **Página** (`src/app/(app)/shows/dias-semana/page.tsx`): server component que carrega os shows do
  usuário, chama `weekdayPerformance` e renderiza três cards de destaque (melhor cachê médio / mais
  faturamento / mais shows, cada um com o dia e o valor) e a tabela domingo→sábado com cachê médio
  (barra proporcional), faturamento (+ participação %), nº de shows e selo "melhor" no dia de maior
  média; linha de total no rodapé. Dias sem shows aparecem esmaecidos (lacuna da agenda). Estado vazio
  honesto. Link **Por dia da semana** na barra de `/shows`. Sem schema, sem dependência, sem server action.
- Definition of Done verde: build (**30 rotas**; nova `/shows/dias-semana`), typecheck (`tsc --noEmit`)
  limpo, lint (0), **436 testes** (`vitest run`), smoke test ao vivo (`next start`): `/shows/dias-semana`
  sem sessão → 307, `/shows` → 307, `/login` → 200; **e2e autenticado com cookie de sessão real** (seed
  demo + 2 shows PLAYED em sábado/sexta de jan) → a página renderiza "Por dia da semana", destaca
  **Sábado** como melhor cachê médio (R$ 500 > sexta R$ 200) com selo "melhor" — verificado. `npm audit`
  inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de
  schema — ver D6/D8).

### Sessão 56 — 2026-06-20 (Fase 1 — fidelização / retenção de contratantes / CRM)
- **Lógica pura** (`src/lib/contacts.ts`): nova `clientRetention(items, now?)` que mede a fidelização da
  **carteira** de contratantes (não por contato como o ranking, nem dormente como o reativar). Considera
  só contatos com ≥1 show **não cancelado** (quem de fato contratou); um contratante é **recorrente**
  quando tem ≥2 shows não cancelados (voltou a contratar). Retorna `rows`/`recurring` (ordenados por nº de
  shows desc, depois cachê, nome pt-BR, id), `totalClients`, `recurringClients`, `oneTimeClients`,
  `repeatRate` (recompra), `totalShows`, `totalFee`, `recurringFee`, `recurringFeeShare` (fatia da receita
  vinda de quem volta), `avgShowsPerClient` e `mostLoyal`. Cachê por contato (um show com vários contatos
  conta para cada um, igual ao ranking D18); inclui shows futuros confirmados (re-contratação agendada
  também é fidelização); shows CANCELLED ignorados. **7 testes** novos em `contacts.test.ts`. Total do
  projeto **443** (eram 436). Ver **DECISIONS.md D47**.
- **Página** (`src/app/(app)/contatos/retencao/page.tsx`): server component que carrega os contatos do
  usuário com seus shows, chama `clientRetention` e renderiza quatro cards de KPI (taxa de recompra,
  receita de recorrentes %, contratantes únicos, shows por contratante), o card "Mais fiel" e a tabela
  de contratantes recorrentes (shows, cachê total, último show). Estado vazio honesto; quando ninguém
  voltou ainda, aponta para `/contatos/reativar`. Links **Fidelização** na barra de `/contatos` e cruzado
  com o Ranking. Sem schema, sem dependência, sem server action.
- Definition of Done verde: build (**31 rotas**; nova `/contatos/retencao`), typecheck (`tsc --noEmit`)
  limpo, lint (0), **443 testes** (`vitest run`), smoke test ao vivo (`next start`): `/contatos/retencao`
  sem sessão → 307, `/login` → 200; **e2e autenticado com cookie de sessão real** (usuário + 1 contratante
  com 2 shows PLAYED + 1 contratante com 1 show) → a página renderiza "Fidelização de contratantes",
  taxa de recompra **50%** (1 de 2), receita de recorrentes **75%**, "Bar Recorrente" como mais fiel —
  verificado. `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma
  dependência nova nem mudança de schema — ver D6/D8).

### Sessão 57 — 2026-06-20 (Fase 1 — atuação por cidade / rollup geográfico)
- **Lógica pura** (`src/lib/finance.ts`): nova `rankCitiesByProfit(shows, txs, opts?)` que agrega o P&L
  dos shows por **cidade** (rollup acima de `rankVenuesByProfit`/D19: uma cidade reúne todas as casas
  nela). Agrupa estritamente por `city` (normalizado sem acento/caixa); shows sem cidade caem em "Sem
  cidade" (chave ""). Mesma forma de retorno da rentabilidade por local — `CityProfitRow`/
  `CitiesProfitability` são type aliases de `VenueProfitRow`/`VenuesProfitability`. **DRY:** o corpo de
  `rankVenuesByProfit` virou o helper privado `aggregateShowProfit(shows, txs, keyer, emptyLabel, opts)`
  e ambas as funções públicas são fachadas finas (keyer/rótulo diferentes) — uma só fonte da agregação,
  reaproveitando `computeShowPnL`. Exclui `CANCELLED` por padrão. **5 testes** novos em `finance.test.ts`
  (vazio; agrupa casas distintas da mesma cidade; "Sem cidade"; ordenação + melhor/pior; exclui
  cancelados); os 6 testes de `rankVenuesByProfit` seguem verdes (refactor puro). Total do projeto **448**
  (eram 443). Ver **DECISIONS.md D48**.
- **Página** (`src/app/(app)/shows/cidades/page.tsx`): server component que carrega os shows + transações
  vinculadas, chama `rankCitiesByProfit` e renderiza três cards de destaque (cidades analisadas /
  resultado líquido total / cidade mais rentável), os destaques mais/menos rentável e a tabela por cidade
  (shows, cachê, extras, despesas, resultado, média/show) com uma **barra de participação** por linha;
  cruza-link com `/shows/locais` para o detalhe por casa. Estado vazio honesto. Link **Por cidade** na
  barra de `/shows`. Sem schema, sem dependência, sem server action.
- Definition of Done verde: build (**35 páginas**; nova `/shows/cidades`), typecheck (`tsc --noEmit`)
  limpo, lint (0), **448 testes** (`vitest run`), smoke test ao vivo (`next start`): `/shows/cidades`
  sem sessão → 307, `/login` → 200; **e2e autenticado com cookie de sessão real** (seed demo: shows em
  São Paulo, Belo Horizonte e Campinas) → a página renderiza "Atuação por cidade", os cards "Cidades
  analisadas"/"Cidade mais rentável" e as cidades São Paulo/Belo Horizonte — verificado. `npm audit`
  inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de
  schema — ver D6/D8).

### Sessão 58 — 2026-06-20 (Fase 1 — concentração de receita por contratante / risco)
- **Lógica pura** (`src/lib/contacts.ts`): nova `clientConcentration(items)` que mede a **dependência**
  da receita em relação aos contratantes (leitura de RISCO — distinta do ranking, que ordena por volume,
  e da retenção, que mede recompra). É o equivalente do mix de receitas (`incomeMix`/D45) no eixo de
  contratantes. Soma o cachê por contato sobre shows **não cancelados** (um show com vários contatos conta
  para cada um, mesma convenção do ranking D18); contatos sem faturamento (cachê 0 ou só cancelados) ficam
  de fora. Retorna `rows` (ordenadas por cachê desc, nome pt-BR, id) com `share` de cada um, `clientCount`,
  `totalFee`, `top`/`topShare`, `top3Share`, `hhi` (Herfindahl), `effectiveClients` (1/HHI) e `level`
  (`concentrated`/`moderate`/`diversified`) com os mesmos limiares de HHI da D45 (≥0,45 concentrada;
  ≥0,25 moderada). **7 testes** novos em `contacts.test.ts` (vazio; ignora sem faturamento; cliente único
  = 100%; ordenação + participações + HHI; soma por contato em vários shows; carteira equilibrada →
  diversificada; faixa intermediária → moderada). Total do projeto **462** (medição real `vitest run`).
  Ver **DECISIONS.md D50**.
- **Página** (`src/app/(app)/contatos/concentracao/page.tsx`): server component que carrega os contatos com
  seus shows, chama `clientConcentration` e renderiza o veredito de concentração (faixa colorida com texto
  específico por nível), três destaques (cachê total da carteira / maior contratante com % e valor / nº de
  contratantes + top-3) e a tabela por contratante com **barra de participação**. Estado vazio honesto;
  cruza-link com `/contatos/${id}` e `/contatos/retencao`. Link **Concentração** na barra de `/contatos`.
  Sem schema, sem dependência, sem server action.
- Definition of Done verde: build (nova rota `/contatos/concentracao`), typecheck (`tsc --noEmit`) limpo,
  lint (0), **462 testes** (`vitest run`), smoke test ao vivo (`next start`): `/contatos/concentracao`
  sem sessão → 307, `/login` → 200; **e2e autenticado com cookie de sessão real** (1 contratante "Festival
  Gigante" com show de R$ 8.000 + 1 "Bar Pequeno" com R$ 1.000) → a página renderiza "Concentração de
  contratantes", veredito **"Carteira concentrada"** e o Festival como maior contratante com **89%** —
  verificado. `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência
  nova nem mudança de schema — ver D6/D8).

### Sessão 59 — 2026-06-20 (Fase 1 — prazo de recebimento / DSO realizado dos cachês)
- **Lógica pura** (`src/lib/finance.ts`): nova `paymentLag(shows, txs)` que mede, sobre os cachês que
  **já entraram**, quantos dias depois do show o dinheiro caiu no caixa — leitura **realizada**,
  complementar ao aging (D31, que olha o que ainda falta). Considera receitas INCOME `received=true`
  vinculadas a um show (`showId`), valor > 0, shows **não cancelados**; prazo = dias (UTC) entre a data
  do show e a do pagamento (negativo = pago adiantado). Agrega por show (`avgDays` ponderado pelo valor
  de cada recebimento; `lastDays` = pior prazo; `bucket`) e retorna o **prazo médio global ponderado
  pelo valor** (o "DSO" do caixa), `showCount`/`paymentCount`/`totalReceived`, `buckets` (5 faixas de
  velocidade via `paymentSpeedBucket`: ≤0 / 1–7 / 8–30 / 31–60 / >60 dias, sempre presentes na ordem
  fixa, com `received`/`share`) e `fastest`/`slowest`. **7 testes** novos em `finance.test.ts` (+1 de
  `paymentSpeedBucket` nas fronteiras). Total do projeto **469** (medição real `vitest run`; eram 462).
  Ver **DECISIONS.md D51**.
- **Página** (`src/app/(app)/shows/prazo-recebimento/page.tsx`): server component que carrega os shows
  não cancelados + as receitas recebidas vinculadas, chama `paymentLag` e renderiza três destaques
  (prazo médio ponderado / recebido analisado / recebimento mais lento), a barra de distribuição por
  faixa de velocidade (quanto do dinheiro entrou em cada prazo, % e valor) e a tabela por show do mais
  lento ao mais rápido (recebido, nº de recebimentos, prazo médio, pior prazo) com link ao detalhe do
  show. Estado vazio honesto apontando para `/shows/a-receber`. Link **Prazo de recebimento** na barra
  de `/shows`. Sem schema, sem dependência, sem server action.
- Definition of Done verde: build (nova rota `/shows/prazo-recebimento`), typecheck (`tsc --noEmit`)
  limpo, lint (0), **469 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/shows/prazo-recebimento` sem sessão → 307, `/login` → 200; **e2e autenticado com cookie de sessão
  real** (seed demo: show "Show no Bar do Zé" pago no mesmo dia) → a página renderiza "Prazo de
  recebimento", os cards "Prazo médio (ponderado)"/"Recebido analisado" e o show pago "no dia" —
  verificado. `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma
  dependência nova nem mudança de schema — ver D6/D8).

### Sessão 60 — 2026-06-20 (Fase 1 — prazo de recebimento por contratante / quem paga rápido x devagar)
- **Lógica pura** (`src/lib/finance.ts`): nova `paymentLagByContact(shows, txs, getPayer)` que **quebra
  o prazo de recebimento (D51) por quem paga**. Reaproveita `paymentLag` (mesma regra de quem entra e o
  cálculo por show) e só redistribui os shows pelo pagador, agregando o prazo ponderado pelo valor por
  contratante. Retorna `rows` (grupos do prazo médio mais lento ao mais rápido; cada grupo com `contact`,
  `received`, `paymentCount`, `showCount`, `avgDays` ponderado, `lastDays`, `bucket`, `share` e os
  `shows` do grupo), `contactCount`/`paymentCount`/`totalReceived`, `avgDays` global e `slowest`/`fastest`
  (ignorando o grupo "Sem contratante"). O grupo de pagador nulo (shows sem contato vinculado) vai
  sempre por último e fica fora de `contactCount`/`slowest`/`fastest`. O seletor de pagador entra por
  **callback** (`getPayer`), mantendo `finance.ts` sem imports. **5 testes** novos em `finance.test.ts`.
  Ver **DECISIONS.md D52**.
- **Seletor de pagador** (`src/lib/billing.ts`): nova `pickPayerContact(contacts)` que escolhe o contato
  responsável pelo pagamento por papel (reusa a prioridade BOOKER/PROMOTER antes de VENUE da D27/D30),
  mas — diferente de `pickBillingContact` — **NÃO exige canal** (e-mail/telefone): para agrupar por quem
  paga, o contratante conta mesmo sem dado de contato. **4 testes** novos em `billing.test.ts`. Total do
  projeto **478** (medição real `vitest run`; eram 469).
- **Página** (`src/app/(app)/shows/prazo-recebimento/por-contratante/page.tsx`): server component que
  carrega os shows não cancelados com seus contatos vinculados + as receitas recebidas, injeta
  `pickPayerContact`, chama `paymentLagByContact` e renderiza três destaques (prazo médio ponderado /
  paga mais rápido / paga mais devagar), a tabela por contratante (recebido, nº de shows, prazo médio
  com selo de cor por velocidade, pior prazo, % do recebido) e o detalhe dos shows de cada contratante
  (lento→rápido). Cruza-link com `/contatos/[id]` e com a página geral `/shows/prazo-recebimento`
  (que ganhou o botão **Por contratante**). Estado vazio honesto apontando para `/shows/a-receber`.
  Sem schema, sem dependência, sem server action.
- Definition of Done verde: build (nova rota `/shows/prazo-recebimento/por-contratante`), typecheck
  (`tsc --noEmit`) limpo, lint (0), **478 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/shows/prazo-recebimento/por-contratante` sem sessão → 307; **e2e autenticado com cookie de sessão
  real** (seed demo) → a página renderiza "Prazo de recebimento por contratante", os cards "Paga mais
  rápido/devagar" e o grupo "Sem contratante" — verificado (HTTP 200). `npm audit` inalterado (10
  advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8).

### Sessão 61 — 2026-06-20 (Fase 1 — distribuição de cachês por faixa de preço)
- **Consolidação:** ao abrir a sessão, a PR #75 (Sessão 60, prazo de recebimento por contratante)
  estava aberta com CI verde — foi **mergeada na `main`** antes de iniciar trabalho novo (regra de
  ouro: um tronco só, sem linha concorrente), e a sessão seguiu a partir da `main` atualizada.
- **Lógica pura** (`src/lib/finance.ts`): nova `feeDistribution(shows)` que distribui os cachês dos
  shows **já realizados** (mesmo critério `isHappenedGig` + `fee > 0` de `feeTrend`) pelas faixas
  fixas de preço de `FEE_BANDS` (até R$ 500 / 500–1k / 1k–2k / 2k–3,5k / 3,5k–5k / acima de 5k, em
  centavos; `min` inclusivo, `max` exclusivo). Por faixa: count, total, `countShare` e `feeShare`.
  Deriva `avgFee`, `medianFee` (robusto a outlier — helper `median()`), `modalBand` (faixa típica =
  mais shows) e `topValueBand` (onde está o faturamento). Complementa `feeTrend` (D44, evolução no
  tempo) com o **formato** da distribuição. `feeBandKeyFor` exportada para teste de fronteira.
  **8 testes** novos (1 de `feeBandKeyFor` nas fronteiras + 7 de `feeDistribution`). Total do projeto
  **486** (medição real `vitest run`; eram 478 após o merge da #75). Ver **DECISIONS.md D53**.
- **Página** (`src/app/(app)/shows/faixas-de-cache/page.tsx`): server component que carrega os shows,
  chama `feeDistribution` e renderiza quatro destaques (cachê médio / mediano / faixa típica / onde
  está o faturamento) e a tabela das 6 faixas com barras por nº de shows, % dos shows, faturamento e
  % do faturamento, selo "típica" na faixa modal e rodapé de totais. Aviso de que as faixas são uma
  referência de mercado (hipótese). Estado vazio honesto. Link **Faixas de cachê** na barra de
  `/shows`, ao lado de "Evolução do cachê". Sem schema, sem dependência, sem server action.
- Definition of Done verde: build (nova rota `/shows/faixas-de-cache`), typecheck (`tsc --noEmit`)
  limpo, lint (0), **486 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/shows/faixas-de-cache` sem sessão → 307, `/login` → 200; **e2e autenticado com cookie de sessão
  real** (seed demo) → a página renderiza "Faixas de cachê", os cards "Cachê mediano"/"Faixa típica"
  e a tabela "Distribuição por faixa de preço"; o link aparece na barra de `/shows` — verificado
  (HTTP 200). `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma
  dependência nova nem mudança de schema — ver D6/D8).

### Sessão 62 — 2026-06-20 (Fase 1 — hub central de Relatórios / discoverability)
- **Motivação:** o app já tinha 24 páginas de análise, mas só alcançáveis por barras de botões que
  cresceram demais no topo de `/shows` (12 links) e `/financas`, com a navbar limitada a
  Painel/Shows/Finanças/Contatos. O acervo ficava enterrado — um problema de discoverability, não
  mais um relatório a somar. Sessão escolheu **consolidar a navegação** em vez de abrir o 25º relatório.
- **Lógica/dados puros** (`src/lib/reports.ts`): `REPORT_GROUPS` — catálogo tipado dos relatórios
  agrupados por área (Shows / Finanças / Contatos), cada entrada com `title`, `href`, `description` e
  `icon`; helpers `allReports()` (achata na ordem dos grupos) e `reportCount()`. Fonte única: registrar
  um relatório novo passa a ser editar só este arquivo. **9 testes** novos de invariantes
  (`src/lib/reports.test.ts`): hrefs únicos e absolutos, sem título/descrição vazios, cada href no
  prefixo da sua área, grupos não vazios, `allReports`/`reportCount` coerentes. Total do projeto
  **495** (medição real `vitest run`; eram 486 na main). Ver **DECISIONS.md D54**.
- **Página** (`src/app/(app)/relatorios/page.tsx`): server component que exige só sessão
  (`requireUser`, sem consulta ao banco) e renderiza, por grupo, cards-link com ícone/título/descrição.
- **Navegação** (`src/app/(app)/layout.tsx`): item **Relatórios** adicionado à navbar desktop e ao
  menu mobile, ao lado de Contatos. As barras de botões existentes em `/shows` e `/financas` foram
  mantidas (atalhos contextuais); o hub é aditivo, sem regressão.
- Definition of Done verde: build (nova rota `/relatorios`), typecheck (`tsc --noEmit`) limpo, lint
  (0 warnings/erros), **495 testes** (`vitest run`), smoke test ao vivo (`next start`): `/relatorios`
  sem sessão → 200 (renderiza o login após redirect interno). `npm audit` inalterado (10 advisories:
  4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8).

### Sessão 63 — 2026-06-20 (Fase 1 — podar as barras de relatórios apontando para o hub)
- **Motivação:** fechar o item 0 dos próximos passos / alternativa (c) deferida da D54. Após o hub
  `/relatorios` da Sessão 62, as barras de botões no topo de `/shows` (~10 links de relatório),
  `/financas` (8) e `/contatos` (4) ficaram redundantes e poluídas, competindo com as ações primárias.
- **Mudança (UI/navegação pura):** em cada uma das três listas, o bloco de links de relatório virou
  **um único link "Relatórios"** ancorado na seção da área no hub: `/shows` → `/relatorios#shows`,
  `/financas` → `/relatorios#financas`, `/contatos` → `/relatorios#contatos`. No hub
  (`src/app/(app)/relatorios/page.tsx`) cada `<section>` ganhou `id={group.area}` + `scroll-mt-24`
  para o salto âncora respeitar o cabeçalho.
- **Mantidos nas barras (não são relatórios):** alternador Lista/Semana/Mês e **Exportar .ics** em
  `/shows`; **Exportar CSV** (age sobre o recorte filtrado) em `/financas`; **+ Novo show / + Nova
  transação / + Novo contato**; e o atalho **Conflitos** de `/shows` (alerta com badge de contagem +
  destaque âmbar — estado vivo que o hub estático não mostra). Ver **DECISIONS.md D55**.
- **Sem schema/dependência/server action.** Nenhuma rota removida; todos os relatórios seguem
  acessíveis pelo hub.
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`)
  limpo, lint (0 warnings/erros), **495 testes** (`vitest run`, inalterados — mudança só de UI sobre
  rotas/lógica já testadas), smoke test ao vivo (`next start`): `/login` → 200, `/relatorios` sem
  sessão → 307 (redireciona ao login). `npm audit` inalterado (10 advisories: 4 moderate / 5 high /
  1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8).

### Sessão 64 — 2026-06-20 (Fase 1 — busca textual no hub de Relatórios)
- **Motivação:** fechar o item 0 dos próximos passos ("um campo de busca/filtro no hub conforme o
  acervo cresce"). O hub `/relatorios` (D54) já reúne 24 relatórios em 3 grupos; percorrer todos os
  cards para achar um específico ficou custoso. Sessão escolheu evoluir o hub em vez de abrir o 25º
  relatório.
- **Lógica pura** (`src/lib/reports.ts`, fonte única do catálogo): nova `filterReports(query)` que
  filtra os grupos pelo texto — casamento insensível a acento/caixa (reusa `normalizeText` de
  `finance.ts`), **multitermo AND** (cada termo precisa aparecer na mesma entrada) varrendo
  **título + descrição + rótulo do grupo** (assim "shows" traz a área inteira, "prazo contratante" só
  casa o relatório com ambos). Grupos sem entrada casada são omitidos; consulta vazia devolve tudo
  (cópia rasa, sem mutar `REPORT_GROUPS`). `countFilteredReports(query)` deriva o "N de M". **9 testes**
  novos em `src/lib/reports.test.ts` (vazio = tudo, sem-mutação, casa por título/descrição/rótulo,
  AND, omissão de grupo vazio, sem-casamento, coerência da contagem). Total do projeto **504**
  (medição real `vitest run`; eram 495 na main). Ver **DECISIONS.md D56**.
- **UI** (`src/app/(app)/relatorios/ReportsBrowser.tsx`, novo client component): campo de busca ao
  vivo no topo do hub que filtra os cards no cliente (catálogo estático — sem ida ao servidor a cada
  tecla), via `filterReports`. Contador "N de M relatórios" só quando há filtro; estado vazio honesto
  quando nada casa. A página `/relatorios` segue server component (auth + cabeçalho) e delega a lista
  ao browser; `id={group.area}`/`scroll-mt-24` preservados → âncoras `#shows`/`#financas`/`#contatos`
  das listas (D55) seguem funcionando. Sem schema, sem dependência, sem server action.
- Definition of Done verde: build (`prisma generate && next build`) OK — `/relatorios` 2,62 kB;
  typecheck (`tsc --noEmit`) limpo, lint (0 warnings/erros), **504 testes** (`vitest run`), smoke test
  ao vivo (`next start`): `/relatorios` sem sessão → 307 (→ login), `/login` → 200; **e2e autenticado
  com cookie de sessão real** (seed demo) → `/relatorios` 200 renderiza o campo "Buscar relatório"
  (`#report-search`) e os cards (ex.: "Faixas de cachê", "Prazo por contratante"). `npm audit`
  inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de
  schema — ver D6/D8).

### Sessão 65 — 2026-06-20 (Fase 1 — prazo MEDIANO de recebimento / DSO robusto a outlier)
- **Motivação:** o card "Prazo médio (ponderado)" de `/shows/prazo-recebimento` (D51) usa a média, que
  um único cachê pago muito atrasado infla — dando a impressão falsa de que "todo mundo paga devagar".
  Faltava a leitura **típica**, resistente a outlier (item 5 dos próximos passos: "a mediana do prazo
  além da média ponderada"). Sessão escolheu polir o relatório existente em vez de abrir um novo.
- **Lógica pura** (`src/lib/finance.ts`): novo campo `medianDays` no `PaymentLag` — a **mediana
  ponderada pelo valor** do prazo de cada show (o dia em que metade do faturamento recebido já tinha
  entrado), usando os **mesmos insumos do DSO médio** (`avgDays` do show, peso = `received`), para
  contar a mesma história com pesos consistentes. Helper interno puro `weightedMedian({value,weight}[])`
  (ordena por valor, acumula peso até a metade do total; convenção do "meio" no empate exato; pesos
  <= 0 ignorados; vazio → 0). **3 testes** novos em `finance.test.ts` (vazio/único; mediana resiste a
  show atrasado que infla a média; mediana ponderada pelo valor). Total do projeto **507** (medição real
  `vitest run`; eram 504 na main). Ver **DECISIONS.md D57**.
- **UI** (`src/app/(app)/shows/prazo-recebimento/page.tsx`): card "Prazo mediano (ponderado)" ao lado
  de "Prazo médio (ponderado)" (grade de destaques de 3 → 4 colunas em telas largas), com nota de que
  resiste a um atraso isolado, e o rodapé explicativo atualizado. Sem schema, sem dependência, sem
  server action.
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`)
  limpo, lint (0 warnings/erros), **507 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/login` → 200, `/shows/prazo-recebimento` sem sessão → 307; **e2e autenticado com cookie de sessão
  real** (seed demo) → `/shows/prazo-recebimento` 200 renderiza os cards "Prazo mediano (ponderado)" e
  "Prazo médio (ponderado)" — verificado. `npm audit` inalterado (10 advisories: 4 moderate / 5 high /
  1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8).

### Sessão 66 — 2026-06-21 (Fase 1 — agrupar os relatórios por subtema no hub)
- **Motivação:** fechar o item 0 dos próximos passos ("agrupar visualmente os relatórios por subtema
  dentro de cada área no hub"). A área Shows do hub `/relatorios` tinha 12 cards num bloco único, em que
  agenda, preço e recebíveis se misturavam numa grade longa e indiferenciada. Sessão escolheu polir o
  hub existente em vez de abrir o 25º relatório.
- **Lógica pura** (`src/lib/reports.ts`, fonte única do catálogo): novo campo **`subtopic` (obrigatório)**
  em `ReportEntry`; as entradas de `REPORT_GROUPS` foram **reordenadas para ficarem contíguas por
  subtema** (sem mudar hrefs nem remover relatórios). Subtemas: Shows → *Agenda & pipeline* /
  *Rentabilidade & preço* / *Recebíveis*; Finanças → *Fechamentos* / *Receitas & pendências* /
  *Custos & metas*; Contatos → *Quem move a carreira* / *Relacionamento*. Nova `subgroupEntries(entries)`
  agrupa por subtema preservando a ordem de primeira aparição (sem mutar), e `filterReports` passou a
  varrer também o `subtopic` (buscar "recebíveis" traz o subtema inteiro). **6 testes** novos em
  `reports.test.ts` (subgroupEntries: ordem/junção não-contígua/vazio/preservação; subtema preenchido +
  contíguo; busca por subtema). Total do projeto **513** (medição real `vitest run`; eram 507 na main).
  Ver **DECISIONS.md D58**.
- **UI** (`src/app/(app)/relatorios/ReportsBrowser.tsx`): cada `<section>` de área agora itera
  `subgroupEntries(group.entries)`, com um subcabeçalho `<h3>` discreto por subtema acima da grade de
  cards. As âncoras `#shows`/`#financas`/`#contatos` (D55) seguem na `<section>` da área — intactas. Sem
  schema, sem dependência, sem server action.
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`)
  limpo, lint (0 warnings/erros), **513 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/login` → 200, `/relatorios` sem sessão → 307; **e2e autenticado com cookie de sessão real** (seed
  demo) → `/relatorios` 200 renderiza o campo "Buscar relatório" e os subcabeçalhos de subtema
  ("Agenda & pipeline", "Recebíveis", "Custos & metas", "Quem move a carreira", "Relacionamento",
  "Fechamentos") — verificado. `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical;
  nenhuma dependência nova nem mudança de schema — ver D6/D8).

### Sessão 67 — 2026-06-21 (Fase 1 — sumário de salto rápido por subtema no hub)
- **Motivação:** fechar o "próximo possível" do item 0 ("âncoras/salto por subtema, ou um índice de
  subtemas no topo de cada área conforme o acervo cresça"). Com 24 relatórios em 8 subtemas, o hub
  `/relatorios` virou uma página longa; faltava um atalho para pular direto ao tema desejado sem rolar.
  Sessão escolheu polir o hub existente em vez de abrir o 25º relatório.
- **Lógica pura** (`src/lib/reports.ts`): nova `subtopicSlug(area, subtopic)` gera um id de âncora
  estável `<area>-<subtema-kebab>` (sem acento/caixa, prefixado pela área para não colidir entre áreas
  homônimas) e `reportsNavIndex()` devolve o índice navegável (área → subtemas) com contagem por
  subtema/área e os ids de âncora. **8 testes** novos em `reports.test.ts` (subtopicSlug: formato kebab,
  determinismo, não-colisão entre áreas, sem hífen nas pontas; reportsNavIndex: ordem/rótulo/âncora da
  área, soma das contagens, casamento com `subgroupEntries`, âncoras únicas via subtopicSlug). Total do
  projeto **521** (medição real `vitest run`; eram 513 na main). Ver **DECISIONS.md D59**.
- **UI** (`src/app/(app)/relatorios/ReportsBrowser.tsx`): novo `<nav>` "Ir para um tema" no topo,
  renderizado a partir de `reportsNavIndex()`, com a área como rótulo e cada subtema como uma "pílula"
  clicável (`<a href="#âncora">`) que mostra a contagem; **some durante a busca** (quando a lista já está
  recortada). Cada subseção de subtema ganhou `id={subtopicSlug(...)}` + `scroll-mt-24` para receber o
  salto. As âncoras de área `#shows`/`#financas`/`#contatos` (D55) seguem intactas. Sem schema, sem
  dependência, sem server action.
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`)
  limpo, lint (0 warnings/erros), **521 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/login` → 200, `/relatorios` sem sessão → 307. `npm audit` inalterado (10 advisories: 4 moderate /
  5 high / 1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8).

### Sessão 68 — 2026-06-21 (Fase 1 — projeção de fechamento do ano)
- **Motivação:** os relatórios financeiros até aqui olham para trás (Resumo anual, Sazonalidade) ou só
  para frente em peças isoladas (Receita agendada = só cachês futuros; Projeção de caixa = saldo mês a
  mês). Faltava a leitura que junta tudo numa frase: "se nada mudar, como fecho o ANO?". É a pergunta de
  planejamento que decide investir, segurar custo ou correr atrás de show. Sessão escolheu um relatório
  financeiro novo de alto valor, reaproveitando a lógica pura existente.
- **Lógica pura** (`src/lib/finance.ts`): nova `projectYearEnd(txs, shows, year, {now})` → `YearEndForecast`.
  Soma três componentes do ano: (1) **realizado** = transações `received=true` (receita recebida /
  despesa paga); (2) **pendente lançado** = transações `received=false`; (3) **cachê agendado** = shows
  futuros do ano (data ≥ hoje, não CANCELLED, fee>0) com o saldo `max(0, fee − receita já vinculada ao
  show)` — abatendo de QUALQUER período para não contar duas vezes (reusa `isConfirmedBooking` p/
  separar confirmado×tentativo). `projectedIncome = realizado+pendente+agendado`; `projectedExpense =
  realizado+pendente` (assimetria deliberada: não inventa custo futuro). **6 testes** novos em
  `finance.test.ts` (soma das 3 partes; abatimento sem dupla contagem; ignora passado/cancelado/sem-fee;
  show de hoje conta; recorte por ano; ano passado degrada p/ resultado lançado). Total do projeto
  **527** (medição real `vitest run`; eram 521 na main). Ver **DECISIONS.md D60**.
- **UI** (`src/app/(app)/financas/projecao-ano/page.tsx`): navegação por ano (←/Ano atual/→), hero do
  resultado projetado (borda/cor verde×vermelho) com o caixa realizado de hoje como referência, e dois
  cards de composição (Receitas: já recebido + a receber lançado + cachês agendados; Despesas: já pago +
  a pagar lançado) em barras com %, mais nota explicando a assimetria e link para Custos fixos. Carrega
  todas as transações (as do ano somam; as de show abatem) + shows do ano, em `Promise.all`. Registrado
  no hub (`reports.ts`, Finanças → Fechamentos, ícone 🔭). Sem schema, sem dependência, sem server action.
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`)
  limpo, lint (0 warnings/erros), **527 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/` → 200, `/financas/projecao-ano` sem sessão → 307 (→ `/login`). `npm audit` inalterado (10
  advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8).

### Sessão 71 — 2026-06-21 (Fase 1 — projeção do ano vs. ano anterior)
- **Motivação:** a projeção de fechamento (Sessão 68/D60) e seus derivados respondem "como fecho ESTE
  ano?", mas sozinhos não dizem se é bom ou ruim. Faltava a leitura de planejamento que ancora o número:
  "estou no caminho de fechar **melhor que o ano passado**?" — o "próximo possível" do item 6. Sessão
  escolheu polir o relatório de projeção existente reaproveitando a lógica pura, sem schema novo.
- **Lógica pura** (`src/lib/finance.ts`): nova `compareYearEndToPrevious(current, previous)` →
  `YearEndComparison`. Opera sobre **dois `YearEndForecast` já calculados** e reusa `computeDelta` para
  resultado, receita e despesa **projetados**. Para um ano já encerrado, `projectYearEnd` degrada esses
  campos para o resultado de competência lançado (o fechamento real), então não precisou de função
  especial. `hasPreviousData=false` quando o ano anterior não teve movimento → a UI omite o card.
  **2 testes** novos em `finance.test.ts` (compara result/income/expense com delta+pct+direction;
  ano anterior vazio → hasPreviousData false e pct nulo). Total do projeto **535** (medição real
  `vitest run`; eram 533 na main). Ver **DECISIONS.md D63**.
- **UI** (`src/app/(app)/financas/projecao-ano/page.tsx`): card "vs. {ano anterior}" logo abaixo do
  resultado projetado, com frase de salto ("deve fechar X acima/abaixo de {ano-1}") e dois mini-cards
  (Receitas/Despesas) com variação % colorida por bom×ruim (`goodWhenUp`). Helpers `DeltaBadge`,
  `CompareRow` e `formatPct` locais à página. A query de shows passou a cobrir `year-1..year` (antes só
  `year`) para a projeção do ano anterior ficar correta ao navegar para anos futuros. Sem schema, sem
  dependência, sem server action.
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`)
  limpo, lint (0 warnings/erros), **535 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/login` → 200, `/financas/projecao-ano` sem sessão → 307 (→ `/login`). `npm audit` inalterado (10
  advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8).

### Sessão 72 — Comparação vs. ano anterior no card de projeção do Painel (D64)
- **UI** (`src/app/(app)/dashboard/page.tsx`): o card "Projeção de {ano}" ganhou uma **pílula compacta
  "▲/▼ X% vs. {ano-1}"** ao lado do resultado projetado, levando a leitura de planejamento da Sessão 71
  (D63) para a primeira tela — "estou indo melhor que ano passado?" sem precisar abrir o relatório.
  Reaproveita 100% a lógica pura `compareYearEndToPrevious` (D63): chama `projectYearEnd` também para
  `currentYear - 1` sobre os mesmos `shows`/`txs` já carregados pelo dashboard (zero consulta extra,
  pois a query do Painel já traz todos os shows do usuário). A pílula só aparece quando
  `comparison.hasPreviousData` (o ano anterior teve movimento); o `title` mostra o fechamento do ano-1.
  Helper local `YoYBadge` (verde quando o resultado sobe, vermelho quando desce, neutro no empate).
- Sem schema, sem dependência, sem server action, **sem novos testes** (mudança de UI que reusa lógica
  pura já coberta por `finance.test.ts`; mesma postura das Sessões 69/71). Ver **DECISIONS.md D64**.
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`)
  limpo, lint (0 warnings/erros), **535 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/login` → 200, `/dashboard` sem sessão → 307 (→ `/login`). `npm audit` inalterado (10 advisories:
  4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8).

### Sessão 73 — Cenário "com custos fixos" no card de projeção do Painel (D65)
- **UI** (`src/app/(app)/dashboard/page.tsx`): o card "Projeção de {ano}" ganhou uma **linha
  conservadora "Com custos fixos: {resultado}"** abaixo da composição, trazendo o cenário pessimista
  da Sessão 70 (D62) para a primeira tela — o número crú projeta a receita futura mas não inventa
  despesa; esta linha soma o custo fixo recorrente típico (D39) aos meses futuros do ano ainda sem
  despesa lançada. Reaproveita 100% a lógica pura `projectYearEndWithFixedCosts` + `recurringExpenses`
  (D62/D39) sobre os mesmos `txs`/`shows` já carregados pelo dashboard (zero consulta extra). A linha
  só aparece quando `fixedScenario.applicable && estimatedRemainingFixedCost > 0` (ano corrente, há
  custo fixo a estimar e meses futuros sem despesa lançada); o valor fica verde/vermelho conforme o
  resultado e o texto detalha o custo/mês × nº de meses estimados. Diferente da página de detalhe
  (`/financas/projecao-ano`), que mostra o cenário num card próprio — no Painel é uma linha compacta
  dentro do card de projeção, evitando inflar a primeira tela.
- Sem schema, sem dependência, sem server action, **sem novos testes** (mudança de UI que reusa lógica
  pura já coberta por `finance.test.ts`; mesma postura das Sessões 69/71/72). Ver **DECISIONS.md D65**.
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`)
  limpo, lint (0 warnings/erros), **535 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/login` → 200, `/dashboard` sem sessão → 307 (→ `/login`). `npm audit` inalterado (10 advisories:
  4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8).

### Sessão 74 — Seletor de cenário (otimista × conservador) na projeção do ano (D66)
- **Lógica pura** (`src/lib/finance.ts`): nova `applyYearEndScenario(forecast, mode)` →
  `YearEndForecast`. No modo `"conservative"` remove os cachês de shows ainda a confirmar
  (`scheduledTentative`) da receita agendada e reprojeta `projectedIncome`/`projectedResult`; no
  `"optimistic"` (default) devolve o forecast inalterado. Para a contagem por cenário, `YearEndForecast`
  ganhou `scheduledConfirmedCount`/`scheduledTentativeCount` (populados em `projectYearEnd`). **4 testes**
  novos em `finance.test.ts` (otimista intacto; conservador remove tentativo e reprojeta receita/resultado/
  contagem; sem-tentativo coincide; contagem confirmados×tentativos). Total do projeto **539** (medição
  real `vitest run`; eram 535 na main). Ver **DECISIONS.md D66**.
- **UI** (`src/app/(app)/financas/projecao-ano/page.tsx`): seletor de pílulas **Otimista/Conservador**
  (via `?cenario=conservador`, preservando `?ano`), exibido só quando há cachê tentativo a descartar. O
  cenário escolhido alimenta o forecast do ano E o do ano anterior (comparação D63 coerente), o hero do
  resultado projetado, as receitas projetadas e a nota de composição (no conservador, informa quanto de
  cachê a confirmar ficou de fora). Despesas e o cenário "com custos fixos" (D62) permanecem ortogonais.
  Sem schema, sem dependência, sem server action.
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`)
  limpo, lint (0 warnings/erros), **539 testes** (`vitest run`), smoke test ao vivo (`next start`):
  `/login` → 200, `/financas/projecao-ano` e `?cenario=conservador` sem sessão → 307 (→ `/login`).
  `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem
  mudança de schema — ver D6/D8).

### Sessão 75 — piso conservador ("só confirmados") no card de projeção do Painel
- **UI** (`src/app/(app)/dashboard/page.tsx`): o card "Projeção de {ano}" ganhou uma **linha compacta**
  "Só confirmados: {resultado}" reaproveitando `applyYearEndScenario(forecast, "conservative")` (D66) sobre
  o forecast já computado — zero consulta extra. Aparece só quando há cachê tentativo a descartar
  (`forecast.scheduledTentative > 0`), detalhando o montante e o nº de shows a confirmar deixados de fora.
  Linha discreta em cinza (vs. âmbar dos "custos fixos" da D65); o número crú segue principal. O card
  continua server-side (um `<Link>` único para `/financas/projecao-ano`, onde vivem as pílulas interativas
  da D66). Sem schema, dependência, server action nem teste novo (lógica pura já coberta em `finance.test.ts`).
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`) limpo,
  lint (0 warnings/erros), **539 testes** (`vitest run`), smoke test ao vivo (`next start`): `/login` → 200.
  `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem
  mudança de schema — ver D6/D8). Ver **DECISIONS.md D67**.

### Sessão 76 — Cenário "pior caso" (conservador + custos fixos) na projeção do ano (D68)
- **Lógica pura** (`src/lib/finance.ts`): nova `projectYearEndPessimistic(forecast, txs, monthlyFixedCost,
  opts)` → `PessimisticYearEndScenario`. Cruza os dois cenários conservadores ORTOGONAIS já existentes:
  aplica `applyYearEndScenario(forecast, "conservative")` (D66 — receita só de shows confirmados) e, sobre
  esse forecast, `projectYearEndWithFixedCosts(...)` (D62 — soma o custo fixo recorrente futuro às
  despesas). Recebe sempre o forecast **cru/otimista**, então independe do seletor da página. Devolve o
  resultado/receita/despesa do piso + os componentes de cada eixo (`droppedTentative`,
  `estimatedRemainingFixedCost`) e `applicable` (true quando ao menos um eixo morde). **4 testes** novos em
  `finance.test.ts` (cruza os dois eixos; não-aplicável sem nenhum; aplicável só pela receita; aplicável só
  pela despesa). Total do projeto **543** (medição real `vitest run`; eram 539 na main). Ver **DECISIONS.md D68**.
- **UI** (`src/app/(app)/financas/projecao-ano/page.tsx`): novo card "Pior caso" (borda rose-500, mais
  forte que o âmbar dos custos fixos) computado de `fRaw`, com o número do piso e a explicação cruzando
  os dois eixos (quanto de cachê a confirmar e quantos meses de custo fixo ficaram somados). Renderizado só
  quando AMBOS os eixos mordem (`droppedTentative > 0 && estimatedRemainingFixedCost > 0`) E no modo
  otimista — evita redundância: em conservador o card de custos fixos já é o piso, e sem um dos eixos o
  pior caso coincide com algo já visível (número crú, pílula conservadora ou card de custos fixos).
  Sem schema, sem dependência, sem server action.
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`) limpo,
  lint (0 warnings/erros), **543 testes** (`vitest run`), smoke test ao vivo (`next start`): `/login` → 200,
  `/financas/projecao-ano` e `?cenario=conservador` sem sessão → 307 (→ `/login`). `npm audit` inalterado
  (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8).

### Sessão 77 — Piso "pior caso" no card de projeção do Painel (D69)
- **UI** (`src/app/(app)/dashboard/page.tsx`): o card "Projeção de {ano}" ganhou uma **linha compacta**
  "Pior caso: {resultado}" abaixo das linhas "Só confirmados" (D67) e "Com custos fixos" (D65),
  reaproveitando `projectYearEndPessimistic(forecast, txs, recurringExpenses(txs).estimatedMonthlyFixedCost)`
  (D68) sobre o forecast já computado — zero consulta extra. Aparece só quando AMBOS os eixos conservadores
  mordem (`pessimistic.droppedTentative > 0 && pessimistic.estimatedRemainingFixedCost > 0`); sem um deles
  o pior caso coincidiria com uma das duas linhas acima. Linha rose-700 (mais forte que o âmbar dos custos
  fixos e o cinza do "só confirmados"), espelhando a borda rose-500 do card de detalhe em
  `/financas/projecao-ano`. Detalha receita (sem o cachê a confirmar) e despesa (+custo fixo somado). O
  card segue server-side (`<Link>` único). Sem schema, dependência, server action nem teste novo (a lógica
  pura `projectYearEndPessimistic` já é coberta por `finance.test.ts` — 4 testes da D68).
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`) limpo,
  lint (0 warnings/erros), **543 testes** (`vitest run`), smoke test ao vivo (`next start`): `/login` → 200,
  `/dashboard` sem sessão → 307 (→ `/login`). `npm audit` inalterado (10 advisories: 4 moderate / 5 high /
  1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8). Ver **DECISIONS.md D69**.

### Sessão 78 — Prazo de recebimento (DSO) no Painel (D70)
- **Lógica pura** (`src/lib/finance.ts`): novo `paymentLagHeadline(lag)` que condensa um `PaymentLag` para
  o card do Painel — `show` (exige `PAYMENT_LAG_HEADLINE_MIN_SHOWS = 2` shows pagos e `totalReceived > 0`),
  `avgDays`/`medianDays`, `bucket` (via `paymentSpeedBucket`, dá o tom) e `skewed` (média ≥ mediana +
  `PAYMENT_LAG_SKEW_THRESHOLD_DAYS = 7` dias → um recebimento atrasado infla o DSO médio). +5 testes em
  `finance.test.ts`.
- **UI** (`src/app/(app)/dashboard/page.tsx`): novo card "Prazo de recebimento" que destaca a **mediana**
  ("metade do cachê entra até …"), com a média como complemento e um aviso quando `skewed`; tons por balde
  na borda/número (verde→âmbar→laranja→vermelho); linka para `/shows/prazo-recebimento`. Reaproveita
  `paymentLag(shows, txs)` sobre os shows/transações já carregados — zero consulta extra. Só aparece com
  amostra mínima de shows pagos. Fecha o "trazer o DSO/aging para o Painel" do item 5 (aging já estava lá
  desde a Sessão 41/D32).
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`) limpo,
  lint (0 warnings/erros), **548 testes** (`vitest run`), smoke test ao vivo (`next start`): `/login` → 200,
  `/dashboard` sem sessão → 307 (→ `/login`). `npm audit` inalterado (10 advisories: 4 moderate / 5 high /
  1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8). Ver **DECISIONS.md D70**.

### Sessão 79 — Indicador de "filtro lembrado" nas listas (D71)
- **Lógica pura** (`src/lib/listFilter.ts`): novo `FILTER_RESTORED_PARAM = "lembrado"` + helpers
  `withRestoredFlag(query)` (acrescenta o marcador à query de restauração) e `wasFilterRestored(params)`.
  O marcador NÃO é chave de filtro, então `canonicalQuery` o ignora — nunca entra no cookie e some na
  primeira submissão. +4 testes em `listFilter.test.ts`, inclusive a garantia de que o marcador não vaza
  para o cookie e que a URL restaurada (já com chaves) vira `persist` sem loop.
- **Middleware** (`src/middleware.ts`): o caso `restore` agora redireciona para
  `<rota>?<filtro>&lembrado=1` (via `withRestoredFlag`), para a página distinguir restauração de submissão.
- **UI**: novo componente server puro `src/components/RememberedFilterNotice.tsx` (pílula `brand` discreta
  "Filtro restaurado da sua última visita." + atalho "Limpar" → `?reset=1`, só renderiza quando `restored`).
  Inserido acima do formulário de filtro nas três listas: `/financas`, `/shows`, `/contatos` (cada uma lê
  `FILTER_RESTORED_PARAM` da query). Fecha o "indicador visual de filtro lembrado" do item 3.
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`) limpo,
  lint (0 warnings/erros), **552 testes** (`vitest run`), smoke test ao vivo (`next start`): `/login` → 200,
  `/dashboard` e `/shows` sem sessão → 307 (→ `/login`). `npm audit` inalterado (10 advisories: 4 moderate /
  5 high / 1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8). Ver **DECISIONS.md D71**.

### Sessão 80 — Exportação CSV da lista de Shows (D72)
- **Lógica pura** (`src/lib/csv.ts`): nova interface `CsvShow` + `SHOW_CSV_HEADERS` + `showsToCsv(shows)`,
  e o helper `csvTime(date)` (hora "HH:MM" em UTC, mesma convenção UTC de `csvDate`/`dayKey`, estável em
  testes). Colunas: Data, Hora, Título, Local, Cidade, Status (rótulo legível via `SHOW_STATUS_LABELS`,
  com fallback defensivo p/ status desconhecido), Cachê (R$) (decimal com vírgula via `centsToCsvAmount`),
  Observações. Mesma convenção pt-BR das demais exportações (delimitador `;`, escape RFC 4180 reaproveitado).
  +7 testes em `csv.test.ts` (cabeçalho, serialização, ausências, escape, status desconhecido, ordem; e
  `csvTime`).
- **Route** (`src/app/(app)/shows/export/route.ts`): GET protegido por `requireUser` que lê os MESMOS
  filtros da lista (`q`, `status`, `de`, `ate`), aplica `filterShows` sobre os shows do usuário (ordem
  `date desc`) e devolve CSV com BOM UTF-8 + `Content-Disposition` `shows-AAAA-MM-DD.csv`. Espelha
  exatamente `financas/export`.
- **UI** (`src/app/(app)/shows/page.tsx`): link "Exportar CSV" no cabeçalho (ao lado de "Exportar .ics"),
  apontando para `/shows/export` com a query do filtro ativo (helper `buildShowExportQuery`), para o
  arquivo respeitar o mesmo recorte exibido. Fecha a lacuna "Finanças tem export CSV, Shows não tinha".
- Definition of Done verde: build (`prisma generate && next build`) OK (`/shows/export` registrada),
  typecheck (`tsc --noEmit`) limpo, lint (0 warnings/erros), **559 testes** (`vitest run`), smoke test ao
  vivo (`next start`): `/login` → 200, `/shows` e `/shows/export` sem sessão → 307 (→ `/login`). `npm audit`
  inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de
  schema — ver D6/D8). Ver **DECISIONS.md D72**.

### Sessão 81 — Seletor de três cenários na projeção do ano (D73)
- **Lógica pura** (`src/lib/finance.ts`): novo tipo `YearEndScenarioChoice` (3 valores: optimistic/
  conservative/pessimistic) + `yearEndScenarioView(forecast, txs, fixedCost, mode, opts)` que normaliza
  qualquer um dos três cenários num formato comum (`YearEndScenarioView`: totais + composição de
  receita/despesa + `estimatedRemainingFixedCost` + `droppedTentative/Count`), reaproveitando
  `applyYearEndScenario` (D66) e `projectYearEndPessimistic` (D68) sem reprojetar. `compareYearEndToPrevious`
  teve o parâmetro alargado para o tipo estrutural `YearEndResultLike` (`Pick` de
  year/projectedResult/projectedIncome/projectedExpense), aceitando tanto `YearEndForecast` quanto a view —
  a comparação anual passa a respeitar o cenário escolhido. +6 testes em `finance.test.ts`.
- **UI** (`src/app/(app)/financas/projecao-ano/page.tsx`): seletor virou **grupo de três botões** Otimista /
  Conservador / Pior caso (componente `ScenarioPill`), cada um escolhendo o número principal e a composição.
  O card standalone "Pior caso" (D68) foi **removido** (consolidado no botão/headline); o card "Cenário com
  custos fixos" (D62) some no modo pior caso (custo fixo já embutido no número principal); a composição de
  despesas ganha a linha "Custo fixo estimado" no pior caso. Gating: botão Conservador só com cachê tentativo
  a descartar; botão Pior caso só com custo fixo futuro a somar; grupo aparece quando há ao menos um piso.
  Slugs pt-BR na query (`?cenario=conservador`/`?cenario=pessimista`).
- Definition of Done verde: build (`prisma generate && next build`) OK (`/financas/projecao-ano` registrada),
  typecheck (`tsc --noEmit`) limpo, lint (0 warnings/erros), **565 testes** (`vitest run`), smoke test ao
  vivo (`next start`): `/login` → 200, `/financas/projecao-ano?cenario=pessimista` sem sessão → 307
  (→ `/login`). `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência
  nova nem mudança de schema — ver D6/D8). Ver **DECISIONS.md D73**.

### Sessão 82 — Página dedicada de Fluxo de caixa projetado (D74)
- **UI** (`src/app/(app)/financas/fluxo-de-caixa/page.tsx`): nova página que reaproveita **100%** da lógica
  pura `projectCashflow` (Sessão 18, já testada) — sem lógica nova. Seletor de **horizonte** (3/6/12/24 meses
  via `?meses=`, default 6, validado contra a lista); três cards de destaque (Caixa atual, Saldo ao fim do
  horizonte, **Pior momento** = menor saldo projetado e em que mês); alerta vermelho do primeiro mês em que o
  caixa fica negativo; tabela mês a mês (a receber / a pagar / variação / saldo acumulado) com barras
  proporcionais ao maior fluxo do horizonte. Segue o padrão "card no Painel + página dedicada" (o card de 6
  meses do dashboard continua como vislumbre; a página dá controle e insights sem inflar o dashboard).
- **Hub** (`src/lib/reports.ts`): entrada "Fluxo de caixa projetado" registrada em Finanças → Receitas &
  pendências (aparece na busca e no índice do hub automaticamente).
- Definition of Done verde: build (`prisma generate && next build`) OK (`/financas/fluxo-de-caixa` registrada,
  260 B), typecheck (`tsc --noEmit`) limpo, lint (0 warnings/erros), **565 testes** (`vitest run`; sem teste
  novo — lógica pura já coberta), smoke test ao vivo (`next start`): `/login` → 200,
  `/financas/fluxo-de-caixa` e `?meses=12` sem sessão → 307 (→ `/login`). `npm audit` inalterado (10
  advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8).
  Ver **DECISIONS.md D74**.

### Sessão 83 — Cadência de shows: volume de apresentações ao longo do tempo (D75)
- **Lógica pura** (`src/lib/finance.ts`): `gigCadence(shows, { now? })` conta os shows **já realizados**
  (`isHappenedGig` — PLAYED, ou CONFIRMED com data passada) **por mês**, em ordem cronológica, e deriva
  média por mês ativo, média por mês de calendário, mês mais cheio/vazio, a **janela** do primeiro ao
  último gig (`spanMonths`), os **meses parados** dentro dela (`idleMonths`) e a **tendência** (contagem do
  mês recente vs. o primeiro, reaproveitando `computeDelta`). Conta **gigs de cachê 0** (o eixo é atividade,
  não preço — distinto de `feeTrend`/`feeDistribution`, que exigem `fee > 0`). Helpers privados `round1`
  (1 casa decimal) e `monthSpan` (meses de calendário entre duas chaves "YYYY-MM"). **+10 testes** em
  `src/lib/finance.test.ts` → **575 no projeto** (eram 565).
- **UI** (`src/app/(app)/shows/cadencia/page.tsx`): página espelhando `/shows/evolucao-cache` —
  cards de destaque (shows por mês ativo, total, mês mais cheio, meses parados), card de tendência
  ("Você está tocando mais/menos") e tabela mês a mês com barras proporcionais. Estado vazio dedicado.
- **Hub** (`src/lib/reports.ts`): entrada "Cadência de shows" registrada em Shows → Agenda & pipeline
  (aparece na busca e no índice do hub automaticamente). Completa o trio preço (`feeTrend`) × distribuição
  (`feeDistribution`) × volume (`gigCadence`).
- Definition of Done verde: build (`prisma generate && next build`) OK (`/shows/cadencia` registrada,
  263 B), typecheck (`tsc --noEmit`) limpo, lint (0 warnings/erros), **575 testes** (`vitest run`), smoke
  test ao vivo (`next start`): `/login` → 200, `/shows/cadencia` sem sessão → 307 (→ `/login`). `npm audit`
  inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de
  schema — ver D6/D8). Ver **DECISIONS.md D75**.

### Sessão 84 — Crescimento ano a ano das Finanças (D76)
- **Lógica pura** (`src/lib/finance.ts`): `yearlyHistory(txs)` consolida os totais por ano
  (receita/despesa/resultado) **só dos anos com movimento**, em ordem cronológica crescente, e calcula o
  crescimento de cada ano frente ao **ano ativo anterior** (predecessor na série, exposto em `previousYear`,
  para que o rótulo "vs. {ano}" seja sempre verdadeiro mesmo com lacunas), reaproveitando `computeDelta`.
  Deriva totais acumulados, média do resultado por ano (`avgNetPerYear`), melhor/pior ano por resultado
  líquido e a **tendência de longo prazo** (`trend`: resultado do último ano vs. o primeiro). **+7 testes**
  em `finance.test.ts` → **582 no projeto** (eram 575).
- **UI** (`src/app/(app)/financas/crescimento/page.tsx`): página espelhando `/financas/anual` —
  cards de destaque (resultado acumulado, média por ano, melhor/pior ano), card de tendência ("A sua carreira
  está crescendo/encolhendo") e tabela ano a ano com barras proporcionais e a variação YoY do resultado;
  cada ano linka para o resumo anual (`/financas/anual?ano=`). Estado vazio dedicado.
- **Hub** (`src/lib/reports.ts`): entrada "Crescimento ano a ano" registrada em Finanças → Fechamentos
  (aparece na busca e no índice do hub automaticamente). Completa o trio fechamento mensal (`annualSummary`)
  × sazonalidade (`monthlySeasonality`) × trajetória plurianual (`yearlyHistory`).
- Definition of Done verde: build (`prisma generate && next build`) OK (`/financas/crescimento` registrada,
  266 B), typecheck (`tsc --noEmit`) limpo, lint (0 warnings/erros), **582 testes** (`vitest run`), smoke
  test ao vivo (`next start`): `/login` → 200, `/financas/crescimento` sem sessão → 307 (→ `/login`). `npm
  audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de
  schema — ver D6/D8). Ver **DECISIONS.md D76**.

### Sessão 85 — Meta de faturamento anual (D77)
- **Schema** (`prisma/schema.prisma`): novo modelo `RevenueGoal` (id, userId, year, amount em
  centavos, timestamps) com **unique (userId, year)** e relação `revenueGoals` no `User`
  (`onDelete: Cascade`). Aplicado via `prisma db push` (dev); `resetDb` (`src/test/db.ts`) limpa a
  nova tabela. Primeira mudança de schema desde a base do MVP — preenche a metade "metas" do subtema
  "Custos & metas", que só tinha custos.
- **Lógica pura** (`src/lib/finance.ts`): `computeGoalProgress({ goal, realized, projected, year }, { now? })`
  cruza a meta com a receita já recebida (`realizedIncome`) e a projeção de faturamento
  (`projectedIncome`, reaproveitando `projectYearEnd`), respondendo "estou no caminho de bater a
  meta?". Deriva razões realizado/projetado, quanto falta, `onTrackToHit` e o **ritmo** (`pace`:
  adiantado/no ritmo/atrasado) frente ao avanço linear da meta no ano (faixa ±5%), só no ano corrente;
  ano passado/futuro não julgam ritmo. Entradas saneadas (não-finito → 0; meta negativa → 0). **+8
  testes** em `finance.test.ts`.
- **Validação** (`src/lib/validation.ts`): `revenueGoalSchema` (ano inteiro 1970–2999; valor > 0 via
  `moneyField`/máscara pt-BR).
- **Server actions** (`src/app/(app)/financas/metas/actions.ts`): `setRevenueGoalAction` (upsert por
  userId+year — uma meta por ano) e `deleteRevenueGoalAction` (remove só a do próprio usuário via
  `deleteMany` escopado). **+6 testes de integração** (`metas/actions.test.ts`): cria, atualiza sem
  duplicar, rejeita meta zero, isolamento entre usuários (criar e remover).
- **UI**: página `/financas/metas` (`page.tsx` + `GoalForm.tsx` client) — navegação por ano, formulário
  de meta (reusa `MoneyInput`), card de progresso com barra (realizado sobre projetado), mensagem de
  ritmo e três stats; estado vazio para definir a meta; remoção via `DeleteButton` (ano no campo `id`).
  **Painel** (`dashboard/page.tsx`): card "Meta de {ano}" compacto (barra + ritmo), só quando há meta do
  ano corrente, reaproveitando o `forecast` já computado (só +1 lookup da meta).
- **Hub** (`src/lib/reports.ts`): entrada "Meta de faturamento" em Finanças → Custos & metas.
- Definition of Done verde: build (`prisma generate && next build`) OK (`/financas/metas` registrada,
  1.5 kB), typecheck (`tsc --noEmit`) limpo, lint (0 warnings/erros), **596 testes** (`vitest run`,
  eram 582), smoke test ao vivo (`next start`): `/login` → 200, `/financas/metas` sem sessão → 307;
  **render autenticado** de `/financas/metas` e `/dashboard` → 200 com a meta/ritmo corretos sobre
  dados reais do dev.db. `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical;
  nenhuma dependência nova — ver D6/D8). Ver **DECISIONS.md D77**.

### Sessão 86 — Projeção do ano vs. meta de faturamento (D78)
- **UI** (`src/app/(app)/financas/projecao-ano/page.tsx`): novo card **"vs. meta de {ano}"** que cruza
  a **receita projetada do cenário selecionado** (`view.projectedIncome`) com a meta de faturamento do
  ano (`RevenueGoal`), respondendo "no ritmo atual, eu bato a meta?". Mostra a razão `% da meta`, a
  frase de sobra/falta (projeção − meta), e a barra realizado-sobre-projetado (espelha o card de
  `/financas/metas`). Diferença-chave: aqui o número **segue o seletor de cenário** (otimista /
  conservador / pior caso), enquanto `/financas/metas` usa sempre o otimista — então o conservador
  pode revelar que a meta só fecha contando shows ainda a confirmar. Quando não há meta, um convite
  discreto com link para `/financas/metas?ano={ano}`.
- **Lógica**: reaproveita o helper puro **já testado** `computeGoalProgress` (D77) — a meta é de
  **faturamento** (receita), por isso compara contra `projectedIncome`, não `projectedResult`. Sem
  nova lógica de negócio (sem novos testes necessários); o card é apresentação fina sobre dados já
  cobertos. Carrega a meta com +1 lookup (`prisma.revenueGoal.findUnique`) no `Promise.all` existente.
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`)
  limpo, lint (0 warnings/erros), **596 testes** (`vitest run`, inalterado — mudança só de UI), smoke
  test ao vivo (`next start`): `/login` → 200, app sobe (`Ready`). `npm audit` inalterado (10
  advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova — ver D6/D8). Ver
  **DECISIONS.md D78**.

### Sessão 87 — Meta de faturamento vs. piso conservador na página de Metas (D79)
- **Lógica** (`src/lib/finance.ts`): novo helper puro **`compareGoalScenarios`** (+ tipo
  `GoalScenarioComparison`). Cruza a meta de faturamento com os DOIS cenários da projeção do ano —
  otimista (`projectYearEnd().projectedIncome`, todos os shows futuros) e conservador
  (`applyYearEndScenario(forecast, "conservative").projectedIncome`, só os confirmados) — rodando
  `computeGoalProgress` (D77) em cada um e derivando flags (`diverges`, `hitsEvenConservatively`,
  `hitsOnlyWithTentative`) + o `tentativeGap` (cachê de shows a confirmar que separa os cenários).
  Compõe o já testado, não recalcula; saneamento herdado de `computeGoalProgress`.
- **UI** (`src/app/(app)/financas/metas/page.tsx`): quando os cenários divergem, o `ProgressCard`
  mostra uma faixa **"piso conservador"** abaixo do ritmo: verde "Folga real" quando a meta resiste só
  com shows confirmados, âmbar "Atenção ao piso" quando ela só fecha contando shows ainda a confirmar
  (com o valor do `tentativeGap` e a % da meta no piso). Some quando não há cachê a confirmar
  (`tentativeGap === 0`) ou em ano passado — sem ruído. Responde "bato a meta mesmo que só os shows
  confirmados se paguem?", que a projeção otimista da página escondia.
- **Testes**: **4 testes novos** para `compareGoalScenarios` (bate só no otimista / folga real / cenários
  coincidem / saneamento + gap nunca negativo). **600 testes** verdes (`vitest run`, eram 596).
- Definition of Done verde: build (`prisma generate && next build`) OK (`/financas/metas` 1.5 kB),
  typecheck (`tsc --noEmit`) limpo, lint (0 warnings/erros), **600 testes**, smoke test ao vivo
  (`next start`): `/login` → 200, `/financas/metas` sem sessão → 307, app sobe (`Ready`). `npm audit`
  inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de
  schema — ver D6/D8). Ver **DECISIONS.md D79**.

### Sessão 88 — Piso conservador da meta no card do Painel (D80)
- **UI** (`src/app/(app)/dashboard/page.tsx`): o card "Meta de {ano}" do Painel ganhou uma linha
  compacta **"piso conservador"** abaixo do ritmo, espelhando a faixa da página de Metas (Sessão 87)
  mas condensada: verde **"Folga real."** quando a meta resiste só com shows confirmados, âmbar
  **"Atenção ao piso."** quando ela só fecha contando shows ainda a confirmar (com o `tentativeGap` e a
  % da meta no piso). Responde no Painel "bato a meta mesmo que só os shows confirmados se paguem?".
- **Zero I/O / zero recálculo**: `goalScenarios = compareGoalScenarios(...)` recombina as DUAS projeções
  já computadas no dashboard — otimista = `forecast` (`projectYearEnd`), conservadora = `conservative`
  (`applyYearEndScenario(forecast, "conservative")`, já usada na linha "Só confirmados" do card de
  projeção). Nenhuma consulta nova.
- **Só aparece com divergência**: a linha some quando `tentativeGap === 0` (projeção toda de confirmados)
  ou em ano sem shows futuros a confirmar — sem ruído, igual à página de Metas.
- **Sem testes novos**: mudança de UI que reaproveita o helper puro já testado em D77/D79 (mesma postura
  das Sessões 75/77). **600 testes** verdes.
- Definition of Done verde: build (`prisma generate && next build`) OK (`/dashboard` 266 B / 96.2 kB),
  typecheck (`tsc --noEmit`) limpo, lint (0 warnings/erros), **600 testes** (`vitest run`), smoke test ao
  vivo (`next start`): `/login` → 200, `/dashboard` sem sessão → 307, app sobe (`Ready in 397ms`).
  `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem
  mudança de schema — ver D6/D8). Ver **DECISIONS.md D80**.

### Sessão 89 — Ritmo necessário no resto do ano na página de Metas (D81)
- **Lógica pura** (`src/lib/finance.ts` → `goalRunRate`): a partir do `RevenueGoalProgress` já computado,
  calcula o número acionável que faltava ao `pace` — **quanto receber por mês para bater a meta no resto
  do ano**: `requiredPerMonth` (falta receber ÷ meses do calendário restantes, mês corrente incluso),
  `currentPerMonth` (ritmo realizado: recebido ÷ meses decorridos, mesma fração do ano do `pace`),
  `gapPerMonth` e um `verdict` (`hit`/`on-pace`/`stretch`/`hard`/`unknown`) por faixa de `effortRatio`
  (required/current: ≤1 cobre no ritmo atual; ≤1,25 acelerar pouco; >1,25 acelerar bastante).
- **UI** (`src/app/(app)/financas/metas/page.tsx`): novo card "Ritmo necessário" com o valor necessário/mês
  em destaque, o ritmo atual e uma faixa colorida (verde/âmbar/vermelho) com a mensagem acionável. Só
  aparece no **ano corrente** com a meta ainda em aberto (`runRate.applicable && verdict !== "hit"`).
- **Zero I/O extra**: o card recombina o `progress` já em mãos; nenhuma consulta nova ao banco.
- **Testes**: 9 casos puros para `goalRunRate`. **609 testes** verdes (eram 600).
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`) limpo,
  lint (0 warnings/erros), **609 testes** (`vitest run`), smoke test ao vivo (`next start`): `/login` → 200,
  `/dashboard` e `/financas/metas` sem sessão → 307, app sobe (`Ready in 300ms`). `npm audit` inalterado
  (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de schema —
  ver D6/D8). Ver **DECISIONS.md D81**.

### Sessão 90 — Ritmo necessário no card de meta do Painel (D82)
- **UI** (`src/app/(app)/dashboard/page.tsx`): o card "Meta de {ano}" do Painel ganhou a linha compacta
  **"Ritmo necessário: {valor}/mês"** — o número acionável que faltava ao `pace` qualitativo já exibido —,
  colorida pelo `verdict` (verde on-pace / âmbar stretch / vermelho hard / cinza unknown), espelhando o card
  da página de Metas (Sessão 89) condensado para o resumo. Só aparece quando é acionável e a meta ainda não
  fechou (`goalRun.applicable && verdict !== "hit"`).
- **Reaproveitamento**: `goalRun = goalRunRate(goalProgress, {})` deriva só do `goalProgress`
  (`RevenueGoalProgress`) já computado no dashboard — **zero I/O extra**, nenhum recálculo de
  transações/shows. Mesmo caminho de D79→D80 (helper da página de Metas adotado no card do Painel).
- **Sem testes novos**: `goalRunRate`/`computeGoalProgress` já têm cobertura pura (D77/D81); mudança de UI.
- Definition of Done verde: build (`prisma generate && next build`) OK, typecheck (`tsc --noEmit`) limpo,
  lint (0 warnings/erros), **609 testes** (`vitest run`), smoke test ao vivo (`next start`): `/login` e
  `/` → 200, app sobe. `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma
  dependência nova nem mudança de schema — ver D6/D8). Ver **DECISIONS.md D82**.

### Sessão 91 — Resumo trimestral das Finanças (D83)
- **Lógica pura** (`src/lib/finance.ts`): nova função `quarterlySummary(txs, year)` que **deriva os 4
  trimestres do `annualSummary`** (jan–mar / abr–jun / jul–set / out–dez), somando income/expense/net por
  trimestre, repassando os totais do ano e apontando o melhor/pior trimestre (por resultado) entre os com
  movimento — mesmo contrato/semântica do `annualSummary`, zero duplicação de agregação. Tipos
  `QuarterSummary`/`QuarterlySummary`.
- **UI** (`src/app/(app)/financas/trimestral/page.tsx`): página `/financas/trimestral` análoga ao Resumo
  anual — totais do ano, cards de melhor/pior trimestre, tabela trimestre a trimestre (barras + período
  "Jan–Mar"), navegação por ano e link cruzado ao Resumo anual. Preenche a cadência de revisão que faltava
  entre o **mês** (Relatório mensal) e o **ano** (Resumo anual), e o horizonte natural para pacing contra a
  meta anual.
- **Hub de Relatórios** (`src/lib/reports.ts`): registrado em `REPORT_GROUPS` (Finanças → Fechamentos),
  aparecendo na busca e no índice automaticamente.
- **Testes:** 5 casos puros novos para `quarterlySummary` (4 trimestres vazios, agrupamento correto +
  totais, ignora outros anos, melhor/pior por resultado, desempate pelo mais cedo).
- Definition of Done verde: build (`prisma generate && next build`) OK — rota `/financas/trimestral`
  gerada; typecheck (`tsc --noEmit`) limpo; lint (0 warnings/erros); **614 testes** (`vitest run`, eram 609);
  smoke test ao vivo (`next start`): `/login` e `/` → 200, `/financas/trimestral` → 307 (protegida, redireciona
  ao login). `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência
  nova nem mudança de schema — ver D6/D8). Ver **DECISIONS.md D83**.

### Sessão 92 — Exportação CSV do Resumo trimestral (D84)
- **Lógica pura** (`src/lib/csv.ts`): nova função `quarterlySummaryToCsv(summary)` + cabeçalhos
  `QUARTERLY_SUMMARY_CSV_HEADERS` (Trimestre / Período / Receitas / Despesas / Resultado). Os 4
  trimestres saem sempre (Q1→Q4, zeros inclusive) com a coluna "Período" ("Janeiro–Março") seguidos de
  uma linha "Total do ano" — espelha a tabela "Trimestre a trimestre" da página e a mesma convenção
  pt-BR de `annualSummaryToCsv` (delimitador ";", decimal com vírgula, BOM UTF-8 na camada HTTP).
- **Rota** (`src/app/(app)/financas/trimestral/export/route.ts`): handler `GET` análogo ao
  `/financas/anual/export` — `requireUser`, lê o ano de `?ano=YYYY` (mesmo `parseYear`/validação),
  serializa via a camada pura e baixa `financas-trimestral-{ano}.csv`. Fecha a lacuna: o Resumo anual já
  exportava CSV, o trimestral não.
- **UI** (`src/app/(app)/financas/trimestral/page.tsx`): botão "⬇ CSV" no cabeçalho (só com movimento no
  ano), espelhando o do Resumo anual.
- **Testes:** 4 casos puros novos para `quarterlySummaryToCsv` (cabeçalho + 4 trimestres + total = 6
  linhas; agregação no trimestre certo + total do ano; resultado negativo preservado; ignora outros anos).
- Definition of Done verde: build (`prisma generate && next build`) OK — rota
  `/financas/trimestral/export` gerada; typecheck (`tsc --noEmit`) limpo; lint (0 warnings/erros);
  **618 testes** (`vitest run`, eram 614); smoke test ao vivo (`next start`): `/login` e `/` → 200,
  `/financas/trimestral` e `/financas/trimestral/export` → 307 (protegidas, redirecionam ao login).
  `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem
  mudança de schema — ver D6/D8). Ver **DECISIONS.md D84**.

### Sessão 93 — Meta por trimestre na página de Metas (D85)
- **Lógica pura** (`src/lib/finance.ts`): nova função `quarterlyGoalProgress(txs, year, goal, opts)` que
  **quebra a meta anual em 4 alvos iguais** (meta/4, com os centavos da divisão distribuídos aos primeiros
  trimestres para que a soma dos 4 seja exatamente a meta) e cruza cada alvo com a **receita já recebida**
  (caixa, `received`) naquele trimestre — a mesma base do `realized` da meta anual (`computeGoalProgress`),
  não a competência do `quarterlySummary`. Marca o `status` de cada trimestre conforme o tempo:
  `hit` (recebido ≥ alvo), `missed` (trimestre encerrado abaixo), `in-progress` (trimestre corrente) ou
  `upcoming` (futuro). Tipos `QuarterGoalStatus`/`QuarterGoalProgress`/`QuarterlyGoalProgress`.
- **UI** (`src/app/(app)/financas/metas/page.tsx`): novo card "Meta por trimestre" (entre "Ritmo necessário"
  e o formulário de ajuste), com uma barra por trimestre (recebido / alvo + %), selo de status colorido,
  marca "(atual)" no trimestre corrente e o placar "{N} de 4 batidos". Responde "em qual trimestre eu fiquei
  para trás?" — o horizonte de revisão natural entre o ritmo mensal (D81) e a corrida anual (D77).
- **Testes:** 7 casos puros novos para `quarterlyGoalProgress` (alvos somam a meta com sobra de centavos;
  só receitas recebidas agrupadas por trimestre; hit/missed em ano encerrado; missed/in-progress/upcoming no
  ano corrente; trimestre corrente que já bateu vira hit; ano futuro tudo upcoming; meta negativa saneada a 0).
- Definition of Done verde: build (`prisma generate && next build`) OK; typecheck (`tsc --noEmit`) limpo;
  lint (0 warnings/erros); **625 testes** (`vitest run`, eram 618); smoke test ao vivo (`next start`):
  `/login` → 200. `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência
  nova nem mudança de schema — ver D6/D8). Ver **DECISIONS.md D85**.

### Sessão 95 — Meta por mês na página de Metas (granularidade fina) (D87)
- **Lógica pura** (`src/lib/finance.ts`): nova `monthlyGoalProgress(txs, year, goal, opts)`, espelhando
  `quarterlyGoalProgress` (D85) com **12 alvos iguais** (meta/12, centavos da divisão distribuídos aos
  primeiros meses para somar exatamente a meta). Cruza cada alvo com a receita **já recebida** no mês
  (regime de caixa, mesma base do `realized` anual) e marca o `status` por tempo
  (`hit`/`missed`/`in-progress`/`upcoming`). Rótulos curtos pt-BR num const local `MONTH_GOAL_LABELS`
  (mantém `finance.ts` sem importar `calendar.ts`, como já fazia `QUARTER_LABELS`).
- **UI** (`src/app/(app)/financas/metas/page.tsx`): novo card "Meta por mês" (abaixo do card trimestral),
  com uma grade responsiva de 12 mini-blocos (barra recebido/alvo, selo de status, valores, mês atual em
  destaque) e o placar "{N} de 12 batidos". O mapa de status da página foi renomeado de `QUARTER_STATUS`
  para `GOAL_STATUS` (mês e trimestre compartilham a mesma união de status). Responde "em qual mês eu
  fiquei para trás?", o detalhe que o trimestre agrega.
- **Testes:** 7 casos puros novos para `monthlyGoalProgress` (soma dos 12 alvos == meta; só receitas
  recebidas agrupadas por mês; hit/missed em ano encerrado; missed/in-progress/upcoming no ano corrente;
  mês corrente que já bateu vira hit; ano futuro tudo upcoming; meta negativa saneada a 0).
- Definition of Done verde: build (`prisma generate && next build`) OK; typecheck (`tsc --noEmit`) limpo;
  lint (0 warnings/erros); **632 testes** (`vitest run`, eram 625); smoke test ao vivo (`next start`):
  `/login` → 200, `/financas/metas` sem sessão → 307. `npm audit` inalterado (10 advisories: 4 moderate /
  5 high / 1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8). Ver **DECISIONS.md D87**.

### Sessão 96 — Tira mensal de meta no Painel (sparkline) (D88)
- **UI apenas** (`src/app/(app)/dashboard/page.tsx`): nova tira compacta "Por mês" no card "Meta de
  {ano}", abaixo da tira trimestral (Sessão 94/D86) — 12 mini-barras (uma por mês, cor pelo status)
  como uma sparkline que mostra de relance em qual mês o ritmo caiu, com o placar "{N} de 12 batidos".
  Rótulo de cada barra é a inicial do mês (J/F/M/...); o detalhe completo (valores, selos) está em
  `/financas/metas`. Só aparece com meta > 0.
- **Reúso**: chama `monthlyGoalProgress` (D87) — nenhuma lógica nova. O mapa de cor de barra do
  dashboard foi renomeado de `QUARTER_BAR` para `GOAL_BAR` (mês e trimestre compartilham a mesma união
  de status `QuarterGoalStatus`; `MonthGoalStatus` é alias dela), reaproveitado pelas duas tiras.
- **Testes:** nenhum novo — a lógica (`monthlyGoalProgress`) já tem 7 casos puros (Sessão 95); a mudança
  é puramente de apresentação. Os 632 testes seguem verdes.
- Definition of Done verde: build (`prisma generate && next build`) OK; typecheck (`tsc --noEmit`) limpo;
  lint (0 warnings/erros); **632 testes** (`vitest run`); smoke test ao vivo (`next start`): `/login` → 200.
  `npm audit` inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem
  mudança de schema — ver D6/D8). Ver **DECISIONS.md D88**.

### Sessão 97 — Composição de despesas: "Para onde vai o dinheiro" (D89)
- **Lógica nova** (`src/lib/finance.ts`): `expenseMix(txs)` — espelho de `incomeMix` (D45) para o lado
  das despesas. Agrupa as despesas (`EXPENSE`) por categoria (= rubrica) com total, participação,
  contagem, concentração nas 3 maiores, **HHI**, **nº efetivo de rubricas** e veredito
  (concentrated/moderate/diversified). Responde "para onde vai o dinheiro e qual gasto domina o
  orçamento". Distinto dos custos fixos (D39, recorrência) e do relatório mensal/anual (por período).
- **DRY**: a matemática comum aos dois mixes virou o helper privado `categoryMixStats(txs, type)`;
  `incomeMix` foi reescrito para delegar a ele (saída pública idêntica — seus 10 testes seguem verdes)
  e `expenseMix` delega ao mesmo núcleo. Um teste novo cruza os dois (mesmas transações como INCOME ×
  EXPENSE → mesmos números) travando a simetria.
- **Página** `/financas/composicao-despesas` (`src/app/(app)/financas/composicao-despesas/page.tsx`):
  veredito (tom neutro — concentrar despesa não é "risco", é "onde cortar rende mais"), cards de
  destaque (despesa total, maior gasto, nº de categorias) e tabela de composição com barras. Registrada
  no **hub de Relatórios** (`REPORT_GROUPS` → Finanças → Custos & metas, em `src/lib/reports.ts`).
- **Testes:** 8 casos puros novos de `expenseMix`. **640 testes** verdes (eram 632).
- Definition of Done verde: build (`prisma generate && next build`) OK; typecheck (`tsc --noEmit`) limpo;
  lint (0 warnings/erros); **640 testes** (`vitest run`); smoke test ao vivo (`next start`): `/login` → 200,
  `/financas/composicao-despesas` → 307 (redireciona para login sem sessão). `npm audit` inalterado
  (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de schema —
  ver D6/D8). Ver **DECISIONS.md D89**.

### Sessão 98 — Variação por categoria: "o que mudou de um mês para o outro" (D90)
- **Lógica nova** (`src/lib/finance.ts`): `compareCategoryReports(current, previous)` — cruza a quebra por
  categoria de dois períodos (mês atual vs. anterior). Para receitas e despesas, lista toda categoria
  presente em qualquer um dos dois lados (ausente conta como R$ 0) com `{amount, previousAmount, delta}`
  (o `delta` é o `MetricDelta` do relatório mensal), ordenada pelo **maior movimento absoluto** primeiro.
  Expõe os totais dos dois lados, a variação dos totais e três destaques: maior alta de gasto, maior
  **economia** (queda de despesa) e maior alta de receita. Responde "qual categoria explica a diferença"
  — o relatório mensal (D33) já dizia que a despesa subiu, mas não onde.
- **DRY:** delega a `categoryReport` (mesma definição de categoria/"Sem categoria") e a `computeDelta`
  (mesma semântica de variação do relatório mensal) — nenhuma matemática nova de agregação.
- **Página** `/financas/variacao` (`src/app/(app)/financas/variacao/page.tsx`): navegação por mês
  (←/→/Mês atual, mesmos helpers do calendário do relatório), cards de total com seta colorida (despesa
  subindo = vermelho, caindo = verde; inverso para receita), faixa de destaques e duas tabelas
  (despesas/receitas) com mês ant. × este mês × variação. Registrada no **hub de Relatórios**
  (`REPORT_GROUPS` → Finanças → Fechamentos) e cruzada com o relatório mensal por link.
- **Testes:** 8 casos puros novos de `compareCategoryReports`. **648 testes** verdes (eram 640).
- Definition of Done verde: build (`prisma generate && next build`) OK; typecheck (`tsc --noEmit`) limpo;
  lint (0 warnings/erros); **648 testes** (`vitest run`); smoke test ao vivo (`next start`): `/login` → 200,
  `/financas/variacao` → 307 (redireciona para login sem sessão). `npm audit` inalterado
  (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de schema —
  ver D6/D8). Ver **DECISIONS.md D90**.

### Sessão 99 — Contas fixas a lançar no mês + lançar com um clique (ver D91)
- **O quê:** transformou os **custos fixos** (D39) de análise passiva em **lembrete acionável**. Nova
  função pura `pendingFixedCosts(txs, options)` (`src/lib/finance.ts`) reaproveita `recurringExpenses`
  para listar as categorias recorrentes **ainda ativas sem despesa lançada no mês corrente** (ordenadas
  pela maior conta típica), com `loggedCount`/`activeCount`/`totalPending`/`month`.
- **UI:** seção **"⏰ A lançar em {mês}"** em `/financas/custos-fixos`
  (`src/app/(app)/financas/custos-fixos/page.tsx`) com botão **"Lançar R$ X →"** por conta, que abre a
  Nova transação **pré-preenchida**; quando nada pende, "✓ Todos os custos fixos já foram lançados".
  Alerta âmbar **"Custos fixos a lançar"** no **Painel** (`src/app/(app)/dashboard/page.tsx`,
  reaproveita os `txs` já carregados; zero consulta extra).
- **Prefill:** `NewTransactionPage` (`src/app/(app)/financas/nova/page.tsx`) passou a ler query params
  (`tipo`, `categoria`, `valor`, `descricao`, `data`), saneá-los e repassá-los ao `TransactionForm` via
  a prop `values` que **já existia** (usada pela edição) — sem novo componente. Valor via `centsToInputValue`.
- **Testes:** 7 casos puros novos de `pendingFixedCosts`. **655 testes** verdes (eram 648). Verificação
  ao vivo autenticada (sessão mintada): seção renderiza a conta pendente, Nova transação abre com
  categoria/valor/data preenchidos, alerta aparece no Painel.
- Definition of Done verde: build (`prisma generate && next build`) OK; typecheck (`tsc --noEmit`) limpo;
  lint (0 warnings/erros); **655 testes** (`vitest run`); smoke test ao vivo (`next start`): `/login` → 200,
  rotas protegidas → 307 sem sessão e → 200 com sessão. `npm audit` inalterado (10 advisories:
  4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8).
  Ver **DECISIONS.md D91**.
- **Nota de ambiente:** o download do engine do Prisma (`@prisma/engines` postinstall) é resetado pelo
  proxy (ECONNRESET); contornado instalando com `npm install --ignore-scripts` e baixando os binários
  (`libquery_engine`/`schema-engine` para `debian-openssl-3.0.x`, hash `60519735…`) via `curl` para
  `node_modules/@prisma/engines/`, com `PRISMA_QUERY_ENGINE_LIBRARY`/`PRISMA_SCHEMA_ENGINE_BINARY` apontando
  para eles. Vale considerar embutir esse fallback no `scripts/session-setup.sh`.

### Sessão 100 — Cachês a receber por contratante (de quem cobrar primeiro) (ver D92)
- **O quê:** nova leitura de cobrança que responde **"quem está me devendo agora — e há quanto tempo?"**.
  Função pura `outstandingByContact(receivables, getPayer, {now})` (`src/lib/finance.ts`) recebe a saída de
  `reconcileShowFees` e agrupa o saldo em aberto pelo contratante (via `pickPayerContact`), reaproveitando a
  idade do atraso de `bucketReceivablesByAge` (`receivableAgeBucket`). Por devedor: saldo a receber, nº de
  shows, pior atraso (`maxDaysOutstanding`), atraso médio ponderado pelo valor (`weightedAvgDays`) e o balde
  de aging do pior atraso (`oldestBucket`); ordena do maior saldo devedor ao menor (grupo "sem contratante"
  por último); `topDebtor`/`oldestDebtor` ignoram o grupo nulo.
- **UI:** nova página `/shows/a-receber/por-contratante`
  (`src/app/(app)/shows/a-receber/por-contratante/page.tsx`) com cards de destaque (total a receber, maior
  devedor, quem espera mais), tabela por contratante e detalhe dos shows em aberto (mais atrasado → mais
  recente, cor por balde de aging). Links cruzados com `/shows/a-receber` nos dois sentidos; a cobrança/
  quitação em si segue lá (esta página é só a priorização). Registrada no hub `/relatorios` (card
  "A receber por contratante", subtema *Recebíveis*).
- **DRY:** compõe `reconcileShowFees` + `receivableAgeBucket`/`RECEIVABLE_AGE_BUCKET_*` + `pickPayerContact`;
  nenhuma regra nova de quem entra/abate. Distinta do aging (agrupa por idade) e do DSO por contratante (D52,
  prazo do que já entrou) — três perguntas diferentes sobre o mesmo dinheiro.
- **Testes:** 5 casos puros novos de `outstandingByContact` + ajuste do invariante de busca do hub
  (`reports.test.ts`). **660 testes** verdes (eram 655).
- Definition of Done verde: build (`prisma generate && next build`) OK; typecheck (`tsc --noEmit`) limpo;
  lint (0 warnings/erros); **660 testes** (`vitest run`); smoke test (`next start`): app sobe, `/login` → 200,
  `/shows/a-receber/por-contratante` → 200, sem erro no log. `npm audit` inalterado (10 advisories:
  4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de schema — ver D6/D8).
  Ver **DECISIONS.md D92**.

### Sessão 101 — Cobrança consolidada por contratante (e-mail/WhatsApp na página "por contratante") (ver D93)
- **O quê:** embutir os atalhos de cobrança na página `/shows/a-receber/por-contratante` — agora cada
  contratante ganha um botão **✉ E-mail** / **WhatsApp** que abre **uma única mensagem** cobrindo **todos**
  os shows em aberto dele de uma vez (antes a cobrança só existia por show em `/shows/a-receber`). Fecha o
  fluxo "de quem cobrar primeiro": vê o maior devedor e cobra tudo dele num clique.
- **Lógica pura (`src/lib/billing.ts`):** `buildContactDunning(shows, {contactName, fromName})` redige uma
  mensagem consolidada (assunto/corpo) listando cada show (título, data UTC, local, valor) e o total em
  aberto; com **um** show cai na redação singular de `buildDunningMessage` (sem plural artificial); `null`
  sem shows. `buildContactBilling(contact, shows, {fromName})` monta o `ContactBilling` (mensagem +
  `mailtoUrl`/`whatsappUrl` prontos + `showCount`/`totalOutstanding`); `null` quando o contato não tem canal
  (sem e-mail/telefone) ou não há shows. Reaproveita `hasChannel`/`venueLabel`/`billingDate`/`formatMoney`/
  `buildMailtoUrl`/`buildWhatsappUrl` já existentes — zero regra nova de telefone/redação.
- **UI:** `page.tsx` passou a estender o `PayerContact` resolvido (`getPayer`) com `email`/`phone`, derivar
  `fromName` (`artistName` || `name`) e, por linha de detalhe, montar `buildContactBilling` a partir dos shows
  em aberto daquele contratante, renderizando os links prontos (server component, anchors puros — sem JS de
  cliente). Rodapé atualizado explicando a cobrança consolidada.
- **Testes:** 8 casos puros novos (`buildContactDunning` × 4, `buildContactBilling` × 4) em
  `src/lib/billing.test.ts`. **668 testes** verdes (eram 660).
- Definition of Done verde: build (`prisma generate && next build`) OK; typecheck (`tsc --noEmit`) limpo;
  lint (0 warnings/erros); **668 testes** (`vitest run`); smoke test (`next start`): app sobe, `/login` → 200,
  `/shows/a-receber/por-contratante` → 307 (redireciona p/ login sem sessão), sem erro no log. `npm audit`
  inalterado (10 advisories: 4 moderate / 5 high / 1 critical; nenhuma dependência nova nem mudança de
  schema — ver D6/D8). Ver **DECISIONS.md D93**.

### Sessão 102 — Data prometida de pagamento + promessas furadas (ver D94)
- **O quê:** fechar o loop da cobrança — ao cobrar um cachê em aberto, o músico agora registra a **data
  prometida de pagamento** pelo contratante, direto na lista `/shows/a-receber`. Quando a data passa e o
  cachê continua em aberto, a promessa vira **furada** e sobe como sinal vermelho (⚠) para voltar a cobrar
  quem prometeu e não pagou. Primeira informação editável persistida sobre um recebível (antes a página só
  derivava de show + transações).
- **Schema:** novo campo opcional `Show.paymentPromisedAt DateTime?` (portável p/ PostgreSQL; aplicado em dev
  via `prisma db push`). Único campo novo; nenhuma migração destrutiva.
- **Lógica pura (`src/lib/finance.ts`):** `paymentPromiseStatus(promisedAt, now)` → `"none" | "pending" |
  "broken"` (compara por dia UTC; sem data/inválida → none; hoje/futuro → pending; passou → broken).
  `summarizePaymentPromises(rows, now)` varre os recebíveis em aberto e separa furadas × no prazo, com
  contagem e total em aberto por grupo, cada grupo ordenado pela data prometida (mais urgente primeiro).
  `resolvePromiseDate(raw)` resolve "YYYY-MM-DD" → meia-noite UTC ou `null` (vazio/inválido = limpar);
  diferente de `resolveReceivedDate`, **aceita data futura** (uma promessa é futura por natureza). Tipo novo
  `PromisableShowLike` (= `ReceivableShowLike` + `paymentPromisedAt?`).
- **Server action (`src/app/(app)/shows/actions.ts`):** `setPaymentPromiseAction(formData)` grava/limpa a
  data prometida; confirma posse do show; resolve a data no servidor (nunca confia no cliente). Revalida
  `/shows/a-receber`, `/shows/a-receber/por-contratante`, `/shows/[id]` e `/dashboard`.
- **UI:** componente client `src/components/PromiseButton.tsx` (duas etapas, espelha `SettleFeeButton`):
  fechado mostra o selo de estado (sem promessa → "+ promessa"; no prazo → 📅 data âmbar; furada → ⚠ data
  vermelha); aberto, um `<input type="date">` com Salvar/Limpar/Cancelar (Limpar esvazia o campo no DOM e
  submete via ref → servidor grava null). `/shows/a-receber` ganhou a coluna **Promessa** por linha e um card
  de destaque "🤝 Promessas de pagamento" (furadas em vermelho, no prazo em âmbar). O Painel ganhou uma linha
  "🤝 {valor} em N promessas vencidas" dentro do alerta de cachês a receber.
- **DRY:** reaproveita `reconcileShowFees` (saldo em aberto), `utcMidnight`/`dayKey`/`isValidDateKey`,
  `SubmitButton` e o padrão de ação inline do `SettleFeeButton`. Nenhuma regra nova de "o que entra/abate".
- **Testes:** 12 casos puros novos (`paymentPromiseStatus` × 5, `summarizePaymentPromises` × 4,
  `resolvePromiseDate` × 3) em `finance.test.ts` + 4 de integração de `setPaymentPromiseAction` (grava, limpa,
  ignora data inválida, bloqueia show de outro usuário) em `shows/actions.test.ts`. **684 testes** verdes
  (eram 668).
- Definition of Done verde: build (`prisma generate && next build`) OK; typecheck (`tsc --noEmit`) limpo;
  lint (0 warnings/erros); **684 testes** (`vitest run`); smoke test (`next start`) **autenticado** (sessão
  semeada): `/login` → 200, `/shows/a-receber` → 200 renderizando a coluna Promessa + card de promessas +
  ⚠ furadas, `/dashboard` → 200 com a linha "promessa vencida", sem erro no log. `npm audit` inalterado
  (10 advisories: 4 moderate / 5 high / 1 critical; **nenhuma dependência nova** — só um campo de schema —
  ver D6/D8). Ver **DECISIONS.md D94**.

## Próximos passos (priorizados para a próxima sessão)
0. **Hub de Relatórios — evoluções** (entregue na Sessão 62, `/relatorios` + `src/lib/reports.ts`,
   ver D54; **barras podadas** na Sessão 63 — `/shows`, `/financas` e `/contatos` agora levam um único
   link "Relatórios" ancorado na seção da área, ver D55; **busca textual no hub** entregue na
   Sessão 64 — `filterReports`/`countFilteredReports` + `ReportsBrowser.tsx`, ver D56;
   **agrupamento por subtema** dentro de cada área entregue na Sessão 66 — `subtopic` +
   `subgroupEntries` em `reports.ts` + subcabeçalhos `<h3>` em `ReportsBrowser.tsx`, ver D58;
   **sumário de salto rápido por subtema** entregue na Sessão 67 — `subtopicSlug` + `reportsNavIndex`
   em `reports.ts` + `<nav>` "Ir para um tema" com pílulas-âncora em `ReportsBrowser.tsx`, ver D59):
   catálogo central dos relatórios na navbar, com busca ao vivo, cards agrupados por subtema e
   índice de salto rápido no topo. Ao criar um relatório novo, **registrá-lo em `REPORT_GROUPS`**
   (com `subtopic`) para aparecer no hub, na busca e no índice automaticamente. Próximo possível —
   destacar a área/subtema visível ao rolar (scroll-spy) ou um contador de "novos" relatórios.
1. **Polimento UX**: estados de loading/erro inline (mensagens de falha do server action),
   mensagens vazias, acessibilidade. (máscara de input monetário entregue na Sessão 11.)
2. **Calendário / agenda — evoluções**: arrastar/soltar para remarcar; mini-calendário de salto rápido.
   (visão semanal entregue na Sessão 19 — `/shows/semana`; link do dashboard para a agenda na
   Sessão 19; clicar num dia para criar show com a data na Sessão 13; exportação iCalendar
   `.ics` na Sessão 15 — base em `src/lib/calendar.ts` e `src/lib/ics.ts`;
   **fins de semana livres** entregue na Sessão 104 — `findOpenWeekends` em `src/lib/shows.ts` +
   `/shows/fins-de-semana-livres`: próximos 12 fins de semana sexta→domingo, marcando os vazios como
   oportunidade de booking, ver D96; **card "próximo fim de semana livre" no Painel** entregue na
   Sessão 105 — banner-nudge "🎸 Fim de semana livre" em `dashboard/page.tsx` reaproveitando
   `findOpenWeekends` + helpers `formatWeekendLabel`/`weekendKeyToDate` extraídos para `shows.ts`,
   só com agenda futura, ver D97; **janela parametrizável** entregue na Sessão 106 — `parseWeekendWindow`
   em `shows.ts` + pílulas 4/8/12/26 semanas via `?semanas=` em `/shows/fins-de-semana-livres`, ver D98.)
   Próximo possível — um mini-calendário de salto rápido na agenda, ou estimar a receita parada por fim de
   semana livre (adiada na D96 por ser hipótese frágil).
2c. **Sazonalidade de shows** (entregue na Sessão 141, `/shows/sazonalidade` + `gigSeasonality` em
   `src/lib/finance.ts`, ver D133): agrega os shows realizados por mês do calendário (jan→dez, somando todos os anos),
   com cards de destaque (mês mais cheio / mais faturamento / melhor cachê médio) e tabela com barra por nº de shows —
   os picos e vales da temporada para planejar prospecção e preço. Distinto de `weekdayPerformance` (dia da semana) e da
   cadência (timeline mês a mês). **Nudge "próximo mês forte" no Painel** entregue na Sessão 142 —
   `gigSeasonalityHeadline` em `src/lib/finance.ts` + banner 📈 em `dashboard/page.tsx` aponta o mês forte mais cedo à
   frente (até 4 meses, `feeShare` ≥ 25% acima da média, com amostra mínima de 6 shows), ver D134. **Nudge "mês fraco à
   frente" (vale da temporada)** entregue na Sessão 143 — `gigSeasonalityLull` em `src/lib/finance.ts` (espelho simétrico
   de `gigSeasonalityHeadline`: mesma janela/amostra, `feeShare ≤ WEAK_MONTH_FACTOR/12` = 0.75/12, exige `count > 0`) +
   banner 🍂 âmbar em `dashboard/page.tsx` que **cede a vez** ao nudge de pico (só com `!seasonHeadline.show` → no máximo um
   nudge de sazonalidade por vez), avisando o próximo mês historicamente fraco para prospectar com antecedência, ver D135.
   Próximo possível —
   recorte por ano (`?ano=`, adiado na D133(b) porque a sazonalidade ganha sentido somando os anos), exportação CSV
   (adiada na D133(d): são só 12 linhas), ou um mini-gráfico dos 12 meses embutido no Painel (adiado na D134(d): o Painel
   já é denso).
2b. **Funil de propostas — evoluções** (entregue na Sessão 51, `/shows/funil` + `showPipeline`,
   ver D42; **card do funil no Painel** entregue na Sessão 52 — cachê em aberto + taxa de
   concretização, ver D43): hoje é um retrato do estado atual. Próximo possível — registrar
   **transições de status** (log) para uma taxa de conversão proposta→realizado de verdade e
   tempo médio em cada etapa.
3. **Filtros — evoluções**: persistência do último filtro entregue para Finanças (Sessão 32),
   Shows e Contatos (Sessão 33) — módulo genérico `src/lib/listFilter.ts` + middleware (ver D23/D24);
   **indicador visual de "filtro lembrado"** entregue na Sessão 79 — marcador `?lembrado=1` na
   restauração + pílula `RememberedFilterNotice` nas três listas (ver D71).
   Próximo possível: estender a persistência a `/shows/calendario` e listas derivadas se fizer sentido.
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
   recebíveis** entregue na Sessão 40 — `bucketReceivablesByAge`, ver D31; **prazo de recebimento /
   DSO realizado** entregue na Sessão 59 — `paymentLag` + `/shows/prazo-recebimento`, ver D51):
   **prazo de recebimento por contratante** entregue na Sessão 60 — `paymentLagByContact` +
   `pickPayerContact` + `/shows/prazo-recebimento/por-contratante`, ver D52; **prazo MEDIANO de
   recebimento** (mediana ponderada, robusta a outlier) entregue na Sessão 65 — `medianDays` +
   helper `weightedMedian` em `paymentLag`, card em `/shows/prazo-recebimento`, ver D57):
   **DSO no Painel** entregue na Sessão 78 — `paymentLagHeadline` + card "Prazo de recebimento" no
   dashboard, ver D70 (aging já estava no Painel desde a Sessão 41/D32); **cachês a receber por
   contratante** ("de quem cobrar primeiro") entregue na Sessão 100 — `outstandingByContact` +
   `/shows/a-receber/por-contratante`, agrupa o saldo em aberto por devedor (maior saldo/pior atraso
   primeiro), reaproveitando aging + `pickPayerContact`, ver D92):
   **atalhos de cobrança por contratante** embutidos na Sessão 101 — `buildContactDunning`/
   `buildContactBilling` + botões ✉ E-mail / WhatsApp em `/shows/a-receber/por-contratante`, com **uma
   mensagem consolidada** cobrindo todos os shows em aberto do contratante, ver D93):
   **data prometida de pagamento + promessas furadas** entregue na Sessão 102 — campo
   `Show.paymentPromisedAt` + `paymentPromiseStatus`/`summarizePaymentPromises`/`resolvePromiseDate` +
   `setPaymentPromiseAction` + `PromiseButton`; coluna "Promessa" e card de promessas em `/shows/a-receber`,
   linha "promessas vencidas" no Painel, ver D94; **promessas furadas no recorte por contratante** entregue
   na Sessão 103 — banner geral + selo "⚠ N promessas vencidas" por devedor (tabela e detalhe) e "⚠ promessa
   vencida" / "📅 promete {data}" por show em `/shows/a-receber/por-contratante`, reaproveitando
   `summarizePaymentPromises`/`paymentPromiseStatus` por grupo, ver D95):
   **exportação CSV dos cachês a receber** entregue na Sessão 136 — `receivablesToCsv` em `src/lib/csv.ts` +
   `/shows/a-receber/export` (Show/Data/Local/Cidade/dias em atraso/cachê/recebido/a receber/situação/promessa/status),
   ordenado pelo atraso mais longo (fila de cobrança), botão "⬇ CSV" só com recebíveis em aberto, ver D128;
   **exportação CSV da visão por contratante** entregue na Sessão 137 — `receivablesByContactToCsv` em `src/lib/csv.ts` +
   `/shows/a-receber/por-contratante/export` (Contratante/Papel/a receber/shows/pior atraso/atraso médio/participação/
   promessas vencidas/a receber vencido), uma linha por devedor na ordem do maior saldo, botão "⬇ CSV" só com devedores,
   ver D129.
   **Prazo MEDIANO de recebimento por contratante** entregue na Sessão 138 — `medianDays` em `ContactPaymentLagRow`
   (`paymentLagByContact` reusa `weightedMedian` sobre os shows do grupo) + coluna "Prazo mediano" em
   `/shows/prazo-recebimento/por-contratante`, exibida só com `showCount >= MIN_MEDIAN_LAG_SAMPLE` (=3) — resolve na
   apresentação a ressalva de "ruidoso com poucos shows por contratante" (D57), mesma mecânica da D123, ver D130.
   **Exportação CSV do prazo de recebimento por contratante** entregue na Sessão 139 — `paymentLagByContactToCsv` em
   `src/lib/csv.ts` + `/shows/prazo-recebimento/por-contratante/export` (Contratante/Papel/Recebido/Shows/prazo médio/prazo
   mediano/pior prazo/participação/velocidade), uma linha por contratante na ordem do mais lento ao mais rápido, prazo
   mediano em branco abaixo de `MIN_MEDIAN_LAG_SAMPLE` (=3) shows, botão "⬇ CSV" só com linhas, ver D131.
   **Exportação CSV do prazo de recebimento por show (tela-mãe)** entregue na Sessão 140 — `paymentLagToCsv` em
   `src/lib/csv.ts` + `/shows/prazo-recebimento/export` (Show/Data/Local/Cidade/Recebido/Recebimentos/prazo médio/pior
   prazo/velocidade), uma linha por show na ordem do mais lento ao mais rápido, sem prazo mediano por linha (é propriedade
   de grupo, não de show isolado), botão "⬇ CSV" só com linhas; fecha a alternativa (b) adiada na D131 e a última lacuna
   de exportação tabular do acervo, ver D132.
   Próximo possível — lembrar a última escolha de contato por show; ou levar o
   prazo mediano por contratante também ao card do Painel (adiado na D130: o Painel já mostra o DSO mediano global via
   `paymentLagHeadline`); ou exportar o agregado por baldes de velocidade (5 linhas-resumo) se houver demanda (descartado
   na D132(a) por baixo valor de planilha).
4. **Sessões/segurança**: invalidação ao trocar a senha entregue na Sessão 26
   (`passwordChangedAt` + `isSessionFresh`, ver D17). Evoluções possíveis: "encerrar sessão
   específica" (lista de sessões revogáveis) e recuperação de senha por e-mail — adiáveis.
6. **Planejamento / projeção — evoluções** (projeção de fechamento do ano entregue na Sessão 68,
   `/financas/projecao-ano` + `projectYearEnd`, ver D60; **resultado projetado no Painel** entregue na
   Sessão 69 — card "Projeção de {ano}" em `dashboard/page.tsx`, ver D61; **cenário "com custos fixos"**
   entregue na Sessão 70 — `projectYearEndWithFixedCosts` soma o custo fixo recorrente (D39) aos meses
   futuros do ano sem despesa lançada, fechando a assimetria da D60 num card opcional, ver D62;
   **projeção vs. ano anterior** entregue na Sessão 71 — `compareYearEndToPrevious` + card "vs. {ano-1}"
   em `/financas/projecao-ano`, reaproveitando `computeDelta`, ver D63; **comparação vs. ano anterior
   no card do Painel** entregue na Sessão 72 — pílula "▲/▼ X% vs. {ano-1}" no card "Projeção de {ano}"
   reaproveitando `compareYearEndToPrevious`, ver D64; **cenário com custos fixos no card do Painel**
   entregue na Sessão 73 — linha "Com custos fixos: {resultado}" no card "Projeção de {ano}"
   reaproveitando `projectYearEndWithFixedCosts`, ver D65; **seletor de cenário otimista × conservador**
   entregue na Sessão 74 — `applyYearEndScenario` remove os cachês de shows a confirmar da projeção, com
   pílulas Otimista/Conservador em `/financas/projecao-ano`, ver D66; **piso conservador no card do Painel**
   entregue na Sessão 75 — linha "Só confirmados: {resultado}" no card "Projeção de {ano}" reaproveitando
   `applyYearEndScenario`, ver D67; **cenário "pior caso"** entregue na Sessão 76 —
   `projectYearEndPessimistic` cruza conservador (só confirmados) + custos fixos num único piso, card
   "Pior caso" em `/financas/projecao-ano`, ver D68; **piso "pior caso" no card do Painel** entregue na
   Sessão 77 — linha "Pior caso: {resultado}" no card "Projeção de {ano}" reaproveitando
   `projectYearEndPessimistic`, só quando ambos os eixos mordem, ver D69):
   a projeção crua segue sem inventar despesas (número conservador-por-design); o cenário pessimista é
   opt-in; a comparação anual ancora o número no fechamento do ano passado; o seletor de cenário dá o
   piso "só confirmados" — agora também visível no Painel; e o card "Pior caso" cruza os dois eixos
   conservadores num só número — agora também visível no Painel (D69); **seletor de três cenários** na
   página entregue na Sessão 81 — `yearEndScenarioView` + botões Otimista / Conservador / Pior caso em
   `/financas/projecao-ano` (consolidou os cards extras num só controle), ver D73. **Meta de
   faturamento** definida pelo usuário entregue na Sessão 85 — modelo `RevenueGoal` + `computeGoalProgress`
   + `/financas/metas` + card no Painel, ver D77; **projeção do ano vs. meta** entregue na Sessão 86 —
   card "vs. meta de {ano}" em `/financas/projecao-ano` reaproveitando `computeGoalProgress` sobre a
   receita projetada do cenário selecionado, ver D78; **meta vs. piso conservador na página de Metas**
   entregue na Sessão 87 — `compareGoalScenarios` + faixa "piso conservador" em `/financas/metas`,
   revelando quando a meta só fecha contando shows ainda a confirmar, ver D79; **piso conservador da
   meta no card do Painel** entregue na Sessão 88 — linha "Folga real."/"Atenção ao piso." no card
   "Meta de {ano}" reaproveitando `compareGoalScenarios` sobre as projeções já computadas no dashboard,
   ver D80; **ritmo necessário no resto do ano** entregue na Sessão 89 — `goalRunRate` + card "Ritmo
   necessário" em `/financas/metas`, com o necessário/mês, o ritmo atual e o veredito de esforço
   (on-pace/stretch/hard), ver D81; **ritmo necessário no card de meta do Painel** entregue na Sessão 90 —
   linha "Ritmo necessário: {valor}/mês" no card "Meta de {ano}" reaproveitando `goalRunRate` sobre o
   `goalProgress` já computado no dashboard, ver D82; **meta por trimestre na página de Metas** entregue na
   Sessão 93 — `quarterlyGoalProgress` + card "Meta por trimestre" em `/financas/metas`, quebrando a meta
   anual em 4 alvos iguais e marcando hit/missed/in-progress/upcoming por trimestre, ver D85; **meta por
   trimestre no Painel** entregue na Sessão 94 — tira compacta de 4 mini-barras (cor pelo status, trimestre
   atual em destaque) + placar "{N} de 4 batidos" no card "Meta de {ano}" do dashboard, reaproveitando
   `quarterlyGoalProgress`, ver D86; **meta por mês na página de Metas** entregue na Sessão 95 —
   `monthlyGoalProgress` + card "Meta por mês" em `/financas/metas`, quebrando a meta anual em 12 alvos
   iguais (grade de mini-blocos, placar "{N} de 12 batidos"), ver D87; **tira mensal de meta no Painel**
   entregue na Sessão 96 — sparkline de 12 mini-barras (cor pelo status, inicial do mês) + placar "{N} de
   12 batidos" no card "Meta de {ano}" do dashboard, abaixo da tira trimestral, reaproveitando
   `monthlyGoalProgress` (mapa de cor unificado `GOAL_BAR`), ver D88. Próximo possível — alerta proativo
   (e-mail/badge) quando a meta passa a depender só de shows a confirmar, ou um scroll-spy/scroll para o
   mês corrente na tira.
6b. **Ritmo do mês corrente** (entregue na Sessão 165, `/financas/ritmo-do-mes` + `currentMonthPace` em
   `src/lib/finance.ts`, ver D158): "estou faturando no ritmo de um mês normal?" — projeção pro-rata do mês
   corrente (competência) vs. o mês típico recente (média dos meses completos com movimento na janela `?meses=`),
   veredito pela receita (`ahead`/`onPace`/`behind`/`insufficient`, ±10%). **Comparativo contra o mesmo mês do ano
   anterior (eixo sazonal)** entregue na Sessão 167 — `currentMonthVsLastYear(txs, { now? })` + tipo `MonthYoY` em
   `src/lib/finance.ts` projeta o mês corrente (competência, pro-rata) e compara com o total **fechado** do mesmo mês
   um ano atrás (veredito pela receita, ±`MONTH_PACE_EPSILON`), com o recorte "até o mesmo dia" (`lastYearIncomeToDate`)
   como leitura maçã-com-maçã; nova seção "Mesmo mês do ano passado" em `/financas/ritmo-do-mes` (card de veredito +
   tabela projeção × ano anterior + linha "até hoje"), sem `?meses=`, ver D160. Próximo possível — uma linha-nudge no
   Painel só quando `behind` e o mês já passou da metade (adiado por densidade do Painel); ponderar a projeção por
   dia-da-semana/sazonalidade do mês (hoje é pro-rata uniforme, hipótese frágil cedo no mês); ou combinar os dois eixos
   (média móvel + YoY) num único veredito ponderado.
7. **Resiliência / fôlego de caixa** (entregue na Sessão 107, `/financas/folego-de-caixa` + `cashRunway`,
   ver D99): cruza o caixa realizado com o custo fixo mensal (D39) → por quantos meses o caixa cobre os
   custos fixos se as receitas pararem, com veredito (limiares 3/6 meses, hipótese) e data de esgotamento.
   **Card "Fôlego de caixa" no Painel** entregue na Sessão 108 — banner-nudge em `dashboard/page.tsx`
   reaproveitando `cashRunway` sobre as transações já carregadas, exibido só quando o veredito é tight
   (âmbar 🛟) ou critical (vermelho 🔴), linkando para a página completa, ver D100.
   **Burn rate completo (cenário alternativo)** entregue na Sessão 109 — `cashBurnRunway` em
   `src/lib/finance.ts` cruza o caixa realizado com o fluxo de caixa líquido médio dos últimos 6 meses
   fechados (custos variáveis incluídos, receita recebida descontada) → por quantos meses o caixa dura no
   ritmo real; card "Cenário alternativo · ritmo de gasto real" sempre visível em `/financas/folego-de-caixa`,
   ver D101.
   **Seletor de janela (`?meses=`)** entregue na Sessão 110 — `parseBurnWindow` em `src/lib/finance.ts`
   (espelha `parseWeekendWindow`, reaproveita `sanitizeBurnWindow`) + pílulas 3m/6m/12m/24m
   (`BURN_WINDOW_PRESETS`) no card "Cenário alternativo" de `/financas/folego-de-caixa`, ver D102.
   **Card "Ritmo de gasto" (burn rate) no Painel** entregue na Sessão 111 — `cashBurnHeadline` em
   `src/lib/finance.ts` (espelha `paymentLagHeadline`/D70) deriva a decisão de Painel de um `cashBurnRunway`
   já computado; segundo banner-nudge 🔥/🔴 em `dashboard/page.tsx`, logo após o de custo fixo (D100),
   surgindo só quando o caixa queima no ritmo real (`tight`/`critical`), ver D103.
   **Detalhamento mês a mês** entregue na Sessão 112 — `cashFlowByMonth` em `src/lib/finance.ts` devolve o fluxo
   de caixa realizado (received/paid/net) por mês na mesma janela de `cashBurnRunway` (consistente: soma dos `net`
   ÷ janela = `avgMonthlyNet`) + tira `MonthlyFlowStrip` (barras ↑/↓ por mês) no card "Cenário alternativo" de
   `/financas/folego-de-caixa`, mostrando a tendência que a média esconde, ver D104.
   **Veredito de tendência da queima** entregue na Sessão 134 — `cashFlowTrend` em `src/lib/finance.ts` parte a
   janela do `cashFlowByMonth` em metade antiga × metade recente e compara o fluxo líquido médio de cada uma
   (limiar relativo `CASH_FLOW_TREND_EPSILON`=15% com piso `CASH_FLOW_TREND_FLOOR`=R$500; descarta o mês do meio
   se ímpar; `insufficient` < 2 meses por metade), classificando em acelerando/aliviando/estável; badge
   `CashFlowTrendBadge` abaixo da tira no card "Cenário alternativo", ver D126.
   Próximo possível — tornar os limiares 3/6 configuráveis pelo usuário; um seletor de janela `?meses=`
   também no recorte do Painel (hoje o card usa a janela default de 6 meses); ou levar o veredito de tendência
   também ao nudge de burn do Painel (só quando `accelerating` e o fôlego morde — adiado na D126 por o Painel já
   ter dois nudges de caixa).
8. **Contatos / relacionamento — evoluções** (ranking por cachê bruto, Sessão 27; concentração/HHI; fidelização,
   Sessão 56; reativar dormentes, Sessão 30): **rentabilidade por contratante** entregue na Sessão 113 —
   `rankContactsByProfit` + `/contatos/rentabilidade`, P&L líquido somado por quem paga (um show → um contratante),
   ver D105; **rentabilidade no detalhe do contato** entregue na Sessão 114 — `summarizeContactProfit` em
   `src/lib/contacts.ts` + card "Rentabilidade" em `/contatos/[id]` (líquido/despesas/média/margem dos shows do
   contato), ver D106; **cachê médio por contratante** entregue na Sessão 115 — campo `avgFee` em
   `ContactProfitRow` (`rankContactsByProfit`) + coluna "Cachê médio" em `/contatos/rentabilidade`, o nível de
   preço praticado distinto do líquido (`avgNet`), ver D107; **recorte por período (ano)** entregue na Sessão 116 —
   `showProfitYears`/`parseProfitYear`/`filterShowsByYear` em `src/lib/finance.ts` + `PeriodPicker` (Todos + pílula
   por ano) em `/contatos/rentabilidade`, recortando o P&L por contratante por ano UTC antes de agregar, ver D108;
   **concentração de clientes (risco de dependência)** entregue na Sessão 117 — `clientConcentration(rows)` em
   `src/lib/finance.ts` deriva das linhas do ranking a dispersão da receita bruta entre contratantes (topShare,
   top3Share, HHI, clientes efetivos, veredito reusando `diversificationLevel`/D45) + card "Concentração de
   clientes" em `/contatos/rentabilidade`, ver D109; **concentração de clientes no Painel** entregue na Sessão 118 —
   `clientConcentrationHeadline(concentration)` em `src/lib/finance.ts` (espelha `cashBurnHeadline`/D103) + segundo
   banner-nudge 🔴/🟠 em `dashboard/page.tsx` (após o de ritmo de gasto), surgindo só quando a carteira está
   `concentrated`; a consulta de shows do dashboard passou a incluir `contacts` p/ resolver o pagador, ver D110.
   **Recorte por período (ano) na rentabilidade por local** entregue na Sessão 119 — `/shows/locais` ganhou o mesmo
   `PeriodPicker`/`?ano=` da rentabilidade por contratante, **reutilizando os três helpers da D108**
   (`showProfitYears`/`parseProfitYear`/`filterShowsByYear`): inclui `date` na consulta e filtra por ano UTC antes de
   `rankVenuesByProfit`, sem tocar a regra de agrupamento por local nem o P&L; estado vazio período-ciente, ver D111.
   **Recorte por período (ano) no detalhe do contato** entregue na Sessão 125 — `/contatos/[id]` ganhou um
   `ProfitPeriodPicker` (`?ano=` ancorado no contato) que recorta **só** o card "Rentabilidade" (D106) reusando os
   três helpers da D108 (`showProfitYears`/`parseProfitYear`/`filterShowsByYear`); filtra os shows por ano UTC antes
   de `summarizeContactProfit`, deixando o histórico e a lista de shows intactos; estado vazio período-ciente, ver
   D117. **Cachê mediano por contratante** entregue na Sessão 131 — `medianFee` em `ContactProfitRow`
   (`rankContactsByProfit` acumula os cachês de cada grupo e reusa `median()`) + coluna "Cachê mediano" em
   `/contatos/rentabilidade`, exibida só com `showCount >= MIN_MEDIAN_FEE_SAMPLE` (=3) — resolve na apresentação a
   ressalva de "ruidoso com poucos shows" (D57) que mantinha o item adiado, ver D123. **Cachê mediano por casa/cidade**
   entregue na Sessão 132 — `medianFee` em `VenueProfitRow`/`CityProfitRow` (acumulado no agregador genérico
   `aggregateShowProfit`) + coluna "Cachê mediano" em `/shows/locais` e `/shows/cidades`, mesma mecânica/limiar da D123
   (fecha a alternativa (c) adiada na D123), ver D124. Próximo possível —
   o **comparativo ano a
   ano da concentração de clientes** foi entregue na Sessão 130
   (`compareClientConcentration` + card "Concentração {ano} vs. {ano-1}" em `/contatos/rentabilidade`, ver D122); ou um
   recorte por período (`?ano=`) também no nudge de concentração do Painel (hoje usa o retrato corrente, todos os
   anos).
   **Rentabilidade por papel do contratante** entregue na Sessão 144 — `rankRolesByProfit` em `src/lib/finance.ts`
   (rollup acima de `rankContactsByProfit`: agrupa o P&L pelo papel de quem paga, vários contratantes do mesmo papel
   somam num grupo) + `/contatos/rentabilidade/por-papel` (cards de destaque + `PeriodPicker`/`?ano=` + tabela com cachê
   médio/mediano) + cross-link ↔ "Por contratante", registrada no hub, ver D136. **Exportação CSV da tela por papel**
   entregue na Sessão 145 — `roleProfitToCsv` + `ROLE_PROFIT_CSV_HEADERS` em `src/lib/csv.ts` (espelha
   `contactProfitToCsv`/D105 sem a coluna "Contratante": a 1ª coluna é "Papel", grupo `role: null` sai como "Sem
   contratante", cachê mediano gated por `MIN_MEDIAN_FEE_SAMPLE`) + rota `/contatos/rentabilidade/por-papel/export?ano=`
   (mesma consulta/recorte da página, BOM UTF-8, nome `rentabilidade-papeis-<ano|todos>.csv`) + botão "⬇ CSV" no
   cabeçalho da página (só com linhas), **+4 testes**, ver D137. **Concentração por papel** entregue na Sessão 146 —
   `roleConcentration(rows)` em `src/lib/finance.ts` (espelha `clientConcentration`/D109 e `geoConcentration`/D113 num eixo
   de papel: receita bruta por papel identificado, `topShare`/`top3Share`/`hhi`/`effectiveRoles`, veredito via
   `diversificationLevel`) + card "Concentração por papel" em `/contatos/rentabilidade/por-papel` (só com `roleCount > 0`),
   **+6 testes**, ver D138. **Comparativo ano a ano da concentração por papel** entregue na Sessão 149 —
   `compareRoleConcentration(current, previous)` + tipo `RoleConcentrationComparison` em `src/lib/finance.ts` (cópia
   estrutural de `compareClientConcentration`/`compareGeoConcentration`/D120 num eixo de papel: `topShareDelta`,
   `effectiveRolesDelta`, `trend` via `concentrationTrend`/`GEO_TREND_EPSILON`) + `RoleComparisonCard` em
   `/contatos/rentabilidade/por-papel` (badge 🟢/🔴/⚪ + variação do maior papel e dos papéis efetivos), só com ano
   selecionado e papel identificado nos dois períodos — fecha a simetria dos três eixos de concentração, **+5 testes**, ver D141.
   Próximo possível — um nudge dessa concentração no Painel (`roleConcentrationHeadline`, adiado na D138/D141 por já haver
   dois nudges de concentração lá).

9. **Rentabilidade geográfica — evoluções** (rentabilidade por local entregue na Sessão 28, `/shows/locais` +
   `rankVenuesByProfit`; atuação por cidade na Sessão 57, `/shows/cidades` + `rankCitiesByProfit`; recorte por
   período no local na Sessão 119, ver D111): **concentração geográfica (risco de depender de poucas cidades)**
   entregue na Sessão 121 — `geoConcentration(rows)` em `src/lib/finance.ts` deriva das linhas de
   `rankCitiesByProfit` a dispersão da receita bruta entre cidades (topShare, top3Share, HHI, cidades efetivas,
   veredito reusando `diversificationLevel`/D45, ignorando "Sem cidade") + card "Concentração geográfica" em
   `/shows/cidades`, ver D113; **nudge de concentração geográfica no Painel** entregue na Sessão 122 —
   `geoConcentrationHeadline(concentration)` em `src/lib/finance.ts` (espelha `clientConcentrationHeadline`/D110)
   decide a exibição (só quando `concentrated`, `critical` quando cidade única ou maior ≥ 2/3) + banner-nudge 🔴/🟠
   em `dashboard/page.tsx` linkando para `/shows/cidades`, reaproveitando os shows já carregados, ver D114;
   **recorte por período (`?ano=`) na atuação por cidade** entregue na Sessão 123 — `PeriodPicker` em
   `/shows/cidades` reaproveitando `showProfitYears`/`parseProfitYear`/`filterShowsByYear` (D108); filtra os shows
   por ano UTC antes de `rankCitiesByProfit`, e a concentração geográfica recompõe sobre as linhas já filtradas,
   ver D115; **concentração por casa na rentabilidade por local** entregue na Sessão 124 — `/shows/locais` ganhou o
   card "Concentração por casa" reaproveitando o mesmo `geoConcentration` (D113) sobre as linhas de
   `rankVenuesByProfit` (recortadas pelo `?ano=` da D111), sem mudança no helper (opera sobre `VenueProfitRow` e
   ignora "Sem local"); só a moldura textual difere ("casa/palco"), ver D116. **Recorte por período (ano) na
   rentabilidade por show** entregue na Sessão 126 — `/shows/rentabilidade` (ranking de P&L por show, F4) ganhou o
   mesmo `PeriodPicker`/`?ano=` das telas irmãs, reaproveitando os três helpers da D108
   (`showProfitYears`/`parseProfitYear`/`filterShowsByYear`): filtra os shows por ano UTC antes de `rankShowsByProfit`,
   sem tocar a exclusão de cancelados nem o P&L; era a última tela de rentabilidade sem recorte por período, ver D118.
   Próximo possível — extrair um
   componente único de card de concentração parametrizado pelo rótulo se surgir um terceiro eixo (adiado na D116
   alt. a por as cópias serem pequenas e os textos acionáveis divergirem); **comparar a concentração entre dois anos
   lado a lado (espelhando D33) entregue na Sessão 128** — `compareGeoConcentration` + `GEO_TREND_EPSILON` em
   `src/lib/finance.ts` (puro: Δ de `topShare` e cidades efetivas + veredito improved/worsened/stable, limiar 5 p.p.)
   + card "Concentração {ano} vs. {ano-1}" em `/shows/cidades`, exibido só com um ano selecionado e ambos os períodos
   com praça, reaproveitando o recorte por ano UTC da D108, ver D120. **Comparativo ano a ano por casa**
   entregue na Sessão 129 — `/shows/locais` ganhou o mesmo card "Concentração {ano} vs. {ano-1}", reaproveitando
   o `compareGeoConcentration` genérico (D120) sobre as linhas de `rankVenuesByProfit` do ano selecionado × ano
   anterior (recorte por ano UTC da D108 sobre os shows já carregados, sem nova consulta), exibido só com um ano
   específico e ambos os períodos com casa; só a moldura textual difere ("maior casa"/"casas efetivas"/"prospectar
   palcos"), ver D121. **Comparativo ano a ano da concentração de clientes** entregue na Sessão 130 —
   `/contatos/rentabilidade` ganhou o card "Concentração {ano} vs. {ano-1}" no eixo de cliente, via novo helper puro
   `compareClientConcentration` em `src/lib/finance.ts` (a regra de tendência virou o helper interno compartilhado
   `concentrationTrend`, reusando `GEO_TREND_EPSILON`; como `ClientConcentration` é tipo distinto de `GeoConcentration`,
   foi um helper paralelo, não generalização — ver D122), +5 testes. **Cachê mediano por casa/cidade** ENTREGUE na
   Sessão 132 — `medianFee` no agregador genérico `aggregateShowProfit` + coluna "Cachê mediano" em `/shows/locais` e
   `/shows/cidades`, gated por `MIN_MEDIAN_FEE_SAMPLE` (=3) como na D123 (resolve na apresentação a ressalva de "ruidoso
   com poucos shows"), ver D124. **DRY do `PeriodPicker`:** ENTREGUE na Sessão 127 — extraído
   `src/components/PeriodPicker.tsx` (server component puro, `basePath` + `ariaLabel`); as cinco telas
   (contratante/local/cidade/detalhe do contato/show) importam o componente compartilhado, −180 linhas, markup
   idêntico, ver D119. Próximo possível de DRY — unificar os cards de concentração permanece **adiado** (D116 alt. a):
   os textos acionáveis divergem de verdade ("prospectar palcos" × "abrir praças" × "diversificar clientes").
10. **Exportação CSV das telas de Finanças — evoluções** (transações entregues na Sessão 14, `/financas/export`;
   resumo anual na Sessão 47, `/financas/anual/export`; trimestral, `/financas/trimestral/export`):
   **fontes de renda** entregue na Sessão 152 — `incomeMixToCsv` + `INCOME_MIX_CSV_HEADERS` em `src/lib/csv.ts` +
   `/financas/fontes-de-renda/export` (Fonte/Lançamentos/Total/Participação + linha Total), botão "⬇ CSV" só com
   fontes, ver D144. **Recorte por ano (`?ano=`) nas fontes de renda** (página + export) entregue na Sessão 156 —
   `incomeMixYears` + `PeriodPicker`/`?ano=` em `/financas/fontes-de-renda` e seu export, filtrando por ano UTC antes de
   `incomeMix` (reusa `parseProfitYear`/`filterShowsByYear` da D108), ver D148. **Recorte por ano na composição de despesas**
   (`/financas/composicao-despesas` + export) entregue na Sessão 157 — `expenseMixYears` + `?ano=`, espelho de D148 no eixo de
   despesa, ver D149. **Exportação CSV do crescimento ano a ano** entregue na Sessão 162 — `yearlyHistoryToCsv` +
   `YEARLY_HISTORY_CSV_HEADERS` em `src/lib/csv.ts` + `/financas/crescimento/export` (Ano/Receitas/Despesas/Resultado/Variação
   do resultado % + linha Total), série inteira por design, botão "⬇ CSV" só com anos, ver D154. **Exportação CSV do fluxo de caixa
   mês a mês** entregue na Sessão 163 — `cashFlowToCsv` + `CASH_FLOW_CSV_HEADERS` em `src/lib/csv.ts` +
   `/financas/folego-de-caixa/export` (Mês/Recebido/Pago/Líquido + linha Total), janela parametrizável via `?meses=`
   (`parseBurnWindow`), nome `fluxo-de-caixa-mensal-{n}m.csv`, emite a janela inteira (meses zerados inclusos), botão "⬇ CSV" no
   card "Cenário alternativo" só com movimento, ver D155 — fecha o candidato natural apontado abaixo. **Exportação CSV da receita
   agendada** entregue na Sessão 164 — `bookedRevenueToCsv` + `BOOKED_REVENUE_CSV_HEADERS` em `src/lib/csv.ts` +
   `/shows/receita-agendada/export` (Mês/Shows/Confirmado/A confirmar/Total do mês + linha Total), do lado Shows: o pipeline de
   cachês futuros agregado por mês (`forecastBookedRevenue`), só meses com shows, nome fixo `receita-agendada.csv`, botão "⬇ CSV"
   só com `forecast.count > 0`, ver D156. **Exportação CSV da agenda de contas a pagar/receber** entregue na Sessão 165 —
   `dueAgendaToCsv` + `DUE_AGENDA_CSV_HEADERS` em `src/lib/csv.ts` + `/financas/agenda/export`
   (Vencimento/Descrição/Categoria/Janela/Tipo/Dias até vencer/Show/A receber/A pagar + linha Total), achata as quatro janelas de
   `buildDueAgenda` na ordem canônica, valor em duas colunas (somável), rótulos de janela compartilhados via `DUE_BUCKET_LABELS`,
   nome fixo `agenda-pagar-receber.csv`, botão "⬇ CSV" só com `agenda.count > 0`, ver D157. Próximo possível — as
   telas de Finanças que ainda não exportam são agora sobretudo painéis de cenário/projeção de número único (metas,
   projeção-ano, ponto-de-equilíbrio, reserva-impostos): menos óbvias como planilha; avaliar caso a caso se o tabular agrega.

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** em `personas-and-needs.md` (CRM, multiusuário)
  precisam de 5–10 entrevistas com músicos reais antes de investimento pesado.
- **Reserva para impostos (Sessão 50/D41)**: a alíquota padrão de 6% é **hipótese** (faixa inicial do
  Simples Nacional). O regime real do músico (MEI/Simples/carnê-leão) varia muito — confirmar com
  contador a alíquota e o modelo (faturamento bruto vs. lucro/progressivo) antes de virar premissa fixa.
- Foco **português/LATAM** e faixas de preço (`business-plan.md`) são hipóteses — validar.
- **Segurança em produção**: definir `AUTH_SECRET` forte e migrar para PostgreSQL antes
  de qualquer deploy real. Revisar advisories do Next (D6) e planejar upgrade p/ Next 15+.
