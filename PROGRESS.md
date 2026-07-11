# PROGRESS — Plataforma de Gestão de Carreira para Músicos (Palco)

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 (MVP) — núcleo funcional + ciclos de CRUD completos + agenda em calendário
+ testes de integração de posse por usuário + ESLint no CI + filtros nas Finanças
(incl. categoria) + confirmação antes de excluir + página de Conta (perfil/e-mail/senha).**
O app builda (`npm run build`), roda e passa nos testes (`npm test`, **83 testes**),
no typecheck e no **lint** (`npm run lint` → 0 warnings/erros). As cinco funcionalidades
do MVP (F1–F5 de `docs/mvp-scope.md`) estão implementadas e navegáveis. **1666 testes** verdes após o
**nudge de erosão da faixa premium no Painel** (Sessão 298, D293 — o `feeDropHeadline` (D274) avisa quando o
cachê **mediano** cai de um ano para o outro, mas a D274(b) adiou — por densidade do Painel — o sinal mais
sutil que a mediana não vê: a **cauda de cima** esvaziar sem o meio se mover (você continua fechando os shows
do meio no mesmo valor, mas parou de emplacar os cachês de topo, faixa premium "Acima de R$ 5.000").
`compareFeeDistribution` (D187) já computa `premiumShareDelta`, mas o sinal só vivia na tela
`/shows/faixas-de-cache`. Novo helper puro `feePremiumErosionHeadline(comparison, minSample?, minPoints?,
criticalPoints?)` + tipo `FeePremiumErosionHeadline` + constantes `PREMIUM_EROSION_MIN_SAMPLE`(=3),
`PREMIUM_EROSION_MIN_POINTS`(=0.15) e `PREMIUM_EROSION_CRITICAL_POINTS`(=0.30) em `src/lib/finance.ts`, espelho
de `feeDropHeadline`: recebe a `FeeDistributionComparison` já computada (zero I/O) e dispara `show` só quando a
participação premium caiu materialmente (`premiumShareDelta ≤ −0.15`), havia base a erodir
(`premiumSharePrevious > 0`), a mediana **não** está em queda (`trend !== "down"`) e ambos os anos têm ≥3 shows
priced; `critical` (🔴 vs 🔻) quando a queda atinge 30 p.p. O gate `trend !== "down"` torna o nudge
**mutuamente exclusivo** com o `feeDropHeadline` — nunca soma um segundo banner de cachê ao Painel (quando a
mediana já caiu, aquele é o titular; a erosão premium só fala quando o meio se manteve e o topo secou),
resolvendo exatamente a densidade que motivou o adiamento da D274(b). Banner no `dashboard/page.tsx` (link
`/shows/faixas-de-cache?ano={ano}`, "Os cachês acima de R$ 5.000 caíram de {X}% para {Y}% dos shows … mesmo
com o cachê típico firme. Hora de reforçar os contratantes de topo.") logo após o do `feeDropHeadline`; o
dashboard passa a derivar `feeComparison` uma vez e alimenta os dois nudges. Zero consulta nova, zero regra
nova, zero migração, zero dependência. **+8 testes** (`finance.test.ts`, `describe("feePremiumErosionHeadline")`:
topo esvaziando com mediana firme → show crítico; erosão < 30 p.p. → não-crítico; mediana em queda cede a vez;
premium subindo → não dispara; sem base premium → nada a erodir; erosão < 15 p.p. → não dispara; amostra fina
suprime; `minPoints` parametrizável barra). Build/typecheck/lint verdes; smoke → `/login` 200, `/dashboard` e
`/shows/faixas-de-cache?ano=2026` 307→/login (auth-gated, sem 500); `npm audit` inalterado (10 advisories).
Ver D293. Antes disso, **1658 testes** verdes após a
**coluna "vs. {ano-1}" por faixa na tabela e no CSV das faixas de cachê** (Sessão 297, D292 — a tela
`/shows/faixas-de-cache` já tinha recorte por ano (`?ano=`) e o card comparativo `FeeComparisonCard`
(`compareFeeDistribution`/D187), mas o card só resumia o deslocamento em três números (mediana, média,
participação premium) — a TABELA de distribuição (uma linha por faixa) não dizia, faixa a faixa, para ONDE a
agenda migrou de um ano para o outro, ao contrário de todas as telas irmãs de comparativo por linha do app
(`indexContactPipelineChanges`/D238, `indexStageDurationChanges`/D282). Agora `compareFeeDistribution` computa
`bandChanges: FeeBandShareChange[]` — o delta de participação (nº de shows, `countShare`) faixa a faixa na
ordem canônica de `FEE_BANDS` (6 faixas, casadas por chave; ausente no anterior = 0) — mais o tipo
`FeeBandShareChange` e o lookup O(1) `indexFeeBandShareChanges` em `src/lib/finance.ts` (espelho de
`indexStageDurationChanges`). A tabela ganha a coluna "vs. {ano-1}" (só quando o card comparativo existe) com o
delta em p.p. por faixa + legenda; `feeDistributionToCsv` ganha os parâmetros opcionais
`comparison`/`previousYear` e anexa a coluna "vs. {ano-1} (p.p.)" ao final (espelho de `stageDurationsToCsv`,
`csvSignedPoints`); a rota `.../export` recomputa a distribuição do ano anterior sobre os MESMOS registros já
carregados (recorte UTC da D108). Leitura NEUTRA por faixa (subir num degrau alto é bom, num baixo é o
contrário — o rumo direcional vive no veredito da mediana do card); completa o par resumo (card) + detalhe
(tabela/CSV). Zero consulta nova, zero regra nova, zero migração, zero dependência. **+8 testes**
(`finance.test.ts`: `bandChanges` traz as 6 faixas na ordem canônica; capta a migração de faixa; faixa vazia
nos dois anos → delta 0; sem base anterior → cada faixa preenchida vira +participação; `indexFeeBandShareChanges`
mapeia por chave — `csv.test.ts`: sem comparativo → sem coluna; com comparativo → coluna "vs. {ano-1} (p.p.)"
com −50/+50 e Total em branco; comparativo sem o ano anterior → sem coluna). Build/typecheck/lint verdes; smoke
→ `/login` 200, `/shows/faixas-de-cache`, `?ano=2026` e `/export?ano=2026` 307→/login (auth-gated, sem 500);
`npm audit` inalterado (10 advisories). Ver D292. Antes disso, **1650 testes** verdes após a
**coluna "sem cobrança iniciada" no CSV dos cachês a receber por contratante** (Sessão 296, D290 — fecha o
adiamento explícito da D289(a) ("um CSV pode vir depois se houver demanda"): a D289 deu à tela
`/shows/a-receber/por-contratante` o selo âmbar "🔔 {N} sem cobrança iniciada" por devedor
(`awaitingPromiseByContact`), mas o CSV da mesma tela (`receivablesByContactToCsv`) só levava as promessas
vencidas (contagem + valor) — a cobrança que nem começou aparecia na página, não na planilha. Agora
`RECEIVABLE_BY_CONTACT_CSV_HEADERS` ganha duas colunas fixas ao final — "Sem cobrança iniciada" (contagem)
e "A receber sem promessa (R$)" (valor) — e `ReceivableByContactCsvRow` os campos
`awaitingCount`/`awaitingOutstanding` em `src/lib/csv.ts`; a rota `.../por-contratante/export` computa
`awaitingPromiseByContact(receivables.rows, getPayer)` sobre os MESMOS recebíveis já reconciliados e casa por
id do contratante (grupo sem contratante = "") com as linhas de `outstandingByContact`, igual ao join da
página (devedores sem cobrança iniciada saem `0`/`0,00`). Paridade tela↔CSV restaurada, espelho das colunas
de promessas vencidas já presentes; zero consulta nova, zero regra nova (reusa a lógica pura de D287/D289),
zero migração, zero dependência. **+1 teste líquido** (`csv.test.ts`: header atualizado com as duas colunas +
linha base `0;0,00` ao final; novo "expõe a cobrança que ainda nem começou (contagem + valor)" → `3`/`1200,00`;
factory `row()` com os novos campos). Build/typecheck/lint verdes; smoke → `/login` 200,
`/shows/a-receber/por-contratante` e `.../export` 307→/login (auth-gated, sem 500); `npm audit` inalterado
(10 advisories). Ver D290. Antes disso, **1649 testes** verdes após a
**cobrança que ainda nem começou, por contratante** (Sessão 295, D289 — a D287/D288 criaram a leitura da
carteira INTEIRA da "cobrança que nem começou" (`receivablesAwaitingPromise` — recebíveis vencidos há ≥30 dias
SEM promessa registrada — banner na tela + segmento no Painel), mas nunca diziam de QUEM é essa cobrança nunca
iniciada. A tela `/shows/a-receber/por-contratante` já quebrava o saldo por devedor com selo ⚠ de promessas
vencidas, faltando o eixo simétrico "com quem a conversa de cobrança nem começou". Helper puro novo
`awaitingPromiseByContact(rows, getPayer, opts?)` + tipos `AwaitingPromiseByContact`/`AwaitingPromiseContactRow`
em `src/lib/finance.ts`, espelho de `outstandingByContact` filtrado ao subconjunto sem promessa: varre os
recebíveis em aberto (saída de `reconcileShowFees`), retém os com `paymentPromiseStatus` === "none" e parados há
≥ `AWAITING_PROMISE_MIN_DAYS`(=30) dias (mesmo filtro de D287) e os agrupa por `getPayer(show)` (o eixo do
pagador, `pickPayerContact`); por grupo `count`/`totalOutstanding`/`maxDaysOutstanding` + cachês do atraso mais
longo ao mais curto (id desempata); grupos do maior saldo sem promessa ao menor (desempate: atraso, depois id),
grupo `null` "sem contratante" por último; expõe `contactCount` (exclui o nulo) e `topContact`. A página ganha
um selo âmbar "🔔 {N} sem cobrança iniciada" por contratante (na tabela e no cabeçalho do detalhe), ao lado do
⚠ de promessas vencidas, mais uma frase na legenda. Reusa os shows/transações JÁ carregados — zero consulta,
zero regra nova, zero migração, zero dependência. **+7 testes** (`finance.test.ts`,
`describe("awaitingPromiseByContact")`: vazio sem cobrança sem promessa; agrupa por contratante do maior saldo
ao menor; exclui quem tem promessa/está no limiar usando o saldo em aberto; guarda o pior atraso e ordena os
cachês do grupo; grupo nulo por último e fora de contactCount/topContact; desempate por atraso quando o saldo é
igual; respeita limiar customizado). Build/typecheck/lint verdes; smoke → `/login` 200, `/shows/a-receber` e
`/shows/a-receber/por-contratante` 307→/login (auth-gated, sem 500); `npm audit` inalterado (10 advisories).
Ver D289. Antes disso, **1642 testes** verdes após o
**nudge de Painel da cobrança que ainda nem começou** (Sessão 294, D288 — fecha o adiamento explícito da
D287(c): a D287 criou `receivablesAwaitingPromise` (recebíveis vencidos há ≥30 dias SEM nenhuma promessa
registrada — a cobrança que nem começou) e o pôs num banner na tela `/shows/a-receber`, mas ADIOU levar o
sinal ao Painel ("um nudge pode vir depois espelhando o padrão `bookingLeadTimeHeadline`"). Quem só bate o
olho no Painel não via, num relance, que existe cobrança nunca iniciada. Helper puro novo
`awaitingPromiseHeadline(report, opts?)` + tipo `AwaitingPromiseHeadline` + constante
`AWAITING_PROMISE_CRITICAL_DAYS`(=90) em `src/lib/finance.ts`, espelho fiel de `staleProposalsHeadline`/
`bookingLeadTimeHeadline`: recebe o `ReceivablesAwaitingPromise` já computado (D287) e destila o nudge —
`show` quando `count > 0`; `critical` quando o mais antigo do grupo já passou de `criticalDays` (padrão 90,
o MESMO corte do balde "encalhado" do aging: passou de "esqueci de combinar" para "esfriou de vez sem
nenhuma cobrança"); `count`/`totalOutstanding`/`maxDaysOutstanding` repassados. O `dashboard/page.tsx`
computa `receivablesAwaitingPromise(receivables.rows)` sobre os recebíveis JÁ carregados (zero I/O extra) e
ganha um terceiro segmento "🔔 {total} sem cobrança iniciada ({N})" no banner "🎤 Cachês a receber", âmbar
por padrão e vermelho quando `critical`, ao lado dos segmentos de encalhado (🚨) e promessas furadas (🤝).
Segmento inline no banner existente (não banner próprio) porque é o MESMO eixo — cobrança de recebível —
dos dois sinais já ali, agrupando os três num único cartão e sem adensar o Painel; zero regra nova, zero
consulta, zero migração, zero dependência. **+6 testes** (`finance.test.ts`,
`describe("awaitingPromiseHeadline")`: não dispara sem awaiting; dispara não-crítico entre 30 e 90 dias;
vira crítico acima de 90; soma total e reporta o maior atraso; respeita `criticalDays` customizado; expõe
a constante de 90 dias). Build/typecheck/lint verdes; smoke → `/login` 200, `/dashboard` e
`/shows/a-receber` 307→/login (auth-gated, sem 500); `npm audit` inalterado (10 advisories). Ver D288.
Antes disso, **1636 testes** verdes após o
**alerta de recebíveis vencidos SEM promessa em `/shows/a-receber`** (Sessão 293, D287 — a tela de cachês a
receber já cobria dois eixos de cobrança — o AGING por idade (`bucketReceivablesByAge`) e as PROMESSAS por
status (`summarizePaymentPromises`, furadas × no prazo) — mas `summarizePaymentPromises` IGNORA de propósito
as linhas sem promessa registrada, deixando um ponto cego: os shows já vencidos há tempo para os quais NENHUMA
promessa foi registrada, a cobrança que nem começou e o dinheiro mais fácil de esquecer. Helper puro novo
`receivablesAwaitingPromise(rows, opts)` + tipos `AwaitingPromiseRow`/`ReceivablesAwaitingPromise` + constante
`AWAITING_PROMISE_MIN_DAYS`(=30) em `src/lib/finance.ts`: varre os recebíveis em aberto (saída de
`reconcileShowFees`), destila os com `paymentPromiseStatus` === "none" E parados há ≥ limiar de dias (padrão 30),
ordenados do atraso mais longo ao mais curto (id desempata), com `count`/`totalOutstanding`/`maxDaysOutstanding`
(`now` e limiar injetáveis). A página ganha o banner âmbar "🔔 Cobrança que ainda nem começou" (só com `count > 0`)
sob o de promessas, com total + nº de cachês + maior atraso, orientando a registrar uma promessa. Terceiro eixo de
cobrança complementar aos dois existentes; reusa os shows/transações JÁ carregados — zero consulta, zero regra nova,
zero migração, zero dependência. **+6 testes** (`finance.test.ts`, `describe("receivablesAwaitingPromise")`: lista só
vencidos além do limiar e sem promessa; ordena do atraso mais longo ao mais curto com id de desempate; usa o saldo em
aberto no total; respeita limiar customizado; vazia quando todos têm promessa ou dentro do limiar; expõe a constante de
30 dias). Build/typecheck/lint verdes; smoke → `/login` 200, `/shows/a-receber` 307→/login (auth-gated, sem 500);
`npm audit` inalterado (10 advisories). Ver D287. Antes disso, **1630 testes** verdes após a
**barra de composição do tempo do funil no card "Onde o tempo se concentra"** (Sessão 292, D286 — a D283
deu à tela `/shows/funil/tempo-em-etapa` a leitura de COMPOSIÇÃO (`stageTimeConcentration`) e o card
"Onde o tempo se concentra", mas o card só NOMEAVA a etapa dominante em texto; a composição inteira só
aparecia como números na coluna "% do percurso" da tabela. Helper puro novo
`stageTimeConcentrationSegments(concentration)` + tipo `StageTimeSegment` em `src/lib/shows.ts` achata a
`StageTimeConcentration` já computada nos segmentos VISÍVEIS de uma barra empilhada — só etapas de naco
positivo (`share > 0`), ordem canônica preservada, cada uma marcada `dominant` quando é o maior naco;
etapas de mediana zero ficam de fora (nada a desenhar), sem base devolve lista vazia. O card
`TimeConcentrationCard` ganha a barra empilhada `ConcentrationBar` (fatia proporcional ao share, cor
sólida reusando `SHOW_STATUS_DOT`, dominante com anel) + legenda etapa/percentual — a FORMA de onde o
tempo se concentra num relance, o mesmo espírito das barras de renda/despesa. Deriva do MESMO
`stageTimeConcentration` já exibido: zero consulta, zero regra nova, zero migração, zero dependência.
**+4 testes** (`shows.test.ts`, `describe("stageTimeConcentrationSegments")`: sem base → vazia; um
segmento por etapa de naco positivo na ordem canônica marcando o dominante; mediana zero fica de fora dos
visíveis mas segue na composição; todas as medianas zero → vazia). Build/typecheck/lint verdes; smoke →
`/login` 200, `/shows/funil/tempo-em-etapa` e `?ano=2026` 307→/login (auth-gated, sem 500); `npm audit`
inalterado (10 advisories). Ver D286. Antes disso, **1626 testes** verdes após o
**nudge de gargalo de tempo no funil no Painel** (Sessão 291, D285 — leva ao Painel a leitura de
COMPOSIÇÃO do tempo do funil (`stageTimeConcentration`/D283): quando a etapa PROPOSED concentra a MAIOR
fatia (≥ 50%) do tempo típico de percurso até o palco — as propostas passam o grosso do caminho apenas
esperando decisão —, um banner "⏳ O funil empaca na decisão" surge com a fatia %, a mediana em PROPOSED,
o percurso típico total e a amostra, linkando `/shows/funil/tempo-em-etapa`. Helper puro novo
`stageTimeBottleneckHeadline(durations, minShare?, criticalShare?, minShows?)` + tipo
`StageTimeBottleneckHeadline` + constantes `STAGE_BOTTLENECK_SHARE`(=0.5)/`STAGE_BOTTLENECK_CRITICAL_SHARE`(=0.7)/
`STAGE_BOTTLENECK_MIN_SHOWS`(=4) em `src/lib/shows.ts`: recebe uma `funnelStageDurations` já computada (dela
extrai a composição e a amostra `showCount`), dispara SÓ quando a etapa DOMINANTE do tempo é PROPOSED (gargalo
em CONFIRMED = espera esperada entre confirmar e o show → não dispara; PLAYED/CANCELLED são terminais e nem
aparecem como origem), a fatia ≥ `minShare` e a amostra é confiável (`showCount ≥ minShows`); `critical` (🔴)
quando a fatia ≥ `criticalShare`. É a mesma leitura de participação de `clientConcentrationHeadline`/
`geoConcentrationHeadline`, agora no eixo do TEMPO do funil. Distinto dos irmãos de proposta:
`staleProposalsHeadline` (propostas paradas AGORA, por deal) e `slowDeliberatorHeadline` (QUEM decide devagar,
por contratante); por ser a história ESTRUTURAL e mais lenta, CEDE A VEZ a eles (e a `contactDeliberationRiseHeadline`)
no `dashboard/page.tsx` para não duplicar banner. Reaproveita os shows JÁ carregados pelos outros nudges
(os `statusEvents` já vêm na consulta — zero I/O extra), zero regra de negócio nova, zero migração, zero
dependência. **+8 testes** (`shows.test.ts`, `describe("stageTimeBottleneckHeadline")`: sem amostra → não
dispara; PROPOSED dominante + amostra confiável → dispara (share 2/3, não crítico); fatia ≥ 0.7 → crítico;
gargalo em CONFIRMED → não dispara mas ainda reporta a fatia de PROPOSED; amostra < mínimo → não dispara;
empate 50/50 → dispara (limiar inclusivo, dominância a PROPOSED); limiares customizados de share; constantes).
Build/typecheck/lint verdes; smoke → `/login` 200, `/dashboard` e `/shows/funil/tempo-em-etapa` 307→/login
(auth-gated, sem 500); `npm audit` inalterado (10 advisories). Ver D285. Antes disso, **1618 testes** verdes após a
**coluna "% do percurso" no CSV do tempo em cada etapa** (Sessão 290, D284 — fecha o "próximo possível"
que a própria D283 deixou explícito: a tela `/shows/funil/tempo-em-etapa` ganhou na Sessão 289 a leitura
de COMPOSIÇÃO do tempo (`stageTimeConcentration`) como card + coluna "% do percurso" na tabela, mas o
CSV do mesmo relatório (`stageDurationsToCsv`) NÃO espelhava a coluna. Agora `STAGE_DURATIONS_CSV_HEADERS`
ganha a coluna fixa "% do percurso" (7ª, após "Máx (dias)") e `stageDurationsToCsv` a preenche por linha
com o naco da etapa (`csvShare`, derivado do MESMO `stageTimeConcentration(durations)` da tela — zero
regra nova, zero I/O), em branco por linha sem mediana positiva (`totalMedianDays === 0`, o "—" da tela) e
sempre em branco no "Total"; a coluna opcional "vs. {ano-1} (dias)" do comparativo (D282) segue anexada
DEPOIS, na 8ª. Motivo forte para reverter o adiamento D283(c): a irmã direta
`proposalDeliberationByContactToCsv` (D275) já carrega uma coluna "Participação (%)" derivada do mesmo
jeito, assim como `pipelineToCsv`/`proposalConversionToCsv` exportam a participação — o precedente da base
é que a composição PERTENCE ao CSV (planilha auto-explicativa e ordenável pelo gargalo de tempo). **+1
teste líquido** (`csv.test.ts`: 3 testes de `stageDurationsToCsv` atualizados para a 7ª coluna — sem
amostra/Total em branco; naco 40%/60% por etapa; etapa única 100%; comparativo com % + vs.{ano-1} — e 1
novo: "% em branco por linha quando não há mediana positiva"). Build/typecheck/lint verdes; smoke →
`/login` 200, `/shows/funil/tempo-em-etapa` e `/export?ano=2026` 307→/login (auth-gated, sem 500); `npm
audit` inalterado (10 advisories). A planilha exportada agora está em paridade total com a tabela que
exporta. Ver D284. Antes disso, **1617 testes** verdes após o
**"onde o tempo se concentra" no funil** (Sessão 289, D283 — dá à tela-mãe do tempo em cada etapa
(`/shows/funil/tempo-em-etapa`) a leitura de COMPOSIÇÃO que faltava: de todo o tempo que um show leva
atravessando o funil, ONDE ele se concentra? Helper puro novo `stageTimeConcentration(durations)` +
tipos `StageTimeShare`/`StageTimeConcentration` em `src/lib/shows.ts`: cada etapa como fração da SOMA
das medianas de todas as etapas (ordem canônica preservada), com `totalMedianDays` (denominador) e
`dominant` (a etapa de maior naco — o maior gargalo de tempo; empate resolve pela primeira do funil,
comparação estrita; `totalMedianDays === 0` → shares zerados + `dominant` nulo, sem divisão por zero).
A página ganha o card "Onde o tempo se concentra" (etapa dominante + percentual + mediana) e a coluna
"% do percurso" na tabela "Detalhe" ("—" sem mediana positiva). É a mesma leitura de participação já
consolidada no app (`incomeMix`/`expenseMix`/`clientConcentration`), agora no eixo do TEMPO do funil, e
a peça de destaque que faltava (as telas irmãs do funil já têm cards de destaque). Derivado das MESMAS
medianas já carregadas/exibidas — zero consulta, zero regra de negócio nova, zero migração, zero
dependência. **+5 testes** (`shows.test.ts`, `describe("stageTimeConcentration")`: sem amostra → shares
vazios + dominant nulo; cada etapa vira fração da soma na ordem canônica + dominante = maior naco;
empate elege a primeira etapa do funil; etapa com mediana zero fica com share zero mas não some; todas
as medianas zero → shares zerados + dominant nulo sem divisão por zero). Build/typecheck/lint verdes;
smoke → `/login` 200, `/shows/funil/tempo-em-etapa` e `?ano=2026` 307→/login (auth-gated, sem 500);
`npm audit` inalterado (10 advisories). ~~Adiado: somar a coluna "% do percurso" também ao CSV
(`stageDurationsToCsv`)~~ (entregue na Sessão 290, D284). Ver D283. Antes disso, **1612 testes**
verdes após o
**comparativo ano a ano por etapa do funil na tela-mãe** (Sessão 288, D282 — fecha o "passo maior" adiado na D281:
a tela-mãe do tempo em cada etapa (`/shows/funil/tempo-em-etapa`) já recortava por ano (`?ano=`, D281), mas não sabia
comparar {ano}×{ano-1} POR ETAPA — o espelho, no eixo do funil inteiro, do que a filha por contratante já tinha
(`compareProposalDeliberationByContact`/D278). Três funções puras novas em `src/lib/shows.ts`, espelho fiel de D278:
`compareFunnelStageDurations(current, previous)` casa as etapas por `status` entre dois `funnelStageDurations` já
recortados por ano e devolve `changes` (variação da mediana + `trend`), `biggestSpeedup`/`biggestSlowdown` e
`newStages`/`droppedStages`, **preservando a ordem canônica do funil** em `changes` para a coluna alinhar sem reordenar;
`indexStageDurationChanges(comparison)` → lookup `status`→`changed`/`new`/`none` em O(1); e a constante
`STAGE_DURATION_TREND_EPSILON`(=3, própria para afinar sem mexer no eixo da deliberação). Como na deliberação (D278),
**descer** a mediana é o sinal saudável (o show fica menos tempo parado na etapa): `trend` = `"faster"` (≤ −ε) /
`"slower"` (≥ +ε) / `"stable"`. Rótulo NEUTRO (faster/slower, não improved/worsened) porque a mãe cobre TODAS as etapas
e "atravessar mais rápido" nem sempre é inequivocamente melhor — descreve o fato mantendo a cor (verde = descer). Página
ganha o card "Como mudou o ritmo do funil · {ano} vs. {ano-1}" (etapa que mais acelerou / mais desacelerou + rodapé de
etapas que ganharam/perderam amostra) e a coluna "vs. {ano-1}" na tabela Detalhe; o CSV `stageDurationsToCsv` ganha a
coluna opcional "vs. {ano-1} (dias)" quando `previousYear`+`rowStatus` são informados (espelho de
`proposalDeliberationByContactToCsv`). Só exibe com um ano específico e ambos os períodos com amostra. Reusa os MESMOS
shows já carregados (recorta o ano anterior pela mesma agregação pura), zero nova consulta, zero migração, zero
dependência. **+6 testes** (`shows.test.ts`, `describe("compareFunnelStageDurations / indexStageDurationChanges")`: sem
etapas em comum → changes vazio + new/dropped; faster/slower além do limiar com ordem canônica preservada + biggest
speedup/slowdown; variação dentro do limiar fica estável; etapas só num período viram new/dropped; lookup
changed/new/none incl. null/undefined — `csv.test.ts`: coluna "vs. {ano-1} (dias)" com variação assinada, "novo" e Total
em branco). Build/typecheck/lint verdes; smoke → `/login` 200, `/shows/funil/tempo-em-etapa`, `?ano=2026` e
`/export?ano=2026` 307→/login (auth-gated, sem 500); `npm audit` inalterado (10 advisories). A tela-mãe do tempo em etapa
agora está em paridade TOTAL com a filha por contratante (recorte por ano + comparativo YoY + coluna "vs. {ano-1}" + CSV).
Ver D282. Antes disso, **1606 testes** verdes após o
**recorte por ano (`?ano=`) no tempo em cada etapa do funil** (Sessão 287, D281 — fecha o descompasso de paridade
herdado no funil: a página-mãe `/shows/funil/tempo-em-etapa` (`funnelStageDurations`/D235) media a permanência típica
em cada etapa somando TODAS as propostas de todos os tempos, SEM seletor de período — ao contrário das telas irmãs do
MESMO funil que já recortam pela coorte da proposta: `/shows/funil/conversao` (`proposalOutcomes`/D243) e a própria
FILHA `/shows/funil/tempo-em-etapa/por-contratante` (`proposalDeliberationByContact` com `opts.year`/D276). A filha
nasceu com `?ano=`, a mãe não. Agora `funnelStageDurations(shows, opts?)` aceita `opts.year` (reusa
`ProposalOutcomesOptions`, sem tipo novo): recorta os shows pela ENTRADA da proposta no funil (primeiro
`toStatus === PROPOSED` via `firstProposedAt`, o mesmo eixo de coorte de D243/D276) ANTES de agregar, mantendo o motor
puro agnóstico ao recorte; shows sem entrada em PROPOSED saem de qualquer ano específico mas seguem contando em `"all"`
(comportamento histórico intacto — `opts` opcional). Página e export ganham o `?ano=`: `availableYears =
proposalOutcomeYears(shows)` (reuso literal do eixo de anos da conversão), `parseProfitYear` + `PeriodPicker`
(`basePath` da rota, `ariaLabel="Ano da proposta"`), subtítulo com o período, empty-state honesto por ano e sufixo do
ano no filename do CSV (`tempo-em-etapa-2026.csv` / `-todas.csv`). Zero migração, zero I/O extra (recorta o mesmo
acervo já carregado), zero dependência. **+2 testes** (`shows.test.ts`, `describe("funnelStageDurations")`: recorta por
ano da entrada da proposta — all/2026/2025 com contagens/medianas distintas; recorte por ano ignora shows sem entrada em
PROPOSED (fora da coorte) mas os conta em `all`). Build/typecheck/lint verdes; smoke → `/login` 200,
`/shows/funil/tempo-em-etapa`, `?ano=2026` e `/export?ano=2026` 307→/login (auth-gated, sem 500); `npm audit` inalterado
(10 advisories). O recorte é pela data da PROPOSTA, não a do show — o eixo de coorte coerente com toda a família do funil.
~~Adiado (o "passo maior", espelho D278): comparativo YoY por etapa {ano}×{ano-1} na própria mãe + coluna "vs. {ano-1}"~~
(o valor imediato era o recorte por ano; o comparativo por etapa é um passo maior e menos pedido). Ver D281. Antes disso,
**1604 testes** verdes após o
**nudge no Painel do contratante que passou a decidir mais devagar** (Sessão 286, D280 — fecha a paridade TOTAL dos
eixos por-contratante no Painel: cada um agora tem os DOIS sabores de eco — o ABSOLUTO (uma relação bem pior que a
carteira hoje) E o de TENDÊNCIA (uma relação que piorou ano a ano). A **deliberação** só tinha o absoluto
(`slowDeliberatorHeadline`/D277); faltava o de tendência, embora a lógica pura de comparação já existisse
(`compareProposalDeliberationByContact`/D278) — o sinal só vivia na página `/shows/funil/tempo-em-etapa/por-contratante`.
Novo helper puro `contactDeliberationRiseHeadline(comparison, minSample?, riseDays?, criticalDays?)` + tipo
`ContactDeliberationRiseHeadline<C>` + constantes `DELIBERATION_RISE_DAYS`(=6, o dobro do `DELIBERATION_TREND_EPSILON`=3 do
card) e `DELIBERATION_RISE_CRITICAL_DAYS`(=14) em `src/lib/shows.ts` (espelho fiel de `contactPaymentLagRiseHeadline`/D279 e
`contactBookingLeadTimeDropHeadline`/D272 no eixo da deliberação): recebe um `ProposalDeliberationByContactComparison` já
computado (dois `proposalDeliberationByContact`, cada um recortado ao seu ano via `opts.year`/D276) e destila o contratante
de MAIOR alta de deliberação com amostra confiável (`stat.count >= minSample` nas DUAS coortes) e alta ≥ `riseDays` dias;
`critical` a ≥ `criticalDays`; `others` resume os demais no gate. **Ancora na MEDIANA** (ao contrário do recebimento/D279 que
usa a média) — a mesma escolha do card/comparativo D278, o eixo por que a página ordena/destaca. Banner no
`dashboard/page.tsx` (link `/shows/funil/tempo-em-etapa/por-contratante?ano={ano}`, 🐌 não-crítico / 🔴 crítico) que **CEDE A
VEZ** ao nudge absoluto de deliberação (`slowDeliberatorHeadline`) — no máximo um banner de deliberação por vez. Reusa o MESMO
pivô show×contato já montado para a conversão/deliberação por contratante (as shows carregam `statusEvents`, o único campo que
a deliberação precisa): zero I/O extra, zero regra de negócio nova, zero migração, zero dependência. Só a ponta de PIORA
(decidir mais devagar) vira alerta; acelerar a decisão é boa notícia. **+5 testes** (`shows.test.ts`,
`describe("contactDeliberationRiseHeadline")`: aponta o contratante que mais desacelerou a decisão com amostra confiável nas
duas coortes (crítico); dispara não-crítico entre o piso e o limiar crítico; ignora pioras de amostra fina e elege a maior
confiável, contando o resto em `others`; não dispara sem piora material (abaixo do piso); respeita limiares injetáveis).
Build/typecheck/lint verdes; smoke → `/login` 200, `/dashboard` e `/shows/funil/tempo-em-etapa/por-contratante?ano=2026`
307→/login (auth-gated, sem 500); `npm audit` inalterado (10 advisories). O `DELIBERATION_RISE_DAYS`=6 é menor que os 14 dos
irmãos porque a deliberação costuma ser mais curta que o prazo de recebimento ou a antecedência (mesma razão do epsilon do card
já ser 3 < 7). Ver D280. Antes disso, **1599 testes** verdes após o
**nudge no Painel do contratante que passou a pagar mais devagar** (Sessão 285, D279 — fecha a paridade dos eixos
por-contratante no Painel: os irmãos mais novos já ecoavam na primeira tela quando UMA relação piora ano a ano —
antecedência encolhendo (`contactBookingLeadTimeDropHeadline`/D272), conversão caindo (`contactConversionDropHeadline`/D248)
e deliberação arrastando (`slowDeliberatorHeadline`/D277) —, mas o eixo do **prazo de recebimento por contratante** (o ORIGINAL
da família: `paymentLagByContact`/D192, `comparePaymentLagByContact`/D194) só vivia na página `/shows/prazo-recebimento/por-contratante`.
Um pagador recorrente que desacelera é um risco de caixa tão acionável quanto os irmãos (hora de renegociar prazo / pedir
adiantamento). Novo helper puro `contactPaymentLagRiseHeadline(comparison, minSample?, riseDays?, criticalDays?)` + tipo
`ContactPaymentLagRiseHeadline<C>` + constantes `PAYMENT_LAG_RISE_DAYS`(=14, o dobro do `PAYMENT_LAG_TREND_EPSILON`=7 do card) e
`PAYMENT_LAG_RISE_CRITICAL_DAYS`(=30) em `src/lib/finance.ts` (espelho de `contactBookingLeadTimeDropHeadline`/D272 no eixo do
recebimento): recebe um `PaymentLagByContactComparison` já computado e destila o pagador de MAIOR alta de prazo com amostra
confiável (`showCount >= minSample` nas DUAS coortes) e alta ≥ `riseDays` dias; `critical` a ≥ `criticalDays`; `others` resume os
demais no gate. **Ancora na MÉDIA ponderada (`avgDays`), não na mediana** — a mesma escolha deliberada de `comparePaymentLagByContact`
(por pagador a amostra é pequena e a mediana fica ruidosa; `avgDays` está sempre definido e é o eixo por que a página ordena/destaca).
Banner no `dashboard/page.tsx` (🐢 não-crítico / 🔴 crítico, link `/shows/prazo-recebimento/por-contratante`) que CEDE A VEZ ao nudge
absoluto de DSO (`paymentLagHeadline`/D70) — no máximo um banner de recebimento por vez —, reusando os MESMOS shows/transações já
carregados e o `leadBooker`/`pickPayerContact` dos recebíveis: zero I/O extra, zero regra de negócio nova, zero migração, zero
dependência. Só a ponta de PIORA (pagar mais devagar) vira alerta. **+6 testes** (`finance.test.ts`, `describe("contactPaymentLagRiseHeadline")`:
aponta o pagador que mais desacelerou com amostra confiável nas duas coortes — crítico; ignora pioras de amostra fina e elege a maior
CONFIÁVEL; conta os demais em `others`; não dispara sem piora material/confiável; piora abaixo do piso de 14 dias não vira nudge;
respeita limiares injetáveis de amostra/piso/crítico). Build/typecheck/lint verdes; smoke → `/login` 200, `/dashboard` e
`/shows/prazo-recebimento/por-contratante` 307→/login (auth-gated, sem 500); `npm audit` inalterado (10 advisories). Ver D279.
Antes disso, o **comparativo ano a ano do tempo de decisão por contratante** (Sessão 284, D278 — fecha o "passo maior" adiado na D276:
`compareProposalDeliberationByContact(current, previous)` + tipos `ProposalDeliberationByContactComparison`/
`ContactProposalDeliberationChange`/`ContactProposalDeliberationRowStatus` + `indexContactProposalDeliberationChanges` +
constante `DELIBERATION_TREND_EPSILON`(=3) em `src/lib/shows.ts`, espelho literal de `compareBookingLeadTimeByContact`/
`indexContactBookingLeadTimeChanges` (D196) no eixo da deliberação. Casa os contratantes por `contact.id` entre dois relatórios
`proposalDeliberationByContact` já recortados por ano (via `opts.year`/D276, o eixo de coorte da entrada da proposta no funil) e
devolve `changes` (variação da mediana + `trend`), `biggestImprovement`/`biggestWorsening` e `newContacts`/`droppedContacts`.
Como no prazo de recebimento (D194), **descer** a mediana é a melhora (a proposta sai mais rápido da mesa), ao contrário da
antecedência (D196, subir é a melhora). Página `/shows/funil/tempo-em-etapa/por-contratante` ganha o card "Quem mudou o ritmo de
decisão · {ano} vs. {ano-1}" (mais acelerou / mais desacelerou + novos/sumidos) e a coluna "vs. {ano-1}" na tabela; o CSV
`proposalDeliberationByContactToCsv` ganha a coluna opcional "vs. {ano-1} (dias)" quando `previousYear` é informado (espelho de
`bookingLeadTimeByContactToCsv`). Só exibe com um ano específico e ambos os períodos com decisão cronometrada. Reusa os MESMOS
itens já carregados (recorta o ano anterior pela mesma agregação pura), zero nova consulta, zero migração, zero dependência.
`DELIBERATION_TREND_EPSILON`=3 (< os 7 dos irmãos) porque a deliberação costuma ser mais curta que antecedência/prazo. **+6 testes**
(5 de `compareProposalDeliberationByContact`/`indexContactProposalDeliberationChanges`: sem comum → changes vazio + sumidos;
melhora/piora além do limiar com "maior piora no topo"; dentro do limiar fica estável; novos/sumidos; lookup changed/new/none — 1
de `proposalDeliberationByContactToCsv`: coluna "vs. {ano-1}" com variação assinada, "novo" e Total em branco). Build/typecheck/lint
verdes; smoke → `/login` 200, página e `/export?ano=2026` 307→/login (auth-gated, sem 500); `npm audit` inalterado (10 advisories).
A deliberação por contratante agora está em paridade TOTAL com os eixos irmãos (recorte por ano + comparativo YoY + coluna
"vs. {ano-1}" + nudge no Painel/D277). Ver D278. Antes disso, **1587 testes** verdes após a **consolidação da PR
paralela #309 (D276, recorte por ano no tempo de decisão por contratante) na `main`** (Sessão 283 — a #309 ficara com conflito
(`dirty`) contra a `main` após o merge de D277 (#310); esta sessão rebaseou o commit da #309 sobre a `main` atual, resolveu os
conflitos só nos docs (PROGRESS/DECISIONS — o código auto-mergeou limpo: `slowDeliberatorHeadline` de D277 e o `opts.year` de
D276 são ortogonais em `shows.ts`) e reordenou as entradas D276→D277 numérica/cronologicamente. DoD verde: build/typecheck/lint,
1587 testes (1585 de D277 + 2 de D276), smoke → `/login` 200 e `/shows/funil/tempo-em-etapa/por-contratante?ano=2026` 307→/login,
`npm audit` inalterado (10 advisories)). Antes disso, o **nudge no Painel do
contratante mais lento a decidir** (Sessão 282, D277 — fecha o adiamento explícito da D275 "nudge no Painel para o contratante
mais lento": `proposalDeliberationByContact` (D275) já sabia QUEM te deixa mais tempo com a proposta na mesa (o campo `slowest`),
mas o sinal só vivia na página `/shows/funil/tempo-em-etapa/por-contratante`. Uma deliberação que se arrasta é tão acionável
quanto a conversão caindo (D248) ou a antecedência encolhendo (D272) — se um parceiro leva semanas para decidir, suas propostas
ficam reféns dele. Novo helper puro `slowDeliberatorHeadline(report, slowRatio?, minDays?, criticalRatio?)` + tipo
`SlowDeliberatorHeadline<C>` + constantes `DELIBERATION_SLOW_RATIO`(=2), `DELIBERATION_SLOW_CRITICAL_RATIO`(=3) e
`DELIBERATION_SLOW_MIN_DAYS`(=7) em `src/lib/shows.ts` (espelho dos headlines irmãos por-contratante
`contactBookingLeadTimeDropHeadline`/`contactConversionDropHeadline`): parte do `slowest` (que já exige >1 contratante confiável)
e só vira nudge quando a mediana dele é materialmente pior que a TÍPICA da carteira — ao menos 2× o mediano geral
(`report.overall.medianDays`) **E** ao menos 7 dias em ABSOLUTO (para "2× de 1 dia" não alertar); `critical` (🔴 vs 🐌) a ≥ 3×.
Banner no `dashboard/page.tsx` (link `/shows/funil/tempo-em-etapa/por-contratante`) reaproveitando o MESMO pivô show×contato já
montado para o nudge de conversão por contratante (D248) — as shows carregam `statusEvents`, o único campo que a deliberação
precisa — zero I/O extra, zero regra de negócio nova, zero migração, zero dependência. **+7 testes** (`shows.test.ts`,
`describe("slowDeliberatorHeadline")`: sem >1 confiável não dispara; típico nulo não dispara; < 2× o típico não dispara (gate
relativo); ≥ 2× mas < 7 dias não dispara (piso absoluto); 2,5× ≥ 7 dias dispara não-crítico com contato/mediana/razão/amostra;
≥ 3× vira crítico; `slowRatio` parametrizável barra o caso-limite). Build/typecheck/lint verdes; smoke → `/login` 200,
`/dashboard` e `/shows/funil/tempo-em-etapa/por-contratante` 307→/login (auth-gated, sem 500); `npm audit` inalterado (10
advisories). Ver D277. Antes disso, o **recorte por ano no
tempo de decisão por contratante** (Sessão 281, D276 — fecha o adiamento explícito da D275 ("recorte por `?ano=`"): a
deliberação por contratante (`/shows/funil/tempo-em-etapa/por-contratante`, D275) media a etapa PROPOSED somando TODAS as
propostas de todos os tempos, sem seletor de período — ao contrário da irmã do mesmo funil `/shows/funil/conversao/contratantes`
(D247), que já recorta por ano da proposta. Agora `proposalDeliberationByContact(items, opts?)` aceita `opts.year` (ano UTC da
ENTRADA da proposta no funil, o mesmo eixo de coorte de `proposalOutcomes`/D243 — primeiro `toStatus === PROPOSED`, não a data
do show): filtra os shows de cada contratante por `firstProposedAt` **antes** de `funnelStageDurations`, mantendo o motor puro
agnóstico ao recorte; o `overall` por relação segue o mesmo recorte. Reusa `ProposalOutcomesOptions` (já `{ year? }`) — zero
tipo novo. Página e export ganham o `?ano=`: `availableYears = proposalOutcomeYears(allShows)` (reuso literal do eixo da
conversão, sem novo helper de anos), `parseProfitYear` + `PeriodPicker` (`basePath` da própria rota, espelho de
conversao/contratantes), subtítulo com o período, empty-state honesto por ano, filename do CSV com sufixo do ano
(`tempo-decisao-por-contratante-2026.csv`). Zero migração, zero I/O extra (recorta o mesmo acervo já carregado), zero
dependência. **+2 testes** (`shows.test.ts`, `describe("proposalDeliberationByContact")`: recorta por ano da entrada da proposta
— `all`/2026/2025 com contagens e medianas distintas + `overall` recortado; contratante sem proposta no ano sai da lista).
Build/typecheck/lint verdes; smoke → `/login` 200, página e `/export?ano=2026` 307→/login (auth-gated, sem 500); `npm audit`
inalterado (10 advisories). ~~Adiado (o "passo maior", espelho D270/D248): comparativo YoY por contratante {ano}×{ano-1} na
deliberação + coluna "vs. {ano-1}"~~ (entregue na Sessão 284, D278). Ver D276. Antes disso, o **tempo de decisão da
proposta por contratante** (Sessão 280, D275 — leva o eixo por contratante à deliberação do funil: o "Tempo em cada etapa"
(`funnelStageDurations`/D235, `/shows/funil/tempo-em-etapa`) media a velocidade típica de travessia somando TODOS os shows, mas
não dizia DE QUEM a proposta demora a sair da mesa — os eixos por contratante já existiam para recebíveis
(`paymentLagByContact`) e antecedência (`bookingLeadTimeByContact`), faltava o da deliberação. Novo
`proposalDeliberationByContact(items)` + tipos `ProposalDeliberationByContact`/`ContactProposalDeliberationRow`/
`ProposalDeliberationShowLike`/`ContactProposalDeliberationItem` + constante `MIN_DELIBERATION_SAMPLE`(=3) em `src/lib/shows.ts`:
para cada contratante roda o MESMO motor `funnelStageDurations` sobre os shows dele e destila a estatística da etapa **PROPOSED**
(mediana/média/mín/máx de dias na mesa antes de decidir — avançar ou cancelar); só viram linha os com ≥1 decisão cronometrada
(propostas em aberto ficam de fora, sem número honesto); `overall` roda por relação (show partilhado conta p/ cada contato, como
o `overall` de `proposalOutcomesByContact`/D247); ordena da MENOR mediana à MAIOR (decide rápido primeiro); `slowest` (destaque
"Quem mais te deixa esperando") só com >1 contratante confiável. Página `/shows/funil/tempo-em-etapa/por-contratante`
(sub-relatório da tela-mãe com link recíproco, card do mais lento + tabela) + export CSV `proposalDeliberationByContactToCsv` +
`PROPOSAL_DELIBERATION_BY_CONTACT_CSV_HEADERS` em `src/lib/csv.ts` + entrada em `REPORT_GROUPS` (Agenda & pipeline). Reaproveita
o motor puro/testado de D235 (zero regra nova, zero migração, zero dependência); consulta espelha a de
`/shows/funil/conversao/contratantes`. **+10 testes** (7 de `proposalDeliberationByContact`: vazio; só-aberto não vira linha;
destila PROPOSED e ordena com participação; amostra fina não-confiável mas listada; avanços + cancelamentos; `overall` por
relação; `slowest` só com >1 confiável — 3 de `proposalDeliberationByContactToCsv`: vazio; linha menor-mediana-primeiro com dias
crus; mediana suprimida na amostra fina). Build/typecheck/lint verdes; smoke → `/login` 200, a página e o `/export` 307→/login
sem auth (rotas presentes no build); `npm audit` inalterado (10 advisories). Ver D275. Adiado: recorte por `?ano=`/comparativo
YoY (espelho D269/D270) e nudge no Painel do mais lento. Antes disso, o **nudge de queda do
cachê típico no Painel** (Sessão 279, D274 — leva ao dashboard o comparativo de nível de preço que só vivia em
`/shows/faixas-de-cache`: `compareFeeDistribution` (D187) já media se o cachê **mediano** subiu/caiu ano a ano, mas o sinal
não aparecia na primeira tela. Uma erosão do preço típico é um risco de carreira tão acionável quanto a conversão caindo
(D245) ou a antecedência encolhendo (D272) — quando o show mediano passa a pagar menos, é hora de revisar tabela/mix de
contratantes. Novo helper puro `feeDropHeadline(comparison, minSample?, criticalRatio?)` + tipo `FeeDropHeadline` +
constantes `FEE_DROP_MIN_SAMPLE`(=3) e `FEE_DROP_CRITICAL_RATIO`(=0,75) em `src/lib/finance.ts` (espelho de
`proposalConversionHeadline`/`yearToDatePaceHeadline`): recebe um `FeeDistributionComparison` já computado e destila o nudge —
`show` só quando a mediana **caiu** (`trend === "down"`, que já embute os pisos absoluto/relativo `FEE_TREND_FLOOR`/`_EPSILON`)
**E** ambos os anos têm ≥ `minSample` shows realizados com cachê (a mediana de 1–2 shows é o próprio show); `critical` (🔴 vs
🔻) quando a mediana atual afunda para ≤ 75% da anterior (≥ 25% abaixo). Banner no `dashboard/page.tsx` (link
`/shows/faixas-de-cache?ano={ano}`) reaproveitando os shows **já carregados** — recorta por ano UTC (`filterShowsByYear`/D108)
e roda a mesma `feeDistribution` da tela sobre o ano corrente e o anterior, zero I/O extra, zero regra de negócio nova, zero
migração, zero dependência. Só a ponta de PIORA vira alerta (um cachê subindo é boa notícia); gate mantém o nudge raro. **+6
testes** (`finance.test.ts`, `describe("feeDropHeadline")`: queda material com amostra confiável → show não-crítico com
deltas/pct; queda ≥ 25% → crítico; mediana subindo → não dispara; variação dentro do limiar → não dispara; amostra fina num
dos anos suprime; `minSample` parametrizável barra). Build/typecheck/lint verdes; smoke → `/login` 200, `/dashboard` e
`/shows/faixas-de-cache` 307→/login sem auth, e **dashboard autenticado 200 renderizando o banner crítico** ("🔴 Cachê típico
em queda … O show mediano de 2026 paga R$ 700,00 — 30% abaixo do típico de 2025 (R$ 1.000,00) …"); `npm audit` inalterado
(10 advisories). Ver D274. Antes disso, o **comparativo ano a
ano do desempenho por dia da semana** (Sessão 278, D273 — fecha a última tela de distribuição de shows sem comparativo YoY:
`/shows/dias-semana` (`weekdayPerformance`/D205) já filtrava por ano (`?ano=`) e exportava CSV, mas — ao contrário da irmã
`/shows/sazonalidade` (`compareGigSeasonality`/D223) — não dizia "em que dias da semana você passou a tocar mais/menos do que
no ano passado". Novo helper puro `compareWeekdayPerformance(current, previous)` + tipos `WeekdayPerformanceComparison`/
`WeekdayPerformanceDayChange` + `classifyWeekdayPerformanceDayChange` (+ tipo `WeekdayPerformanceDayTrend`) em
`src/lib/finance.ts` (espelho fiel de `compareGigSeasonality`/`classifyGigSeasonalityMonthChange` no eixo do dia da semana):
casa os 7 dias (dom→sáb) dos dois períodos por índice, destila os dois **movers** — o dia que mais cresceu e o que mais caiu
em nº de shows (ancora no `count`, `feeDelta` de desempate; dia mais cedo na semana vence empate) — e mantém os 7 `days`
para o detalhe. CSV `weekdayPerformanceComparisonToCsv` + `WEEKDAY_PERFORMANCE_COMPARISON_CSV_HEADERS` em `src/lib/csv.ts`
(espelho de `gigSeasonalityComparisonToCsv`: 7 linhas dom→sáb inclusive dias zerados + linha `Total`, deltas assinados,
tendência Subiu/Caiu/Estável). Card "Semana {ano} vs. {ano-1}" na página `dias-semana/page.tsx` (movers + `<details>` com os 7
dias + link `⬇ CSV`) só quando `?ano=` está setado e ambos os anos têm shows; rota `/shows/dias-semana/comparativo/export`
(irmã de `/shows/sazonalidade/comparativo/export`, mesmo gate → 404 sem ano/sem shows nos dois anos). Reusa os shows **já
carregados** (recorte do ano anterior por `filterShowsByYear`, zero I/O extra), zero regra de negócio nova, zero migração,
zero dependência. **+11 testes** (`finance.test.ts`: `compareWeekdayPerformance` +4 / `classifyWeekdayPerformanceDayChange`
+4, espelhando os da sazonalidade; `csv.test.ts`: `weekdayPerformanceComparisonToCsv` +3). Build/typecheck/lint
verdes; smoke → `/login` 200, `/shows/dias-semana` e `/shows/dias-semana/comparativo/export?ano=2026` 307→/login (auth-gated,
sem 500); `npm audit` inalterado (10 advisories). Ver D273. Antes disso, o **nudge no Painel
"contratante recorrente passou a fechar em cima da hora"** (Sessão 277, D272 — fecha o "próximo possível" adiado na D270:
a lógica pura `compareBookingLeadTimeByContact` (D196) já media, por contratante, quem passou a te fechar com mais folga /
mais em cima da hora ano a ano, mas o sinal só vivia na tela dedicada `/shows/antecedencia/por-contratante`. Novo helper puro
`contactBookingLeadTimeDropHeadline(comparison, minSample?, dropDays?, criticalDays?)` + tipo
`ContactBookingLeadTimeDropHeadline<C>` + constantes `LEAD_TIME_DROP_DAYS`(=14, o dobro do `LEAD_TIME_TREND_EPSILON` do
veredito do card) e `LEAD_TIME_DROP_CRITICAL_DAYS`(=30) em `src/lib/shows.ts` (espelho fiel de `contactConversionDropHeadline`
no eixo da antecedência): destila o contratante de MAIOR perda de folga com amostra confiável — `leadTime.sample >=
MIN_LEAD_TIME_SAMPLE` nas DUAS coortes — e queda mediana >= `dropDays`; `critical` quando >= `criticalDays`; `others` resume os
demais no gate. Banner no `dashboard/page.tsx` (link `/shows/antecedencia/por-contratante?ano={ano}`) que CEDE A VEZ ao nudge
absoluto (`bookingLeadTimeHeadline`) para no máximo um banner de folga por vez; reusa os shows já carregados (date+createdAt+
contacts, zero I/O extra, `pickPayerContact` como eixo de contratante), zero regra de negócio nova, zero migração, zero
dependência. **+6 testes** (`shows.test.ts`, `describe("contactBookingLeadTimeDropHeadline")`). Build/typecheck/lint verdes;
smoke → dashboard autenticado 200 renderizando o banner com dados que disparam o gate ("… 5 dias … 40 dias a menos que em
2025 (45 dias)", variante crítica); `npm audit` inalterado (10 advisories). Ver D272. Antes disso, a **exportação CSV
da distribuição das secas** (Sessão 276, D271 — reverte a deferência "**Sem CSV próprio**" da D267 e fecha a última
distribuição sem export: a seção "Distribuição das secas" de `/shows/hiatos` (`gapDistribution`, os hiatos repartidos nas
5 faixas canônicas) já vivia na tela mas só as "Maiores secas" eram exportáveis. A D267 adiou o CSV por a distribuição ser
"derivável" da lista de hiatos, mas todos os relatórios de distribuição irmãos (cachê/sazonalidade/dias-da-semana) já têm o
seu, e obrigar o músico a montar a tabela dinâmica na planilha é atrito. Novo `gapDistributionToCsv(dist)` + `GAP_DISTRIBUTION_CSV_HEADERS` (`Faixa`/`Secas`/`% das secas`)
em `src/lib/csv.ts` (espelho fiel de `feeDistributionToCsv`: uma linha por faixa inclusive as zeradas → `0`/`0%` para o
"formato da cadência" não pular degraus + linha `Total` com participação em branco) + rota `/shows/hiatos/distribuicao/export`
(irmã de `/shows/hiatos/export`, mesma consulta enxuta `date`+`status`, BOM UTF-8, nome `hiatos-distribuicao.csv`) + um
segundo botão "⬇ CSV" no cabeçalho da própria seção "Distribuição das secas" (o CSV do topo segue sendo o das "Maiores
secas"). Zero regra de negócio nova (a repartição vive em `gapDistribution`, pura e testada), zero I/O extra, zero migração,
zero dependência. **+2 testes** (distribuição vazia → 5 faixas zeradas + `Total;0;`; três faixas distintas → contagem/
participação inclusive zeradas + `Total;3;`). Build/typecheck/lint verdes; smoke → `/login` 200, página e `/export`
307→/login; `npm audit` inalterado (10 advisories). Ver D271. Antes disso, o **comparativo ano a
ano da antecedência por contratante** (Sessão 275, D270 — fecha o "passo maior" adiado nas D268/D269: quem passou a te
fechar com MAIS folga / mais em cima da hora de um ano para o outro. Espelha `comparePaymentLagByContact`/
`indexContactPaymentLagChanges` (D194/D195) no eixo da antecedência. Novo em `src/lib/shows.ts`:
`compareBookingLeadTimeByContact(current, previous)` + `indexContactBookingLeadTimeChanges(comparison)` + tipos
`ContactBookingLeadTimeChange`/`BookingLeadTimeByContactComparison`/`ContactBookingLeadTimeRowStatus` — casa por
`contact.id` dois `bookingLeadTimeByContact` (ano atual × anterior, mesmo escopo), devolve as variações (`changes`), os
extremos (`biggestImprovement`/`biggestWorsening`) e quem entrou/sumiu (`newContacts`/`droppedContacts`). Ao contrário do
prazo de recebimento (descer é melhora), aqui **subir** a antecedência é a melhora (mais runway) — `medianDaysDelta` positivo
= "improved", `changes` da maior piora ao topo; ancora na MEDIANA (o eixo por que a página ordena/destaca e o comparativo
agregado decide a tendência), reusando `LEAD_TIME_TREND_EPSILON`(=7). Página `/shows/antecedencia/por-contratante` ganha o
card "Quem mudou o ritmo de agenda · {ano} vs. {ano-1}" (espelho de `PaymentLagMoversCard`, marca amostra pequena <
`MIN_LEAD_TIME_SAMPLE`) + coluna "vs. {ano-1}" na tabela + nota de rodapé, tudo gated ao ano específico com ambos os
períodos medindo antecedência. Export CSV ganha a coluna opcional "vs. {ano-1} (dias)" (via `previousYear` em
`bookingLeadTimeByContactToCsv`, padrão do `paymentLagByContactToCsv`). Reusa os shows já carregados (recorte por `date`,
D108) e `pickPayerContact` — zero I/O novo, zero migração, zero dependência. **+8 testes** (4 de
`compareBookingLeadTimeByContact`, 2 de `indexContactBookingLeadTimeChanges`, 2 de CSV com/sem `previousYear`).
Build/typecheck/lint verdes; smoke → `/login` 200, página e `/export` com `?ano=2026&escopo=firm` 307→/login; `npm audit`
inalterado (10 advisories). Ver D270. Antes disso, o **recorte por ano
na antecedência por contratante** (Sessão 274, D269 — a D268 entregou a antecedência por contratante mas SEM recorte por
ano (adiado ali); a tela-mãe `/shows/antecedencia` já filtra por ano (D186). Agora a página e o export
`/shows/antecedencia/por-contratante` aplicam o MESMO recorte: filtra os shows por ano (`filterShowsByYear`, D108)
**antes** de `bookingLeadTimeByContact`, com os anos do seletor vindos de `bookingLeadTimeYears(rows, scope)` (só anos com
antecedência mensurável no escopo ativo). Reusa o `PeriodPicker` compartilhado (`params={escopo:"firm"}`) e refatora o
`ScopePicker` local para um `buildHref` que preserva ano+escopo — espelho do `buildHref` da tela-mãe; filename do CSV
ganha o sufixo do ano (`antecedencia-por-contratante-2025-firmes.csv`). Zero regra nova, zero migração, zero dependência;
testes **inalterados** (só recomposição de helpers já cobertos). Comparativo ano-a-ano por contratante segue adiado (o
"passo maior": espelhar `comparePaymentLagByContact`/`indexContactPaymentLagChanges`). Build/typecheck/lint verdes; smoke
→ `/login` 200, página e `/export` com `?ano=` 307→/login; `npm audit` inalterado (10 advisories). Ver D269. Antes disso, a
**antecedência de
agendamento por contratante** (Sessão 273, D268 — `bookingLeadTime` (D190) media a antecedência só no AGREGADO
(`/shows/antecedencia`); não dizia DE QUEM vem o lead. Dois contratantes podem ter o mesmo faturamento e hábitos opostos:
um te fecha meses antes (runway para prospectar/precificar) e outro só chama na véspera (agenda reativa). Novo helper puro
`bookingLeadTimeByContact(shows, getBooker, scope)` + tipos `BookingLeadTimeByContact`/`ContactBookingLeadTimeRow`/
`LeadTimeShowReading` em `src/lib/shows.ts`: atribui cada show ao contratante via `getBooker` (a página usa
`pickPayerContact`, o mesmo eixo dos recebíveis) e roda `bookingLeadTime` sobre a sublista de cada grupo — herda escopo,
mediana, faixas e confiabilidade sem duplicar regra; `overall` = `bookingLeadTime(shows, scope)` (o número da tela-mãe).
Ordena do MENOR lead mediano ao maior (o mais "em cima da hora" primeiro, a ponta que dói), com "Sem contratante"
(`pickPayerContact` nulo) por último; destaques `mostLeadTime`/`leastLeadTime` só entre amostra confiável
(`reliable` ≥ `MIN_LEAD_TIME_SAMPLE`) para não celebrar/acusar 1–2 shows. Nova página
`/shows/antecedencia/por-contratante` (seletor de escopo `all`/`firm` da D190, destaques + tabela + detalhe por
contratante) + export CSV (`bookingLeadTimeByContactToCsv` em `src/lib/csv.ts`) + entrada no hub (`reports.ts`) + link
"Por contratante →" na tela-mãe. Escopo por ora **sem recorte por ano nem comparativo ano-a-ano** (adiado: o próximo passo
é espelhar `comparePaymentLagByContact`/`indexContactPaymentLagChanges` no eixo da antecedência). Zero migração, zero
dependência nova. **+13 testes** (`shows.test.ts` +8: vazia; agrupamento + reuso da mediana; ordenação menor→maior lead com
`null` por último; soma de `share`; destaques só confiáveis; readings maior→menor lead ignorando retroativos; escopo
`firm`; `csv.test.ts` +5 de `bookingLeadTimeByContactToCsv`). Build OK, typecheck 0 erros, lint 0 avisos; smoke
(`next start`) → `/login` 200, `/shows/antecedencia/por-contratante` e `/export` 307→/login (auth-gated, sem 500).
`npm audit` inalterado vs. baseline (10 advisories, mesmos Next/postcss da D6). Ver D268. Antes, a **distribuição
das secas por faixa** no relatório de hiatos (Sessão 272, D267 — `showGaps` (D262) já dava a CAUDA (maiores hiatos) e o
CENTRO (mediana/média); faltava a FORMA da distribuição — dois músicos com a mesma mediana e o mesmo recorde podem ter
agendas muito diferentes (cadência regular × festa-ou-fome), e a tabela "Maiores secas" lista tudo mas não resume o padrão
num relance. Novo helper puro `gapDistribution(report)` + tipos `GapBucket`/`GapDistribution` em `src/lib/shows.ts`: reparte
os hiatos JÁ computados (`report.gaps`) em 5 faixas canônicas de duração (Até 1 semana / 1 a 2 semanas / 2 a 4 semanas /
1 a 2 meses / Mais de 2 meses), com contagem + participação por faixa e a faixa mais cheia `busiest` (desempate pela mais
curta, via `>` estrito na ordem canônica). Espelha `feeDistribution`/`bookingLeadTime` no eixo de duração (mesmo shape
label/minDays/maxDays/count/share, limites inclusivos, última sem teto). Nova seção "Distribuição das secas" em
`/shows/hiatos` (uma barra por faixa + destaque na `busiest`), exibida só com ≥ 2 hiatos (com 1 seria uma barra a 100%,
sem forma). Deriva do `ShowGapsReport` já pronto — **zero I/O extra**, zero consulta nova, zero migração, zero dependência
nova. **Sem CSV próprio** (deliberado: `showGapsToCsv`/D262 já exporta a lista de hiatos com `days`, da qual a distribuição
é derivável — igual aos readings inline `CurrentGapReading`/`RecordGapReading`, sem download). **+7 testes** (`shows.test.ts`,
`describe("gapDistribution")`: vazio zerado/`busiest` nulo; ordem canônica e faixa sem teto; repartição com soma da
participação a 1; limites inclusivos 7/8; `busiest` na faixa mais cheia; desempate pela mais curta; hiato longo na faixa
sem teto). Build OK, typecheck 0 erros, lint 0 avisos; smoke (`next start`) → `/login` 200, `/shows/hiatos` 307→/login
(auth-gated, sem 500). `npm audit` inalterado vs. baseline (10 advisories, mesmos Next/postcss da D6; nenhuma dependência
nova). Ver D267. Antes, a **limpeza
oportunista de tokens de redefinição mortos** (Sessão 271, D266 — `isResetTokenPrunable` em `src/lib/passwordReset.ts`
+ `deleteMany` escopado ao usuário em `requestPasswordResetAction`: ao pedir um novo link de "esqueci a senha", apaga os
tokens já mortos — consumidos/expirados — e antigos (fora da janela do rate-limit) da própria conta, mantendo a tabela
enxuta sem cron, sem afetar o rate-limit anti-abuso da D260 nem o token válido pendente; **+7 testes**; zero migração).
Antes disso, o **nudge de seca atual no Painel** (Sessão 270, D265 — fechado o adiamento explícito das D262/D263/D264 ("sem nudge no Painel"): `showGaps` (D262) já media a seca atual e a contextualizava pelo hábito (`currentGapVsTypical`/D263) e pelo recorde (`currentGapVsLongest`/D264), mas SÓ na página `/shows/hiatos` — o Painel não avisava, num relance, "faz tempo que você não sobe ao palco e NADA está agendado", justamente a hora de prospectar. Novo helper puro `currentDrySpellHeadline(report, unusualRatio?)` + tipo `CurrentDrySpellHeadline` + constante `DRY_SPELL_UNUSUAL_RATIO`(=2) em `src/lib/shows.ts` (espelho dos headlines irmãos `bookingLeadTimeHeadline`/`staleProposalsHeadline`): recebe um `ShowGapsReport` já computado e destila o nudge — `show` só quando a seca atual é **fora do comum** (`currentGapVsTypical >= 2×`, o mesmo limiar de APRESENTAÇÃO "fora do comum" da página; ≥2× já exige a mediana confiável da D263) **E** não há gig firme à frente (`daysUntilNext == null` — com um show já agendado a seca está por terminar e prospectar não é a ação, gate deliberado que mantém o nudge acionável e raro); `critical` (🔴 vs 🟠) quando a seca já igualou/superou o RECORDE (`currentGapVsLongest >= 1`, D264 — você nunca ficou tanto tempo sem tocar). Banner no `dashboard/page.tsx` (link `/shows/hiatos`, "Faz {N dias} que você não toca … {ratio}× o intervalo típico de {mediana} entre gigs, e nada está agendado. Boa hora para prospectar."; `formatRatio` pt-BR local, sem casa quando inteiro). Reaproveita os shows **já carregados** pelos outros nudges (só `date`+`status` bastam a `showGaps` — zero I/O extra), zero regra de negócio nova (a lógica de seca vive em `showGaps`), zero migração, zero dependência nova. **+7 testes** (`shows.test.ts`, `describe("currentDrySpellHeadline")`: sem shows → não dispara; dentro do hábito (1,5×) → não dispara; gig firme à frente suprime; fora do comum abaixo do recorde → âmbar; iguala/supera o recorde → vermelho; limiar injetado; expõe o padrão 2×). Build OK, typecheck 0 erros, lint 0 avisos; smoke → `next start` sobe, `/login` 200, `/dashboard` e `/shows/hiatos` 307 (auth-gated) + **render autenticado** (cookie de sessão forjado com o `AUTH_SECRET` de dev, 5 gigs PLAYED, último 50 dias atrás, mediana 25, recorde 90, nada à frente) confirmou o banner âmbar "🟠 Faz 50 dias que você não toca — Seca fora do comum — 2× o intervalo típico de 25 dias entre gigs, e nada está agendado. Boa hora para prospectar." com `border-amber-200` (abaixo do recorde). `npm audit` inalterado vs. baseline (10 advisories, mesmos Next/postcss da D6; nenhuma dependência nova). Ver D265. Antes, **1502 testes** verdes após a **seca atual contextualizada pelo RECORDE** no relatório de hiatos (Sessão 269, D264 — a leitura da seca atual media só o HÁBITO (mediana, `currentGapVsTypical`/D263); faltava a outra ponta — o EXTREMO. `ShowGapsReport` ganhou `currentGapVsLongest: number | null` computado em `showGaps` como `currentGapDays / longest.days` (quantas vezes o RECORDE — maior hiato já vivido — a seca atual representa), arredondado a uma casa; `null` sem seca atual ou sem hiato passado (`longest` nulo, < 2 dias-de-show). A página `/shows/hiatos` ganhou a leitura `RecordGapReading` ABAIXO do `CurrentGapReading`, só na cauda (`RECORD_GAP_NEAR` = 0,9×, limiar de APRESENTAÇÃO na UI): 🏜️ vermelho "Recorde de seca … já superou/igualou a sua maior seca" (≥1×), ⚠️ âmbar "Perto do recorde … encostando" (≥0,9×). Dimensão DISTINTA da D263 (hábito vs. extremo): a D263 descartou "vs. maior seca" como régua do "isto é anormal?" (outlier vira régua ruim), mas aqui o recorde é ALARME de recorde, e só na cauda — fora dela a leitura nem aparece, evitando a armadilha que a D263 apontou. Puro/determinístico, zero I/O extra (deriva de dois campos que `showGaps` já devolvia), zero migração, zero dependência nova. Respeita os adiamentos D262/D263 (sem nudge no Painel, sem `?ano=`, sem PROPOSED, sem CSV — escalar da seca atual). **+3 testes** (`shows.test.ts`, `describe("showGaps")`: 15/20 = 0,8×; 65/5 = 13× recorde batido; `null` sem hiato passado). Build OK, typecheck 0 erros, lint 0 avisos, smoke (`next start`) → `/login` 200 e `/shows/hiatos` 307. `npm audit` inalterado (mesmos advisories Next/postcss, D6). Ver D264. Segue a **seca atual contextualizada pelo espaçamento típico** no relatório de hiatos (Sessão 268, D263 — o relatório de hiatos (`showGaps`/D262) já mostrava a seca atual em dias e o espaçamento típico (mediana), mas não os RELACIONAVA: 25 dias sem tocar é rotina para quem faz um gig por mês e é seca fora do comum para quem toca toda semana — o número cru não distingue. `ShowGapsReport` ganhou o campo `currentGapVsTypical: number | null` computado em `showGaps` — quantas vezes a mediana a seca atual já representa (`currentGapDays / medianGapDays`, arredondado a uma casa decimal); `null` quando não há seca atual (sem gig passado) OU a mediana não é confiável (`showDays < MIN_SHOW_GAP_SAMPLE` ou mediana 0), o mesmo limiar de "amostra pequena" que a página já sinaliza — nada de dividir por uma mediana frágil de um ou dois hiatos. Puro/determinístico, zero I/O extra (deriva de dois campos que a função já devolvia), zero migração, zero dependência nova. A página `/shows/hiatos` ganhou um banner de leitura (`CurrentGapReading`) abaixo dos stats, com limiares de APRESENTAÇÃO (1,5× / 2×) que vivem na UI, não na lógica pura: 🌵 vermelho "Seca fora do comum … Boa hora para prospectar" (≥2×), ⏳ âmbar "Espera esticada" (≥1,5×), cinza "no ritmo de sempre" (≥1×) e 🎸 esmeralda "Dentro do ritmo" (<1×); múltiplo em vírgula decimal pt-BR (`formatRatio`, sem casa quando inteiro). Distinto do stat "Seca atual" (dias absolutos + próximo show) — este contextualiza a MAGNITUDE contra o hábito do próprio músico. Respeita os adiamentos da D262 (sem nudge no Painel, sem `?ano=`, sem PROPOSED). **+4 testes** (`shows.test.ts`, `describe("showGaps")`: relaciona 25 dias / mediana 10 = 2,5×; arredonda 8/3 = 2,7×; null com amostra pequena (2 dias-de-show); null sem seca atual (só gigs futuros)). Build OK (rota `/shows/hiatos` compilada); smoke → `next start` sobe, `/login` 200, `/shows/hiatos` 307 (auth-gated) + render autenticado (cookie de sessão forjado com o `AUTH_SECRET` de dev, 3 gigs PLAYED espaçados 10 dias, o último 25 dias atrás) confirmou o banner "🌵 Seca fora do comum: sua espera atual (25 dias) já é 2,5× o espaçamento típico (10 dias entre gigs). Boa hora para prospectar." `npm audit` inalterado vs. baseline (10 advisories, mesmos Next/postcss da D6; nenhuma dependência nova). Ver D263. Antes, **1495 testes** verdes após os **hiatos entre shows (secas de agenda)** (Sessão 267, D262 — nova leitura de CONTINUIDADE da agenda que faltava: a cadência (`gigCadence`) conta shows por mês e a sazonalidade diz QUAIS meses enchem, mas nada media quanto tempo, na prática, passa ENTRE um gig e o outro — nem a maior seca já vivida, nem há quanto tempo o músico não sobe ao palco. Nova função pura `showGaps(shows, opts?)` + tipos `ShowGap`/`ShowGapsReport`/`ShowGapShowLike` + `MIN_SHOW_GAP_SAMPLE`(=3) em `src/lib/shows.ts`: considera só shows FIRMES (CONFIRMED + PLAYED — os que de fato ocupam/ocuparam a agenda; propostas em aberto ainda podem cair e ficam fora, reusando o conjunto `FIRM_LEAD_STATUSES`/D190), colapsa vários gigs no mesmo dia (uma seca é sobre dias SEM nenhum gig) e mede o intervalo em dias UTC entre dias-de-show consecutivos. Devolve `gaps` (hiatos ordenados do maior ao menor, empate pelo mais recente), `longest`, `medianGapDays`/`averageGapDays` (espaçamento típico, mediana via `leadMedian`), `firstDay`/`lastDay`, `currentGapDays` (dias do último gig JÁ PASSADO até hoje = a seca atual; null sem gig passado) e `daysUntilNext` (dias até o próximo gig futuro agendado); `now` injetável. Página `/shows/hiatos` (4 stats — Seca atual 🟥 se ≥30 dias / Maior seca / Espaçamento típico / Dias de show — + aviso de amostra pequena + tabela "Maiores secas" com barra por dias + empty-state), registrada no hub (`REPORT_GROUPS`, "Agenda & pipeline", 🌵). CSV `showGapsToCsv`/`SHOW_GAPS_CSV_HEADERS` (De/Até/Dias entre shows; uma linha por hiato na ordem da tela, datas em chave ISO, sem linha Total — hiatos não somam) + rota `/shows/hiatos/export` (`hiatos-entre-shows.csv`, BOM UTF-8). Distinto de `gigCadence` (contagem mensal), `gigSeasonality` (mês do ano) e `findOpenWeekends` (fins de semana futuros vazios). Zero migração, zero dependência nova. **+12 testes** (10 shows: vazio, ignora propostos/cancelados, único gig + seca atual, mede/ordena hiatos, colapsa mesmo dia, CONFIRMED futuro vira próximo gig, só-futuros → seca nula, gig hoje zera, desempate pelo mais recente, limiar; 2 csv: só cabeçalho sem hiatos, uma linha por hiato ordenada). Build OK (rotas `/shows/hiatos` e `/shows/hiatos/export` compiladas); smoke → `next start` sobe, ambas as rotas 307→/login (auth-gated, sem 500). `npm audit` inalterado vs. baseline (10 advisories, mesmos Next/postcss da D6; nenhuma dependência nova). Ver D262. Antes, **1483 testes** verdes após a **exportação CSV do diretório de contatos** (Sessão 266, D261 — fechada a última lacuna de cobertura de export: TODAS as telas analíticas já tinham "⬇ CSV", menos a própria lista `/contatos` — a única página de navegação com busca+filtro sem download; e os CSVs de contatos existentes eram todos analíticos (rentabilidade/atividade/retenção/concentração/cancelamento), faltando o **diretório cru**. Nova função pura `contactsToCsv` + `CONTACT_DIRECTORY_CSV_HEADERS` (Nome/Tipo/E-mail/Telefone/Notas) em `src/lib/csv.ts` — uma linha por contato na ordem recebida (a página ordena por nome), campos ausentes vazios, quebras de linha das notas normalizadas para um espaço (`\s*[\r\n]+\s*` → " ") mantendo uma linha por contato, papel desconhecido → "Outro" (reusa `contactRoleLabel`), escape RFC 4180 via `escapeCsvField`. Rota `/contatos/export` espelha a query da página (`?q=` + `?papel=`, reusa `filterContacts`/`isValidContactRole` de `@/lib/contacts`), BOM UTF-8, nome `contatos-AAAA-MM-DD.csv`; botão "⬇ CSV" no cabeçalho de `/contatos`, exibido só com linhas visíveis e propagando os filtros ativos (baixa exatamente o recorte). Zero lógica de negócio nova além da serialização, zero migração, zero dependência nova. **+7 testes** (`csv.test.ts`, `describe("contactsToCsv")`: cabeçalho vazio; campos completos com papel legível; ausentes vazios; normalização de notas multi-linha; escape delimitador/aspas; papel desconhecido → "Outro"; ordem preservada). Build OK (rota `/contatos/export` compilada); smoke autenticado (`next start` + cookie de sessão forjado com o `AUTH_SECRET` de dev) → `/contatos/export` 200 com `Content-Disposition`/`text/csv`/BOM corretos e 3 contatos ordenados por nome, `?papel=VENUE` e `?q=marina` recortando certo; deslogado → 307. `npm audit` inalterado vs. baseline (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D261. Antes, **1476 testes** verdes após o **rate-limit anti-abuso dos pedidos de redefinição de senha** (Sessão 265, D260 — fechado o item (c) dos "próximos passos" da recuperação de senha (D259): o `requestPasswordResetAction` não limitava o número de pedidos de link por conta, permitindo spam de links/abuso para um e-mail cadastrado. Nova lógica pura em `src/lib/passwordReset.ts`: `resetRequestWindowStart(now)` (limite inferior do `createdAt` = `now` − `RESET_REQUEST_WINDOW_MINUTES`=60 min, espelho de `resetTokenExpiry`) + `isPasswordResetRateLimited(recentCount)` (predicado: `recentCount >= RESET_REQUEST_MAX_PER_WINDOW`=3, espelho de `isResetTokenUsable`) — `now` injetável, zero I/O. A action, ao achar a conta, conta os `PasswordResetToken` com `createdAt` dentro da janela deslizante e, se já bateu o limite, **ignora silenciosamente** o pedido (nenhum token novo) devolvendo a MESMA mensagem genérica — o que **preserva a anti-enumeração** (D259): a resposta é idêntica exista/não a conta e esteja/não barrada. Reusa a própria tabela de tokens como trilha dos pedidos (o `createdAt` já era gravado) — sem novo modelo, sem store em memória (que não sobrevive ao container efêmero nem escala horizontalmente). Limiares (3 pedidos / 60 min) são **hipóteses** a validar, sinalizados nos bloqueios. Zero migração, zero dependência nova. **+6 testes** (`passwordReset.test.ts` 4 — janela recuando o TTL, predicado abaixo/no/acima do máximo; `(auth)/actions.test.ts` 2 — barra além do limite sem gerar token novo mantendo a resposta genérica, e não conta pedidos fora da janela deslizante). Build OK; smoke → `next start` sobe, `/login` 200, `/esqueci-senha` 200, `/dashboard` 307 (auth-gated). `npm audit` inalterado vs. baseline (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D260. Antes, **1470 testes** verdes após a **recuperação de senha (fluxo deslogado "esqueci a senha" → link de redefinição → nova senha)** (Sessão 264, D259 — fechada a última lacuna de autoatendimento do login, apontada nos "próximos passos" (o eixo de export tabular seguia esgotado). Até agora quem esquecia a senha não tinha saída sem acesso a um admin; a troca de senha só existia logada (`/conta`). Novo modelo Prisma `PasswordResetToken` (userId, `tokenHash` @unique, `expiresAt`, `usedAt?`, `createdAt`) — guarda só o **hash SHA-256** do token, nunca o token cru (um vazamento do banco não expõe tokens utilizáveis); `db push` (sem migração versionada, como o resto do schema). Nova lógica pura `src/lib/passwordReset.ts`: `generateResetToken()` (CSPRNG `randomBytes(32)` → base64url), `hashResetToken(raw)` (SHA-256 hex determinístico, a chave de busca), `resetTokenExpiry(now)` (now + `RESET_TOKEN_TTL_MINUTES`=60), `isResetTokenUsable({expiresAt,usedAt}, now)` (não usado **e** não expirado, expiração estrita) — `now` injetável, zero I/O. Duas server actions em `(auth)/actions.ts`: `requestPasswordResetAction` (valida e-mail via `requestPasswordResetSchema`; **anti-enumeração** — resposta genérica idêntica exista ou não a conta; se existe, invalida tokens pendentes anteriores e cria um novo; **sem provedor de e-mail** (segredo de produção), em dev devolve o link `devResetLink` e o loga no servidor) e `resetPasswordAction` (valida token+nova senha via `resetPasswordSchema` com confirmação e mínimo de 8; busca por `tokenHash`, checa `isResetTokenUsable`, numa `$transaction` grava o novo `passwordHash` + `passwordChangedAt` (o que **também desloga sessões antigas**, D10) e marca o token como usado (uso único); erros de token deliberadamente genéricos; sucesso → `redirect("/login?redefinida=1")`). Rotas `(auth)/esqueci-senha` (form + confirmação genérica + link em dev) e `(auth)/redefinir-senha?token=` (form de nova senha; sem token → aviso); login ganhou o link "Esqueci a senha" e o banner verde de sucesso pós-redefinição. `resetDb` limpa a nova tabela. Zero dependência nova (usa `node:crypto` + o `bcryptjs`/`zod` já presentes). **+21 testes** (`passwordReset.test.ts` 11 — geração URL-safe/entropia, hash determinístico/hex/não guarda o cru, TTL, matriz de usabilidade fresh/usado/expirado/limiar; `(auth)/actions.test.ts` 10 — cria só o hash e devolve o link em dev, anti-enumeração sem token p/ e-mail desconhecido, invalida o pendente anterior, troca o hash+`passwordChangedAt`+consome o token, recusa token usado/expirado/inexistente/confirmação divergente/senha curta). Build OK (rotas `/esqueci-senha` e `/redefinir-senha` compiladas); smoke → `next start` sobe, `/login` 200 (com o link "esqueci-senha"), `/esqueci-senha` 200, `/redefinir-senha?token=x` 200. `npm audit` inalterado vs. baseline (mesmos advisories Next/postcss da D6; nenhuma dependência nova). **Bloqueio sinalizado:** produção exige um provedor de e-mail real para entregar o link (hoje só dev/log) — ver DECISIONS.md D259. Ver D259. Antes, **1449 testes** verdes após o **salto para a semana do show mais próximo na agenda semanal** (Sessão 263, D258 — a agenda semanal `/shows/semana` só navegava uma semana por vez (setas ←/→) e, desde a D255, com o mini-calendário lateral; faltava o atalho direto "leva-me ao próximo/anterior compromisso", pulando de uma vez as semanas vazias. Nova função pura `findAdjacentShowDate(showDates, weekReference, direction)` em `src/lib/calendar.ts`: dada uma lista de datas e a semana em foco, devolve a data do show cuja SEMANA é estritamente anterior (`"prev"`, a MAIOR de semanas passadas) ou posterior (`"next"`, a MENOR de semanas futuras); determinística, sem efeitos, ordem indiferente, reusa `startOfWeek`. A página faz duas consultas enxutas e indexadas em paralelo — `findFirst` do vizinho imediato `date < start` (desc) e `date >= endExclusive` (asc), só `date` — alimentando a função pura, e renderiza numa faixa fina sob o cabeçalho os atalhos "← Show anterior (DD/MM)" / "(DD/MM) Próximo show →" para `?semana=YYYY-MM-DD` da semana vizinha, cada um só quando há vizinho (a faixa some sem nenhum). Zero regra de domínio nova, zero migração, zero dependência nova. **+5 testes** (`calendar.test.ts`, `describe("findAdjacentShowDate")`: lista vazia → null; só-própria-semana não conta; `next`/`prev` casando a semana certa; ordem indiferente). Smoke → `/login` 200, `/shows/semana?semana=2026-07-08` 307 (auth-gated) + render autenticado (cookie forjado com o `AUTH_SECRET` de dev) confirmou "← Show anterior (28/06)" e "(28/07) Próximo show →" com os hrefs corretos. `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D258. Antes, **1444 testes** verdes após a **busca do hub de relatórios deep-linkável via `?q=`** (Sessão 262, D257 — o hub `/relatorios` já filtrava os 49 relatórios ao vivo por texto (`filterReports`), mas a consulta vivia só como estado de cliente efêmero: recarregar, compartilhar o link ou voltar/avançar perdia o filtro. Agora a busca é **deep-linkável** via `?q=`: novo helper puro `normalizeReportQuery(raw: string | string[] | undefined)` em `src/lib/reports.ts` coage o search param do Next (string, array repetido ou ausente) numa consulta de uma linha (primeira ocorrência, colapsa espaços/quebras, apara; ausência/só-espaços → `""`); `page.tsx` lê `searchParams.q`, normaliza e passa como `initialQuery` ao `ReportsBrowser`; o componente inicia o estado com esse valor e num `useEffect` espelha a consulta de volta em `?q=` via `window.history.replaceState` (sem empilhar histórico por tecla, sem recarregar — o hub é estático, nada no servidor depende de `q`), removendo o parâmetro quando vazio; botão "Limpar" ao lado do contador. Zero mudança em `filterReports` (a saída de `normalizeReportQuery` alimenta o mesmo casamento já testado), zero dependência nova. **+5 testes** (`reports.test.ts`, `describe("normalizeReportQuery")`: string aparada; colapso de espaços/quebras; ausência/só-espaços → vazio; primeira ocorrência de array incl. `[]`; saída alimenta `filterReports` sem interpretação extra). Smoke → `/login` 200, `/relatorios?q=cache` 307 (auth-gated, a rota com `?q=` compila e serve); `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D257. Antes, **1439 testes** verdes após a **exportação CSV do comparativo ano a ano da conversão real de propostas** (Sessão 261, D256 — o card `ConversionComparisonCard` "Conversão real {ano} vs. {ano-1}" de `/shows/funil/conversao` (D244, com a linha da vazão da coorte `winRateDelta` da D253) já mostrava o comparativo agregado na tela, mas — diferente do eixo por contratante, cujo CSV ganhou a coluna "vs. {ano-1}" na D250 — o comparativo AGREGADO não tinha download (o CSV `proposalConversionToCsv`/D243 exporta só a coorte de UM ano, não a comparação). Fechada a lacuna espelhando a D223 (que criou uma rota `/comparativo/export` dedicada para o card de comparação da sazonalidade): novo serializador puro `proposalConversionComparisonToCsv` + `PROPOSAL_CONVERSION_COMPARISON_CSV_HEADERS` em `src/lib/csv.ts` — como o comparativo aqui é um punhado de métricas escalares (não uma tabela de 12 meses), a planilha é orientada a MÉTRICA no molde de `monthlyReportToCsv`: colunas `Métrica`/`Ano anterior`/`Ano corrente`/`Variação` e uma linha por indicador (Taxa de conversão real % / Vazão da coorte % / Propostas realizadas / decididas / na coorte), fechando numa linha "Tendência" com o veredito pt-BR do card (Convertendo mais/menos/Estável) na coluna de variação; taxas via `csvShare` (em branco quando indefinidas, o "—" da UI), variação das taxas em p.p. assinados (`csvSignedPoints`), contagens cruas com variação assinada (`csvSignedCount`). Rota `/shows/funil/conversao/comparativo/export` com o MESMO gate do card (ano específico via `?ano=` + ambas as coortes com propostas decididas; senão 404), recortando a coorte de cada ano do mesmo acervo já carregado (zero I/O extra, eixo = data da proposta), nome `conversao-comparativo-{ano}-vs-{ano-1}.csv` com BOM UTF-8; link "⬇ CSV" no cabeçalho do próprio card. Reusa `compareProposalOutcomes` (D244), zero lógica de negócio nova, zero migração, zero dependência nova. **+4 testes** (`csv.test.ts`, `describe("proposalConversionComparisonToCsv")`: linha por métrica + Tendência "Convertendo mais"; queda "Convertendo menos"; taxa indefinida em algum ano → célula/variação em branco e "Estável"; delimitador alternativo). Smoke → `/login` 200, app sobe; build registra a rota `/shows/funil/conversao/comparativo/export`; `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D256. Antes, **1435 testes** verdes após o **mini-calendário de salto rápido na agenda semanal** (Sessão 260, D255 — a agenda semanal `/shows/semana` só tinha as setas ←/→ de uma semana por vez e o atalho "Esta semana", sem um mapa para pular semanas/meses distantes. Novo helper puro `buildMiniMonth(year, month, opts?)` + tipo `MiniCalendarCell` em `src/lib/calendar.ts`: monta a grade compacta de um mês (semanas × 7 dias, com bordas dos meses vizinhos como `buildMonthGrid`) devolvendo só **flags de estado** por dia — `inMonth`, `isToday`, `inSelectedWeek` (todos os dias domingo→sábado da semana em foco, via `weekRange`) e `hasShows` (a partir de um `Set` de chaves "YYYY-MM-DD" com show) — sem carregar os itens (a agenda já lista os shows da semana; aqui basta a bolinha). Novo componente de servidor `src/components/MiniCalendar.tsx` (só monta links, lógica na função pura): grade clicável onde cada dia leva a agenda à sua semana (`/shows/semana?semana=YYYY-MM-DD`), as setas ◀/▶ trocam o mês do widget SEM mudar a semana em foco (`?cal=YYYY-MM`, preservando `?semana`), realçando a semana atual (fundo `bg-brand-50/60`), o dia de hoje (anel `ring-brand-400`, `aria-current="date"`) e pintando `bg-brand-500` nos dias com show. `/shows/semana` ganhou o widget num `<aside>` (topo no mobile via `order-first`, coluna lateral em telas largas via `grid lg:grid-cols-[1fr_15rem]`), com uma segunda consulta enxuta (só `date`, na grade do mini-mês) para as bolinhas — separada da consulta da semana. Zero regra de negócio nova, zero migração, zero dependência nova; a visão mensal `/shows/calendario` não recebe o widget (já mostra o mês inteiro). **+5 testes** (`calendar.test.ts`, `describe("buildMiniMonth")`: grade inteira com bordas; marca só hoje; realça a semana selecionada 14..20; pinta só os dias do `Set`; sem opções nada é selecionado/tem show). Smoke → `/login` 200, `/shows/semana` 307 (auth-gated) e render autenticado (cookie de sessão forjado com o `AUTH_SECRET` de dev) confirmou o widget: título "Julho de 2026", nav Jun/Ago, links por dia, realce da semana e bolinha no dia com show. `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D255. Antes, **1430 testes** verdes após a **variação da vazão da coorte (`winRateDelta`) também no comparativo da conversão POR contratante** (Sessão 259, D254 — a D253 levou a `winRateDelta` (variação da vazão da coorte = `winRate` atual − anterior, denominador = coorte TODA incluindo as em aberto) ao comparativo GERAL da conversão (`compareProposalOutcomes`, `/shows/funil/conversao`), mas adiou o mesmo eixo no comparativo POR contratante (`compareContactProposalOutcomes`/D247, card de movers em `/shows/funil/conversao/contratantes`) por receio de ruído per-relação. Agora `ContactProposalConversionChange<C>` ganhou o campo `winRateDelta: number | null` (irmão do `conversionRateDelta`, computado em `compareContactProposalOutcomes` a partir do `winRate` que a `ProposalConversion` por-contratante já expõe — zero consulta nova, lógica pura) e cada `MoverBlock` do card ("Convertendo mais/menos") ganhou uma linha secundária cinza "Vazão da coorte: {±N p.p.} — {antes} → {agora} das propostas viraram palco (inclui as em aberto)" só quando `winRateDelta != null`. Exibido APENAS nos dois movers (maior melhora/piora da taxa), NÃO como veredito, NÃO por linha na tabela, NÃO no CSV — restringir aos dois extremos neutraliza o motivo do adiamento (espalhar a vazão por-relação por TODA a tabela seria ruidoso) e fecha a assimetria tela-geral↔tela-por-contratante. O veredito/cor do mover segue ancorado só na `conversionRate`. **+1 teste** (`shows.test.ts`, `describe("compareContactProposalOutcomes")`: divergência por contratante — conversão sobe +0,5/"improved" enquanto a vazão fica parada em 0 porque sobrou proposta em aberto) + asserções de `winRateDelta` acrescidas ao teste de melhora/piora simétrica. Smoke → `/login` 200, `/` 200; `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D254. Antes, **1429 testes** verdes após o **nudge no Painel de conversão caindo com um contratante específico** (Sessão 258, D252 — o item adiado na D247(alt. e)/D248(alt. b): o Painel já alertava a queda da conversão real da carteira INTEIRA (`proposalConversionHeadline`/D245) e a página `/shows/funil/conversao/contratantes` já trazia o comparativo por contratante (`compareContactProposalOutcomes`/D248), mas faltava o eco por-contratante no Painel — QUAL contratante específico passou a fechar uma fração materialmente menor das propostas. Novo helper puro `contactConversionDropHeadline(comparison, minDecided?, dropPoints?, criticalPoints?)` + tipo `ContactConversionDropHeadline<C>` em `src/lib/shows.ts` (irmão por-contratante de `proposalConversionHeadline`): recebe um `ContactProposalConversionComparison` já computado e varre os `changes` (já ordenados da maior piora à maior melhora), elegendo o contratante de MAIOR queda com amostra confiável (≥ `minDecided` decididas em CADA coorte) e queda ≥ `dropPoints`; `critical` na queda ≥ `criticalPoints`; `others` conta os demais contratantes que também passariam no gate. Reusa as constantes de gate do nudge geral (`CONVERSION_DROP_MIN_DECIDED`=4/`CONVERSION_DROP_POINTS`=0.10/`CONVERSION_DROP_CRITICAL_POINTS`=0.25, nenhum número mágico novo) e a mesma disciplina "só a ponta de piora vira alerta". Banner 📉/🔴 "Conversão caindo com {contratante}" em `dashboard/page.tsx` (link `/shows/funil/conversao/contratantes?ano={ano}`, "N de M", "P p.p. abaixo", "+K contratantes esfriaram"), computando as coortes deste ano × anterior a partir de um segundo pivô show×contato que carrega os `statusEvents` **já presentes** na consulta do Painel (desde D245), **zero I/O extra**. **CEDE A VEZ ao nudge geral (D245):** quando a carteira inteira já caiu, o Painel conta a história maior e este nudge nem é computado — evita banner duplo de conversão (mesma disciplina do vale × pico de sazonalidade/D135); brilha quando a carteira empata mas uma relação específica azedou (o caso que o agregado esconde). Limiares são **hipóteses** herdadas da D245 (sinalizados nos bloqueios). **+6 testes** (`shows.test.ts`, `describe("contactConversionDropHeadline")`). Smoke → `/login` 200, `/dashboard` 307 (auth-gated); `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D252. Antes, **1423 testes** verdes após o **comparativo ano a ano da conversão de propostas ganhar a variação da vazão da coorte (`winRateDelta`)** (Sessão 258, D253 — a página `/shows/funil/conversao` mostra dois números-chave no topo: a **taxa de conversão real** (`conversionRate` = realizadas ÷ decididas, resistente a propostas em andamento) e a **vazão da coorte** (`winRate` = realizadas ÷ coorte inteira, "Já viraram palco", inclui as em aberto no denominador), mas o card ano a ano `ConversionComparisonCard` (`compareProposalOutcomes`/D244) comparava **só** a `conversionRate`. As duas podem se mover em sentidos OPOSTOS — a taxa das decididas sobe enquanto a vazão cai porque muita proposta ficou parada em aberto — deixando o músico ver a melhora da conversão sem enxergar que o throughput proposta→palco piorou. `ProposalConversionComparison` ganhou o campo `winRateDelta: number | null` (`current.winRate − previous.winRate`, ou `null` quando alguma coorte está vazia) computado em `compareProposalOutcomes`, irmão do `conversionRateDelta`; o card ganhou uma linha secundária "Vazão da coorte: {±N p.p.} — {antes} → {agora}…" só quando `winRateDelta != null`. O **veredito** (`trend`/cor) segue ancorado só na `conversionRate` (leitura principal, resistente); a vazão é informativa. Puro/determinístico, zero I/O extra (reusa os dois `proposalOutcomes` já computados na página), zero migração, zero dependência nova — enriquece uma leitura existente e cobre um caso de leitura enganosa real. **+2 testes** (`shows.test.ts`, `describe("compareProposalOutcomes")`: divergência vazão↓×conversão↑ com veredito "improved"; `winRateDelta` null com coorte vazia) + asserções acrescidas aos testes existentes. Smoke → `/login` 200, `/shows/funil/conversao` 307 (auth-gated); `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D253. Antes, **1421 testes** verdes após a **busca da lista de shows passar a casar também as anotações (`notes`)** (Sessão 257, D251 — o campo de busca livre (`q`) de `/shows` (`filterShows`) casava título + local + cidade, mas ignorava o campo `notes` do show, onde o músico anota lembretes, nomes de contato/evento e detalhes operacionais ("levar cabo reserva", "aniversário da Cláudia"). `ShowLike` ganhou `notes?: string | null` e o `haystack` de `filterShows` passou a incluir `normalizeText(s.notes)` — mesma normalização sem acento/caixa dos demais campos; substring em AND com status/data preservado. Zero regra de negócio nova, zero migração, zero I/O extra (a página e o `/shows/export` já carregavam `notes`); o export CSV herda o mesmo recorte automaticamente. Placeholder atualizado para "Título, local, cidade ou anotações". **+1 teste** (`shows.test.ts`, `filterShows` "busca também nas anotações do show"). Smoke → `/login` 200, `/shows` 307 (auth-gated); `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D251. Antes, **1420 testes** verdes após a **coluna "vs. {ano-1}" no CSV da conversão por contratante** (`proposalConversionByContactToCsv` ganhou `previous?`/`previousYear?` + rota `/shows/funil/conversao/contratantes/export`) (Sessão 256, D250 — a tendência ano a ano por-linha, que a D249 levou à **tabela** de `/shows/funil/conversao/contratantes` (`indexContactProposalConversionChanges` + célula `ConversionRowDelta`), agora também sai no **CSV** do mesmo relatório, fechando a assimetria tela↔planilha — espelho byte a byte da D242 (`pipelineByContactToCsv`) no eixo da coorte. `proposalConversionByContactToCsv` ganhou dois parâmetros opcionais `previous?`/`previousYear?`: quando ambos vêm, a planilha ganha a última coluna `vs. {previousYear} (p.p.)` — `"novo"` para quem só teve coorte de proposta neste ano, os pontos assinados (`csvSignedPoints`) da variação da taxa de conversão real para os comparáveis, e em branco quando `conversionRateDelta == null` (taxa indefinida em algum dos anos → sem base, o "—" da célula `ConversionRowDelta`) e na linha Total. Reaproveita `indexContactProposalConversionChanges(compareContactProposalOutcomes(...))` (D248/D249) — zero lógica pura nova. Sem `previous`/`previousYear`, a saída é byte a byte idêntica à histórica (8 colunas), preservando chamadores/testes. A rota computa a conversão do ano anterior espelhando a página (só com `?ano=` específico + ambas as coortes não-vazias; ano anterior do MESMO acervo já carregado, recorte pela data da proposta, **zero I/O extra**). **+3 testes** (`csv.test.ts`, `describe("proposalConversionByContactToCsv")`). Smoke → `/login` 200, `/shows/funil/conversao/contratantes` e `/shows/funil/conversao/contratantes/export` (+ `?ano=2026`) 307 (auth-gated); `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D250. Antes, **1417 testes** verdes após a **coluna "vs. {ano-1}" por linha na tabela de conversão por contratante** (`indexContactProposalConversionChanges` + célula `ConversionRowDelta` em `/shows/funil/conversao/contratantes`) (Sessão 255, D249 — o "próximo possível (a)" da D248: o card de movers da conversão por contratante (`compareContactProposalOutcomes`/D248) mostrava a tendência ano a ano só nos dois extremos; agora cada linha da tabela traz, ao lado do contratante, quanto sua taxa de conversão real mudou frente ao ano anterior. Novo helper puro `indexContactProposalConversionChanges(comparison)` + tipo `ContactProposalConversionRowStatus<C>` em `src/lib/shows.ts` — espelho de `indexContactPipelineChanges`/D238 no eixo da coorte: recebe a `ContactProposalConversionComparison` já computada pela página (zero I/O, zero recomputação) e devolve um lookup por `contact.id` em O(1) → "changed" (variação da taxa + `trend`), "new" (só coorte no atual) ou "none". A tabela ganha, só quando há comparativo (um ano específico + ambas as coortes não-vazias com ao menos um comparável), a coluna "vs. {ano-1}" com a célula `ConversionRowDelta`: verde = fechou uma fração maior, vermelho = fechou menos, cinza no limiar, "novo" para quem só teve proposta na coorte deste ano, "—" para não-comparável ou taxa indefinida em algum ano. Reusa `pctDelta`/`previousYear` já na página; herda a semântica da D248 (subir a taxa = melhora, `CONVERSION_TREND_EPSILON`=0.05), sem número mágico novo; sem comparativo a tabela segue idêntica (6 colunas). **+3 testes** (`shows.test.ts`, `describe("indexContactProposalConversionChanges")`). Smoke → `/login` 200, `/shows/funil/conversao/contratantes` (+ `?ano=2026`) 307 (auth-gated); `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D249. Antes, **1414 testes** verdes após o **comparativo ano a ano da conversão real por contratante** (`compareContactProposalOutcomes` + card em `/shows/funil/conversao/contratantes`) (Sessão 254, D248 — fecha o candidato natural apontado na D247 (alt. (d)): a conversão real por contratante (`proposalOutcomesByContact`/D247) é o retrato de UM recorte ("de quais contratantes minhas propostas de {ano} viraram show?"); faltava a TENDÊNCIA — "para quem passei a fechar mais/menos de um ano para o outro?". Novo helper puro `compareContactProposalOutcomes(current, previous)` + tipos `ContactProposalConversionChange`/`ContactProposalConversionComparison` em `src/lib/shows.ts`, espelho byte a byte de `compareContactPipelines` (D236) no eixo da conversão: casa os contratantes de dois `proposalOutcomesByContact` por `contact.id`, para cada um com coorte não-vazia nos DOIS períodos devolve `conversionRateDelta` (atual − anterior em pontos; `null` se algum lado não tem proposta decidida) + `wonCountDelta`/`decidedCountDelta` + veredito `trend` (improved/worsened/stable) contra o mesmo `CONVERSION_TREND_EPSILON` (=0.05) importado de `finance.ts` (nenhum número mágico novo, subir a taxa = melhora); os que só têm coorte num período viram `newContacts`/`droppedContacts`; ordena da maior piora à maior melhora e elege `biggestImprovement`/`biggestWorsening`. Card `ConversionMoversCard` "Para quem passei a fechar mais/menos · {ano} vs. {ano-1}" (blocos "Convertendo mais" 🟢 / "Convertendo menos" 🔴 + rodapé de entradas/saídas da mesa) na página, exibido só com um ano específico e ambas as coortes não-vazias com ao menos um comparável; a coorte do ano anterior sai dos MESMOS `items` já carregados (`proposalOutcomesByContact(items, {year: ano-1})`, recorte em memória pela data da proposta), **zero I/O extra**. Sem CSV nesta fatia (destila dois movers, como o card da D236; a tabela-mãe já tem export/D247). **+5 testes** (`shows.test.ts`, `describe("compareContactProposalOutcomes")`). Smoke → `/login` 200, `/shows/funil/conversao/contratantes` (+ `?ano=2026`) 307 (auth-gated); `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D248. Antes, **1409 testes** verdes após a **conversão real de propostas por contratante** (`proposalOutcomesByContact` + `/shows/funil/conversao/contratantes`) (Sessão 253, D247 — a conversão real por coorte (`proposalOutcomes`/D243) media a coorte INTEIRA ("das propostas de {ano}, quantas viraram palco?"); agora a mesma leitura é quebrada POR contratante — "para quais deles minhas propostas de fato fecham?", o eixo de decisão de com quem insistir. Novo helper puro `proposalOutcomesByContact(items, opts?)` + tipos `ContactProposalConversionItem`/`ContactProposalConversionRow`/`ContactProposalConversion` em `src/lib/shows.ts`: para cada contato monta a coorte das suas propostas via `proposalOutcomes` (reusa a MESMA classificação ganho/perdido/aberto e o desfecho PLAYED>CANCELLED da D243, zero regra duplicada) e destila a taxa de conversão; só viram linha os contatos com coorte não-vazia no recorte; o agregado `overall` soma por RELAÇÃO (um show partilhado conta para cada contato, como `pipelineByContact`/D184). Ordena por taxa de conversão desc, com nº de decididas desempatando (uma amostra fina 1/1 não pula na frente de uma conversão robusta 3/3), depois ganhas/coorte desc, nome pt-BR, id; taxa indefinida (só em aberto) ao fim. `opts.year` recorta a coorte pela data da PROPOSTA (repassado a `proposalOutcomes`, eixo distinto do funil), com `PeriodPicker`/`?ano=` alimentado por `proposalOutcomeYears`. Página `/shows/funil/conversao/contratantes` (3 stats da carteira + tabela contratante/conversão/realizadas/perdidas/em aberto/coorte + empty-state), cross-link "👥 Por contratante" na conversão geral e entrada no hub (`REPORT_GROUPS`, "Agenda & pipeline", 👥). CSV `proposalConversionByContactToCsv`/`PROPOSAL_CONVERSION_BY_CONTACT_CSV_HEADERS` (Contratante/Papel/Conversão(%)/Propostas/Realizadas/Perdidas/Em aberto/Decididas; uma linha por contratante + Total da carteira) + rota `/shows/funil/conversao/contratantes/export?ano=` (`conversao-por-contratante-{ano|todas}.csv`, BOM UTF-8). **I/O:** a página/rota carregam cada contato + os `statusEvents` dos seus shows numa única consulta (mesma seleção enxuta da conversão geral, só que via a relação contato→show). Sem lógica de negócio nova (reusa `proposalOutcomes`), zero migração, zero dependência nova. **+8 testes** (5 shows + 3 csv). Smoke → `/login` 200, `/shows/funil/conversao/contratantes` (+ `?ano=2026`) e o export (+ `?ano=2026`) 307 (auth-gated); `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D247. Antes, **1401 testes** verdes após a **janela de dormência configurável (`?dias=`) nas telas de reengajamento** (Sessão 252, D246 — fecha o "próximo possível" da D232: o limiar de "esfriou" (`staleDays`) das telas "Praças para revisitar" (`findCitiesToReengage`/D229) e "Casas para revisitar" (`findVenuesToReengage`/D231) era fixo em 90 dias, uma hipótese sinalizada; o núcleo puro **já aceitava** `opts.staleDays`, só faltava expor. Novo helper puro `parseReengageWindow(raw, fallback?)` + presets `REENGAGE_WINDOW_PRESETS`(=[60, 90, 180, 365]) + `REENGAGE_WINDOW_DEFAULT`(=90) + limites `REENGAGE_WINDOW_MIN`(=1)/`REENGAGE_WINDOW_MAX`(=730) em `src/lib/finance.ts` — espelho byte a byte de `parseWeekendWindow`/`?semanas=`, no eixo de dias. Novo componente compartilhado `ReengageWindowPicker` (pílulas por preset) usado pelas DUAS telas (`/shows/cidades/revisitar` e `/shows/locais/revisitar`, diferem só no `basePath`); as páginas leem `?dias=` e passam `{ staleDays }` ao helper (regra pura intacta); os exports herdam `?dias=` e ancoram o nome do arquivo na janela (`pracas-para-revisitar-{n}dias.csv` / `casas-para-revisitar-{n}dias.csv`). O nudge do Painel (`citiesToReengageHeadline`/D232) segue com a janela padrão de 90 (leitura de "agora", sem seletor — mesma disciplina do nudge de fins de semana). Zero lógica de negócio nova, zero migração, zero dependência nova. **+9 testes** (`finance.test.ts`, `describe("parseReengageWindow")`). Smoke → `/login` 200, `/shows/cidades/revisitar` (+ `?dias=180`), `/shows/locais/revisitar` (+ `?dias=60`) e ambos os exports 307 (auth-gated); `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D246. Antes, **1392 testes** verdes após o **nudge do Painel para a queda ano a ano da conversão real de propostas** (Sessão 251, D245 — o "próximo possível (b)" da D244: o comparativo ano a ano da conversão real (`compareProposalOutcomes`/D244), que vivia só na página `/shows/funil/conversao`, agora puxa um alarme para o Painel quando a taxa CAIU. Novo helper puro `proposalConversionHeadline(comparison, minDecided?, dropPoints?, criticalPoints?)` + tipo `ProposalConversionHeadline` + constantes `CONVERSION_DROP_MIN_DECIDED`(=4)/`CONVERSION_DROP_POINTS`(=0.1)/`CONVERSION_DROP_CRITICAL_POINTS`(=0.25) em `src/lib/shows.ts` (espelho do gate dos nudges irmãos `staleProposalsHeadline`/`cancellationHeadline`/`bookingLeadTimeHeadline`): recebe o `ProposalConversionComparison` já computado e destila só a ponta de PIORA — `show` quando ambas as coortes têm taxa definida (≥ `minDecided` decididas cada) **e** a taxa caiu ≥ `dropPoints`; `critical` na queda ≥ `criticalPoints`. Só a queda vira nudge (subir a conversão é boa notícia, não pede ação); o piso de 10 p.p. é deliberadamente maior que o `CONVERSION_TREND_EPSILON` (=0.05) do card, para o Painel só alertar com queda material. Banner 📉/🔴 "Conversão de propostas caindo" em `dashboard/page.tsx` (link `/shows/funil/conversao?ano={anoAtual}`), computando a coorte deste ano × a do ano anterior via `proposalOutcomes(shows, {year})`. **I/O:** o Painel passou a incluir `statusEvents` (fromStatus/toStatus/createdAt) na consulta de shows que **já era feita** — uma coluna a mais na mesma consulta, não uma consulta nova; era o único insumo que faltava (a coorte da conversão real se monta pela linha do tempo de status/D234). Limiares são **hipóteses** a validar (sinalizados nos bloqueios). **+7 testes** (`shows.test.ts`, `describe("proposalConversionHeadline")`). Smoke → `/login` 200, `/dashboard` e `/shows/funil/conversao` (+ `?ano=2026`) 307 (auth-gated); `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D245. Antes, **1385 testes** verdes após o **comparativo ano a ano da conversão real de propostas** em `/shows/funil/conversao` (Sessão 250, D244 — o "próximo possível (a)" da D243: a conversão real por coorte (`proposalOutcomes`/D243) ganhou o card "vs. {ano-1}" que o funil geral (`compareShowPipelines`/D209) e o funil por contratante (`compareContactPipelines`/D236) já tinham, mas faltava no eixo da COORTE (data da proposta). Novo helper puro `compareProposalOutcomes(current, previous)` + tipo `ProposalConversionComparison` em `src/lib/shows.ts`, espelho byte a byte de `compareShowPipelines`: recebe dois `ProposalConversion` já computados e devolve `conversionRateDelta` (atual − anterior em pontos 0..1; `null` se algum período não tem proposta decidida) + `wonCountDelta`/`decidedCountDelta` + veredito `trend` (improved/worsened/stable), reusando o mesmo `CONVERSION_TREND_EPSILON` (=0.05) importado de `finance.ts` (nenhum número mágico novo) e a mesma direção (subir a taxa = melhora). Card `ConversionComparisonCard` "Conversão real {ano} vs. {ano-1}" (🟢/🔴/⚪, variação em p.p. + as duas taxas com won/decididas) na página, exibido só com um ano específico e ambas as coortes tendo propostas decididas; a coorte do ano anterior sai do MESMO acervo já carregado (`proposalOutcomes(shows, {year: ano-1})`, recorte em memória pela data da proposta), **zero I/O extra**. Sem CSV nesta fatia (destila um único veredito ano-a-ano, como o card de movers da D236). **+4 testes** (`shows.test.ts`, `describe("compareProposalOutcomes")`). Smoke → `/login` 200, `/shows/funil/conversao` (+ `?ano=2026`) e `/shows/funil/conversao/export?ano=2026` 307 (auth-gated); `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D244. Antes, **1381 testes** verdes após a **conversão real proposta → realizado (coorte pela data da proposta)** em `/shows/funil/conversao` (Sessão 249, D243 — a "outra métrica que os eventos destravam" apontada como próximo passo na D241. Enquanto a taxa de concretização do funil (`showPipeline`) é um retrato do estado ATUAL recortado pela data do SHOW, esta leitura monta a COORTE das propostas pela data em que entraram no funil (o primeiro evento `toStatus === PROPOSED`, da D234) e acompanha o desfecho de cada uma — virou palco (chegou a PLAYED, ganha), foi perdida (chegou a CANCELLED sem tocar) ou ainda em andamento (aberta) — respondendo "das propostas que fiz em {ano}, quantas viraram show?", que o retrato de estado não alcança. Novo helper puro `proposalOutcomes(shows, opts?)` + tipos `ProposalConversion`/`ProposalOutcome`/`ProposalOutcomeShowLike`/`ProposalOutcomesOptions` em `src/lib/shows.ts`: expõe `total`/`wonCount`/`lostCount`/`openCount`/`decidedCount` + `conversionRate` (`wonCount/decidedCount`, a leitura principal — das decididas, a fração ganha; `null` sem decididas) e `winRate` (`wonCount/total`, informativa, penaliza as em aberto). PLAYED vence CANCELLED no desempate do desfecho; shows sem evento PROPOSED (sem backfill dos antigos, como o tempo-em-etapa/D235) ficam fora da coorte. `opts.year` (ano UTC da PRIMEIRA entrada em PROPOSED) recorta a coorte — eixo distinto do funil (data da proposta, não do show); novo `proposalOutcomeYears(shows)` alimenta o `PeriodPicker` só com anos de coorte não-vazia (espelho de `showProfitYears` no eixo da proposta). Página com 3 stats (Taxa de conversão / Propostas na coorte / Já viraram palco) + barras por desfecho (realizadas/perdidas/em aberto) + empty-state; cross-link "🎯 Conversão" no funil + entrada no hub (`REPORT_GROUPS`). CSV `proposalConversionToCsv`/`PROPOSAL_CONVERSION_CSV_HEADERS` (Desfecho/Propostas/% da coorte, uma linha por desfecho + Total; exporta contagens+participação, não a taxa derivada, como `pipelineToCsv`) + rota `/shows/funil/conversao/export?ano=` (nome `conversao-propostas-{ano|todas}.csv`). **+12 testes** (9 shows + 3 csv). Smoke → `/login` 200, `/shows/funil/conversao` (+ `?ano=2026`) e `/shows/funil/conversao/export` (+ `?ano=2026`) 307 (auth-gated); `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D243. Antes, **1369 testes** verdes após a **coluna "vs. {ano-1}" no CSV do funil por contratante** (Sessão 248, D242 — a tendência ano a ano por-linha, que a D238 levou à **tabela** de `/contatos/funil` (`indexContactPipelineChanges` + célula `PipelineRowDelta`), agora também sai no **CSV** (`/contatos/funil/export`), fechando a assimetria tela↔planilha apontada como próximo passo na própria D238. `pipelineByContactToCsv` ganhou dois parâmetros opcionais `previous?`/`previousYear?` no molde byte a byte de `clientConcentrationToCsv`/`withTrend` (D201): quando ambos vêm, a planilha ganha a última coluna `vs. {previousYear} (p.p.)` — `"novo"` para quem só teve pipeline neste ano, os pontos assinados (`csvSignedPoints`) da variação da taxa de concretização para os comparáveis, e em branco quando `conversionRateDelta == null` (taxa indefinida em algum dos anos → sem base, o "—" da tela) e na linha Total. Reaproveita `indexContactPipelineChanges(compareContactPipelines(...))` — zero lógica pura nova. Sem `previous`/`previousYear`, a saída é byte a byte idêntica à histórica (11 colunas). A rota computa o funil do ano anterior espelhando a página (só com `?ano=` específico + ambos os períodos com pipeline; ano anterior do MESMO acervo já carregado via `filterShowsByYear`, **zero I/O extra**). **+2 testes** (`csv.test.ts`). Smoke → `/login` 200, `/contatos/funil` e `/contatos/funil/export?ano=2026` 307 (auth-gated); `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D242. Antes, **1367 testes** verdes após o **nudge do Painel para propostas paradas** (Sessão 247, D241 — o relatório de propostas paradas (D240) ganhou manchete no Painel: novo helper puro `staleProposalsHeadline(report)` + tipo `StaleProposalsHeadline` em `src/lib/shows.ts` (espelho de `pipelineByContactHeadline`/`cancellationHeadline`) recebe a `StaleProposalsReport` **já computada** (zero recomputação) e destila só o subconjunto acionável — dispara (`show`) quando há proposta **vencida** ou **iminente** (`overdueCount+imminentCount>0`), `critical` (🔴 vs 🟠) com ao menos uma vencida; expõe `top` (a mais urgente), `actionableCount`/`actionableFee` (cachê só das acionáveis) e `totalStale` (para o "+N sem resposta"). As "cold" (paradas mas com data distante) ficam de fora do nudge — são follow-up, não urgência; vivem só na página. Banner em `dashboard/page.tsx` (link `/shows/funil/paradas`) reaproveita a MESMA consulta `shows` já carregada pelos outros nudges (zero I/O extra); sem `statusEvents` na consulta do Painel, o "tempo parado" cai para `createdAt` (um show nasce PROPOSED → bom proxy; `overdue` é exato sem eventos), enquanto a página carrega o histórico completo. **+5 testes** (`shows.test.ts`). Smoke → `/login` 200, `/dashboard` e `/shows/funil/paradas` 307 (auth-gated); `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D241. Antes, **1362 testes** após **propostas paradas (follow-up de deals esquecidos)** em `/shows/funil/paradas` (Sessão 246, D240 — primeiro relatório operacional do funil: aponta QUAIS propostas específicas pedem decisão agora, complementando os agregados de conversão. Novo helper puro `findStaleProposals(shows, opts?)` + tipos `StaleProposal`/`StaleProposalsReport`/`StaleProposalUrgency` + constantes `STALE_PROPOSAL_DAYS`(=21)/`STALE_PROPOSAL_IMMINENT_DAYS`(=14) em `src/lib/shows.ts`: considera só shows em PROPOSED (etapa aberta) e marca "parada" a que está há ≥21 dias sem movimento OU com a data já vencida; classifica urgência overdue/imminent/cold e ordena a fila; tempo no status via último evento de status (D234), caindo para `createdAt` sem histórico; dias UTC inteiros; `now`/limiares injetáveis. Página com 4 stats + tabela com selo de urgência + link ao show + cross-link "⏳ Propostas paradas" no funil + entrada no hub; CSV `staleProposalsToCsv`/`STALE_PROPOSALS_CSV_HEADERS` + rota `/shows/funil/paradas/export` (`propostas-paradas.csv`). **+17 testes** (14 shows + 3 csv)). Segue 1347 da Sessão 245 (**exportação CSV da agenda semanal** em `/shows/semana/export` — D239: a agenda semanal `/shows/semana` ganhou botão "⬇ CSV", irmã do export do mês do calendário (D221): serializador puro `weekShowsToCsv` em `src/lib/csv.ts` (mesmas colunas `MONTH_CALENDAR_CSV_HEADERS`, data/hora LOCAL, uma linha por show + Total) + novo helper puro `summarizeWeekShows` em `src/lib/shows.ts` (resumo de uma lista já recortada à janela, sem filtro de data; reusa o shape `MonthShowsSummary`); rota reusa a janela `weekRange` da página, nome `semana-{início}.csv`; botão só com shows na semana; **+9 testes**). Segue 1338 da Sessão 244 (**coluna "vs. {ano-1}"
por linha na tabela do funil por contratante** — a tela `/contatos/funil`, com o card agregado de "movers"
da D236, ganhou o detalhe por-linha: ao lado de cada contratante, quanto sua taxa de concretização mudou frente ao ano
anterior. Novo helper puro `indexContactPipelineChanges(comparison)` + tipo `ContactPipelineRowStatus` em `src/lib/contacts.ts`
(espelho de `indexContactPaymentLagChanges`/D196): recebe a `ContactPipelineComparison` **já computada** pela página (D236 —
zero I/O, zero recomputação) e devolve um lookup por `contact.id` em O(1) → "changed" (variação da taxa + `trend`), "new" (só
teve pipeline neste ano) ou "none". A tabela ganha, **só quando há comparativo** (um ano específico + ambos os períodos com
pipeline), a coluna "vs. {ano-1}" com a célula `PipelineRowDelta`: verde = fechou uma fração maior, vermelho = fechou menos,
cinza no limiar, "novo" para os novos na mesa, "—" para não-comparável ou taxa indefinida em algum ano. Reusa `pctDelta` e
`previousYear` já na página; herda a semântica da D236 (subir a taxa é melhora, `CONVERSION_TREND_EPSILON`=0.05), sem número
mágico novo. **+4 testes** (`describe("indexContactPipelineChanges")`). Smoke test (`next start`) → `/login` 200 e
`/contatos/funil?ano=2026` 307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6).
Ver D238. Segue 1334 da Sessão 243 (**exportação CSV do
tempo em cada etapa do funil** em `/shows/funil/tempo-em-etapa/export` (Sessão 243, D237 — a tela "Tempo em cada etapa"
(`funnelStageDurations`, o residence time por etapa: mediana/média/mín/máx de dias que um show fica em cada etapa antes de
sair, D235) ganhou botão de exportação, fechando a última vista de funil sem download. Novo serializador puro
`stageDurationsToCsv(durations)` + `STAGE_DURATIONS_CSV_HEADERS` (Etapa / Transições / Mediana (dias) / Média (dias) /
Mín (dias) / Máx (dias)) em `src/lib/csv.ts` recebe a `FunnelStageDurations` já computada (`funnelStageDurations`, de
`@/lib/shows`) e emite uma linha por etapa com amostra, na ordem canônica do funil, encerrada numa linha "Total" com o total
de transições cronometradas (`totalSamples`); as colunas de dias do Total ficam em branco (não há agregado honesto entre
etapas — a mediana do conjunto não se recompõe das medianas por etapa, espelho da participação em branco de `pipelineToCsv`).
Diferente da tela (que escreve "N dias"), o CSV emite o inteiro de dias cru (legível por máquina/ordenável, convenção de
`bookingLeadTimeToCsv`); rótulo de etapa via `showStatusLabel`. Rota `/shows/funil/tempo-em-etapa/export` reusa a mesma
consulta (só `statusEvents` de cada show) e o mesmo `funnelStageDurations` da página + BOM UTF-8; nome fixo
`tempo-em-etapa.csv`; botão "⬇ CSV" no cabeçalho só com `durations.totalSamples > 0`. Sem `?ano=` (herda a D235: amostra
pós-D234 ainda pequena, sem backfill; a página também não tem seletor). **+3 testes** (`describe("stageDurationsToCsv")`: sem
amostra → só cabeçalho + Total zerado com dias em branco; uma linha por etapa na ordem canônica com dias crus + Total; agrega
multi-show com mediana/média/mín/máx). Smoke test (`next start`) → `/login` 200 e `/shows/funil/tempo-em-etapa` +
`/shows/funil/tempo-em-etapa/export` 307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss
da D6). Ver D237. Antes, **1331 testes** verdes após o **comparativo ano a ano
do funil por contratante** (Sessão 242, D236 — a outra metade da D233: novo helper puro `compareContactPipelines(current,
previous)` + tipos `ContactPipelineChange`/`ContactPipelineComparison` em `src/lib/contacts.ts` casa os contratantes de dois
`pipelineByContact` (ano atual × anterior) por `contact.id` e destila os dois **movers** — quem mais melhorou (`biggestImprovement`)
e quem mais piorou (`biggestWorsening`) a **taxa de concretização** (PLAYED / decididos) de um ano para o outro — + `newContacts`/
`droppedContacts` (entrou/saiu da mesa). Ancora na taxa (não no cachê em aberto): "passar a fechar mais" é converter, espelho do
funil geral (`compareShowPipelines`/D209, **subir** = melhora), reusando `CONVERSION_TREND_EPSILON`(=0.05) importado de `finance.ts`.
Compara só quem tem pipeline aberto nos dois anos (a lente da página); taxa indefinida num período → delta `null`, "stable", ao fim
da ordem. Card `PipelineMoversCard` "Quem passou a fechar mais/menos · {ano} vs. {ano-1}" em `/contatos/funil` (blocos "Fechando
mais" 🟢 / "Fechando menos" 🔴 + rodapé de entradas/saídas), exibido só com um ano específico e ambos os períodos com pipeline; o
ano anterior sai do mesmo acervo já carregado via `filterShowsByYear(txs, ano-1)` (**zero I/O extra**). Sem CSV nesta fatia (a
tabela-mãe já tem export/D184; o card destila dois movers). **+8 testes** (`contacts.test.ts`). Smoke → `/login` 200, `/contatos/funil`
e `?ano=2026` 307 (auth-gated); `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência
nova). Ver D236. Antes, **1324 testes** verdes após o **tempo médio em cada
etapa do funil** (Sessão 241, D235 — primeiro agregado que a linha do tempo da D234 destrava: helper puro
`funnelStageDurations(shows)` + tipos `StageDurationShowLike`/`StageDurationStat`/`FunnelStageDurations` em
`src/lib/shows.ts` — para cada show monta `buildStatusTimeline` (reuso) e credita cada transição (`daysInPrevious`) à
**etapa de origem** (`fromStatus`), o tempo que o show ficou ali antes de sair; agrega por etapa `count`/`medianDays`
(reusa `leadMedian`, leitura principal)/`averageDays`/`shortestDays`/`longestDays`, na ordem canônica do funil
(`SHOW_STATUSES`) + `totalSamples` + `showCount`. Uma etapa soma tanto saídas por avanço quanto por cancelamento
(residência honesta); a etapa atual em aberto fica de fora (puro/determinístico, coerente com `buildStatusTimeline`).
Enquanto `showPipeline` fotografa ONDE os shows estão, isto mede a VELOCIDADE de atravessar o funil. Página
`/shows/funil/tempo-em-etapa` (barras da mediana + tabela de detalhe + empty-state), link "⏱ Tempo em etapa" no cabeçalho
de `/shows/funil` e entrada no hub (`REPORT_GROUPS`, "Agenda & pipeline", ⏱). Sem `?ano=`/CSV nesta fatia (amostra ainda
pequena, sem backfill; candidatos naturais quando amadurecer). **+6 testes** (`shows.test.ts`). Smoke → `/login` 200,
`/shows/funil` e `/shows/funil/tempo-em-etapa` 307 (auth-gated); `npm audit` sem novas vulnerabilidades (mesmos advisories
Next/postcss da D6; nenhuma dependência nova). Ver D235. Antes, **1318 testes** verdes após o **histórico de status
do show / linha do tempo do funil** (Sessão 240, D234 — novo modelo `ShowStatusEvent` (Prisma) + relação `statusEvents` no
`Show`; as server actions `createShowAction`/`updateShowAction`/`duplicateShowAction` gravam cada mudança de status
(null → inicial na criação, `from → to` só quando o status muda de fato, uma cópia nasce PROPOSED); helper puro
`buildStatusTimeline(events)` em `src/lib/shows.ts` (ordena + calcula `daysInPrevious`, dias na etapa anterior) + card
"Histórico de status" em `/shows/[id]`. Gravação **aditiva** (não altera estado/retornos das actions → não quebra testes
existentes); sem backfill (shows antigos não mostram o card). É a primeira fatia do "log de transições do funil" (item 2b),
base para tempo-em-etapa/conversão real futuras. **+10 testes** (5 puros em `shows.test.ts` + 5 de integração em
`shows/actions.test.ts`). Smoke → `/login` 200, `/shows` e `/shows/[id]` 307; `npm audit` sem novas vulnerabilidades). Antes,
**1308 testes** verdes após o **recorte por período
(`?ano=`) no funil por contratante** (Sessão 239, D233 — `/contatos/funil` + export ganharam `PeriodPicker`/`?ano=`
reaproveitando `showProfitYears`/`parseProfitYear`/`filterShowsByYear` (D108): filtra a carteira de cada contato antes de
`pipelineByContact`, então a lógica pura segue agnóstica ao recorte; export herda `?ano=` no nome
`funil-por-contratante-{ano}.csv`; **+3 testes** em `contacts.test.ts`. Fecha metade do item 2b (o comparativo ano a ano por
contratante fica para depois). Smoke test (`next start`) → `/login` 200, `/contatos/funil`, `?ano=2026` e o export 307
(auth-gated); `npm audit` sem novas vulnerabilidades). Antes, **1305 testes** verdes após o **nudge do Painel "praça
para revisitar"** (Sessão 238, D232 — as "Praças para revisitar" (`findCitiesToReengage`/D229) só existiam se o músico abrisse a
sub-rota; ao contrário de sazonalidade/concentração/antecedência, não tinham manchete que as empurrasse ao Painel — e rebooking
geográfico é oportunidade de receita. Novo `citiesToReengageHeadline(list, minPastShows?)` + tipo `CitiesToReengageHeadline` +
`REENGAGE_HEADLINE_MIN_PAST_SHOWS`(=2) em `src/lib/finance.ts`: pura, destila da lista a UMA praça — a mais esquecida que tenha ≥ 2
shows passados (lastro; uma passagem única há 90 dias é evento avulso, não relação a reacender — a disciplina anti-ruído mora na
manchete, não na lista/D229 que legitimamente mostra tudo na página). Banner brand "📍 Praça para revisitar" em `dashboard/page.tsx`
("{cidade} — sem show há N dias (M shows no histórico) · +K praças frias", link `/shows/cidades/revisitar`), reaproveitando os shows
já carregados (`city` na consulta, zero I/O extra). Eixo cidade (não casa/D231): a decisão de deslocamento que cabe num empurrão
único. **+6 testes** (`finance.test.ts`). Smoke test (`next start`) → `/login` 200, `/dashboard` 307 e `/shows/cidades/revisitar` 307
(auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D232. Antes,
as **casas/venues para revisitar** (Sessão 237, D231 — versão por **local/venue** das "Praças para revisitar" (`findCitiesToReengage`/D229), apontada como
evolução na D229(a): as **casas/palcos** onde já toquei, sem nada agendado e há ≥ 90 dias sem show — uma cidade quente pode esconder
um bar frio. Novo `findVenuesToReengage(shows, opts)` + tipos `VenueReengageShowLike`/`VenueReengageRow`/`VenueReengageList`/
`VenueReengageOptions` + `VENUE_REENGAGE_STALE_DAYS`(=90) em `src/lib/finance.ts`, agrupando por `venue` em vez de `city`. Como a
lógica é byte a byte a mesma, extraí o núcleo puro `collectPlacesToReengage(shows, getPlace, now, staleDays)` (interno) e fiz tanto
`findCitiesToReengage` quanto `findVenuesToReengage` delegarem a ele (precedente de `aggregateShowProfit`; DRY sem tocar a API
pública). Página `/shows/locais/revisitar` (tabela Local/Último show/Sem tocar/Shows/Cachê histórico + card de prioridade +
empty-state), link "🏛 Revisitar" no cabeçalho de `/shows/locais`, entrada no hub (`REPORT_GROUPS`, "Agenda & pipeline", 🏛). CSV:
`venuesToReengageToCsv` + `VENUES_REENGAGE_CSV_HEADERS` + rota `/shows/locais/revisitar/export` (`casas-para-revisitar.csv`, BOM
UTF-8), botão "⬇ CSV" só com `list.count > 0`. Sem `?ano=` (coerente com a D229(d): leitura sobre o histórico inteiro). **+6 testes**
(`finance.test.ts`) **+3 testes** (`csv.test.ts`). Smoke test (`next start`) → `/login` 200, `/shows/locais/revisitar` e
`/shows/locais/revisitar/export` 307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6;
nenhuma dependência nova). Ver D231. Antes, a **exportação CSV das praças
para revisitar** (Sessão 236, D230 — as "Praças para revisitar" (`findCitiesToReengage`/D229) — cidades onde já toquei, sem nada
agendado e há > 90 dias sem show — nasceram sem CSV (a própria D229(c) adiou); eram a única vista analítica recém-nascida sem "⬇
CSV". Novo serializador puro `citiesToReengageToCsv(list)` + `CITIES_REENGAGE_CSV_HEADERS` (Cidade / Último show / Dias sem tocar /
Shows / Cachê histórico (R$)) em `src/lib/csv.ts` — irmão geográfico de `reengageToCsv`/D127 (mesmo layout, sem Contato/Papel, com
Cidade na 1ª): uma linha por praça na ordem da página (mais esquecidas primeiro, desempate por cachê, depois nome pt-BR) + linha
"Total" (soma de shows passados e cachê histórico); "Dias sem tocar" é o `daysSinceLastShow` cru (máquina-legível). Nova rota
`/shows/cidades/revisitar/export` (mesma consulta enxuta da página, zero I/O extra), BOM UTF-8, nome `pracas-para-revisitar.csv`;
link "⬇ CSV" no cabeçalho só com `list.count > 0`. Sem `?ano=` — coerente com a D229(d): a leitura é "há quanto tempo não toco",
sobre o histórico inteiro. **+3 testes** (`csv.test.ts`). Smoke test (`next start`) → `/login` 200 e
`/shows/cidades/revisitar/export` 307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6;
nenhuma dependência nova). Ver D230. Antes, o **comparativo
sazonal do ritmo do mês com o recorte "até o mesmo dia do ano passado"** (Sessão 235, D221 — `monthYoYPace` ganhou os campos
`lastYear*ToDate` + `*ToDateVsLastYear`: além da projeção pro-rata × mês cheio do ano anterior (D161), agora compara o **lançado
até agora** com o lançado até o mesmo dia do mês no ano anterior — leitura maçã-com-maçã que não depende da projeção frágil cedo
no mês; nova linha-nota "Sem depender da projeção: até hoje…" abaixo da tabela "Mesmo mês no ano passado" em
`/financas/ritmo-do-mes`; **+3 testes**). Vinha de **1284** (Sessão 234) e **1276** após a **exportação CSV do comparativo
ano a ano da composição de despesas** (Sessão 234, D228 — o card "Onde o gasto mudou · {ano} vs. {ano-1}" (`compareExpenseMix`/D224) mostra na
tela só os dois movers; a `changes` completa (rubrica a rubrica) ficava computada mas não exportável, e a própria D224(b) adiara o CSV. Novo
serializador puro `expenseMixComparisonToCsv(comparison)` + `EXPENSE_MIX_COMPARISON_CSV_HEADERS` (Categoria / Gasto (ano anterior) / Gasto (ano
corrente) / Δ gasto / Participação (ano anterior) / Participação (ano corrente) / Situação) em `src/lib/csv.ts` — espelho de
`gigSeasonalityComparisonToCsv`/D223 no eixo de despesa: uma linha por rubrica em três blocos (presentes nos dois anos, ordem `changes` maior
aumento→maior queda; "Novas" só no corrente com ano anterior 0; "Sumiram" só no anterior com ano corrente 0) + linha "Total". Coluna "Situação"
(Subiu / Caiu / Estável / Nova / Sumiu) torna a planilha filtrável por rumo; Δ via `centsToCsvAmount` (emite "-" nos negativos, sem "+" nos
positivos, mesma convenção do irmão de sazonalidade). Nova rota `/financas/composicao-despesas/comparativo/export?ano=YYYY` (recorta ano atual +
anterior do mesmo acervo, zero I/O extra) com o mesmo gate do card (só um ano específico e ambos os anos com despesa — 404 texto fora disso),
nome `composicao-despesas-comparativo-{ano}-vs-{ano-1}.csv`; link "⬇ CSV" no cabeçalho do card `ExpenseMixComparisonCard`. **+4 testes**
(`csv.test.ts`). Smoke test (`next start`) → `/login` 200 e `/financas/composicao-despesas/comparativo/export?ano=2025` 307 (auth-gated). `npm
audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D228. Antes, o **scroll-spy do sumário do hub de
relatórios** (Sessão 233, D227 — o hub `/relatorios` já tinha o sumário de salto rápido por subtema (âncoras, D59), mas conforme o acervo
passou de 60 relatórios o sumário perdia o "onde estou": ao rolar, nenhuma pílula indicava qual seção você está vendo. Novo helper puro
`activeSectionAnchor(sections, scrollY, margin, atBottom)` + tipo `SectionOffset` em `src/lib/reports.ts`: recebe os offsets (topo em px) das
seções medidos no cliente e devolve a âncora da seção **ativa** — a última cujo topo cruzou a linha de ativação (`scrollY + margin`); antes da
primeira cruzar devolve a primeira, com `atBottom` devolve a última (torna a última âncora, curta demais para alcançar a linha, ainda
acessível); robusto à ordem de entrada (ordena por `top`) e ignora offsets não finitos (medições pendentes). `ReportsBrowser.tsx` mede os
offsets dos subtemas (rAF-throttled em scroll/resize, só com o sumário à mostra — sem busca ativa) e realça a pílula do subtema visível
(`border-brand-400 bg-brand-50`, `aria-current="location"`) + o rótulo da sua área. Reverte a deferência da D56(a) ("scroll-spy descartado por
ora"): o acervo cresceu o suficiente para justificar. **+8 testes** (`reports.test.ts`). Smoke test (`next start`) → `/login` 200 e
`/relatorios` 307 (auth-gated); build OK (bundle da rota 4.73 kB). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6;
nenhuma dependência nova). Ver D227. Antes, o **comparativo ano a ano das fontes de
renda** (Sessão 232, D225 — espelho simétrico da composição de despesas/D224 no eixo de receita: `/financas/fontes-de-renda` (mix de receitas
por fonte, `incomeMix`) já tinha `?ano=` e CSV, mas não respondia "que fontes de renda cresceram/encolheram frente ao ano passado?". Novo helper
puro `compareIncomeMix(current, previous)` + tipos `IncomeMixComparison`/`IncomeSourceChange` em `src/lib/finance.ts` casa as fontes de dois
`incomeMix` por nome de categoria (via `.sources`) e destila os dois **movers** — a fonte que mais cresceu (`biggestIncrease`) e a que mais caiu
(`biggestDecrease`) — + delta total + fontes novas/sumidas. Card `IncomeMixComparisonCard` "De onde veio a mudança · {ano} vs. {ano-1}" na
página (mover de crescimento em verde/bom, de queda em rosa/atenção — **cor invertida** frente ao card de despesa), exibido só com um ano
específico e ambos os períodos com receita; o ano anterior sai do mesmo acervo já carregado via `filterShowsByYear(txs, ano-1)` (**zero I/O
extra**). Sem limiar de estabilidade (como D224): qualquer `amountDelta` não-nulo conta; empate pelo nome (pt-BR). **+5 testes**
(`finance.test.ts`, espelho dos da D224). Smoke test (`next start`) → `/login` 200 e `/financas/fontes-de-renda?ano=2025` 307 (auth-gated). `npm
audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D225. Antes, o **comparativo ano a ano
da composição de despesas** (Sessão 231, D224 — `/financas/composicao-despesas` já tinha recorte por período (`?ano=`) e CSV, mas — ao contrário das vistas
analíticas irmãs (sazonalidade de shows/D215, DSO por contratante/D195) — não respondia "em que rubricas gastei mais/menos que no ano passado?".
Novo helper puro `compareExpenseMix(current, previous)` + tipos `ExpenseMixComparison`/`ExpenseCategoryChange` em `src/lib/finance.ts`: casa as
rubricas de dois `expenseMix` já computados por nome de categoria e destila os dois **movers** — a rubrica que mais subiu (`biggestIncrease`) e a
que mais caiu (`biggestDecrease`) de gasto — + delta total + rubricas novas (só no atual) / sumidas (só no anterior). Card
`ExpenseMixComparisonCard` "Onde o gasto mudou · {ano} vs. {ano-1}" (mover de aumento em rosa/atenção, de queda em verde/economia), exibido só
com um ano específico e ambos os períodos com despesa; o ano anterior sai do mesmo acervo já carregado via `filterShowsByYear(txs, ano-1)`
(**zero I/O extra**). Segue o padrão de "movers" de `comparePaymentLagByContact`/D195 (não despeja todas as rubricas — a tela-mãe já tem a
tabela completa). Sem limiar de estabilidade: qualquer `amountDelta` não-nulo conta (dinheiro raramente empata em centavos); empate desempata
pelo nome (pt-BR). **+5 testes** (`finance.test.ts`). Smoke test (`next start`) → `/login` 200 e `/financas/composicao-despesas?ano=2025` 307
(auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6; nenhuma dependência nova). Ver D224. Antes, a
**exportação CSV do comparativo ano a ano da sazonalidade de shows** (Sessão 230, D223 — o card "Temporada {ano} vs. {ano-1}" (`compareGigSeasonality`, D215) já traz na
tela os dois movers e a tabela recolhida "Ver os 12 meses" (D217), mas o comparativo era a **única** leitura da sazonalidade sem CSV (a
tela-mãe já exporta a sazonalidade absoluta via `gigSeasonalityToCsv`/D205; levar o comparativo à planilha ficou adiado na D215(d)/D217(c)).
Novo serializador puro `gigSeasonalityComparisonToCsv(comparison)` + `GIG_SEASONALITY_COMPARISON_CSV_HEADERS` (Mês / Shows (ano anterior) /
Shows (ano corrente) / Δ shows / Δ faturamento (R$) / Tendência) em `src/lib/csv.ts` — espelha a tabela "Ver os 12 meses": uma linha por mês
(sempre as 12, jan→dez, inclusive meses sem shows nos dois anos) + linha Total com os deltas agregados. Coluna "Tendência" (Subiu/Caiu/Estável)
reusa `classifyGigSeasonalityMonthChange` (ancora no nº de shows, faturamento de desempate) replicando a **cor** da tabela on-screen, tornando
a planilha filtrável — no espírito da coluna "Destaque" da D205. Diferente da UI (que mostra "—" nos vazios), o CSV registra 0/0,00/"Estável"
para ficar legível por máquina; deltas assinados (`csvSignedCount` novo p/ contagem; `centsToCsvAmount` já emite "-" no faturamento negativo).
Nova rota `/shows/sazonalidade/comparativo/export?ano=YYYY` (recorta ano atual + anterior do mesmo acervo, zero I/O extra) com o mesmo **gate**
do card: só com um ano específico e ambos os períodos com shows — 404 (texto) quando o ano não bate no acervo (`parseProfitYear`→"all") ou
falta shows num dos anos, em vez de CSV vazio; anos no **nome do arquivo** (`sazonalidade-comparativo-{ano}-vs-{ano-1}.csv`, convenção de
`yearPaceToCsv`). Link discreto "⬇ CSV" no cabeçalho do card `SeasonComparison`. **+4 testes** (`csv.test.ts`). Smoke test (`next start`) →
`/login` 200 e `/shows/sazonalidade/comparativo/export?ano=2025` 307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories
Next/postcss da D6; nenhuma dependência nova). Ver D223. Antes, o **atalho "Duplicar" na lista de
shows** (Sessão 229, D222 — a duplicação de shows (residências / eventos recorrentes) existia só no **detalhe** do show (D218–D220); os
próximos passos apontavam levá-la também à **lista** de `/shows`, e a `duplicateShowAction` estava sem testes de integração diretos. Novo
botão-ícone "⧉ Duplicar" por linha em `src/app/(app)/shows/page.tsx`, num `<form action={duplicateShowAction}>` **irmão** do `<Link>` da
linha (não aninhado — botão dentro de `<a>` é HTML inválido); sem seletores, usa os **padrões** server-side (`parseDuplicateInterval(null)`
→ semanal, `parseDuplicateCount(null)` → 1) e cai no fluxo "duplicar → editar" da D218 (uma cópia PROPOSED na próxima semana → abre a
edição dela). Backfill de **+4 testes** de integração em `shows/actions.test.ts` cobrindo `duplicateShowAction` (uma cópia + redirect;
intervalo/quantidade espaçando o lote e voltando à lista; vínculos de contato copiados mas transações/estado de cobrança **não**; posse —
não duplica show de outro usuário). Smoke test (`next start`) → `/login` 200 (app sobe). `npm audit` sem novas vulnerabilidades (mesmos
advisories Next/postcss da D6; nenhuma dependência nova). Ver D222. Antes, a **exportação CSV do mês do
calendário** (Sessão 228, D221 — `/shows/calendario` ganhou a faixa de resumo do mês (D216) mas era a **única** vista analítica de shows
sem exportação CSV (todas as irmãs — rentabilidade, faixas-de-cache, dias-da-semana, sazonalidade, antecedência, funil — já têm "⬇ CSV" +
rota `/export`). Novo serializador puro `monthCalendarToCsv(shows, year, month)` + `MONTH_CALENDAR_CSV_HEADERS` (Data / Hora / Título /
Local / Status / Cachê (R$)) em `src/lib/csv.ts` + rota `/shows/calendario/export?mes=YYYY-MM` + link "⬇ CSV" no cabeçalho da página (ao
lado do "Exportar .ics"), propagando o mês exibido. O serializador recebe os **mesmos** shows que a página carrega para a grade (janela
`monthGridRange`, com bordas das semanas vizinhas), **recorta pela data LOCAL** ao mês pedido — o que a grade marca como "do mês"
(`inMonth`) e o que `summarizeMonthShows`/D216 soma — lista uma linha por show em ordem de data e fecha (com linhas) numa linha **"Total"**
que reusa `summarizeMonthShows`: `N show(s)` (cancelados à parte no rótulo, fora da soma) + cachê total do mês (confirmado + a confirmar).
Novos helpers `csvLocalDate`/`csvLocalTime` formatam data/hora em horário **LOCAL** (distinto do UTC de `csvDate`/`csvTime`) para casar o
recorte da grade/resumo — um show em 31/03 23:00 LOCAL aparece sob março no CSV como na grade. **+7 testes**. Smoke test (`next start`) →
`/login` 200 e `/shows/calendario/export?mes=2026-03` 307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories
Next/postcss da D6). Ver D221. Segue a **duplicação de shows em lote**
(Sessão 227, D220 — a ação "Duplicar show" (D218) + seletor de intervalo (D219) criava **uma** cópia por clique; agendar o próximo trimestre
de uma residência semanal exigia clicar "Duplicar" ~12 vezes. Novo helper puro `buildDuplicatedShowSeries(show, weeksAhead, count)` em
`src/lib/shows.ts`: gera `count` cópias, cada uma `weeksAhead * k` semanas à frente (k = 1..count) — **espaçadas pela cadência escolhida**
(semanal/quinzenal/mensal via D219), todas no mesmo dia da semana e horário, reusando `buildDuplicatedShow` por cópia. Nova regra pura
`parseDuplicateCount(value)` (não-numérico/ausente/< 1 → 1; satura em `MAX_DUPLICATE_COUNT` = 12; fracionário truncado) + presets
`DUPLICATE_COUNT_PRESETS` (1/2/4/8/12). Segundo `<select>` "quantidade" ao lado do de intervalo no detalhe do show; a `duplicateShowAction`
lê `formData.get("quantidade")`, monta a série e cria todas as cópias **atomicamente** via `prisma.$transaction([...])`; **uma** cópia segue
para a edição dela (padrão "duplicar → editar" da D218), **várias** voltam para `/shows`. Default = 1 preserva exatamente o comportamento
anterior. **+8 testes** (`parseDuplicateCount` + `buildDuplicatedShowSeries`). Smoke test (`next start`) → `/login` 200 e `/shows/abc123`
307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6). Ver D220). Segue o **seletor de intervalo na
duplicação de shows** (Sessão 226, D219 — a ação "Duplicar show" (D218) sempre criava a cópia **+1 semana** à frente; o intervalo real
(semanal/quinzenal/mensal) ficava para o usuário corrigir na edição. A própria D218(c) já previa isso: `weeksAhead` era parametrizável no
helper puro `buildDuplicatedShow` (testado com 4 ≈ mensal), mas a UI expunha só o padrão semanal. Novo helper puro
`parseDuplicateInterval(value)` + tabela `DUPLICATE_INTERVAL_WEEKS` (`weekly:1`/`biweekly:2`/`monthly:4`) + `DEFAULT_DUPLICATE_INTERVAL`/tipo
`DuplicateInterval` em `src/lib/shows.ts`: traduz a string do formulário no nº de semanas, caindo no padrão semanal para valor
desconhecido/ausente (validação por lista branca com `hasOwnProperty`, não `in`, para não aceitar chaves de protótipo). A tela de detalhe do
show ganhou um `<select>` "intervalo" (+1 semana / +2 semanas / +1 mês (4 sem.)) ao lado do botão "Duplicar"; a action `duplicateShowAction`
lê `formData.get("intervalo")` → `parseDuplicateInterval` → `buildDuplicatedShow(show, weeksAhead)`, com o resto intocado. "Mensal ≈ 4
semanas inteiras" preserva o dia da semana que define uma residência (o mesmo princípio da D218). O default preserva o comportamento
histórico (semanal). **+4 testes** (mapeia cada opção; valor inválido → padrão; ignora chaves herdadas do Object; compõe com
`buildDuplicatedShow`). Smoke test (`next start`) → `/login` 200 e `/shows/abc123` 307 (auth-gated). `npm audit` sem novas vulnerabilidades
(mesmos advisories Next/postcss da D6). Ver D219). Segue a **ação "Duplicar show"**
(Sessão 225, D218 — o cadastro de shows não tinha atalho para eventos recorrentes: um músico com uma **residência semanal** (mesma casa,
todo sábado) redigitava o mesmo show semana após semana. Novo helper puro `buildDuplicatedShow(show, weeksAhead=1)` + tipos
`DuplicableShow`/`DuplicatedShowData` + const `DUPLICATE_SHOW_WEEKS_AHEAD` em `src/lib/shows.ts`: copia o conteúdo de forma do evento
(título/local/cidade/cachê/notas), **desloca a data +1 semana inteira preservando o instante do dia** (soma múltiplos de 7 dias em ms → cai
no mesmo dia da semana) e **reseta o status para PROPOSED**. A ação de servidor `duplicateShowAction` (botão "Duplicar" na tela de detalhe
do show, ao lado de Editar/Excluir) cria a cópia, **copia os vínculos de contato** (o contratante/casa de uma residência costuma ser o
mesmo) mas **não** copia transações (realizados do evento passado) nem estado de cobrança (`paymentPromisedAt`/`billingContactId`), e
redireciona para a **edição** da cópia — padrão "duplicar → editar", que não adivinha o intervalo exato e devolve o controle ao usuário.
Primeiro atalho operacional de redução de atrito na entrada de shows (o eixo até aqui era CRUD do zero + leitura analítica). **+8 testes**.
Smoke test (`next start`) → `/login` 200 e `/shows/xyz` 307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories
Next/postcss da D6). Ver D218). Segue a **tabela de detalhe dos 12
meses no comparativo de sazonalidade de shows** em `/shows/sazonalidade` (Sessão 224, D217 — o card "Temporada {ano} vs. {ano-1}"
(`compareGigSeasonality`, D215) destila o comparativo em dois **movers**, mas os 12 `months` já computados em `GigSeasonalityComparison`
não eram exibidos; a D215(d)/próximos passos 2c apontaram "detalhar numa tabela de 12 linhas" como **evolução barata**. (a) Novo helper
puro `classifyGigSeasonalityMonthChange(change)` + tipo `GigSeasonalityMonthTrend` (`up`/`down`/`flat`) em `src/lib/finance.ts`: classifica
cada mês ancorando no nº de shows (`countDelta`) com o faturamento (`feeDelta`) de desempate — a **mesma disciplina dos movers**, para a
cor da linha casar com quem venceu o mover; só `flat` com os dois deltas zero. (b) UI: disclosure `<details>` "Ver os 12 meses" (recolhido
por padrão) dentro de `SeasonComparison`, abaixo dos movers, com tabela jan→dez (Shows {ano-1} / Shows {ano} / Δ shows / Δ faturamento),
cada linha colorida pelo `trend`, meses vazios nos dois anos em cinza, linha **Total** com os deltas agregados. Reusa os `months` já
computados — **zero I/O, zero agregação nova**. Entrega o detalhe adiado sem poluir o card: os movers seguem o sinal de relance, a tabela
fica atrás de um clique para auditar a forma da temporada mês a mês. **+4 testes** (ancora no nº de shows; faturamento desempata; só flat
com deltas zero; contagem tem prioridade sobre faturamento). Smoke test (`next start`) → `/login` 200 e `/shows/sazonalidade?ano=2025` 307
(auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6). Ver D217). Segue a **faixa de resumo do mês no
calendário** em `/shows/calendario` (Sessão 223, D216 — novo helper puro `summarizeMonthShows(shows, year, month)` +
`MonthShowsSummary` em `src/lib/shows.ts`: dos shows já carregados para a grade (incluindo bordas), recorta pela data **LOCAL** ao mês
exibido — casando o `inMonth` da grade (`calendar.ts`), não o dia UTC da rentabilidade — e devolve `total` (exceto cancelados),
`cancelled` (à parte), `confirmedFee` (Σ fee de CONFIRMED+PLAYED), `pendingFee` (Σ fee de PROPOSED), `totalFee` e `byStatus`. A página
passou a selecionar `fee` na **mesma** consulta da grade (**zero I/O extra**) e mostra uma faixa acima do calendário com 4 tiles
(Shows no mês / Cachê confirmado 🟢 / A confirmar 🟠 / Cachê total) + nota de cancelados; mês vazio mostra "Nenhum show em {mês}".
Transforma o calendário de "onde estão meus shows" em "o que este mês me rende", separando dinheiro firme de expectativa, sem sair da
tela. **+6 testes**). Segue o **comparativo ano a ano da
sazonalidade de shows via "movers"** em `/shows/sazonalidade` (Sessão 222, D215 — novo helper puro `compareGigSeasonality(current,
previous)` + `GigSeasonalityComparison`/`GigSeasonalityMonthChange` em `src/lib/finance.ts`: de duas `gigSeasonality` já computadas
devolve os 12 meses casados (`countDelta`/`feeDelta` atual − anterior) + `totalShowsDelta`/`totalFeeDelta` + os dois **movers**
(`biggestGain`/`biggestDrop`, mês que mais ganhou/perdeu shows, ancorados no nº de shows com `feeDelta` de desempate). Entrega o
comparativo adiado na D214(b) **sem** despejar 12 baldes na tela — destila os extremos no espírito do `comparePaymentLagByContact`/
D195. Card `SeasonComparison` "Temporada {ano} vs. {ano-1}" 🟢/🔴 exibido só com um ano específico e ambos os períodos com shows; o
ano anterior sai do acervo já carregado via `filterShowsByYear(rows, yearFilter-1)` (**zero I/O extra**). `gigSeasonality` intocado.
**+4 testes**). Segue o **recorte por período
(`?ano=`) na sazonalidade de shows** em `/shows/sazonalidade` (Sessão 221, D214 — `PeriodPicker`/`?ano=` na página e no export,
reusando `parseProfitYear`/`filterShowsByYear` (D108); novo helper puro `gigSeasonalityYears` lista só os anos dos gigs que a
sazonalidade conta (espelho de `cancelledShowYears`/D180); padrão segue "Todos os anos" (preserva a leitura multi-ano da D133b);
CSV com ano no nome; **+4 testes**). Segue **1201 testes** verdes após a **consolidação da margem líquida
agregada na rentabilidade por show (D211, PR #235) na `main`** (Sessão 220 — a linha da D211 vivia num PR paralelo aberto e desatualizado
(`mergeable_state: dirty`); esta sessão trouxe o commit para a `main` (código auto-mesclou limpo; só PROGRESS/DECISIONS conflitavam por
serem append-only), resolveu os docs preservando as três entradas (D211/D212/D213) e revalidou toda a DoD sobre a união — build/typecheck/
lint/1201 testes/smoke/audit verdes; +5 testes da D211 somados aos 1196 da D213). Segue o **split "fim de semana × dias de
semana" em `/shows/dias-semana`** (Sessão 219, D213 — a tela por dia da semana (`weekdayPerformance`) respondia "qual dia paga melhor /
concentra faturamento" mas não a pergunta de planejamento mais grossa e distinta: "que fração dos meus shows e do meu faturamento vem das
noites de fim de semana (sex/sáb/dom) vs. dias de semana, e o cachê médio de fim de semana é de fato maior?" — nenhuma outra leitura cobre
isso (rentabilidade/faixas são agnósticas ao dia; "fins de semana livres"/D96–D98 é agenda futura, não faturamento realizado). Novo helper
puro `weekdaySplit(wp)` + `WeekdaySplitBucket` + constante `WEEKEND_WEEKDAYS = [5,6,0]` (sex/sáb/dom) em `src/lib/finance.ts`, que **deriva
direto dos 7 `wp.days` já computados** (soma dois blocos — fim de semana × seg–qui), **zero agregação nova, zero I/O**, com participações
sobre `wp.totalShows`/`wp.totalFee` (respeitam o recorte `?ano=` automaticamente). A página ganha a seção "Fim de semana × dias de semana"
(2 cards `SplitCard` com % do faturamento + barra + shows/faturamento/cachê médio) após os destaques + uma linha do gap de cachê médio
entre os blocos (`avgGapLabel`). Guarda contra divisão por zero em bloco vazio. **+4 testes**. Smoke test (`next start`) → `/login` 200 e
`/shows/dias-semana?ano=2025` 307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6). Ver D213.
Segue o 1192 do **recorte por período (`?ano=`) +
comparativo ano a ano da taxa de concretização no funil de propostas** (Sessão 218, D212 — `/shows/funil` (`showPipeline`) era a última
leitura de tendência de shows ainda sem o recorte por período (`?ano=`/`PeriodPicker`) e sem o card "vs. {ano-1}" que as irmãs já têm
(antecedência/D187, faixas-de-cache/D203/D209, rentabilidade/D210, prazo-recebimento/D193), deixando sem resposta direta a pergunta de
progressão do funil "fechei uma fração maior do que negociei este ano vs. ano passado?". (a) A página e o export ganham o recorte por ano
UTC da `date` reusando `showProfitYears`/`parseProfitYear`/`filterShowsByYear`/D108 (filtra ANTES de agregar, `showPipeline` segue agnóstico)
+ `PeriodPicker` compartilhado (D119) + nome `funil-de-propostas-{ano}.csv` no export com ano. (b) Novo helper puro
`compareShowPipelines(current, previous)` + `ShowPipelineComparison` + `CONVERSION_TREND_EPSILON` (=0,05 = 5 p.p.) em `src/lib/finance.ts`
(espelho de `compareBookingLeadTime`/D187): de dois `showPipeline` já computados devolve `conversionRateDelta` (0..1, `null` sem show
decidido em algum período) + deltas de realizados/decididos + veredito `trend` (`improved`/`worsened`/`stable`), **ancorado na taxa de
concretização** (PLAYED/decididos) — a única métrica do funil comparável entre anos fechados (contagem/valor em aberto é snapshot do agora);
**subir** é a melhora, direção igual ao cachê/antecedência. Card `ConversionComparisonCard` 🟢/🔴/⚪ "Concretização {ano} vs. {ano-1}" só com
um ano específico e ambos os períodos tendo shows decididos, reusando o recorte por ano sobre os registros já carregados (**zero I/O extra**).
Adiado (D212): comparar valor/contagem em aberto (snapshot, não ano fechado); comparativo no CSV (precedente D193/D209/D210); nudge no Painel
(já denso). **+5 testes**. Smoke test (`next start`) → `/login` 200 e `/shows/funil?ano=2025` + `/export` 307 (auth-gated). `npm audit` sem
novas vulnerabilidades (mesmos advisories Next/postcss da D6). Ver D212. Segue a **margem líquida agregada na
rentabilidade por show** (Sessão 218, D211 — `/shows/rentabilidade` (`rankShowsByProfit`, F4) já mostrava a margem **por show** (coluna
"Margem") e os totais de receita/despesa/resultado em cards, mas faltava a leitura direta "de cada real bruto do período, quanto sobrou
líquido?" — a **margem líquida agregada** — e o CSV `showProfitToCsv` era o único ranking tabular do eixo sem uma linha **Total** (ao
contrário de sazonalidade/faixas/dias-da-semana, D205/D206/D209). Novo campo `totalMargin` em `ShowsProfitability` (`src/lib/finance.ts`):
margem agregada = `totalNet / totalIncome`, **ponderada pela receita bruta** (não a média das margens por show — um show grande pesa mais,
leitura honesta), 0 sem receita bruta (convenção de `computeShowPnL`), podendo ser negativa; calculada no `sum`/`reduce` já existente do
helper — zero agregação nova, zero I/O. A página exibe a margem como `hint` (linha secundária) sob o card "Resultado líquido" via prop
opcional `hint` em `Stat` (sem inflar o grid de 4 cards). O CSV passa a fechar, quando há linhas, com uma linha **"Total"** (Data/Status em
branco) somando cachê/extras/despesas/resultado + a margem agregada na coluna "Margem" (reusa `csvMargin`); com zero linhas a saída segue só
o cabeçalho (empty state preservado). Adiado (D211): margem como média simples das margens (distorce com shows pequenos); 5º card no grid
(quebraria `lg:grid-cols-4`; o `hint` é mais econômico); comparar a margem ano a ano no `ProfitComparisonCard`/D210 (já ancora no resultado
médio por show); margem no Painel (já denso). **+5 testes** (`rankShowsByProfit`: margem ponderada; negativa quando despesa>receita; 0 sem
receita; `totalMargin:0` no vazio · `showProfitToCsv`: linha Total com agregados+margem 72%; sem Total quando vazio). Smoke test (`next start`)
→ `/login` 200 e `/shows/rentabilidade?ano=2025` + `/export` 307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories
Next/postcss da D6). Ver D211. Segue 1187 da **comparativo ano a ano do
resultado por show** em `/shows/rentabilidade` (Sessão 217, D210 — a tela mais central de F4 tinha o recorte por período (`?ano=`) mas,
ao contrário das irmãs já cobertas (faixas-de-cache/D203, locais/D120, antecedência/D187, prazo-recebimento/D193, concentração/D226),
**não** tinha um card "vs. {ano-1}", deixando sem resposta direta a pergunta central "o show típico me paga mais líquido que ano
passado?". Novo helper puro `compareShowsProfitability(current, previous)` em `src/lib/finance.ts` (recebe duas `rankShowsByProfit` já
computadas) devolve `ShowsProfitabilityComparison` com três `MetricDelta` (`avgNet`/`totalNet`/`count`) + veredito `trend`
(`up`/`down`/`stable`), **ancorado no resultado líquido MÉDIO por show** (`totalNet/count`, helper interno `avgNetPerShow`) — não no
total somado (um ano com o dobro de shows do mesmo nível somaria mais sem cada gig render mais). Materialidade em **duas** condições,
espelhando `compareFeeDistribution`/D209: relativa ≥ `SHOW_PROFIT_TREND_EPSILON` (10%) **e** absoluta ≥ `SHOW_PROFIT_TREND_FLOOR`
(R$ 50). A página compõe o card `ProfitComparisonCard` 🟢/🔴/⚪ "Resultado por show {ano} vs. {ano-1}" só com um ano específico e ambos
os períodos tendo shows (`report.count > 0 && previousReport.count > 0`), reusando `filterShowsByYear`/D108 sobre os registros já
carregados (**zero I/O extra**): delta do médio (com %) + delta do total (com a contagem de shows) + nota de tendência. Aqui **subir**
é a melhora (progressão), como no card de cachê e oposto ao de DSO/cancelamento. Adiado (D210): ancorar no total (infla com volume);
mediana por show (a média é derivação direta de `totalNet`/`count`, zero agregação nova); comparativo no CSV/export (é apresentação,
precedente D193/D209); nudge no Painel (já denso). **+5 testes** (`compareShowsProfitability`: `up`/`down` além do limiar; ancoragem
na média — total triplica com 3× shows de mesmo nível → `stable`; `stable` por relativo-ok/absoluto-pequeno e vice-versa; sem base
anterior média 0 → qualquer resultado conta, `pct` nulo). Smoke test (`next start`) → `/login` 200 e `/shows/rentabilidade?ano=2025`
307 (auth-gated). `npm audit` sem novas vulnerabilidades (mesmos advisories Next/postcss da D6). Ver D210. Segue 1182 da **participação
na faixa premium no comparativo ano a ano de `/shows/faixas-de-cache`** (Sessão 216, D209 — o card "Cachê {ano} vs. {ano-1}" (`compareFeeDistribution`,
D203) comparava só a **mediana** (e a média, informativa) do cachê entre dois anos, mas dois anos podem ter a **mesma** mediana enquanto
a cauda de cima engorda — o músico leva mais shows para a faixa alta sem mover o meio da distribuição, e a mediana esconde essa
progressão. Exportar/comparar a participação na faixa alta foi o item explicitamente **adiado na D203**. Nova constante
`PREMIUM_FEE_BAND_KEY = "gte5k"` ("Acima de R$ 5.000", a mais alta de `FEE_BANDS`) + helper puro `premiumBandShare(dist)` em
`src/lib/finance.ts` que lê o `countShare` da faixa premium direto de `dist.bands` (**zero agregação nova**; 0 quando faixa/período
vazio) + três campos em `FeeDistributionComparison` (`premiumShareCurrent`/`premiumSharePrevious`/`premiumShareDelta`, participação em
nº de shows 0..1). O card de `/shows/faixas-de-cache` ganha a linha "Faixa premium (acima de R$ 5.000): X% → Y% dos shows +Z p.p."
(formatador `pointsDelta`) sob os deltas de mediano/médio. O veredito `trend` **segue ancorado só na mediana** — a participação premium
é informativa (mesma disciplina da média): com amostra pequena um único show premium vira um salto enorme, então não pode ditar o
veredito. Complemento barato reusando as duas `feeDistribution` já computadas (zero I/O). Adiado (D209): `feeShare` em vez de
`countShare` (a pergunta é migração de patamar, não faturamento — este já é o card "Onde está o faturamento"); premium como as duas
faixas do topo (a faixa única é o premium mais inequívoco); levar a coluna ao CSV (o CSV já lista `count`/`countShare` da linha `gte5k`;
o comparativo é apresentação, precedente D193/D203). **+3 testes**) sobre os **1179 testes** verdes após os **selos "melhor mês" / "mais
fraco" por linha na tabela de `/financas/sazonalidade`** (Sessão 215, D208 — a página já mostrava os dois destaques (melhor mês típico /
mês mais fraco, por resultado médio `avgNet`) só em **cards** no topo; a tabela "Média por mês do ano" listava os 12 meses sem marcar
**quais** linhas eram esses destaques, enquanto a tela irmã `/shows/sazonalidade` já destaca as linhas com selos (D204/D211) e o CSV
financeiro ganhou a coluna "Destaque" na Sessão 214 (D207). Dois selos inline na célula "Mês": 🟢 "melhor mês" (`seasonality.best?.monthIndex
=== m.monthIndex`, emerald) / 🟠 "mais fraco" (`seasonality.worst?.monthIndex === m.monthIndex`, amber), reusando os campos `best`/`worst` já
computados por `monthlySeasonality` — **zero lógica pura nova** — com a **mesma regra de desempate** do helper testado `seasonalMonthHighlight`
do CSV (D207): com um único mês ativo `best === worst` e "melhor mês" vence (o "mais fraco" é suprimido via `!isBest`); meses sem movimento
(`years === 0`) nunca recebem selo. Fecha a assimetria tela↔CSV↔tela-de-shows e a alternativa (b) explicitamente adiada na D207. Mudança
**UI-only** sobre campos já cobertos por `finance.test.ts`/`csv.test.ts`: **sem testes novos**, suíte inalterada em 1179 verdes) sobre os
**1179 testes** verdes após a **coluna "Destaque" no CSV da
sazonalidade financeira mensal** (Sessão 214, D207 — as D205/D206 (Sessões 212/213) levaram a coluna "Destaque" para os dois CSVs de
shows do eixo "Stat → linhas + Total" (`gigSeasonalityToCsv` e `weekdayPerformanceToCsv`), mas o CSV irmão do eixo **financeiro** — a
sazonalidade de receita/despesa/resultado por mês do calendário (`monthlySeasonalityToCsv`, `/financas/sazonalidade`) — seguia como
retrato cru: 12 linhas de mês com receita/despesa/resultado médios + nº de anos ativos, sem marcar **quais** meses são os destaques que a
tela mostra em cards (melhor mês típico / mês mais fraco, ambos por resultado médio `avgNet`). Nova 6ª coluna "Destaque" em
`MONTHLY_SEASONALITY_CSV_HEADERS` + helper puro interno `seasonalMonthHighlight(season, m)` em `src/lib/csv.ts` que reusa os campos
`best`/`worst` já computados por `monthlySeasonality` (casando por `monthIndex`, **zero lógica pura nova**): `best`→"Melhor mês típico",
`worst`→"Mês mais fraco"; meses sem movimento (`years === 0`) e a linha Total ficam em branco. Diferente dos CSVs de shows (onde um
mês/dia acumula papéis de eixos distintos, juntados com " / "), a sazonalidade financeira tem um **único** eixo — o resultado típico —
então cada mês é o melhor **OU** o mais fraco, nunca os dois (no máximo um rótulo, sem juntar); com um só mês ativo `best === worst` e
vence "Melhor mês típico" (mesma supressão da D204). Fecha a simetria dos CSVs de "Destaque" para o eixo das Finanças, apontada no item
2c. **+2 testes** (+ 3 asserções de formato atualizadas: 6ª coluna vazia no empty state, no mês zerado e no Total)) sobre os **1177
testes** verdes após a **coluna "Destaque" no CSV do
desempenho por dia da semana** (Sessão 213, D206 — a D205 (Sessão 212) levou a coluna "Destaque" para o CSV da sazonalidade de shows
(`gigSeasonalityToCsv`) e deixou explícito como próximo passo a **coluna simétrica no CSV irmão de dias-da-semana**
(`weekdayPerformanceToCsv`, `/shows/dias-semana`), o único dos dois CSVs de "eixo Stat → linhas + Total" ainda sem a marcação dos
destaques que a tela mostra em cards. Nova 7ª coluna "Destaque" em `WEEKDAY_PERFORMANCE_CSV_HEADERS` + helper puro interno
`weekdayHighlight(wp, day)` em `src/lib/csv.ts` (espelho de `gigMonthHighlight`/D205) que junta com " / " os papéis de cada dia
(`busiest`→"Dia mais cheio" / `bestByVolume`→"Mais faturamento" / `bestByAvg`→"Melhor cachê médio"), reusando os campos de destaque
já computados por `weekdayPerformance`, casando por `weekday`, **zero lógica pura nova de agregação**; dias sem shows e a linha Total
ficam em branco. Diferente da sazonalidade, **não há papel "mais fraco"**: `WeekdayPerformance` não computa `quietest` (D205), então o
mapeamento tem só os três papéis dos cards da tela. Ordem dos papéis igual à de `gigMonthHighlight` (mais cheio → faturamento → cachê
médio) para os dois CSVs irmãos lerem consistente. Fecha o passo adiado na D205. **+2 testes** (+ 2 asserções de formato atualizadas
no empty state e no dia zerado, que ganharam a 7ª coluna em branco)) sobre os **1175 testes** verdes após a **coluna "Destaque" no CSV da
sazonalidade de shows** (Sessão 212, D205 — o CSV de `/shows/sazonalidade` (`gigSeasonalityToCsv`) trazia as 12 linhas de mês com
contagem/cachê médio/faturamento/participações, mas era um retrato cru: não marcava **quais** meses são os destaques que a tela mostra
(cards mais cheio/`busiest` + mais faturamento/`bestByVolume` + melhor cachê médio/`bestByAvg` + mais fraco/`quietest`; selos na tabela),
obrigando quem baixa a planilha a reordenar e replicar à mão os desempates. Nova 7ª coluna "Destaque" em `GIG_SEASONALITY_CSV_HEADERS` +
helper puro interno `gigMonthHighlight(season, month)` em `src/lib/csv.ts` que junta com " / " os papéis de cada mês na ordem dos cards
(reusa os campos de destaque já computados por `gigSeasonality`, casando por `month`, **zero lógica pura nova de agregação**); meses sem
shows e a linha Total ficam em branco; o selo "Mês mais fraco" é suprimido quando o mês é também o mais cheio (mesma regra da tabela da UI,
D204). Fecha a lacuna adiada na D204(c) de forma mais completa que só exportar o `quietest`: exporta os quatro destaques, tornando a planilha
auto-explicativa e ordenável/filtrável por papel. Adiado (D205): coluna simétrica no CSV irmão de dias-da-semana (`weekdayPerformanceToCsv`)
e no mensal — próximo passo (dias-da-semana não tem `quietest`, mapeamento difere levemente). **+2 testes** (+ 2 asserções de formato
atualizadas)) sobre os **1173 testes** verdes após o **destaque do "mês mais fraco"
(vale da temporada) na sazonalidade de shows** (Sessão 211, D204 — `/shows/sazonalidade` (`gigSeasonality`/D133) já destacava três picos
(mês mais cheio/`busiest` + mais faturamento/`bestByVolume` + melhor cachê médio/`bestByAvg`) e o texto da página fala em "revelar os vales
da temporada — onde prospectar mais ou ajustar o preço", mas o **vale** não tinha destaque próprio (só o nudge forward-looking
`gigSeasonalityLull`/D135 no Painel). Novo campo `quietest: GigMonthStat | null` em `GigSeasonality`: o mês de **menos** shows entre os que
tiveram algum (`count > 0`), empate → menor faturamento → mês mais cedo — espelho exato do `busiest` via `pick((m) => -m.count, (m) =>
-m.totalFee)`, **zero lógica pura nova**. 4º card "Mês mais fraco" (âmbar) + selo "mais fraco" na linha da tabela (suprimido quando o mês é
também o `busiest`); grid dos destaques → `sm:grid-cols-2 lg:grid-cols-4`. Meses zerados não competem (ausência de dado ≠ mês fraco).
Adiado (D204): vale por `feeShare` (o count é mais intuitivo); exportar o `quietest` no CSV (o count por mês já está nas 12 linhas). **+1
teste** (+ asserções de `quietest` nos testes de destaque/empate/vazio)) sobre os **1172 testes** verdes após o **comparativo ano a ano do
cachê mediano na distribuição de faixas** (Sessão 210, D203 — `/shows/faixas-de-cache` (`feeDistribution`/D53 + recorte `?ano=`/D148) dava
o retrato da tabela de cachês de um período mas comparava só um ano por vez; era a última leitura de "nível de preço" sem o card
"vs. {ano-1}" que as irmãs de tendência já têm (antecedência/D187, concentração/D120, DSO/D193, cancelamento/D181) — e é a pergunta mais
direta de progressão de carreira ("meus cachês subiram este ano?"). Novo helper puro `compareFeeDistribution(current, previous)` +
`FeeDistributionComparison` + `FEE_TREND_EPSILON` (=5%) + `FEE_TREND_FLOOR` (=R$ 50) em `src/lib/finance.ts` (espelho de
`compareBookingLeadTime`): de duas `feeDistribution` já computadas devolve `medianFeeDelta`/`avgFeeDelta` (centavos) + `medianFeePct`
(variação relativa do mediano, `null` sem base anterior) + veredito `trend` (`up`/`down`/`stable`), ancorado na **mediana** (a média é só
informativa). Aqui **subir** é a melhora (progressão), direção oposta a concentração/cancelamento; o veredito exige as **duas** condições —
relativo ≥ 5% **e** absoluto ≥ R$ 50 — para não oscilar nem numa mediana pequena (onde 5% é troco) nem numa grande (onde R$ 50 é troco).
Card `FeeComparisonCard` 🟢/🔴/⚪ "Cachê {ano} vs. {ano-1}" em `/shows/faixas-de-cache`, logo após os destaques, exibido só com um ano
específico e ambos os períodos tendo shows realizados com cachê, reaproveitando o recorte por ano UTC (D108) sobre os registros já
carregados (zero I/O extra). Adiado (D203): comparar a participação na faixa alta (a tabela já mostra a migração) e exportar o comparativo
no CSV (segue o precedente da D193 — o comparativo é apresentação). **+5 testes**) sobre os **1167 testes** verdes após a **coluna "vs. {ano-1}" por
contratante na concentração (tela + CSV)** (Sessão 209, D202 — a D201 (Sessão 208) levou o card-manchete agregado "Concentração {ano}
vs. {ano-1}" para `/contatos/concentracao`, mas o card só mostra os dois números do topo (maior contratante + clientes efetivos); com
vários contratantes na tabela não dava para ver de **quais** veio a mudança de dependência — faltava o detalhe por linha do card, a mesma
relação card-manchete → coluna-detalhe da D196 (prazo de recebimento por contratante). Novo helper puro `indexClientShareChanges<C>(current,
previous)` + `ClientShareChange`/`ClientShareRowStatus`/`ClientShareTrend` + `CLIENT_SHARE_TREND_EPSILON` (=0,02 = 2 p.p.) em
`src/lib/contacts.ts`: de duas `clientConcentration` já computadas devolve um lookup por `contact.id` casando cada linha do ano atual com
sua situação frente ao anterior em O(1) — `changed` (com `shareDelta`/`trend`), `new` (só faturou no atual), `none` (id fora da carteira),
espelhando `indexContactPaymentLagChanges`/D196. Na página, com o comparativo válido (mesmo gate do card: ano específico + contratante nos
dois anos) a tabela ganha a coluna "vs. {ano-1}" (`ShareDelta`): variação da participação em p.p. com sinal, 🔴 subiu (mais dependência
dele)/🟢 caiu/cinza estável dentro do epsilon, "novo" para quem só faturou no atual, "—" para não comparáveis; rodapé explica o código. No
CSV, `clientConcentrationToCsv` ganhou 3º/4º parâmetros opcionais `previous`/`previousYear` que acrescentam a coluna "vs. {previousYear}
(p.p.)" com o **mesmo** helper (zero lógica pura nova): valor assinado inteiro (`csvSignedPoints`), "novo", branco na linha Total; sem eles
a saída é byte a byte idêntica à histórica (5 colunas). O route `/contatos/concentracao/export` recomputa o ano anterior com o mesmo gate
sobre os `items` já carregados (uma agregação extra em memória, zero I/O adicional). Subir a participação de UM contratante lê como
concentração (🔴), na mesma moldura do card agregado. Adiado (D202): coluna de variação de **cachê** (R$) por contratante (drift do
enquadramento do card, que é sobre share). **+7 testes**) sobre os **1160 testes** verdes após o **card comparativo
"vs. {ano-1}" na tela dedicada de concentração de contratantes** (Sessão 208, D201 — a D200 (Sessão 207) levou o `PeriodPicker`
(`?ano=`) para `/contatos/concentracao` mas adiou (alternativa (b)) o card comparativo "vs. {ano-1}" que toda leitura irmã de tendência
já tem (rentabilidade/D120–D122, geo/D120, papel/D141, cancelamento/D181, antecedência/D187, prazo de recebimento/D193); a tela
dedicada — a única com a tabela completa por contratante + veredito HHI/nº efetivo — era a última irmã sem o card. Agora, com um ano
específico selecionado e contratante nos **dois** períodos (`clientCount > 0`), a página computa a `clientConcentration` do ano anterior
(reusando `filterShowsByYear`/D108 sobre os `items` já carregados, sem nova consulta) + `compareClientConcentration`/D120 e renderiza
o card `ClientComparisonCard` 🟢/🔴/⚪ "Concentração {ano} vs. {ano-1}" (variação do maior contratante em p.p. + clientes efetivos, veredito
mais distribuída × mais concentrada) logo após o veredito de nível — inline na página, espelhando o precedente geo (`VenueComparisonCard`/
`GeoComparisonCard` inline em `/shows/locais` e `/shows/cidades`) e o card de `contatos/rentabilidade`. Reuso sem duplicar lógica: havia
dois `clientConcentration` (o de `finance.ts` sobre rank rows, tipo com `clients`/`total`, que `compareClientConcentration` recebia; e o
de `contacts.ts` sobre shows por contato, tipo `ClientConcentration<C>` com `rows`/`totalFee`, que a página usa) — o comparativo só lê
`topShare`/`effectiveClients`, comuns aos dois, então `compareClientConcentration` virou **genérico** sobre o mínimo estrutural
`ClientConcentrationLike` (`ClientConcentrationComparison<T = ClientConcentration>`, default preserva os chamadores), **zero lógica pura
nova** e backward-compatible. **+1 teste** (genérico sobre o mínimo estrutural, guarda contra re-narrow)) sobre os **1159 testes** verdes
após o **recorte por período
(`?ano=`) na concentração de contratantes** (Sessão 207, D200 — `/contatos/concentracao` (`clientConcentration`/D40) media a
concentração de receita sobre o acervo inteiro, uma das poucas leituras do eixo Contatos sem o `PeriodPicker` (D119) que as irmãs já
têm; o comparativo ano a ano da concentração já vive em `contatos/rentabilidade` (`compareClientConcentration`/D120–D122), mas a
página **dedicada** — a única com a tabela completa por contratante + veredito HHI/nº efetivo — não deixava recortar "quão concentrada
foi minha receita em 2025". Novo helper puro `clientConcentrationYears<C>(items)` em `src/lib/contacts.ts` (anos UTC desc dos shows que
**entram** na concentração: não cancelados e com cachê > 0 — ancora o seletor no próprio sinal, não em todos os shows vinculados, para
uma pílula nunca cair num estado vazio; mesma disciplina de `cancelledShowYears`/D180 e `bookingLeadTimeYears`/D186) + `PeriodPicker` em
`/contatos/concentracao` (página e export), filtrando os shows de **cada contato** por `filterShowsByYear`/D108 **antes** de agregar —
`clientConcentration` segue intocada. Empty state período-ciente ("Nenhum cachê de contratante em {ano}"), export herda `?ano=` no link
e no nome `concentracao-contratantes-<ano|todos>.csv`. Zero lógica pura nova de agregação (só a extração de anos) e zero I/O extra.
Adiado (D200): o card comparativo "vs. {ano-1}" na tela dedicada (já vive em `contatos/rentabilidade`). **+4 testes** puros) sobre os
**1155 testes** verdes após a **exportação CSV do ponto de
equilíbrio** (Sessão 206, D199 — varrendo as 44 entradas do hub de relatórios, `/financas/ponto-de-equilibrio` (`computeBreakEven`)
era a **única** página sem rota `export/route.ts`; todas as outras leituras tabulares/de métricas já têm "⬇ CSV". Novo
`breakEvenToCsv(analysis)` + `BREAK_EVEN_CSV_HEADERS` em `src/lib/csv.ts` + rota `/financas/ponto-de-equilibrio/export` + botão "⬇
CSV" na página, gated por `monthlyFixedCost > 0` (mesmo gate do estado-vazio). Formato **chave→valor** (colunas "Métrica"/"Valor",
uma linha por número na ordem da página: custo fixo mensal → resultado médio por show → shows considerados → ritmo atual → shows/mês
para o equilíbrio → cobre o custo fixo?), porque o relatório é um punhado de métricas heterogêneas, não linhas homogêneas — precedente
`yearPaceToCsv`/D166. Dinheiro via `centsToCsvAmount`, ritmo com uma casa via novo `csvRate`, veredito "Sim"/"Não"; meta e veredito
saem em branco quando não estimáveis (`showsNeeded == null`), espelhando o "não dá para estimar" da UI; sem linha Total; nome fixo
`ponto-de-equilibrio.csv`; rota responde 404 sem custo fixo. **+3 testes** puros. Fecha a última lacuna de exportação dos relatórios)
sobre os **1152 testes** verdes após **lembrar a última escolha de
contato "quem cobrar" por show** (Sessão 205, D198 — a lista de cachês a receber (`/shows/a-receber`) monta por show os contatos
alcançáveis em ordem de prioridade por papel (`buildShowBillings`/D30) e o `BillingActions` oferece um `<select>` "quem cobrar", mas
a escolha era **efêmera** (só `useState`): reabrir a lista sempre voltava à escolha automática, obrigando o usuário a reeleger o
contato de sempre daquele contratante toda vez — era o 1º "Próximo possível" do eixo de cachês a receber. Novo campo
`Show.billingContactId` (`String?`, não relação) guarda a última escolha por show; helper puro `preferredBillingIndex(billings,
preferredContactId?)` em `src/lib/billing.ts` devolve o índice do preferido na lista **já ordenada por prioridade** (0 sem
preferência ou quando o preferido não é mais alcançável — a lista **não reordena**, só a seleção inicial muda, evitando
reconciliação após `revalidatePath`); server action `setBillingContactAction` grava o `billingContactId` só quando o `contactId` é
um contato **do usuário** e **vinculado ao show** (senão limpa para `null`), confirmando posse antes de gravar; `BillingActions`
ganhou props opcionais `showId`/`initialIndex`/`action` e, na troca do seletor (com >1 contato), submete um form escondido para a
action — sem `action`, segue puramente local. Campo simples e não relação: um id que deixou de ser alcançável é inofensivo (a lógica
pura o ignora). Semântica de persistir na troca (revealed preference) e a opção de relação com `SetNull` ficaram registradas na
D198. **+7 testes** (3 puros `preferredBillingIndex` + 4 de integração `setBillingContactAction`)) sobre os **1145 testes** verdes
após a **coluna "vs. {ano-1}" no
CSV do prazo de recebimento por contratante** (Sessão 204, D197 — a D196 (Sessão 203) levou a variação ano a ano do prazo médio para
a **tela** de `/shows/prazo-recebimento/por-contratante` (coluna "vs. {ano-1}" por linha via `indexContactPaymentLagChanges`), mas o
CSV do mesmo recorte (`/shows/prazo-recebimento/por-contratante/export`, D131) seguia só com o retrato do ano — quem baixasse a
planilha com `?ano=` selecionado perdia a leitura de tendência que a página mostra. `paymentLagByContactToCsv(rows, delimiter?,
previousYear?)` ganhou um 3º parâmetro opcional `previousYear`: quando informado, a planilha ganha uma última coluna "vs. {ano-1}
(dias)" espelhando a coluna da página — variação **assinada** do prazo médio (`csvSignedDays`: "+12"/"-5"/"0"; negativo = passou a
pagar mais rápido) para quem existe nos dois períodos, "novo" para quem só apareceu no ano atual (`isNew`), em branco para linhas não
comparáveis; sem `previousYear` a saída é byte a byte idêntica à histórica (9 colunas), preservando os chamadores/testes.
`PaymentLagByContactCsvRow` ganhou `avgDaysDelta?`/`isNew?`. O route recomputa o comparativo com o **mesmo gate da página** (só com
ano específico; ambos os períodos com recebimento; `changes.length > 0`), reusando `comparePaymentLagByContact` +
`indexContactPaymentLagChanges` (zero lógica pura nova) sobre os shows já carregados (só uma agregação extra do ano anterior em
memória, zero I/O adicional) e só passa `previousYear` quando o comparativo é válido; o botão "⬇ CSV" já herda `?ano=` (D194).
Assina em número puro como `csvSignedPct` (D166/D170), não o "+12 dias" verboso da tela, para a planilha ficar ordenável. Adiado
(D197): coluna equivalente no CSV da tela-mãe (lá o comparativo é por período único, não por linha) e exportar o `medianDaysDelta`
(coerência com a coluna da tela, ancorada na média). **+6 testes**) sobre os **1139 testes** verdes após a **coluna "vs. {ano-1}" por
linha na tabela do prazo de recebimento por contratante** (Sessão 203, D196 — a D195 (Sessão 202) adicionou o card de destaques
`PaymentLagMoversCard` mas ele só mostra dois extremos (quem mais acelerou / desacelerou); com vários contratantes comparáveis os do
meio ficavam sem leitura de tendência, embora o número já estivesse em `comparison.changes`. Era o passo seguinte listado na própria
D195/escopo(a) e no PROGRESS. Novo helper puro `indexContactPaymentLagChanges<C,S>(comparison)` + tipo `ContactPaymentLagRowStatus<C,S>`
(`changed`/`new`/`none`) em `src/lib/finance.ts`: do `PaymentLagByContactComparison` já computado (D195) devolve uma função de lookup
por `contact.id` que casa cada linha da tabela (período atual) com sua variação em O(1) — `changed` para quem está nos dois períodos,
`new` para quem só apareceu neste ano (`newContacts`), `none` para o grupo sem contratante / ids desconhecidos. Na página, quando o
comparativo existe (só com ano específico, mesmo gate do card), a tabela ganha a coluna "vs. {ano-1}" após "Prazo médio", renderizada
por `PaymentLagRowDelta`: `daysDelta` colorido (🟢 `improved` desceu o prazo / 🔴 `worsened` subiu / cinza `stable` dentro de
`PAYMENT_LAG_TREND_EPSILON`=7 d), "novo" para novos pagadores, "—" para o resto; rodapé explica o código de cores. Reabre a deferência
da D195 (que preferiu o card citando "ruído por amostra pequena") na **apresentação**, não removendo o card: a coluna é o **detalhe**
do card-**manchete** (mesma dobra de "paga mais rápido/devagar" + tabela), e o `trend` gateia a cor — deltas pequenos ficam cinza, não
lêem como alarme. **Zero lógica pura nova de comparação** (só a indexação do comparativo já testado) e **zero I/O extra**. Adiado
(D196): export CSV do comparativo (segue o precedente da D195/D193 — o comparativo é apresentação); coluna equivalente na tela-mãe
(lá o comparativo é por período único, não por linha). **+2 testes**) sobre os **1137 testes** verdes após o **comparativo ano a ano do
prazo de recebimento por contratante** (Sessão 202, D195 — a D194 (Sessão 201) recortou `/shows/prazo-recebimento/por-contratante`
por ano mas deixou explícito o comparativo por contratante como o "passo maior" adiado (item 5). A tela-mãe já tem o card global do
DSO (`comparePaymentLag`/D193), então o que faltava e é genuinamente novo é **por pagador**: quem começou a te pagar mais rápido /
mais devagar de um ano para o outro. Novo helper puro `comparePaymentLagByContact<C,S>(current, previous)` +
`PaymentLagByContactComparison<C,S>` + `ContactPaymentLagChange<C,S>` em `src/lib/finance.ts`: casa os contratantes por `contact.id`
entre dois `paymentLagByContact` já computados — para cada um nos **dois** períodos devolve `avgDaysDelta`/`medianDaysDelta` + `trend`;
os que aparecem só num período viram `newContacts`/`droppedContacts`; expõe `biggestImprovement`/`biggestWorsening` e ordena `changes`
da maior piora à maior melhora. O veredito ancora na **média** (`avgDays`), não na mediana como o global (D193): por pagador a amostra
costuma ser pequena (< `MIN_MEDIAN_LAG_SAMPLE`) e a mediana fica ruidosa, ao passo que `avgDays` está sempre definido e é o eixo por
que a página já ordena/destaca. Direção **invertida** vs. booking lead time — descer o prazo é a melhora (`improved`), limiar reusado
`PAYMENT_LAG_TREND_EPSILON` (=7 dias). Card `PaymentLagMoversCard` "Quem mudou de ritmo · {ano} vs. {ano-1}" na página, logo após os
destaques, com dois blocos (Acelerou 🟢 / Desacelerou 🔴) + rodapé de novos/sumidos; gate: só com ano específico, ambos os períodos com
recebimento e ≥1 contratante comparável; reusa os shows/txs já carregados (zero I/O extra). Adiado (D195): coluna "vs. {ano-1}" por
linha na tabela e export CSV do comparativo (o card de extremos entrega o sinal acionável; export segue o precedente da D193, que
também não exportou o card). **+4 testes**) sobre os **1133 testes** verdes após o **recorte por período
(`?ano=`) no prazo de recebimento por contratante** (Sessão 201, D194 — a tela `/shows/prazo-recebimento/por-contratante`
(`paymentLagByContact`/D52, quem te paga rápido × devagar) era um retrato do acervo inteiro: a tela-mãe já tinha `PeriodPicker`
(D192) e comparativo ano a ano do DSO (D193), mas a irmã por contratante ficou sem recorte — era o próximo passo listado na
própria D192(c)/D193(c). Página e export agora recortam por ano reaproveitando os **mesmos** helpers puros da tela-mãe
(`paymentLagYears`/`parseProfitYear`/`filterShowsByYear`, D108/D192), **zero lógica pura nova**: os anos do seletor vêm de
`paymentLagYears(shows, txs)` (shows não cancelados que já receberam algo, a mesma amostra da mãe, para o seletor nunca cair
em lista vazia); filtra os shows pela **`date`** (`filterShowsByYear`, D108) **antes** de agregar por contratante, então os
destaques (prazo médio, paga mais rápido/devagar), a tabela por contratante e o detalhe por show saem recortados sem tocar
`paymentLagByContact`. `PeriodPicker` na página com `basePath="/shows/prazo-recebimento/por-contratante"`, empty state
período-ciente ("Nenhum cachê recebido de shows de {ano}"), o export herda `?ano=` no link e no nome
`prazo-recebimento-por-contratante-<ano|todos>.csv`. O ano é o da `date` do show (quando o show aconteceu), consistente com a
mãe: "quão rápido fui pago pelos shows daquele ano". Adiado (D194): o comparativo ano a ano **por contratante**
(`comparePaymentLagByContact`) — passo maior, e o comparativo global do DSO já vive na tela-mãe. **Sem novos testes** (plumbing
sobre helpers já testados); suíte inalterada em **1133 testes**) sobre os **1133 testes** verdes após o **comparativo ano a ano do
prazo de recebimento** (Sessão 200, D193 — a tela `/shows/prazo-recebimento` (`paymentLag`/D51, o DSO do músico) ganhou o
`PeriodPicker` (D192/`?ano=`) mas comparava só um período por vez, enquanto todas as leituras irmãs de tendência já têm um card
"vs. {ano-1}" (concentração/D120/D122, cancelamento/D181, antecedência de agendamento/D187); era o item (c) adiado na própria
D192, e o recorte por ano — o pré-requisito — já estava na `main`. Novo helper puro `comparePaymentLag<S>(current, previous)` +
`PaymentLagComparison<S>` + `PAYMENT_LAG_TREND_EPSILON` (=7 dias) em `src/lib/finance.ts`, espelho de `compareBookingLeadTime`/D187:
recebe dois `paymentLag` já computados (um por período) e devolve `medianDaysDelta`/`avgDaysDelta` (atual − anterior) + `trend`, mas
com a **direção invertida** — aqui **descer** a mediana é a melhora (o cachê entra mais cedo), a mesma direção que
cancelamento/concentração (número menor é melhor): `improved` quando a mediana cai ≥ ε, `worsened` quando sobe ≥ ε, `stable` no meio.
Veredito ancorado na **mediana** (resiste a um recebimento muito atrasado, como o próprio `paymentLag`/D57); a média entra no card só
como informação. Card `PaymentLagComparisonCard` 🟢/🔴/⚪ "Prazo de recebimento {ano} vs. {ano-1}" em `/shows/prazo-recebimento`, logo
após os destaques, exibido só com um ano específico e ambos os períodos com recebimento (`showCount > 0`), com nota de amostra pequena
quando qualquer ano tem menos de `MIN_MEDIAN_LAG_SAMPLE` (=3) shows pagos; reaproveita os mesmos registros já carregados (computa o ano
anterior pelo recorte por `date` UTC/D108, zero I/O extra). Adiado (D193): recortar/comparar também a tela por contratante. **+5 testes**)
sobre os **1128 testes** verdes após o **recorte por período
(`?ano=`) no prazo de recebimento** (Sessão 199, D192 — a tela `/shows/prazo-recebimento` (`paymentLag`/D51, o DSO do músico) era um
retrato do acervo inteiro, a última leitura de dinheiro do eixo Shows sem o `PeriodPicker` (D119) que as telas irmãs de tendência já
têm. Novo helper puro `paymentLagYears<S>(shows, txs)` em `src/lib/finance.ts` (irmão de `bookingLeadTimeYears`/`cancelledShowYears`):
anos (UTC, desc) **dos shows com prazo mensurável** — não cancelados e com ao menos um recebimento qualificável (a mesma regra de
entrada de `paymentLag`: INCOME + `received` + `showId` + valor positivo), para o seletor nunca cair numa lista vazia. Página e export
reaproveitam `parseProfitYear`/`filterShowsByYear` (D108): filtram os shows pela **`date`** (quando o show aconteceu, o mesmo eixo das
irmãs) antes de `paymentLag`, então o DSO médio/mediano, os baldes de velocidade e a tabela por show saem recortados sem tocar a lógica
pura; `PeriodPicker` na página, empty state período-ciente ("Nenhum cachê recebido de shows de {ano}"), export herda o ano no nome
`prazo-recebimento-<ano|todos>.csv`. O ano é o da `date` do show, não o do pagamento: a pergunta é "quão rápido fui pago pelos shows
daquele ano". Adiados (D192): recortar também a tela por contratante e o comparativo ano a ano do DSO (`comparePaymentLag`). **+4 testes**)
sobre os **1124 testes** verdes após o **comparativo entre escopos
(todos × só firmes) na antecedência de agendamento** (Sessão 198, D191 — a D190 (Sessão 197) adicionou o `ScopePicker`
(todos os não cancelados × só compromissos firmes) mas mostrava um escopo por vez, obrigando a alternar/memorizar para ver o quanto as
propostas em aberto distorcem a leitura; era o próximo possível listado na própria D190. Novo helper puro
`compareBookingLeadTimeScopes(all, firm)` + `type BookingLeadTimeScopeComparison` em `src/lib/shows.ts` (irmão de
`compareBookingLeadTime`/D187, mas sobre **escopos** do mesmo período, não sobre dois anos): recebe duas `bookingLeadTime` já
computadas e devolve `medianDaysDelta`/`avgDaysDelta` (firme − todos), `openProposalCount` (`all.sample − firm.sample`, as propostas
em aberto que separam os escopos) e um veredito `gap` pela variação da **mediana** contra `LEAD_TIME_TREND_EPSILON` (=7 dias, reusado):
`firm-more-lead` (mediana firme sobe além do limiar — as propostas puxavam a geral para baixo), `firm-less-lead` (cai além do limiar —
os shows que fecham vêm em cima da hora e as propostas distantes inflam a geral) e `similar` (dentro do limiar). Card
`BookingLeadTimeScopeCard` 🟢/🟠/⚪ "Todos os shows vs. só firmes" em `/shows/antecedencia`, logo após o card ano-a-ano, **independente
do escopo ativo** (o gap é o mesmo dos dois lados), reaproveitando a `lead` já computada e computando só o outro escopo (zero I/O
extra). Gate: só aparece com proposta em aberto separando os escopos e firmes com amostra mensurável (`firm.sample > 0 && all.sample >
firm.sample`); nota de amostra pequena quando `!firm.reliable`. Ao contrário do card ano-a-ano (subir a mediana é melhora), aqui o gap é
**diagnóstico**, não evolução — daí os rótulos neutros. **+4 testes**) sobre os **1120 testes** verdes após o **seletor de escopo na
antecedência de agendamento** (Sessão 197, D190 — a tela `/shows/antecedencia` (`bookingLeadTime`/D185) media sobre **todos** os
shows não cancelados, incluindo propostas em aberto; a D185(a)/D189(d) apontavam "restringir a CONFIRMED+PLAYED (compromissos
firmes)" como refinaria adiada. Novo `type BookingLeadTimeScope = "all" | "firm"` + `FIRM_LEAD_STATUSES` + predicado
`leadShowInScope` + `parseLeadTimeScope` em `src/lib/shows.ts`; `bookingLeadTime(shows, scope="all")` e
`bookingLeadTimeYears(shows, scope="all")` ganharam parâmetro opcional cujo **default preserva** o comportamento histórico — os
chamadores existentes (nudge/D189, comparativo/D187, export/D185) seguem sem migração. No escopo `firm` a mediana/média/faixas/cachê e
os anos do seletor recompõem só sobre CONFIRMED+PLAYED. Página: `ScopePicker` ("Todos os shows" × "Só confirmados/realizados"), empty
state e rodapé cientes do escopo; `PeriodPicker` ganhou prop opcional `params` (query extra preservada, vazia por padrão) para o
período não perder o escopo; export herda `?escopo=` e adiciona sufixo `-firmes` ao nome do arquivo. Separa o funil de prospecção
(leads) do runway de execução (bookings firmes). **+4 testes**) sobre os **1116 testes** verdes após o **nudge de antecedência de
agendamento no Painel** (Sessão 196, D189 — a antecedência de agendamento (`bookingLeadTime`/D185 + `/shows/antecedencia`) tinha
página, CSV (D185), recorte por ano (D186) e comparativo ano-a-ano (D187), mas nenhuma presença no Painel — o nudge fora adiado
duas vezes (D185(d)/D187(a)) por a leitura ser "um retrato, não um alarme". Reavaliado: uma antecedência mediana **curta** É um
alarme (fecha shows em cima da hora → pouco runway para prospectar/precificar), com precedente no DSO/prazo de recebimento (também
um retrato) que ganhou card no Painel (D70). Novo helper puro `bookingLeadTimeHeadline(report, shortDays=14, criticalDays=7)` +
`BookingLeadTimeHeadline` + `LEAD_TIME_SHORT_DAYS`/`LEAD_TIME_CRITICAL_DAYS` em `src/lib/shows.ts` (espelho de `paymentLagHeadline`):
de uma `bookingLeadTime` já computada, `show` só quando a amostra é **confiável** (`reliable`, ≥ `MIN_LEAD_TIME_SAMPLE=3` — a mediana
representa um hábito, não 1–2 shows) **e** a mediana cai a ≤ `shortDays`; `critical` quando desce a ≤ `criticalDays`. Ao contrário do
card ano-a-ano (subir a mediana é melhora), aqui o alarme é a ponta **baixa**. Banner 🟠/🔴 em `dashboard/page.tsx` logo após o nudge
de funil por contratante, reaproveitando os shows já carregados (createdAt vem na consulta, zero I/O extra), linkando
`/shows/antecedencia`. Gate apertado (só na faixa ≤ 14 dias) mantém o banner raro, mesma disciplina dos nudges irmãos.
**Ressalva de dados** herdada da D185: `createdAt` só é fiel com cadastro perto do fechamento (seed/import distorcem). **+7 testes**)
sobre os **1109 testes** verdes após o **nudge de funil por
contratante no Painel** (Sessão 195, D188 — o funil por contratante (`pipelineByContact`/D183 + `/contatos/funil`) tinha página e
CSV (D184) mas nenhuma presença no Painel — era a única leitura recente do eixo Contatos sem nudge, enquanto concentração de
clientes/geo (`clientConcentrationHeadline`/`geoConcentrationHeadline`) e cancelamentos (`cancellationHeadline`/D179) já ecoam no
dashboard. Novo helper puro `pipelineByContactHeadline(report, highShare=0.5, criticalShare=2/3)` + `PipelineByContactHeadline<C>` +
`PIPELINE_CONCENTRATION_HIGH_SHARE`/`PIPELINE_CONCENTRATION_CRITICAL_SHARE` em `src/lib/contacts.ts` (espelho de
`clientConcentrationHeadline`): de uma `pipelineByContact` já computada decide se o nudge de **dependência do pipeline aberto**
aparece — `rows[0]` é o maior por cachê em aberto, `topShare = openValue/totalOpenValue`; `show` quando o maior concentra ≥ metade
do pipeline aberto, `critical` quando é contratante **único** (100%) ou passa de 2/3 (o mesmo corte de
`clientConcentrationHeadline`). Banner 🟠/🔴 em `dashboard/page.tsx` logo após o nudge de cancelamentos, reaproveitando o **mesmo**
pivô show×contato já montado para o nudge de cancelamentos (zero consulta nova), linkando `/contatos/funil`. Eixo genuinamente
distinto da concentração de RECEITA (`clientConcentration`, sobre o cachê já **realizado** — o passado): aqui é o pipeline
**aberto** (PROPOSED + CONFIRMED), a receita futura ainda não realizada — se o maior deal cair, quanto da agenda futura vai junto.
**+7 testes**) sobre os **1102 testes** verdes após o **comparativo ano a ano
da antecedência de agendamento** (Sessão 194, D187 — a tela `/shows/antecedencia` tinha página, CSV (D185) e recorte por ano (D186),
mas comparava só um período por vez, enquanto todas as leituras irmãs de tendência já têm um card "vs. {ano-1}"
(concentração/D120/D122, papel/D141, cancelamento/D181). Novo helper puro `compareBookingLeadTime(current, previous)` +
`BookingLeadTimeComparison` + `LEAD_TIME_TREND_EPSILON` (=7 dias) em `src/lib/shows.ts`: recebe duas `bookingLeadTime` já computadas
(uma por período) e devolve `medianDaysDelta`/`avgDaysDelta` + `trend` — mas, ao contrário de concentração/cancelamento, aqui **subir**
a mediana é a **melhora** (mais runway/previsibilidade, menos correria): `improved` quando sobe ≥ ε, `worsened` quando cai ≥ ε,
`stable` no meio. Veredito ancorado na **mediana** (resiste a outlier, como o próprio `bookingLeadTime`/D185); a média entra no card
como métrica informativa mas não decide a tendência. Card "Antecedência {ano} vs. {ano-1}" (`BookingLeadTimeComparisonCard` 🟢/🔴/⚪)
em `shows/antecedencia/page.tsx`, logo após os destaques, exibido só com um ano específico e **ambos** os períodos tendo amostra
mensurável (`sample > 0` — a mediana de amostra vazia é 0 e compararia contra um zero fantasma); anota "amostra pequena" quando um dos
anos fica abaixo de `MIN_LEAD_TIME_SAMPLE`. Reaproveita o recorte por ano UTC (D108) sobre os registros já carregados, sem nova
consulta; **+5 testes**) sobre os **1097 testes** verdes após o **recorte por período
(`?ano=`) na antecedência de agendamento** (Sessão 193, D186 — a tela `/shows/antecedencia` (`bookingLeadTime`/D185) era um retrato
do acervo inteiro; a própria D185(b) apontava o `PeriodPicker` (D119) como candidato natural da próxima sessão. Página e export
agora recortam por ano reaproveitando `parseProfitYear`/`filterShowsByYear` (D108): os anos do seletor vêm do novo helper puro
`bookingLeadTimeYears<T>(shows)` em `src/lib/shows.ts` — os anos (UTC, desc) da **`date`** dos shows com antecedência **mensurável**
(não cancelados e `leadDays >= 0`, a mesma amostra de `bookingLeadTime`), não de todos os shows: um ano só com cancelados/retroativos
não mede antecedência e viraria uma opção vazia no seletor (mesmo cuidado de `cancelledShowYears`/D180, que se ancora no sinal da
tela). Filtra os registros do Prisma **antes** de mapear/`bookingLeadTime`, então mediana/média/faixas/retroativos saem recortados
ao ano sem tocar a lógica pura; o eixo do filtro é a `date` (quando o show acontece), o mesmo de `filterShowsByYear`. Empty state
período-ciente ("Nenhum show com antecedência mensurável em {ano}"), CSV herda o ano no nome
`antecedencia-de-agendamento-<ano|todos>.csv`; **+4 testes** (`bookingLeadTimeYears`: vazio; anos UTC desc dedup; ano da `date` e não
do `createdAt`; ignora cancelados/retroativos)) sobre os **1093 testes** verdes após a **antecedência de
agendamento** (Sessão 192, D185 — feature nova do lado Shows: `bookingLeadTime<T>(shows)` em `src/lib/shows.ts` +
`/shows/antecedencia` + export CSV (`bookingLeadTimeToCsv` + `/shows/antecedencia/export`). Primeiro uso do campo `createdAt` do show
como eixo analítico: com quanta antecedência os shows entram na agenda (booking lead time / runway). Para cada show **não cancelado**,
`leadDays = dia(date) − dia(createdAt)` em dias UTC inteiros; `>= 0` entra na amostra, `< 0` é **lançamento retroativo** (back-fill) e
fica **fora** da mediana/média/distribuição, contado à parte (`retroactiveCount`) para não puxar a leitura para baixo com ruído de
importação. Expõe `sample`/`medianDays`/`avgDays`/`shortestDays`/`longestDays`/`reliable` (amostra ≥ `MIN_LEAD_TIME_SAMPLE=3`) + 4
faixas canônicas (Até 1 semana / 1 a 4 semanas / 1 a 3 meses / Mais de 3 meses) com `count`/`totalFee`/`share`. Mediana antes da média
(robusta a outlier, como o DSO/prazo de recebimento); cachê por faixa pesa a receita ("os shows de cima da hora carregam quanto?").
Página: 4 cards + tabela de faixas com barra e Total; CSV irmão de `feeDistributionToCsv`/`weekdayPerformanceToCsv`. Registrada em
`REPORT_GROUPS` (Shows/"Agenda & pipeline"). **Ressalva de dados:** `createdAt` só é fiel com cadastro perto do fechamento — seed/import
distorcem; sinalizado para validação. **+12 testes**) sobre os **1081 testes** verdes após a **exportação CSV do
funil por contratante** em `/contatos/funil/export` (Sessão 191, D184 — a tela "Funil por contratante" (`pipelineByContact` +
`/contatos/funil`, D183) era a única tabular do acervo ainda sem botão "⬇ CSV"; a própria D183(b) adiara o export. Serializador puro
`pipelineByContactToCsv(report)` + `PIPELINE_BY_CONTACT_CSV_HEADERS` em `src/lib/csv.ts` (irmão de `cancellationByContactToCsv`/D178,
genérico sobre `ContactPipeline<C>`, reusa `contactRoleLabel`/`csvShare`/`centsToCsvAmount`) emite uma linha por contratante com
pipeline aberto na ordem da página (maior cachê aberto primeiro): Contratante/Papel/Em aberto (R$)/Shows em aberto/Em negociação (R$)/
Propostos/Confirmado (R$)/Confirmados/Concretização (%)/Realizados/Decididos; encerra num "Total" com os agregados da carteira
(cachê aberto/em negociação/confirmado + concretização geral), mas as **contagens por etapa** (Propostos/Confirmados/Realizados/
Decididos) ficam **em branco** no Total — o helper só expõe esses totais em valor na carteira e a `overallConversionRate` inclui
contatos sem linha, então somar as linhas enganaria (mesma distinção linhas×carteira de `cancellationByContactToCsv`); concretização
`null` vira célula vazia (o "—" é da UI); rota reusa a query/`pipelineByContact` da página (sem `?ano=` — retrato do estado atual,
D183(a)) + BOM UTF-8, nome fixo `funil-por-contratante.csv`, botão "⬇ CSV" gated por `hasData`; **+3 testes**) sobre os **1078 testes**
verdes após o **funil por contratante** (Sessão 190, D183 — `pipelineByContact<C>` + `/contatos/funil`: o pipeline **aberto**
(PROPOSED + CONFIRMED) por quem paga + a taxa de concretização histórica de cada contratante, "de quem cobrar o fechamento primeiro";
+8 testes) sobre os **1070 testes** verdes após a **troca de e-mail de
acesso na página de Conta** (Sessão 189, D182 — a página `/conta` editava perfil e senha mas não havia como alterar o e-mail de
login, a única credencial imutável do usuário; com o eixo de exportação CSV esgotado (D174), a gestão de conta era o próximo passo
natural. Nova server action `changeEmailAction` + `changeEmailSchema` (Zod: e-mail válido, `trim().toLowerCase()` + `currentPassword`)
+ `EmailForm.tsx` numa seção "Trocar e-mail de acesso": exige a **senha atual** (o e-mail é o login, espelho de `changePasswordAction`),
rejeita e-mail já em uso por outro usuário (`findUnique` antes da constraint `@unique`, para mensagem clara) e rejeita o e-mail igual
ao atual; **não** reemite cookie/invalida sessões — o JWT guarda `userId`, não o e-mail (diferente da senha/D10); **+6 testes**) sobre
os **1064 testes** verdes após o **comparativo ano a ano da
taxa de cancelamento da carteira** (Sessão 188, D181 — a tela `/contatos/cancelamentos` já tinha página, CSV (D178), nudge (D179) e
recorte por ano (D180), mas comparava só um período por vez; todas as telas de concentração (`compareGeoConcentration`/D120,
`compareClientConcentration`/D122) ganharam um card "vs. {ano-1}" e a de cancelamentos era a única leitura de taxa/risco sem esse
espelho. Novo helper puro `compareCancellationRate<C>(current, previous)` + `CancellationComparison<C>` + `CANCELLATION_TREND_EPSILON`
(=0.05, espelho de `GEO_TREND_EPSILON`) em `src/lib/contacts.ts`: recebe duas `cancellationByContact` já computadas (uma por período),
devolve `overallRateDelta`/`lostFeeDelta` + `trend` — mas, ao contrário da concentração, aqui **subir** a taxa é a piora
(`worsened` quando a taxa sobe ≥ ε, `improved` quando cai ≥ ε, `stable` no meio). Card "Taxa de cancelamento {ano} vs. {ano-1}"
(`CancellationComparisonCard` 🟢/🔴/⚪) em `contatos/cancelamentos/page.tsx`, logo após os destaques, exibido só com um ano
específico selecionado e o ano anterior tendo shows vinculados nos dois períodos (senão "melhorou/piorou" enganaria); reaproveita o
recorte por ano UTC (D108) sobre os `items` já carregados, sem nova consulta; **+4 testes**) sobre os **1060 testes** verdes após o
**recorte por período (`?ano=`) em Cancelamentos por contratante** (Sessão 187, D180 — a tela `/contatos/cancelamentos` (`cancellationByContact`/D177)
era a única leitura analítica do eixo Contatos ainda sem o `PeriodPicker` (D119) que todas as telas irmãs de rentabilidade/
concentração já têm; a D179 listava o recorte como próximo possível. Página e export agora recortam por ano reaproveitando
`parseProfitYear`/`filterShowsByYear` (D108): os anos do seletor vêm do novo helper puro `cancelledShowYears(items)` em
`src/lib/contacts.ts` — os anos (UTC, desc) **dos shows cancelados**, não dos ativos (`showProfitYears`), porque o cancelamento é o
sinal da tela e um ano sem cancelado levaria o seletor a uma lista vazia (dead-end). Filtra os shows de cada contato **antes** de
`cancellationByContact`, então a taxa, o cachê perdido e os agregados saem recortados ao ano sem tocar a lógica pura; `totalShows` do
ano conta todos os status daquele ano (mesma distinção top-stats×lista da D177). Empty state período-ciente ("Nenhum cancelamento em
{ano}"), CSV herda o ano no nome `cancelamentos-por-contratante-<ano|todos>.csv`; **+6 testes** (`cancelledShowYears` + composição
`filterShowsByYear`→`cancellationByContact`)) sobre os **1054 testes** verdes após o **nudge de cancelamentos no
Painel** (Sessão 186, D179 — a taxa de cancelamento por contratante (`cancellationByContact`/D177) e seu CSV (D178) tinham página
e planilha mas nenhuma presença no Painel; ganhou eco via novo helper puro `cancellationHeadline(report, highRate=0.3,
criticalRate=0.5)` em `src/lib/contacts.ts` — espelho de `clientConcentrationHeadline`: filtra as linhas **confiáveis** (amostra
≥ `minSample`) com taxa ≥ `highRate`, o pior vira a manchete (`show`), `critical` quando fura ≥ metade; expõe contato/taxa/
cancelados/total/cachê perdido + `flaggedCount` para o "e mais N". Banner-link 🟠/🔴 em `dashboard/page.tsx` após os nudges de
concentração de clientes/geo, linkando `/contatos/cancelamentos`; pivota **em memória** os shows-com-contatos já carregados
(sem I/O extra). Contatos de amostra pequena são ignorados no nudge — 1/1 = 100% é ruído, não padrão: a página anota o ruidoso
(D177), o alarme só toca com sinal confiável; o limiar 0.3 mantém o banner raro, respondendo à ressalva de densidade da D177(e);
**+7 testes**) sobre os **1047 testes** verdes após a **exportação CSV dos
cancelamentos por contratante** em `/contatos/cancelamentos/export` (Sessão 185, D178 — entrega o CSV adiado na D177(d): a tela
"Cancelamentos por contratante" (`cancellationByContact`/D177) era a única tabular do eixo Contatos sem export. Serializador puro
`cancellationByContactToCsv(report)` + `CANCELLATION_BY_CONTACT_CSV_HEADERS` em `src/lib/csv.ts` (irmão de `clientConcentrationToCsv`,
genérico sobre `ContactCancellations<C>`, reusa `contactRoleLabel`/`csvShare`/`centsToCsvAmount`) emite uma linha por contratante com
≥1 cancelamento na ordem da página (confiáveis primeiro, taxa desc, cancelados desc, cachê perdido desc, nome pt-BR):
Contratante/Papel/Cancelados/Shows/Taxa (%)/Cachê perdido (R$)/Amostra ("Confiável"/"Amostra pequena" pelo `reliable`, traduzindo o
selo da UI); encerra numa linha "Total" com os agregados da carteira (`totalCancelled`/`totalShows`/`overallRate`/`totalLostFee` +
"N cancelaram") — cancelados/cachê batem com as linhas, mas "Shows" é o total de **todos** os vinculados (inclui contratantes sem
cancelamento, que não viram linha), mesma distinção top-stats×lista da D177; rota reusa a query/`cancellationByContact` da página +
BOM UTF-8, nome fixo `cancelamentos-por-contratante.csv`, botão "⬇ CSV" gated por `hasData`; **+3 testes**) sobre a **taxa de cancelamento por
contratante** em `/contatos/cancelamentos` (Sessão 184, D177 — pivô do eixo de exportação CSV, dado como esgotado na D174, de volta
a **feature nova**: todo o resto da plataforma trata shows `CANCELLED` como ruído a excluir; o funil (`showPipeline`) é o único que
os olha, mas só na taxa de concretização **global**, sem recorte por quem cancela. Novo helper puro
`cancellationByContact<C>(items, minSample=MIN_CANCELLATION_SAMPLE=3)` em `src/lib/contacts.ts` (família de `clientConcentration`,
recebe `ContactWithShows<C>[]`) mede por contato `totalShows`/`cancelledShows`/`cancellationRate`/`lostFee` (cachê dos cancelados)
+ `reliable` (`totalShows >= minSample`); agregados do topo somam **todos** os contatos com shows, a lista `rows` traz **só** os com
≥1 cancelamento (fila acionável); contagem por relação (show com N contatos conta p/ cada, como D18); ordenação reliable-first →
taxa desc → cancelados desc → cachê perdido desc → nome/id (um 5/5 confiável acima de um 1/1 ruidoso, sem esconder dado — selo
"amostra pequena" resolve na apresentação, como cachê/prazo mediano gated D123/D130); página espelha o layout de
`/contatos/concentracao` (cards + barra por taxa), registrada em `REPORT_GROUPS` (Contatos/"Relacionamento"); CSV e nudge no Painel
adiados (D177(d)/(e)); **+8 testes**) sobre os **1036 testes** verdes após o **nudge de ponto de
equilíbrio no Painel** (Sessão 183, D176 — a leitura do break-even (`computeBreakEven`: quantos shows/mês para cobrir o custo fixo
vs. o ritmo atual) só existia na página `/financas/ponto-de-equilibrio`; ganhou eco no Painel via novo helper puro
`breakEvenHeadline(analysis)` em `src/lib/finance.ts` — espelho de `cashBurnHeadline`/`yearToDatePaceHeadline`: recebe o
`computeBreakEven` já computado e decide só a exibição; `show` só quando há meta a bater e o ritmo **não a cobre**
(`showsNeeded != null && covered === false`), `critical` quando o ritmo cai a ≤ metade da meta (`avgShowsPerMonth/showsNeeded ≤
BREAK_EVEN_CRITICAL_RATIO=0.5`); banner-link ⚖️/🔴 no `dashboard/page.tsx` reaproveita os `shows`/`txs` já carregados
(`computeBreakEven(shows as BreakEvenShowLike[], txs)`, sem I/O extra), logo após o nudge de burn rate, linkando para
`/financas/ponto-de-equilibrio`; fecha a falta de presença do break-even no Painel apontada na D175(a) — CSV lá foi descartado
por ser escalares, o nudge é o formato certo; **+4 testes**) sobre os **1032 testes** verdes após a **exportação CSV da
reserva para impostos** em `/financas/reserva-impostos/export` (Sessão 182, D175 — a tela "Reserva para impostos"
(`/financas/reserva-impostos`: tabela "Mês a mês" do `taxReserve`, quanto guardar do que **entrou no caixa** por mês com alíquota
parametrizável por `?aliquota=`, presets 6/11/15/27,5%) ganhou botão "⬇ CSV"; serializador puro `taxReserveToCsv(report)` +
`TAX_RESERVE_CSV_HEADERS` em `src/lib/csv.ts` emite uma linha por mês — **sempre as 12** inclusive os sem receita (`0,00`/`0%`, não
o "—" da UI) — Mês/Recebido (R$)/Reserva (R$)/Participação (%), participação = peso na **reserva do ano** via `csvShare`, + linha
"Total" (recebido e reserva somados, participação em branco = 100% por construção como `clientConcentrationToCsv`); alíquota fora
das colunas (uniforme) → vai no nome `reserva-impostos-{ano}-{pct}pct.csv` (ponto→hífen), cabeçalhos genéricos; rota repete o parsing
`parseYear`/`parseRate` da página + BOM UTF-8, botão gated por `hasActivity` propagando `ano`+`aliquota`; `csvShare` movido para a
zona de helpers (antes do novo serializador, evita `no-use-before-define`); resta `/financas/ponto-de-equilibrio` como única tela
sem export tabular, adiada (escalares de planejamento, ~3 linhas); **+4 testes**) sobre os **1028 testes** verdes após a
**exportação CSV do
relatório mensal** em `/financas/relatorio/export` (Sessão 181, D174 — a tela "Relatório mensal" (`/financas/relatorio`: os quatro
indicadores do mês — Receitas/Despesas/Saldo do mês/Caixa realizado — cada um com dois eixos de comparação, vs. o mês anterior e
vs. a média móvel dos últimos meses com movimento) ganhou botão "⬇ Relatório (CSV)"; serializador puro `monthlyReportToCsv(view)`
+ `MONTHLY_REPORT_CSV_HEADERS` em `src/lib/csv.ts` recebe uma `MonthlyReportCsvView` (resumo + os dois `FinanceComparison` já
computados + flags) e achata tudo numa tabela única pela coluna "Base de comparação" (Base/Métrica/Valor do mês (R$)/Comparação
(R$)/Variação (%)) — espelho estrutural de `monthPaceToCsv`: seção "Mês atual" sempre presente (4 métricas + pendências do mês "A
receber/A pagar" quando > 0, comparação em branco), depois os eixos "Mês anterior" e "Média dos últimos N meses" **só quando a
página os exibiria** (`hasPreviousMonth`/`hasAverage` ≥ 2 meses) com a variação via `csvDeltaPct` ("+25%"/"0%"/"novo" — fiel ao
"novo" da UI, diferente do `csvSignedPct` dos paces); rota repete a composição da página (`AVERAGE_WINDOW=3`, regra ≥2), nome
`relatorio-{YYYY-MM}.csv` + BOM UTF-8; o antigo botão de dump bruto foi renomeado "⬇ Transações (CSV)" para distingui-lo; distinto
de `categoryVariationToCsv`/`/financas/variacao` (lá o eixo são categorias, aqui as 4 métricas do resumo); **+4 testes**) sobre os
**1024 testes** verdes após a **exportação CSV dos
custos fixos recorrentes** em `/financas/custos-fixos/export` (Sessão 180, D173 — a tela "Custos fixos" (`recurringExpenses`/D39, o
piso a faturar todo mês) ganhou botão "⬇ CSV"; serializador puro `recurringExpensesToCsv(report)` + `RECURRING_EXPENSES_CSV_HEADERS`
em `src/lib/csv.ts` emite uma linha por categoria recorrente na ordem da página (conta típica desc): Categoria/Conta típica/mês (R$)/
Meses ativos/Janela (meses)/Última/Total (R$)/Situação — "Última" na chave ISO "YYYY-MM" (não o "jun/26" da UI), "Situação"
Ativa/Encerrada espelhando o selo da tela; + linha "Total" cuja coluna "Conta típica/mês" traz o **custo fixo mensal estimado**
(`estimatedMonthlyFixedCost`, soma só das ativas — não a soma cega da coluna), "Total" somando o histórico de todas e "Situação"
= "N/M ativas" (como o "recorrentes/total" de `clientRetentionToCsv`), com meses/janela/última em branco; sem `?ano=` (retrato de
todo o histórico de despesas), nome fixo `custos-fixos.csv` + BOM UTF-8, botão gated por `categories.length > 0`; **+2 testes**.
Ao varrer as páginas sem subpasta `export/` ressurgiu também `/financas/relatorio` (mensal + média móvel), tabular e ainda sem export
— próximo candidato natural) sobre os **1022 testes** da **exportação CSV dos
conflitos de agenda** em `/shows/conflitos/export` (Sessão 179, D172 — a tela "Conflitos de agenda" (`findScheduleConflicts`, dias
com 2+ shows não cancelados) ganhou botão "⬇ CSV"; serializador puro `scheduleConflictsToCsv(report)` + `SCHEDULE_CONFLICTS_CSV_HEADERS`
em `src/lib/csv.ts` (2º consumidor de `csv.ts` que importa tipo de `shows.ts`: `ScheduleConflicts`, depois de `openWeekendsToCsv`) achata
os dias em conflito numa linha por **show envolvido** (Dia/Situação/Show/Horário/Local/Cidade/Status/Cachê (R$)), na ordem da tela
(dias cronológicos; dentro do dia, por horário/título), com o "Dia" repetido em cada show e "Situação" = "A resolver"/"Passado"
(veredito `upcoming` da página); horário UTC via `csvTime`, status via `SHOW_STATUS_LABELS`, cancelados de fora (a lógica pura já os
exclui); + linha "Total" (Situação="N/M a resolver" como o "N/M livres" de `openWeekendsToCsv`, Cachê somando os envolvidos, nº de
shows é a própria contagem de linhas); sem `?ano=`/`?semanas=` (retrato de toda a agenda), nome fixo `conflitos-de-agenda.csv` + BOM
UTF-8, botão gated por `dayCount > 0`; **+3 testes**) sobre os **1019 testes** da **exportação CSV da
projeção de fechamento do ano** em `/financas/projecao-ano/export` (Sessão 178, D171 — a tela "Projeção de fechamento"
(`projectYearEnd`/`yearEndScenarioView`, com seletor de cenário otimista/conservador/pior caso, D73) ganhou botão "⬇ CSV";
serializador puro `yearEndProjectionToCsv(view)` + `YEAR_END_PROJECTION_CSV_HEADERS` em `src/lib/csv.ts` emite a composição dos
dois cards da página numa tabela agrupada (Grupo/Componente/Valor (R$)/Participação (%)): Receitas (Já recebido/A receber/Cachês
agendados/Total projetado) → Despesas (Já pago/A pagar/[Custo fixo estimado]/Total projetado) → Resultado (Resultado projetado),
com a participação de cada componente no total do grupo via `csvShare` e linhas Total/Resultado com participação em branco
(100%/o próprio total por construção); a linha "Custo fixo estimado" só sai quando `> 0` (espelha o card, só no pior caso); rota
reusa a consulta+parsing de `?ano=`/`?cenario=` da página + BOM UTF-8, nome `projecao-ano-{ano}-{cenario}.csv` (cenário e ano no
nome, cabeçalhos genéricos), botão gated por `hasAnything`; **+4 testes**) sobre os **1015 testes** da **exportação CSV do ritmo
do mês** em `/financas/ritmo-do-mes/export` (Sessão 177, D170 — a tela "Ritmo do mês" (`currentMonthPace`/D158 + `monthYoYPace`/D161)
ganhou botão "⬇ CSV"; serializador puro `monthPaceToCsv(pace, yoy)` + `MONTH_PACE_CSV_HEADERS` em `src/lib/csv.ts` achata os dois
eixos de comparação numa única tabela com a coluna "Base de comparação" (Mês típico × Mesmo mês do ano anterior), uma linha por
métrica em cada eixo (Receitas → Despesas → Resultado: Base/Métrica/Projeção do mês (R$)/Comparação (R$)/Variação (%)); a coluna
"Projeção do mês" é a projeção pro-rata do fechamento (idêntica nos dois eixos, como na UI), a "Comparação" é a baseline do eixo e
a "Variação" reusa `csvSignedPct` ("+25%"/"0%"/"" sem base); **sem linha Total** (métricas não somam — Resultado já é Receitas −
Despesas, como `yearPaceToCsv`); o eixo do ano anterior é **sempre emitido** (mesmo sem movimento no mês de referência — Comparação
0,00 e variação em branco, embora a página oculte essa tabela nesse caso); rota reusa consulta+`parseBurnWindow` da página + BOM
UTF-8, nome `ritmo-do-mes-{YYYY-MM}-{n}m.csv`, botão só com `hasData` (movimento no mês, baseline ou ano anterior); **+3 testes**)
sobre os **1012 testes**
da **exportação CSV dos
fins de semana livres** em `/shows/fins-de-semana-livres/export` (Sessão 176, D169 — a tela "Fins de semana livres"
(`findOpenWeekends`, D96/D98) ganhou botão "⬇ CSV"; serializador puro `openWeekendsToCsv(report)` + `OPEN_WEEKENDS_CSV_HEADERS`
em `src/lib/csv.ts` (1º consumidor de `csv.ts` que importa tipo de `shows.ts`: `OpenWeekendsReport`) emite uma linha por fim de
semana da janela (De/Até como datas ISO-formatadas em vez do rótulo "13–15 de mar"; Situação Livre/Ocupado; Shows; Cachê
marcado), **toda a janela inclusive os livres** (Shows 0 — é o vazio que importa, distinto das séries de eixo ativo), + linha
"Total" (Situação="N/M livres", shows e cachês somados); rota reusa consulta+`parseWeekendWindow` da página + BOM UTF-8, nome
`fins-de-semana-livres-{n}sem.csv`, botão sempre visível (janela tem ≥1 fim de semana); **+3 testes**) sobre os **1009 testes**
da **exportação CSV da
meta de faturamento por trimestre** em `/financas/metas/trimestral/export` (Sessão 175, D168 — rota irmã da exportação mensal
(D167) explicitamente adiada na D167(c): a tela "Meta de faturamento" tem um card "Meta por trimestre" (`quarterlyGoalProgress`,
D83) que quebra a meta anual em 4 alvos iguais cruzados com o recebido (caixa) do trimestre; serializador puro
`quarterlyGoalProgressToCsv(quarterly)` + `QUARTERLY_GOAL_CSV_HEADERS` em `src/lib/csv.ts` emite uma linha por trimestre
(1º→4º tri: Trimestre/Alvo (R$)/Recebido (R$)/Falta (R$)/Atingido (%)/Situação, situação via o **mesmo** `MONTH_GOAL_STATUS_LABELS`
da D167 — `QuarterGoalStatus` e `MonthGoalStatus` são o mesmo union) + linha "Total" cujo alvo é a meta anual, recebido somado e
situação "N/4 batidos" (Atingido em branco = 100% por construção); rota reusa a consulta/`?ano=` da página + BOM UTF-8, nome
`metas-trimestral-{ano}.csv`, botão "⬇ CSV" no card "Meta por trimestre" só com `quarterly.goal > 0`; **+4 testes**) sobre os
**1005 testes** da **exportação CSV da
meta de faturamento por mês** em `/financas/metas/export` (Sessão 174, D167) sobre os **1001 testes** da **exportação CSV do
ritmo do ano** em `/financas/ritmo-do-ano/export` (Sessão 173, D166 — a tela "Ritmo do ano" (`yearToDatePace`, o acumulado
do ano corrente até hoje vs. o mesmo ponto do ano passado, comparação igual-com-igual) ganhou botão "⬇ CSV"; serializador
puro `yearPaceToCsv(pace)` + `YEAR_PACE_CSV_HEADERS` em `src/lib/csv.ts` emite uma linha por métrica na ordem da página
(Receitas → Despesas → Resultado: Métrica/Ano corrente (R$)/Mesmo período do ano anterior (R$)/Variação (%)), com o
acumulado dos dois anos e a variação relativa assinada via novo helper `csvSignedPct` ("+25%"/"-50%"/"0%", **em branco**
quando `pct` é null = sem base no ano anterior, espelhando o "—" do veredito "insufficient"); **sem linha Total** (as três
métricas não somam entre si — Resultado já é Receitas − Despesas); rota reusa a consulta/`yearToDatePace` da página + BOM
UTF-8, nome `ritmo-do-ano-{ano}.csv` (ano concreto no nome, cabeçalhos de ano genéricos — const estático), botão só com
`hasData` (movimento no ano corrente OU no mesmo período do ano anterior); **+3 testes**) sobre os **998 testes** da
**exportação CSV da
concentração de contratantes** em `/contatos/concentracao/export` (Sessão 172, D165 — a tela "Concentração de contratantes"
(`clientConcentration`, o risco de depender de poucos pagadores) ganhou botão "⬇ CSV"; serializador puro
`clientConcentrationToCsv(concentration)` + `CLIENT_CONCENTRATION_CSV_HEADERS` em `src/lib/csv.ts` emite uma linha por
contratante com faturamento (Contratante/Papel/Shows/Cachê (R$)/Participação (%), ordem cachê desc / nome pt-BR, `csvShare`
"37%") + linha "Total" (soma de shows e cachê da carteira, participação em branco = 100% por construção, como
`clientRetentionToCsv`); rota reusa a consulta/`clientConcentration` da página + BOM UTF-8, nome `concentracao-contratantes.csv`,
botão só com `conc.clientCount > 0`; distinta da concentração geográfica (cidades/locais) — aqui o eixo é o pagador; **+3 testes**.
**Recorte por período (`?ano=`)** entregue na Sessão 207 (D200) — `clientConcentrationYears<C>(items)` (anos UTC desc dos shows que
faturam) + `PeriodPicker` em `/contatos/concentracao` (página e export via `filterShowsByYear`/D108, zero lógica pura nova de
agregação): filtra os shows de cada contato pela `date` antes de `clientConcentration`, empty state período-ciente, export herda
`?ano=` no nome `concentracao-contratantes-<ano|todos>.csv`.
**Card comparativo "vs. {ano-1}" na tela dedicada** entregue na Sessão 208 (D201) — com um ano específico e contratante nos dois
períodos, a página computa a `clientConcentration` do ano anterior (reusando `filterShowsByYear`/D108 sobre os itens já carregados,
sem nova consulta) + `compareClientConcentration`/D120 e renderiza `ClientComparisonCard` 🟢/🔴/⚪ "Concentração {ano} vs. {ano-1}"
(variação do maior contratante em p.p. + clientes efetivos) após o veredito de nível, inline como o card geo/rentabilidade;
`compareClientConcentration` virou genérico sobre o mínimo estrutural `ClientConcentrationLike` (`{topShare;effectiveClients}`) para
servir aos dois `clientConcentration` (finance/contacts) sem duplicar a aritmética, zero lógica pura nova, backward-compatible.
**Coluna "vs. {ano-1}" por linha na tabela + CSV** entregue na Sessão 209 (D202) — `indexClientShareChanges<C>(current, previous)` +
`ClientShareChange`/`ClientShareRowStatus`/`ClientShareTrend` + `CLIENT_SHARE_TREND_EPSILON` (=0,02) em `src/lib/contacts.ts` (lookup
por `contact.id` do detalhe por linha do card-manchete, espelhando `indexContactPaymentLagChanges`/D196): a tabela ganha a coluna
"vs. {ano-1}" (`ShareDelta`, 🔴 subiu/🟢 caiu/cinza estável, "novo"/"—") com o mesmo gate do card, e `clientConcentrationToCsv` ganhou
os parâmetros opcionais `previous`/`previousYear` que acrescentam a coluna "vs. {previousYear} (p.p.)" com o mesmo helper (assinada,
"novo", branco no Total); sem eles a saída é byte a byte idêntica à histórica (5 colunas). Próximo possível — coluna de variação de
**cachê** (R$) por contratante (adiada na D202: drift do enquadramento do card, que é sobre share), ou um nudge dessa concentração
no Painel.)
sobre os **995 testes** da **exportação CSV da
projeção de caixa** em `/financas/fluxo-de-caixa/export` (Sessão 171, D164 — a tela "Fluxo de caixa projetado"
(`projectCashflow`) ganhou botão "⬇ CSV"; serializador puro `cashflowProjectionToCsv(projection)` +
`CASHFLOW_PROJECTION_CSV_HEADERS` em `src/lib/csv.ts` emite uma linha por mês do horizonte (Mês/A receber/A pagar/Variação/
Saldo ao fim, ISO "YYYY-MM", todos os meses inclusive os parados) + linha "Total" (soma dos fluxos + saldo projetado final
na coluna de saldo, distinto da soma-de-saldos sem sentido); horizonte compartilhado via `parseCashflowHorizon`/
`CASHFLOW_HORIZON_PRESETS`/`CASHFLOW_HORIZON_DEFAULT` extraídos para `@/lib/finance` (preset-only, distinto do clamp de
`parseBurnWindow`; página passou a importá-los no lugar do `resolveHorizon` local); rota reusa consulta+horizonte da página
+ BOM UTF-8, nome `fluxo-de-caixa-projetado-{n}m.csv`, botão só com `hasPending || startBalance !== 0`; **+7 testes**)
sobre os **988 testes** do **nudge de ritmo do ano
no Painel** (Sessão 170, D163 — novo helper puro `yearToDatePaceHeadline(pace)` em `src/lib/finance.ts`, espelho de
`cashBurnHeadline`/`geoConcentrationHeadline`: decide só a exibição a partir do `yearToDatePace` já computado e mostra a
manchete **só quando `behind`** — atrás do mesmo ponto do ano passado; `YTD_PACE_CRITICAL_RATIO=0.75` escala para 🔴/vermelho
quando a receita YTD cai a ≤75% da do ano anterior; manchete 🐢/🔴 no `dashboard/page.tsx` reaproveita as transações já
carregadas, linka para `/financas/ritmo-do-ano`; entrega a alt. (c) adiada na D162; **+4 testes**) sobre as **984 testes** do **ritmo do ano**
em `/financas/ritmo-do-ano` (Sessão 169, D162 — novo helper puro `yearToDatePace(txs, { now? })` em `src/lib/finance.ts`
responde "estou à frente de onde eu estava nesta época do ano passado?": soma o acumulado do ano corrente (1º jan → hoje,
competência, UTC) e o compara com o acumulado do ano anterior até o **mesmo mês/dia** — comparação igual-com-igual, dois
acumulados **reais** (sem projeção, distinto de `monthYoYPace`), `verdict` pela receita reusando `MONTH_PACE_EPSILON`
(`ahead`/`onPace`/`behind`/`insufficient`), dia do corte limitado ao último dia do mês no ano anterior p/ alinhar bissexto;
página dedicada com barra de "% do ano decorrido", selo de veredito, cards de receita acumulada e tabela ano × ano × variação,
registrada no hub (Finanças/"Fechamentos", ao lado de "Ritmo do mês"); **+6 testes**) sobre a Sessão 168 (**comparativo sazonal do mês corrente vs. mesmo mês do ano anterior** em `/financas/ritmo-do-mes` (Sessão 168, D161 — novo helper puro `monthYoYPace(txs, { now? })` em `src/lib/finance.ts` reaproveita `currentMonthPace` para a projeção pro-rata do mês corrente e a compara com o **mesmo mês do calendário um ano antes, já fechado** (mês inteiro, competência, UTC) — comparação cheio×cheio, eixo sazonal distinto da média móvel do "mês típico"; três `MetricDelta` + `verdict` pela receita (`ahead`/`onPace`/`behind`/`insufficient`, reusa `MONTH_PACE_EPSILON`); card "Mesmo mês no ano passado" abaixo da tabela do mês típico, reusando o componente `Row`, com estado vazio quando não há histórico no mês de referência; **+5 testes**) sobre a Sessão 167 (**exportação CSV do funil de propostas** em `/shows/funil/export`, D160 — a tela "Funil de propostas"/`showPipeline` ganhou botão "⬇ CSV"; serializador puro `pipelineToCsv(pipeline)` + `PIPELINE_CSV_HEADERS` em `src/lib/csv.ts` emite uma linha por etapa (proposto → confirmado → realizado → cancelado, ordem de `PIPELINE_STAGE_ORDER`) com contagem, participação (`csvShare`) e cachê somado, encerrada num "Total"; participação do Total em branco (100% por construção, como `incomeMixToCsv`); `conversionRate` é escalar de destaque e não vira coluna; nome fixo `funil-de-propostas.csv`, botão só com `pipeline.total > 0`; **+3 testes**) sobre a Sessão 166. Segue 970 verdes após consolidar a **exportação CSV da agenda de contas a pagar/receber** em `/financas/agenda/export` (PR #180, D157 — a tela "A pagar e receber"/`buildDueAgenda` ganhou botão "⬇ CSV"; serializador puro `dueAgendaToCsv` + `DUE_AGENDA_CSV_HEADERS` em `src/lib/csv.ts`, rótulos de janela extraídos para `DUE_BUCKET_LABELS` em `@/lib/finance` (DRY com a página); **+3 testes**) sobre a Sessão 166. Segue 967 da Sessão 166 — a tela "Funil de propostas"/`showPipeline` ganhou botão "⬇ CSV"; serializador puro `pipelineToCsv(pipeline)` + `PIPELINE_CSV_HEADERS` em `src/lib/csv.ts` emite uma linha por etapa (proposto → confirmado → realizado → cancelado, ordem de `PIPELINE_STAGE_ORDER`) com contagem, participação (`csvShare`) e cachê somado, encerrada num "Total"; participação do Total em branco (100% por construção, como `incomeMixToCsv`); `conversionRate` é escalar de destaque e não vira coluna; nome fixo `funil-de-propostas.csv`, botão só com `pipeline.total > 0`; **+3 testes**) sobre a Sessão 166. Segue 970 verdes após consolidar a **exportação CSV da agenda de contas a pagar/receber** em `/financas/agenda/export` (PR #180, D157 — a tela "A pagar e receber"/`buildDueAgenda` ganhou botão "⬇ CSV"; serializador puro `dueAgendaToCsv` + `DUE_AGENDA_CSV_HEADERS` em `src/lib/csv.ts`, rótulos de janela extraídos para `DUE_BUCKET_LABELS` em `@/lib/finance` (DRY com a página); **+3 testes**) sobre a Sessão 166. Segue 967 da Sessão 166
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
- **Tempo de decisão por contratante — evoluções** (entregue na Sessão 280, D275 —
  `proposalDeliberationByContact` em `src/lib/shows.ts` + `/shows/funil/tempo-em-etapa/por-contratante`
  + CSV `proposalDeliberationByContactToCsv`): a deliberação da etapa PROPOSED quebrada por contratante,
  ordenada menor→maior mediana, com card do mais lento. Próximo possível — (a) recorte por `?ano=`/
  `PeriodPicker` + comparativo YoY por contratante (espelho de D269/D270 na antecedência: "quem passou
  a decidir mais rápido/devagar"); (b) nudge no Painel quando um contratante recorrente passa a demorar
  muito além do seu hábito para decidir (espelho de `contactBookingLeadTimeDropHeadline`/D272), adiado
  por o Painel já estar denso.
0. **Hub de Relatórios — evoluções** (entregue na Sessão 62, `/relatorios` + `src/lib/reports.ts`,
   ver D54; **barras podadas** na Sessão 63 — `/shows`, `/financas` e `/contatos` agora levam um único
   link "Relatórios" ancorado na seção da área, ver D55; **busca textual no hub** entregue na
   Sessão 64 — `filterReports`/`countFilteredReports` + `ReportsBrowser.tsx`, ver D56;
   **agrupamento por subtema** dentro de cada área entregue na Sessão 66 — `subtopic` +
   `subgroupEntries` em `reports.ts` + subcabeçalhos `<h3>` em `ReportsBrowser.tsx`, ver D58;
   **sumário de salto rápido por subtema** entregue na Sessão 67 — `subtopicSlug` + `reportsNavIndex`
   em `reports.ts` + `<nav>` "Ir para um tema" com pílulas-âncora em `ReportsBrowser.tsx`, ver D59;
   **scroll-spy do sumário** entregue na Sessão 233 — `activeSectionAnchor` + tipo `SectionOffset` em
   `reports.ts` (lógica pura) + medição rAF-throttled em `ReportsBrowser.tsx` que realça a pílula do
   subtema visível (`aria-current="location"`) + o rótulo da sua área, ver D227):
   catálogo central dos relatórios na navbar, com busca ao vivo, cards agrupados por subtema,
   índice de salto rápido no topo e destaque "onde estou" ao rolar. Ao criar um relatório novo,
   **registrá-lo em `REPORT_GROUPS`** (com `subtopic`) para aparecer no hub, na busca e no índice
   automaticamente. **Busca deep-linkável via `?q=`** entregue na Sessão 262 — `normalizeReportQuery` em `reports.ts`
   + leitura de `searchParams.q` na `page.tsx` + sincronização de URL (`history.replaceState`) e botão "Limpar" em
   `ReportsBrowser.tsx`: a consulta filtrada agora é compartilhável/favoritável e sobrevive ao voltar/avançar, ver D257.
   Próximo possível — um contador de "novos" relatórios (badge por entrada recém-adicionada), adiado na D257 por
   "recém-adicionado" não ter lastro no dado (exigiria metadado por entrada + um limiar arbitrário de recência).
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
   em `shows.ts` + pílulas 4/8/12/26 semanas via `?semanas=` em `/shows/fins-de-semana-livres`, ver D98;
   **exportação CSV dos fins de semana livres** entregue na Sessão 176 — `openWeekendsToCsv` + `OPEN_WEEKENDS_CSV_HEADERS`
   em `src/lib/csv.ts` + `/shows/fins-de-semana-livres/export?semanas=N` (De/Até/Situação/Shows/Cachê marcado + Total
   "N/M livres"), uma linha por fim de semana da janela inclusive os livres, nome `fins-de-semana-livres-{n}sem.csv`,
   botão "⬇ CSV" propagando a janela, ver D169.)
   **Faixa de resumo do mês no calendário** entregue na Sessão 223 — `summarizeMonthShows` + `MonthShowsSummary`
   em `src/lib/shows.ts` (recorte LOCAL ao mês exibido sobre os shows já carregados para a grade, zero I/O extra) +
   faixa com Shows no mês / Cachê confirmado 🟢 / A confirmar 🟠 / Cachê total em `/shows/calendario`, ver D216.
   **Exportação CSV do mês do calendário** entregue na Sessão 228 — `monthCalendarToCsv` + `MONTH_CALENDAR_CSV_HEADERS`
   em `src/lib/csv.ts` (recorte LOCAL ao mês, uma linha por show + linha Total reusando `summarizeMonthShows`;
   `csvLocalDate`/`csvLocalTime` em horário LOCAL) + rota `/shows/calendario/export?mes=YYYY-MM` + botão "⬇ CSV"
   propagando o mês, ver D221.
   **Exportação CSV da agenda semanal** entregue na Sessão 245 — `weekShowsToCsv` em `src/lib/csv.ts` (irmã de
   `monthCalendarToCsv`/D221 no eixo semanal: mesmas colunas `MONTH_CALENDAR_CSV_HEADERS`, data/hora LOCAL, uma linha por
   show + Total) + novo helper puro `summarizeWeekShows` em `src/lib/shows.ts` (resumo de uma lista já recortada à janela,
   **sem** filtro por data — o chamador passa a semana de `weekRange`; reusa o shape `MonthShowsSummary`) + rota
   `/shows/semana/export?semana=YYYY-MM-DD` (reusa a mesma janela da página, nome ancorado na segunda `semana-{início}.csv`)
   + botão "⬇ CSV" em `/shows/semana` só com shows na semana, ver D239.
   **Mini-calendário de salto rápido na agenda semanal** entregue na Sessão 260 — `buildMiniMonth` + tipo
   `MiniCalendarCell` em `src/lib/calendar.ts` (grade compacta de um mês só com flags `inMonth`/`isToday`/
   `inSelectedWeek`/`hasShows`, sem carregar itens) + componente `src/components/MiniCalendar.tsx` embutido num
   `<aside>` de `/shows/semana`: clicar num dia leva a agenda à sua semana, setas ◀/▶ trocam o mês do widget via
   `?cal=YYYY-MM` sem mudar a semana em foco, realçando a semana atual/hoje e pintando os dias com show (segunda
   consulta enxuta só de `date`), ver D255.
   **Salto para a semana do show mais próximo** entregue na Sessão 263 — `findAdjacentShowDate(showDates,
   weekReference, direction)` em `src/lib/calendar.ts` (função pura: a data do show da semana estritamente
   anterior/posterior à em foco — MAIOR das passadas / MENOR das futuras, via `startOfWeek`) + duas `findFirst`
   enxutas do vizinho imediato (`date < start` desc / `date >= endExclusive` asc, só `date`) na página +
   atalhos "← Show anterior (DD/MM)" / "(DD/MM) Próximo show →" numa faixa sob o cabeçalho de `/shows/semana`,
   cada um só quando há vizinho, pulando de uma vez as semanas vazias, ver D258.
   Próximo possível — estimar a receita parada por fim de semana livre (adiada na D96 por ser hipótese frágil),
   ou levar o mini-calendário também à visão semanal do mobile como drawer recolhível se o `<aside>` ficar denso.
2d. **Antecedência de agendamento** (entregue na Sessão 192, `/shows/antecedencia` + `bookingLeadTime` em
   `src/lib/shows.ts`, ver D185): com quantos dias de antecedência os shows entram na agenda (booking lead time /
   runway), mediana/média + 4 faixas canônicas, retroativos à parte; export CSV `bookingLeadTimeToCsv`. **Recorte
   por período (`?ano=`)** entregue na Sessão 193 — `bookingLeadTimeYears` + `PeriodPicker` em `/shows/antecedencia`
   (página e export), ver D186. **Comparativo ano a ano** entregue na Sessão 194 — `compareBookingLeadTime` +
   `BookingLeadTimeComparison` + `LEAD_TIME_TREND_EPSILON` (=7 dias) em `src/lib/shows.ts` + card "Antecedência {ano} vs.
   {ano-1}" (`BookingLeadTimeComparisonCard` 🟢/🔴/⚪) em `/shows/antecedencia`, exibido só com um ano específico e ambos os
   períodos tendo amostra mensurável; aqui **subir** a mediana é a melhora (mais runway), direção oposta ao card de
   cancelamento/concentração, e o veredito olha a mediana (a média é informativa), ver D187. **Nudge no Painel** entregue
   na Sessão 196 — `bookingLeadTimeHeadline` + `LEAD_TIME_SHORT_DAYS`(=14)/`LEAD_TIME_CRITICAL_DAYS`(=7) em `src/lib/shows.ts`
   + banner 🟠/🔴 "Você fecha shows em cima da hora" em `dashboard/page.tsx` quando a antecedência mediana é confiável e ≤ 14
   dias (crítico ≤ 7), reaproveitando os shows já carregados, linkando `/shows/antecedencia`, ver D189 (reverte a dupla
   deferência D185(d)/D187(a): mediana curta É alarme de runway, com precedente no DSO/D70). **Seletor de escopo (todos ×
   compromissos firmes)** entregue na Sessão 197 — `BookingLeadTimeScope`/`FIRM_LEAD_STATUSES`/`leadShowInScope`/`parseLeadTimeScope`
   em `src/lib/shows.ts` + parâmetro opcional `scope` em `bookingLeadTime`/`bookingLeadTimeYears` (default `all` preserva o histórico)
   + `ScopePicker` na página e `?escopo=` no export (sufixo `-firmes`); `PeriodPicker` ganhou prop `params` para compor ano+escopo;
   o escopo `firm` restringe a amostra a CONFIRMED+PLAYED, separando leads de bookings fechados (fecha a refinaria D185(a)/D189(d)),
   ver D190. **Comparativo entre os dois escopos lado a lado** entregue na Sessão 198 — `compareBookingLeadTimeScopes(all, firm)` +
   `BookingLeadTimeScopeComparison` em `src/lib/shows.ts` + card `BookingLeadTimeScopeCard` 🟢/🟠/⚪ "Todos os shows vs. só firmes" em
   `/shows/antecedencia` (delta da mediana/média firme − todos, `openProposalCount` e veredito `gap` firm-more-lead/firm-less-lead/similar
   pelo `LEAD_TIME_TREND_EPSILON` reusado), independente do escopo ativo, só com proposta em aberto separando os escopos, ver D191.
   Próximo possível — restringir também a amostra do nudge do Painel (D189) ao escopo firme (adiável na D190(c): o Painel
   usa a amostra ampla por design).
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
   **Destaque do "mês mais fraco" (vale) na tela** entregue na Sessão 211 — campo `quietest` em `GigSeasonality`
   (`gigSeasonality`, mês de menos shows entre os ativos, espelho do `busiest` via `pick` negado, zero lógica pura nova) + 4º
   card de destaque "Mês mais fraco" (âmbar) e selo "mais fraco" na tabela de `/shows/sazonalidade`, ver D204.
   **Coluna "Destaque" no CSV** entregue na Sessão 212 — 7ª coluna em `GIG_SEASONALITY_CSV_HEADERS` +
   `gigMonthHighlight` em `src/lib/csv.ts` marca os papéis de cada mês (mais cheio / mais faturamento / melhor cachê
   médio / mais fraco), tornando a planilha auto-explicativa e ordenável por papel, ver D205.
   **Coluna "Destaque" no CSV irmão de dias-da-semana** entregue na Sessão 213 — 7ª coluna em
   `WEEKDAY_PERFORMANCE_CSV_HEADERS` + `weekdayHighlight` em `src/lib/csv.ts` (espelho de `gigMonthHighlight`, três
   papéis: mais cheio / mais faturamento / melhor cachê médio; sem "mais fraco" porque `WeekdayPerformance` não
   computa `quietest`), ver D206.
   **Coluna "Destaque" no CSV de sazonalidade financeira mensal** entregue na Sessão 214 — 6ª coluna em
   `MONTHLY_SEASONALITY_CSV_HEADERS` + `seasonalMonthHighlight` em `src/lib/csv.ts` (reusa `best`/`worst` de
   `monthlySeasonality`, um único eixo `avgNet` → melhor mês típico / mês mais fraco, no máximo um papel por mês), ver D207.
   **Selos por linha na tabela de `/financas/sazonalidade`** entregue na Sessão 215 — selos inline 🟢 "melhor mês" /
   🟠 "mais fraco" na célula "Mês" da tabela (reusa `best`/`worst`, mesma regra de desempate do CSV: com um único mês
   ativo "melhor mês" vence; meses sem movimento nunca recebem selo), fechando a assimetria tela↔CSV↔tela-de-shows e a
   alternativa (b) adiada na D207, ver D208.
   **Recorte por período (`?ano=`)** entregue na Sessão 221 — `PeriodPicker`/`?ano=` em `/shows/sazonalidade` (página e
   export) reusando `parseProfitYear`/`filterShowsByYear` (D108); novo helper puro `gigSeasonalityYears` (anos só dos gigs
   que a sazonalidade conta, espelho de `cancelledShowYears`/D180) alimenta o seletor sem pílulas mortas; padrão segue "Todos
   os anos" (preserva a leitura multi-ano da D133b); CSV com ano no nome; **+4 testes**, ver D214.
   **Comparativo ano a ano via "movers"** entregue na Sessão 222 — `compareGigSeasonality` +
   `GigSeasonalityComparison`/`GigSeasonalityMonthChange` em `src/lib/finance.ts` + card `SeasonComparison` "Temporada {ano}
   vs. {ano-1}" em `/shows/sazonalidade` (o mês que mais cresceu / mais caiu em nº de shows, ancorado na contagem com `feeDelta`
   de desempate; total de shows/faturamento; só com um ano específico e ambos os períodos com shows, ano anterior do acervo já
   carregado, zero I/O extra), destilando os movers em vez de comparar 12 baldes na tela (o "passo maior" que a D214b adiou), no
   espírito do `PaymentLagMoversCard`/D195, ver D215.
   **Tabela de detalhe dos 12 meses** entregue na Sessão 224 — `classifyGigSeasonalityMonthChange` + tipo `GigSeasonalityMonthTrend`
   (`up`/`down`/`flat`, ancora no nº de shows com faturamento de desempate, como os movers) em `src/lib/finance.ts` + disclosure
   `<details>` "Ver os 12 meses" (recolhido) em `SeasonComparison` com tabela jan→dez (Shows {ano-1}/Shows {ano}/Δ shows/Δ faturamento)
   colorida pelo trend + linha Total, reusando os `months` já computados (zero I/O), ver D217.
   **Exportação CSV do comparativo ano a ano** entregue na Sessão 230 — `gigSeasonalityComparisonToCsv` +
   `GIG_SEASONALITY_COMPARISON_CSV_HEADERS` (Mês / Shows (ano anterior) / Shows (ano corrente) / Δ shows / Δ faturamento /
   Tendência) em `src/lib/csv.ts` (uma linha por mês jan→dez + Total; coluna "Tendência" reusa `classifyGigSeasonalityMonthChange`,
   deltas assinados via `csvSignedCount`/`centsToCsvAmount`) + rota `/shows/sazonalidade/comparativo/export?ano=YYYY` (mesmo gate do
   card, 404 sem ano/sem shows nos dois anos; nome `sazonalidade-comparativo-{ano}-vs-{ano-1}.csv`) + link "⬇ CSV" no card
   `SeasonComparison`, ver D223 (reverte a deferência D215(d)/D217(c): o valor do comparativo é a forma mês a mês dos deltas,
   que ganha em ordenar/filtrar numa planilha).
   Próximo possível —
   o mesmo `?ano=` na sazonalidade financeira (`/financas/sazonalidade`, D214(c): eixo distinto, sessão irmã — porém redundante com
   `annualSummary`, reavaliar valor); ou um mini-gráfico dos 12 meses embutido no Painel (adiado na D134(d): o Painel já é denso).
2e. **Hiatos entre shows (secas de agenda)** (entregue na Sessão 267, `/shows/hiatos` + `showGaps` em
   `src/lib/shows.ts`, ver D262): quanto tempo passa entre um gig e o outro — maiores secas, espaçamento típico
   (mediana/média), seca atual (dias desde o último gig passado) e espera pelo próximo. Só shows firmes
   (CONFIRMED + PLAYED), colapsa vários gigs no mesmo dia; CSV `showGapsToCsv` + `/shows/hiatos/export`.
   **Seca atual contextualizada pelo espaçamento típico** entregue na Sessão 268 — campo `currentGapVsTypical`
   (múltiplo da mediana, `null` sem seca atual ou com amostra pequena) em `ShowGapsReport`/`showGaps` +
   banner de leitura `CurrentGapReading` em `/shows/hiatos` (🌵/⏳/cinza/🎸 pelos limiares de APRESENTAÇÃO 1,5×/2×),
   contextualizando a MAGNITUDE da seca contra o hábito do próprio músico, ver D263.
   **Seca atual contextualizada pelo RECORDE** entregue na Sessão 269 — campo `currentGapVsLongest` em
   `ShowGapsReport`/`showGaps` + leitura `RecordGapReading` (🏜️/⚠️, ≥0,9×) em `/shows/hiatos`, ver D264.
   **Nudge de seca atual no Painel** entregue na Sessão 270 — `currentDrySpellHeadline` + banner 🟠/🔴 em
   `dashboard/page.tsx` (só fora do comum ≥2× E sem gig firme à frente), ver D265 (fecha o item (b) adiado).
   **Distribuição das secas por faixa** entregue na Sessão 272 — `gapDistribution(report)` + tipos
   `GapBucket`/`GapDistribution` em `src/lib/shows.ts` (reparte os hiatos em 5 faixas canônicas de duração —
   semana/quinzena/mês/bimestre — com contagem/participação + `busiest`; espelho de `feeDistribution`/`bookingLeadTime`)
   + seção "Distribuição das secas" em `/shows/hiatos` (barras por faixa, só com ≥ 2 hiatos), a FORMA da agenda além
   dos extremos e do centro. **+7 testes**, sem CSV próprio (a lista de hiatos já é exportada), ver D267.
   Próximo possível — (a) recorte por `?ano=`/`PeriodPicker` (adiado: uma seca cruza a virada do ano, o corte por
   ano fragmentaria o hiato); ~~(b) um nudge no Painel quando a seca atual passa de um limiar~~ (entregue, D265);
   (c) incluir PROPOSED como "seca provável" à frente (adiado: proposta em aberto ainda pode cair, ruído); (d) levar o
   mesmo múltiplo `currentGapVsTypical` ao CSV (adiado na D263: o CSV é por-hiato; o múltiplo é um escalar da seca
   ATUAL, sem lugar natural na tabela — caberia só um cabeçalho/rodapé, ruído).
2b. **Funil de propostas — evoluções** (entregue na Sessão 51, `/shows/funil` + `showPipeline`,
   ver D42; **card do funil no Painel** entregue na Sessão 52 — cachê em aberto + taxa de
   concretização, ver D43; **exportação CSV do funil** entregue na Sessão 167 — `pipelineToCsv` +
   `PIPELINE_CSV_HEADERS` em `src/lib/csv.ts` + `/shows/funil/export` (Etapa/Shows/Participação/Cachê
   + linha Total), uma linha por etapa na ordem de `PIPELINE_STAGE_ORDER`, botão "⬇ CSV" só com
   `pipeline.total > 0`, ver D160): hoje é um retrato do estado atual. **Funil por contratante**
   entregue na Sessão 190 — `pipelineByContact` + `/contatos/funil` recorta o pipeline aberto por quem
   paga (ver item 8 e D183); **exportação CSV do funil por contratante** entregue na Sessão 191 —
   `pipelineByContactToCsv` + `PIPELINE_BY_CONTACT_CSV_HEADERS` em `src/lib/csv.ts` + `/contatos/funil/export`
   (Contratante/Papel/Em aberto/Shows em aberto/Em negociação/Propostos/Confirmado/Confirmados/Concretização/
   Realizados/Decididos + linha Total com contagens por etapa em branco), uma linha por contratante com pipeline
   aberto na ordem da página, sem `?ano=`, nome `funil-por-contratante.csv`, botão "⬇ CSV" gated por `hasData`,
   ver D184. **Nudge no Painel** entregue na Sessão 195 — `pipelineByContactHeadline` + banner 🟠/🔴 em
   `dashboard/page.tsx` quando o maior contratante concentra ≥ metade do pipeline aberto (crítico se único/≥2/3),
   reaproveitando o pivô show×contato do nudge de cancelamentos, linkando `/contatos/funil`, ver D188.
   **Recorte por período (`?ano=`) no funil por contratante** entregue na Sessão 239 — `PeriodPicker`/`?ano=` em
   `/contatos/funil` (página e export) reaproveitando `showProfitYears`/`parseProfitYear`/`filterShowsByYear` (D108):
   filtra a carteira de cada contato antes de `pipelineByContact` (agnóstico ao recorte, como a D194), export com ano no
   nome `funil-por-contratante-{ano}.csv`; **+3 testes**, ver D233.
   **Log de transições de status — 1ª fatia** entregue na Sessão 240 — modelo `ShowStatusEvent` no schema (Prisma) +
   relação `statusEvents` no `Show`; `createShowAction`/`updateShowAction`/`duplicateShowAction` gravam cada mudança de
   status (aditivo, não altera estado/retornos); helper puro `buildStatusTimeline` em `src/lib/shows.ts` (ordena +
   `daysInPrevious`) + card "Histórico de status" em `/shows/[id]`; **+10 testes**; sem backfill dos shows antigos, ver
   D234.
   **Tempo médio em cada etapa** entregue na Sessão 241 — helper puro `funnelStageDurations(shows)` +
   `StageDurationShowLike`/`StageDurationStat`/`FunnelStageDurations` em `src/lib/shows.ts` (para cada show monta
   `buildStatusTimeline` e credita cada transição `daysInPrevious` à etapa de origem `fromStatus`; agrega
   `count`/`medianDays`(reusa `leadMedian`)/`averageDays`/`shortestDays`/`longestDays` na ordem canônica do funil +
   `totalSamples`/`showCount`; avanço + cancelamento somados; etapa atual em aberto fora, puro/determinístico) + página
   `/shows/funil/tempo-em-etapa` (barras da mediana + tabela + empty-state) + link "⏱ Tempo em etapa" no funil + entrada no
   hub; sem `?ano=` (amostra jovem, sem backfill); **+6 testes**, ver D235.
   **Exportação CSV do tempo em cada etapa** entregue na Sessão 243 — `stageDurationsToCsv` + `STAGE_DURATIONS_CSV_HEADERS`
   (Etapa / Transições / Mediana (dias) / Média (dias) / Mín (dias) / Máx (dias)) em `src/lib/csv.ts` (uma linha por etapa
   na ordem canônica + Total com o total de transições; dias crus inteiros, colunas de dias do Total em branco) + rota
   `/shows/funil/tempo-em-etapa/export` (nome fixo `tempo-em-etapa.csv`) + botão "⬇ CSV" só com `totalSamples > 0`, sem
   `?ano=` (herda a D235); **+3 testes**, ver D237 — fecha a última vista de funil sem download.
   **Comparativo ano a ano do funil por contratante** entregue na Sessão 242 — `compareContactPipelines(current, previous)` +
   tipos `ContactPipelineChange`/`ContactPipelineComparison` em `src/lib/contacts.ts` casa os contratantes de dois
   `pipelineByContact` por `contact.id` e destila os movers da **taxa de concretização** (quem passou a fechar mais/menos) +
   entradas/saídas da mesa; card `PipelineMoversCard` "Quem passou a fechar mais/menos · {ano} vs. {ano-1}" em `/contatos/funil`,
   só com um ano específico e ambos os períodos com pipeline, ano anterior do acervo já carregado (zero I/O), reusando
   `CONVERSION_TREND_EPSILON`; **+8 testes**, ver D236 — fecha a outra metade da D233.
   **Coluna "vs. {ano-1}" por linha na tabela do funil por contratante** entregue na Sessão 244 — `indexContactPipelineChanges`
   + tipo `ContactPipelineRowStatus` em `src/lib/contacts.ts` (espelho de `indexContactPaymentLagChanges`/D196) transforma a
   `ContactPipelineComparison` da D236 num lookup por `contact.id` (O(1), zero I/O) e a página ganha a célula `PipelineRowDelta`
   ("changed" com a variação da taxa / "new" / "—"), só quando há comparativo; **+4 testes**, ver D238 — o polimento barato que
   o card de movers da D236 abriu.
   **Propostas paradas (follow-up de deals esquecidos)** entregue na Sessão 246 — helper puro `findStaleProposals(shows, opts?)`
   + tipos `StaleProposal`/`StaleProposalsReport`/`StaleProposalUrgency` + `STALE_PROPOSAL_DAYS`(=21)/`STALE_PROPOSAL_IMMINENT_DAYS`(=14)
   em `src/lib/shows.ts`: 1º relatório **operacional** do funil (QUAIS propostas específicas agir, não o agregado). Só shows em
   PROPOSED; "parada" = ≥21 dias sem movimento no status OU data já vencida; urgência overdue/imminent/cold + fila ordenada; tempo
   no status via último `ShowStatusEvent` (D234), fallback `createdAt` sem histórico; dias UTC inteiros; `now`/limiares injetáveis.
   Página `/shows/funil/paradas` (4 stats + tabela com selo de urgência/link ao show + empty-state) + cross-link "⏳ Propostas
   paradas" no funil + entrada no hub; CSV `staleProposalsToCsv`/`STALE_PROPOSALS_CSV_HEADERS` + `/shows/funil/paradas/export`
   (`propostas-paradas.csv`); **+17 testes** (14 shows + 3 csv), ver D240.
   **Nudge no Painel** entregue na Sessão 247 — `staleProposalsHeadline(report)` + tipo `StaleProposalsHeadline` em
   `src/lib/shows.ts` (espelho de `pipelineByContactHeadline`/`cancellationHeadline`): recebe a `StaleProposalsReport` já
   computada (zero recomputação) e destila só o subconjunto acionável — dispara com proposta **vencida** ou **iminente**,
   `critical` (🔴 vs 🟠) com ao menos uma vencida; as "cold" (data distante) ficam fora do nudge (follow-up, não urgência).
   Banner em `dashboard/page.tsx` reaproveita a mesma consulta `shows` já carregada pelos outros nudges (zero I/O extra;
   sem `statusEvents` o tempo parado cai para `createdAt`, bom proxy — show nasce PROPOSED; `overdue` é exato sem eventos).
   Reverte a alternativa (b) adiada da D240. **+5 testes** (`shows.test.ts`), ver D241. Próximo possível para esta feature:
   (a) incluir CONFIRMED com data vencida sem virar PLAYED como higiene de dados (adiado, sinal distinto); (b) restringir o
   nudge só às vencidas (crítico) se o Painel ficar denso.
   A **conversão real proposta→realizado por período** foi entregue na Sessão 249 (D243 — `proposalOutcomes`/`proposalOutcomeYears`
   em `src/lib/shows.ts` + `/shows/funil/conversao` + export: a coorte das propostas pela data de entrada no funil e o desfecho
   de cada uma, distinta da taxa de estado atual do `showPipeline`). Próximo possível para esta feature: (a) comparativo ano a
   ano da taxa de conversão real — **entregue na Sessão 250** (D244 — `compareProposalOutcomes` + tipo `ProposalConversionComparison`
   em `src/lib/shows.ts`, espelho de `compareShowPipelines`/D209, reusando `CONVERSION_TREND_EPSILON`; card `ConversionComparisonCard`
   "Conversão real {ano} vs. {ano-1}" 🟢/🔴/⚪ em `/shows/funil/conversao`, só com um ano específico e ambas as coortes tendo
   propostas decididas, ano anterior do mesmo acervo já carregado, zero I/O extra; +4 testes;
   **variação da vazão da coorte (`winRateDelta`) acrescida na Sessão 258/D253** — o card ganhou a linha secundária
   "Vazão da coorte" ao lado do delta da conversão real, cobrindo o caso em que a taxa das decididas sobe mas o
   throughput proposta→palco cai porque muita proposta ficou em aberto; o veredito segue ancorado na `conversionRate`); (b) um nudge no
   Painel se a taxa de conversão da coorte recente cair — **entregue na Sessão 251** (D245 — `proposalConversionHeadline` +
   constantes `CONVERSION_DROP_MIN_DECIDED`(=4)/`CONVERSION_DROP_POINTS`(=0.1)/`CONVERSION_DROP_CRITICAL_POINTS`(=0.25) em
   `src/lib/shows.ts`; banner 📉/🔴 "Conversão de propostas caindo" no Painel quando a taxa de conversão real deste ano caiu
   material frente à do ano passado, com amostra confiável em ambas as coortes; só a ponta de piora vira nudge; o Painel passou
   a incluir `statusEvents` na consulta de shows já existente — uma coluna a mais, sem consulta nova; +7 testes); (c) quando a amostra de tempo-em-etapa amadurecer, `?ano=`
   nela (o CSV já foi entregue na Sessão 243/D237). A **exportação CSV do comparativo ano a ano da conversão real (agregado)** foi
   entregue na Sessão 261 (D256 — `proposalConversionComparisonToCsv` + rota `/shows/funil/conversao/comparativo/export`, orientada a
   métrica no molde de `monthlyReportToCsv`, com o mesmo gate do card `ConversionComparisonCard`; espelho da D223 (rota
   `/comparativo/export` dedicada) no eixo da conversão), fechando a metade agregada que faltava — o eixo por contratante já tinha CSV
   com "vs. {ano-1}" (D250). A **coluna "vs. {ano-1}" no CSV do funil por contratante** foi
   entregue na Sessão 248 (D242 — `pipelineByContactToCsv` com `previous?`/`previousYear?` no molde de
   `clientConcentrationToCsv`/`withTrend`; a rota `/contatos/funil/export` computa o ano anterior espelhando a página).
   A **conversão real de propostas por contratante** foi entregue na Sessão 253 (D247 — `proposalOutcomesByContact` +
   `/shows/funil/conversao/contratantes` + export: de quais contratantes minhas propostas de fato fecham, a coorte da conversão
   real quebrada por quem paga). O **comparativo ano a ano por contratante** (movers) foi entregue na Sessão 254 (D248 —
   `compareContactProposalOutcomes` + tipos `ContactProposalConversionChange`/`ContactProposalConversionComparison` em
   `src/lib/shows.ts`, espelho de `compareContactPipelines`/D236 no eixo da conversão; card `ConversionMoversCard` "Para quem
   passei a fechar mais/menos · {ano} vs. {ano-1}" na página, só com um ano específico e ambas as coortes não-vazias, ano anterior
   dos mesmos `items` já carregados, zero I/O extra; +5 testes). A **coluna "vs. {ano-1}" por linha na tabela** foi entregue na
   Sessão 255 (D249 — `indexContactProposalConversionChanges` + tipo `ContactProposalConversionRowStatus<C>` em `src/lib/shows.ts`,
   espelho de `indexContactPipelineChanges`/D238 no eixo da coorte; a tabela ganha, só com comparativo exibível, a coluna "vs. {ano-1}"
   com a célula `ConversionRowDelta` (verde/vermelho/cinza/"novo"/"—"); +3 testes). Próximo possível para esta feature: (a) levar a
   coluna também ao CSV do export (no molde da D242); (b) nudge no Painel de contratante cuja conversão despencou (D247 alt. (e) /
   D248 alt. (b)) — adiável, o Painel já tem o nudge da conversão agregada (`proposalConversionHeadline`/D245) e um 2º eixo por
   contratante pode ficar barulhento.
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
   **Recorte por período (`?ano=`) no prazo de recebimento (tela-mãe)** entregue na Sessão 199 — `paymentLagYears<S>(shows, txs)`
   em `src/lib/finance.ts` (anos UTC desc dos shows com prazo mensurável — não cancelados e já com recebimento qualificável) +
   `PeriodPicker` em `/shows/prazo-recebimento` (página e export via `parseProfitYear`/`filterShowsByYear`, D108): DSO médio/mediano,
   baldes e tabela recortados pelo ano da `date` do show, empty state período-ciente, export `prazo-recebimento-<ano|todos>.csv`, ver D192.
   **Comparativo ano a ano do DSO** entregue na Sessão 200 — `comparePaymentLag(current, previous)` + `PaymentLagComparison<S>` +
   `PAYMENT_LAG_TREND_EPSILON` (=7 dias) em `src/lib/finance.ts` (espelho de `compareBookingLeadTime`/D187, mas com direção invertida:
   **descer** a mediana é a melhora, como em cancelamento/concentração) + card `PaymentLagComparisonCard` 🟢/🔴/⚪ "Prazo de recebimento
   {ano} vs. {ano-1}" em `/shows/prazo-recebimento`, exibido só com um ano específico e ambos os períodos com recebimento, com nota de
   amostra pequena abaixo de `MIN_MEDIAN_LAG_SAMPLE`; reaproveita os registros já carregados (ano anterior por `filterShowsByYear`, zero
   I/O extra), veredito na mediana, ver D193.
   **Recorte por período (`?ano=`) na tela por contratante** entregue na Sessão 201 — `PeriodPicker` +
   `paymentLagYears`/`parseProfitYear`/`filterShowsByYear` (D108/D192, zero lógica pura nova) em
   `/shows/prazo-recebimento/por-contratante` (página e export): filtra os shows pela `date` antes de agregar por contratante,
   então destaques/tabela/detalhe saem recortados sem tocar `paymentLagByContact`; empty state período-ciente, export herda
   `?ano=` no nome `prazo-recebimento-por-contratante-<ano|todos>.csv`, ver D194.
   **Comparativo ano a ano por contratante** entregue na Sessão 202 — `comparePaymentLagByContact` + card `PaymentLagMoversCard`
   "Quem mudou de ritmo · {ano} vs. {ano-1}" (quem acelerou 🟢 / desacelerou 🔴 + novos/sumidos), veredito na média ponderada, ver D195;
   **coluna "vs. {ano-1}" por linha na tabela** entregue na Sessão 203 — `indexContactPaymentLagChanges` +
   `ContactPaymentLagRowStatus` + `PaymentLagRowDelta`, o detalhe do card-manchete linha a linha (delta colorido pelo `trend` / "novo"
   / "—"), ver D196; **coluna "vs. {ano-1}" no CSV** entregue na Sessão 204 — 3º parâmetro `previousYear` em `paymentLagByContactToCsv`
   + `avgDaysDelta?`/`isNew?` em `PaymentLagByContactCsvRow` + `csvSignedDays`: `/shows/prazo-recebimento/por-contratante/export`
   ganha a coluna "vs. {ano-1} (dias)" (variação assinada / "novo" / branco) com o mesmo gate da página, sem `previousYear` a saída é
   idêntica à histórica, ver D197.
   **Lembrar a última escolha de contato "quem cobrar" por show** entregue na Sessão 205 — campo `Show.billingContactId` (`String?`)
   + helper puro `preferredBillingIndex(billings, preferredContactId?)` em `src/lib/billing.ts` (índice do preferido na lista já
   ordenada por prioridade; a lista **não reordena**, só a seleção inicial) + server action `setBillingContactAction` (grava só um
   contato do usuário vinculado ao show, senão limpa; confirma posse) + props `showId`/`initialIndex`/`action` em `BillingActions`
   (persiste na troca do seletor via form escondido). O seletor de `/shows/a-receber` reabre na última escolha do usuário para o
   show em vez de sempre voltar à prioridade automática, ver D198.
   Próximo possível —
   levar o prazo mediano por contratante também ao card do Painel (adiado na D130: o Painel já mostra o DSO mediano global via
   `paymentLagHeadline`); ou exportar o agregado por baldes de velocidade (5 linhas-resumo) se houver demanda (descartado
   na D132(a) por baixo valor de planilha); ou promover `billingContactId` a relação com `onDelete: SetNull` na migração a Postgres
   (adiado na D198).
4. **Sessões/segurança / gestão de conta**: invalidação ao trocar a senha entregue na Sessão 26
   (`passwordChangedAt` + `isSessionFresh`, ver D17); **troca do e-mail de acesso** entregue na Sessão 189
   — `changeEmailAction` + `changeEmailSchema` + `EmailForm.tsx` na página `/conta` (exige a senha atual,
   rejeita e-mail em uso ou igual ao atual), ver D182. Evoluções possíveis: "encerrar sessão específica"
   (lista de sessões revogáveis) e recuperação de senha por e-mail — adiáveis (sem SMTP no MVP, ver D4).
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
   veredito pela receita (`ahead`/`onPace`/`behind`/`insufficient`, ±10%). **Comparativo sazonal vs. mesmo mês do ano
   anterior** entregue na Sessão 168 — `monthYoYPace(txs, { now? })` em `src/lib/finance.ts` (reusa `currentMonthPace`
   para a projeção do mês corrente e compara com o mesmo mês do calendário −1 ano, já fechado: comparação cheio×cheio,
   eixo sazonal distinto da média móvel; `verdict` pela receita reusando `MONTH_PACE_EPSILON`) + card "Mesmo mês no ano
   passado" em `/financas/ritmo-do-mes`, ver D161. **Ritmo do ano (acumulado YTD vs. mesmo período do ano anterior)**
   entregue na Sessão 169 — `yearToDatePace(txs, { now? })` em `src/lib/finance.ts` soma o acumulado do ano corrente
   (1º jan → hoje, competência, UTC) e compara com o acumulado do ano anterior até o mesmo mês/dia (dois acumulados **reais**,
   sem projeção; clamp de fim-de-mês alinha bissexto) + página `/financas/ritmo-do-ano` (barra de % do ano, selo de veredito,
   cards de receita acumulada e tabela ano × ano × variação), registrada no hub, ver D162. Distinto de `crescimento` (anos
   fechados), `projecao-ano` (projeção do fechamento) e `monthYoYPace` (só o mês). **Nudge de ritmo do ano no Painel**
   entregue na Sessão 170 — `yearToDatePaceHeadline(pace)` em `src/lib/finance.ts` (espelho de
   `cashBurnHeadline`/`geoConcentrationHeadline`: decide só a exibição, mostra só quando `behind`; `YTD_PACE_CRITICAL_RATIO=0.75`
   escala para 🔴 no atraso ≥25%) + manchete 🐢/🔴 no `dashboard/page.tsx` (reusa as transações já carregadas, linka para
   `/financas/ritmo-do-ano`), ver D163. **Exportação CSV do ritmo do ano** entregue na Sessão 173 — `yearPaceToCsv(pace)` +
   `YEAR_PACE_CSV_HEADERS` em `src/lib/csv.ts` + `/financas/ritmo-do-ano/export` (Métrica/Ano corrente/Mesmo período do ano
   anterior/Variação (%)), uma linha por métrica (Receitas/Despesas/Resultado), variação assinada via `csvSignedPct` (branco
   sem base), sem linha Total, nome `ritmo-do-ano-{ano}.csv`, botão "⬇ CSV" só com `hasData`, ver D166. **Exportação CSV do ritmo do mês** entregue na
   Sessão 177 — `monthPaceToCsv(pace, yoy)` + `MONTH_PACE_CSV_HEADERS` em `src/lib/csv.ts` + `/financas/ritmo-do-mes/export?meses=N`
   achata os dois eixos de comparação numa única tabela (coluna "Base de comparação": Mês típico × Mesmo mês do ano anterior; uma
   linha por métrica em cada eixo, Base/Métrica/Projeção do mês/Comparação/Variação), reusa `csvSignedPct`, sem linha Total (como
   `yearPaceToCsv`), eixo do ano anterior sempre emitido (0,00 + variação em branco sem âncora sazonal), nome
   `ritmo-do-mes-{YYYY-MM}-{n}m.csv`, botão "⬇ CSV" só com `hasData`, ver D170. **Recorte "até o mesmo dia do ano passado"** entregue
   na Sessão 235 — `monthYoYPace` ganhou `lastYear*ToDate` + `*ToDateVsLastYear`: compara o **lançado até agora** com o lançado até
   o mesmo dia do mês no ano anterior (maçã-com-maçã, sem projeção — resposta ao "cedo no mês a projeção é frágil"); linha-nota
   "Sem depender da projeção: até hoje…" abaixo da tabela "Mesmo mês no ano passado", ver D221.
   Próximo possível —
   ponderar a projeção do mês por dia-da-semana/sazonalidade (hoje é pro-rata uniforme, hipótese frágil cedo no mês); ou um
   seletor que alterne o card de `/financas/ritmo-do-mes` entre o eixo "mês típico" (média móvel) e o eixo sazonal (ano anterior).
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
   **Cancelamentos por contratante** entregue na Sessão 184 — `cancellationByContact<C>(items, minSample=MIN_CANCELLATION_SAMPLE=3)`
   em `src/lib/contacts.ts` (família de `clientConcentration`, recebe `ContactWithShows<C>[]`) + `/contatos/cancelamentos`
   (cards de destaque taxa/cachê-perdido + tabela com barra por taxa), registrada no hub (Contatos/"Relacionamento"): a taxa de
   cancelamento por quem paga — quem mais fura o combinado. Mede por contato `totalShows`/`cancelledShows`/`cancellationRate`/
   `lostFee` + `reliable` (amostra >= minSample); rows só com ≥1 cancelamento, agregados somam todos os contatos com shows; contagem
   por relação (D18); ordenação reliable-first (selo "amostra pequena" resolve na apresentação, D123/D130); é a 1ª leitura da
   plataforma que **usa** os cancelados como sinal (o resto os exclui como ruído); distinta da taxa global do funil
   (`showPipeline.conversionRate`, sem recorte por contratante); **+8 testes**, ver D177.
   **Exportação CSV dos cancelamentos** entregue na Sessão 185 — `cancellationByContactToCsv` + `CANCELLATION_BY_CONTACT_CSV_HEADERS`
   em `src/lib/csv.ts` + `/contatos/cancelamentos/export` (Contratante/Papel/Cancelados/Shows/Taxa (%)/Cachê perdido (R$)/Amostra +
   Total da carteira), uma linha por contratante com ≥1 cancelamento na ordem da página, botão "⬇ CSV" gated por `hasData`, ver D178.
   **Nudge no Painel** entregue na Sessão 186 — `cancellationHeadline(report, highRate=0.3, criticalRate=0.5)` em
   `src/lib/contacts.ts` (espelho de `clientConcentrationHeadline`: filtra as linhas **confiáveis** com taxa ≥ `highRate`, o pior
   vira a manchete) + banner-link 🟠/🔴 em `dashboard/page.tsx` após os nudges de concentração de clientes/geo, pivotando em memória
   os shows-com-contatos já carregados (sem I/O extra); contatos de amostra pequena são ignorados no alarme (a página os anota, o
   Painel só toca com sinal confiável) e o limiar 0.3 mantém o banner raro (ressalva de densidade da D177(e)), ver D179.
   **Recorte por período (`?ano=`)** entregue na Sessão 187 — `PeriodPicker` (D119) na página e no export de
   `/contatos/cancelamentos`, reaproveitando `parseProfitYear`/`filterShowsByYear` (D108); os anos vêm do novo helper puro
   `cancelledShowYears(items)` (anos UTC dos shows **cancelados**, não dos ativos, para o seletor nunca cair numa lista vazia),
   filtra os shows de cada contato antes de `cancellationByContact`, CSV com ano no nome, ver D180.
   **Comparativo ano a ano da taxa de cancelamento** entregue na Sessão 188 — `compareCancellationRate` +
   `CancellationComparison` + `CANCELLATION_TREND_EPSILON` em `src/lib/contacts.ts` (espelho de
   `compareGeoConcentration`/`compareClientConcentration` no eixo de cancelamento, mas **subir** a taxa é a piora) + card
   "Taxa de cancelamento {ano} vs. {ano-1}" em `/contatos/cancelamentos`, exibido só com um ano específico e o ano anterior
   com shows vinculados, ver D181.
   Próximo possível — parametrizar o limiar do nudge se ele se mostrar barulhento; ou um nudge de tendência da taxa no
   Painel (adiado: o Painel já tem o nudge de pior contratante via `cancellationHeadline`).
   **Funil por contratante** entregue na Sessão 190 — `pipelineByContact(items)` em `src/lib/contacts.ts`
   (família de `cancellationByContact`/`clientConcentration`) + `/contatos/funil` (cards da carteira: cachê em
   aberto / em negociação / confirmado / concretização; tabela por contratante). Agrega o pipeline **aberto**
   (PROPOSED + CONFIRMED) por quem paga — `openValue`/`openCount`, proposto e confirmado separados, e a taxa de
   concretização histórica (`conversionRate` = PLAYED / decididos, `—` sem shows decididos). Só entram contatos
   com pipeline aberto; agregados da carteira somam todos com shows; ordena por cachê aberto desc. Distinto do
   funil geral (D42, agregado sem pagador), dos cancelamentos (D177, passado) e dos recebíveis por contratante
   (D92, já tocados e não pagos): é o **futuro em aberto por relação**. Registrado no hub (Contatos / "Quem move a
   carreira", 🔭) + cross-link ↔ funil geral; **+8 testes**, ver D183. **Exportação CSV** entregue na Sessão 191
   — `pipelineByContactToCsv` + `PIPELINE_BY_CONTACT_CSV_HEADERS` em `src/lib/csv.ts` + `/contatos/funil/export`
   (uma linha por contratante com pipeline aberto na ordem da página + Total com contagens por etapa em branco,
   mesma distinção linhas×carteira de `cancellationByContactToCsv`), sem `?ano=`, nome `funil-por-contratante.csv`,
   botão "⬇ CSV" gated por `hasData`, **+3 testes**, ver D184. Próximo possível — recorte por ano
   (`?ano=`, adiado: o pipeline aberto é retrato do "agora/à frente" e cruza anos), ou um nudge do maior pipeline
   aberto no Painel (adiado: Painel já denso e sobrepõe o card de funil geral).

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
   **Praças para revisitar** entregue na Sessão 234 — `findCitiesToReengage(shows, opts)` + tipos
   `CityReengageShowLike`/`CityReengageRow`/`CityReengageList`/`CityReengageOptions` + `CITY_REENGAGE_STALE_DAYS`(=90) em
   `src/lib/finance.ts` (análogo geográfico de `findContactsToReengage`/contacts.ts, reusando
   `normalizeText`/`utcMidnight`/`DAY_MS`/`pickLabel`) + rota `/shows/cidades/revisitar` (tabela Cidade/Último show/Sem
   tocar/Shows/Cachê histórico + card de prioridade + empty-state) + link "📍 Revisitar" no cabeçalho de `/shows/cidades` +
   entrada no hub (`REPORT_GROUPS`, "Agenda & pipeline", 📍): as cidades onde já toquei, sem nada agendado e há ≥90 dias sem
   show — o 1º sinal **de recência** por praça (a geografia só tinha concentração/D113 e P&L/D111, ambas sobre dinheiro).
   Ignora shows sem cidade e cancelados; ordena pelas mais esquecidas, desempatando por cachê acumulado; **+8 testes**, ver
   D229. **Exportação CSV** entregue na Sessão 236 — `citiesToReengageToCsv` + `CITIES_REENGAGE_CSV_HEADERS` (Cidade / Último
   show / Dias sem tocar / Shows / Cachê histórico) em `src/lib/csv.ts` (irmão geográfico de `reengageToCsv`/D127: uma linha
   por praça na ordem da página + Total) + rota `/shows/cidades/revisitar/export` + botão "⬇ CSV" só com `list.count > 0`, sem
   `?ano=` (a leitura é sobre o histórico inteiro, D229(d)); **+3 testes**, ver D230.
   **Versão por local/venue** entregue na Sessão 237 — `findVenuesToReengage` (+ tipos + `VENUE_REENGAGE_STALE_DAYS`) em
   `src/lib/finance.ts` delegando ao núcleo puro compartilhado `collectPlacesToReengage` (extraído de `findCitiesToReengage`,
   DRY) + página `/shows/locais/revisitar` + link "🏛 Revisitar" em `/shows/locais` + entrada no hub + CSV
   `venuesToReengageToCsv`/`/shows/locais/revisitar/export`; **+9 testes** (6 finance + 3 csv), ver D231.
   **Nudge no Painel "praça para revisitar"** entregue na Sessão 238 — `citiesToReengageHeadline(list, minPastShows?)` +
   `CitiesToReengageHeadline` + `REENGAGE_HEADLINE_MIN_PAST_SHOWS`(=2) em `src/lib/finance.ts` (destila a praça mais esquecida
   COM lastro ≥ 2 shows; disciplina anti-ruído na manchete, não na lista) + banner brand "📍 Praça para revisitar" em
   `dashboard/page.tsx` (eixo cidade, zero I/O extra), ver D232.
   **Janela de dormência configurável (`?dias=`)** entregue na Sessão 252 — `parseReengageWindow` + presets
   `REENGAGE_WINDOW_PRESETS`(=[60, 90, 180, 365]) + limites [1, 730] em `src/lib/finance.ts` (espelho de `parseWeekendWindow`) +
   componente compartilhado `ReengageWindowPicker` nas telas `/shows/cidades/revisitar` e `/shows/locais/revisitar` (e nos exports,
   com o nome do arquivo ancorado na janela); o núcleo puro já aceitava `staleDays`, então a página só parseia e passa. O nudge do
   Painel segue com a janela padrão de 90 (leitura de "agora"). Fecha o "próximo possível" do `staleDays`=90 fixo, ver D246.
   Próximo possível — o `minPastShows`=2 do nudge (D232) continua uma **hipótese** sinalizada nos bloqueios; ou um nudge simétrico
   no eixo casa/venue (adiável: um só nudge de rebooking por vez, no eixo cidade — mais amplo).
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
   nome fixo `agenda-pagar-receber.csv`, botão "⬇ CSV" só com `agenda.count > 0`, ver D157. **Exportação CSV da projeção de
   caixa** entregue na Sessão 171 — `cashflowProjectionToCsv` + `CASHFLOW_PROJECTION_CSV_HEADERS` em `src/lib/csv.ts` +
   `/financas/fluxo-de-caixa/export` (Mês/A receber/A pagar/Variação/Saldo ao fim + linha Total cujo saldo é o projetado
   final, não soma-de-saldos), horizonte `?meses=` compartilhado via `parseCashflowHorizon`/`CASHFLOW_HORIZON_PRESETS`
   (preset-only, distinto do clamp de `parseBurnWindow`), nome `fluxo-de-caixa-projetado-{n}m.csv`, emite a janela inteira
   (meses parados inclusos), botão "⬇ CSV" só com `hasPending || startBalance !== 0`, ver D164. **Exportação CSV da meta de
   faturamento por mês** entregue na Sessão 174 — `monthlyGoalProgressToCsv` + `MONTHLY_GOAL_CSV_HEADERS` em `src/lib/csv.ts` +
   `/financas/metas/export?ano=YYYY` (Mês/Alvo/Recebido/Falta/Atingido %/Situação + linha Total cujo alvo é a meta anual e cuja
   situação resume "N/12 batidos"), reusa a consulta da página, herda o `?ano=` do seletor de ano da tela, nome
   `metas-mensal-{ano}.csv`, botão "⬇ CSV" no card "Meta por mês" (só com `monthly.goal > 0`), ver D167. **Exportação CSV da
   meta de faturamento por trimestre** entregue na Sessão 175 — `quarterlyGoalProgressToCsv` + `QUARTERLY_GOAL_CSV_HEADERS` em
   `src/lib/csv.ts` + `/financas/metas/trimestral/export?ano=YYYY` (Trimestre/Alvo/Recebido/Falta/Atingido %/Situação + linha
   Total cujo alvo é a meta anual e cuja situação resume "N/4 batidos"), espelho mais grosso da mensal (D167), reusa a
   consulta/`?ano=` da página, nome `metas-trimestral-{ano}.csv`, botão "⬇ CSV" no card "Meta por trimestre" (só com
   `quarterly.goal > 0`), ver D168 — fecha a rota irmã adiada na D167(c). **Exportação CSV da projeção de fechamento do ano**
   entregue na Sessão 178 — `yearEndProjectionToCsv(view)` + `YEAR_END_PROJECTION_CSV_HEADERS` em `src/lib/csv.ts` +
   `/financas/projecao-ano/export?ano=YYYY&cenario=...` (Grupo/Componente/Valor (R$)/Participação (%): composição de Receitas,
   Despesas e Resultado projetado do cenário escolhido, espelhando os dois cards da página; linha "Custo fixo estimado" só no pior
   caso; cenário+ano no nome `projecao-ano-{ano}-{cenario}.csv`), reusa consulta/parsing da página, botão gated por `hasAnything`,
   ver D171 — a avaliação caso a caso da projeção-ano deu positiva (a tela tem composição tabular, não só número único).
   **Exportação CSV dos conflitos de agenda** entregue na Sessão 179 — `scheduleConflictsToCsv` + `SCHEDULE_CONFLICTS_CSV_HEADERS`
   em `src/lib/csv.ts` + `/shows/conflitos/export` (Dia/Situação/Show/Horário/Local/Cidade/Status/Cachê (R$) + linha Total
   "N/M a resolver"), do lado Shows: uma linha por show dos dias em conflito (`findScheduleConflicts`), nome fixo
   `conflitos-de-agenda.csv`, botão "⬇ CSV" só com `dayCount > 0`, ver D172. **Exportação CSV dos custos fixos recorrentes**
   entregue na Sessão 180 — `recurringExpensesToCsv` + `RECURRING_EXPENSES_CSV_HEADERS` em `src/lib/csv.ts` +
   `/financas/custos-fixos/export` (Categoria/Conta típica/mês/Meses ativos/Janela/Última/Total/Situação + linha Total cuja conta
   típica é o custo fixo mensal estimado só-ativas e cuja situação resume "N/M ativas"), uma linha por categoria recorrente na ordem
   da página, sem `?ano=`, nome fixo `custos-fixos.csv`, botão "⬇ CSV" só com `categories.length > 0`, ver D173.
   **Exportação CSV do relatório mensal** entregue na Sessão 181 — `monthlyReportToCsv(view)` + `MONTHLY_REPORT_CSV_HEADERS` em
   `src/lib/csv.ts` + `/financas/relatorio/export?mes=YYYY-MM` (Base de comparação/Métrica/Valor do mês (R$)/Comparação (R$)/
   Variação (%): seção "Mês atual" com as 4 métricas + pendências do mês, depois os eixos "Mês anterior" e "Média dos últimos N
   meses" só quando a página os exibiria; variação via `csvDeltaPct` "novo"/assinada), repete a composição da página
   (`AVERAGE_WINDOW=3`, regra ≥2 meses), nome `relatorio-{YYYY-MM}.csv`, botão "⬇ Relatório (CSV)" (o dump bruto que já havia virou
   "⬇ Transações (CSV)"), distinto de `categoryVariationToCsv` (lá o eixo são categorias), ver D174 — fecha o candidato natural
   apontado na D173.
   **Antecedência de agendamento** entregue na Sessão 192 — `bookingLeadTime` + `/shows/antecedencia` + `bookingLeadTimeToCsv` +
   `/shows/antecedencia/export`: primeiro uso de `createdAt` como eixo (com quanta antecedência os shows entram na agenda), ver D185.
   Próximo possível para esta feature: (a) recorte por `?ano=`/`PeriodPicker` (entregue, D186); (b) restringir a amostra a
   CONFIRMED+PLAYED (compromissos firmes) como visão alternativa (entregue, D190); (c) nudge no Painel se a antecedência mediana cair
   a um piso curto (entregue, D189).
   **Antecedência por contratante** entregue na Sessão 273 — `bookingLeadTimeByContact(shows, getBooker, scope)` + tipos
   `BookingLeadTimeByContact`/`ContactBookingLeadTimeRow`/`LeadTimeShowReading` em `src/lib/shows.ts` (roda `bookingLeadTime` por grupo
   de contratante via `pickPayerContact`, o eixo dos recebíveis; `overall` = a leitura da carteira inteira; ordena do menor lead
   mediano ao maior, "Sem contratante" por último; destaques só entre amostra confiável) + página `/shows/antecedencia/por-contratante`
   (seletor de escopo, destaques + tabela + detalhe) + export `bookingLeadTimeByContactToCsv` + entrada no hub + link na tela-mãe:
   quem te fecha com folga × quem só chama em cima da hora. Espelho de `paymentLagByContact` (D194) no eixo da antecedência, ver D268.
   **+13 testes.** Recorte por `?ano=`/`PeriodPicker` entregue na Sessão 274 (D269) e o **comparativo ano-a-ano por contratante**
   entregue na Sessão 275 (D270 — `compareBookingLeadTimeByContact` + `indexContactBookingLeadTimeChanges` + card "Quem mudou o
   ritmo de agenda" + coluna "vs. {ano-1}" na tabela e no CSV): fecha as duas alternativas então adiadas. A feature de
   antecedência por contratante está em paridade total com o eixo de recebíveis (escopo + ano + comparativo YoY). O **nudge no
   Painel quando um contratante recorrente passa a fechar em cima da hora** foi entregue na Sessão 277 (D272 —
   `contactBookingLeadTimeDropHeadline` + banner no `dashboard/page.tsx`, espelho de `contactConversionDropHeadline` no eixo da
   antecedência, cedendo a vez ao nudge absoluto `bookingLeadTimeHeadline`): fecha o "próximo possível" antes adiado. A feature de
   antecedência por contratante agora tem tela dedicada + comparativo YoY + nudge no Painel — paridade total com a conversão.
   **Comparativo ano a ano do prazo de recebimento por contratante** entregue na Sessão 202 — `comparePaymentLagByContact` +
   `PaymentLagByContactComparison`/`ContactPaymentLagChange` em `src/lib/finance.ts` + card `PaymentLagMoversCard` "Quem mudou de
   ritmo" em `/shows/prazo-recebimento/por-contratante`: quem começou a te pagar mais rápido/devagar de um ano para o outro
   (biggest improvement/worsening + novos/sumidos), ancorado na média por conta da amostra pequena por pagador, ver D195 — fecha o
   "passo maior" adiado na D194(item 5). Próximo possível para esta feature: (a) coluna "vs. {ano-1}" por linha na tabela (adiado,
   ruído para amostras pequenas); (b) export CSV do comparativo (adiado, o card de extremos entrega o sinal acionável).
   Fora dela, o eixo de exportação tabular segue **esgotado** e próximas sessões podem evoluir feature maior (calendário drag&drop,
   log de transições do funil, ~~recuperação de senha~~).
   **Recuperação de senha** entregue na Sessão 264 — fluxo deslogado "esqueci a senha" → link de redefinição (token de uso único,
   hash SHA-256 no banco, validade de 60 min) → nova senha, em `src/lib/passwordReset.ts` + `(auth)/actions.ts`
   (`requestPasswordResetAction`/`resetPasswordAction`) + rotas `/esqueci-senha` e `/redefinir-senha` + link/banner no login, ver D259.
   **Bloqueio:** produção exige um provedor de e-mail real (hoje o link só é surfado em dev/log). Próximo possível — (a) integrar um
   provedor de e-mail (Resend/SendGrid/SMTP) para entregar o link de fato; (b) botão "reenviar link"; ~~(c) rate-limit por e-mail/IP nos
   pedidos (anti-abuso)~~ (rate-limit por conta entregue na Sessão 265, D260 — 3 pedidos/60 min; falta o eixo por IP); ~~(d) limpeza
   periódica de tokens expirados~~ (limpeza **oportunista** entregue na Sessão 271, D266 — `isResetTokenPrunable` em
   `src/lib/passwordReset.ts` + `deleteMany` escopado ao usuário em `requestPasswordResetAction`: ao pedir um novo link, apaga os
   tokens já mortos — consumidos/expirados — e antigos (fora da janela do rate-limit) da própria conta, mantendo a tabela enxuta sem
   cron, sem tocar no rate-limit nem no token válido pendente; **+7 testes**).
   **Duplicar show** entregue na Sessão 225 — `buildDuplicatedShow` + `duplicateShowAction` + botão "Duplicar" no detalhe do show:
   primeiro atalho operacional de redução de atrito (residências / eventos recorrentes), ver D218.
   **Seletor de intervalo (semanal/quinzenal/mensal)** entregue na Sessão 226 — `parseDuplicateInterval` + `DUPLICATE_INTERVAL_WEEKS`
   (`weekly:1`/`biweekly:2`/`monthly:4`) + `DEFAULT_DUPLICATE_INTERVAL`/tipo `DuplicateInterval` em `src/lib/shows.ts` + `<select>`
   "intervalo" na tela de detalhe do show ligando direto no `weeksAhead` já testado; a action lê `formData.get("intervalo")` e repassa a
   `buildDuplicatedShow`; "mensal ≈ 4 semanas" preserva o dia da semana, default semanal preserva o comportamento da D218, ver D219.
   **Duplicação em lote** entregue na Sessão 227 — `buildDuplicatedShowSeries(show, weeksAhead, count)` + `parseDuplicateCount` +
   `DUPLICATE_COUNT_PRESETS` (1/2/4/8/12) + `MAX_DUPLICATE_COUNT` (=12) em `src/lib/shows.ts` + segundo `<select>` "quantidade" no detalhe do
   show; a `duplicateShowAction` cria as N cópias (espaçadas pela cadência da D219) atomicamente via `prisma.$transaction`, redirecionando à
   edição só quando é 1 cópia (senão volta à lista), ver D220.
   **Botão "Duplicar" também na lista de shows** entregue na Sessão 229 — botão-ícone "⧉ Duplicar" por linha em `/shows`
   (`<form action={duplicateShowAction}>` irmão do `<Link>` da linha; sem seletores, usa os padrões server-side → 1 cópia semanal →
   abre a edição, fluxo "duplicar → editar" da D218) + backfill de +4 testes de integração de `duplicateShowAction`, ver D222 — fecha a
   alternativa (c). Próximo possível para esta feature: (d) lembrar o último intervalo/
   quantidade escolhidos por show (adiado na D219/D220: ação de um clique com palpite sensato); (e) redirecionar o lote para o calendário em
   vez da lista, se houver demanda.

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** em `personas-and-needs.md` (CRM, multiusuário)
  precisam de 5–10 entrevistas com músicos reais antes de investimento pesado.
- **Reserva para impostos (Sessão 50/D41)**: a alíquota padrão de 6% é **hipótese** (faixa inicial do
  Simples Nacional). O regime real do músico (MEI/Simples/carnê-leão) varia muito — confirmar com
  contador a alíquota e o modelo (faturamento bruto vs. lucro/progressivo) antes de virar premissa fixa.
- Foco **português/LATAM** e faixas de preço (`business-plan.md`) são hipóteses — validar.
- **Praças para revisitar (D229)**: o limiar padrão de 90 dias sem tocar (`CITY_REENGAGE_STALE_DAYS`) para
  considerar uma cidade "fria" é **hipótese** — a cadência natural de retorno a uma praça varia por gênero/
  circuito. Validar com músicos em turnê antes de virar premissa fixa. O `minPastShows`=2 do nudge do Painel
  (`REENGAGE_HEADLINE_MIN_PAST_SHOWS`/D232) — lastro mínimo p/ empurrar uma praça — também é heurística a validar.
- **Propostas paradas (D240)**: os limiares `STALE_PROPOSAL_DAYS`=21 (dias sem movimento em PROPOSED para
  virar "parada") e `STALE_PROPOSAL_IMMINENT_DAYS`=14 (janela de decisão iminente) são **hipóteses** — a
  cadência natural de fechamento de uma proposta varia por circuito/gênero. Validar com músicos antes de
  virar premissa fixa.
- **Queda de conversão no Painel (D245)**: os limiares `CONVERSION_DROP_POINTS`=0.10 (queda mínima da taxa,
  em pontos, para o nudge disparar), `CONVERSION_DROP_CRITICAL_POINTS`=0.25 (queda que vira crítico) e
  `CONVERSION_DROP_MIN_DECIDED`=4 (amostra mínima de propostas decididas por coorte) são **hipóteses** — o
  que conta como "queda material" e "amostra confiável" da conversão real varia por circuito/volume. Validar
  com músicos antes de virar premissa fixa.
- **Rate-limit de redefinição de senha (D260)**: `RESET_REQUEST_MAX_PER_WINDOW`=3 pedidos e
  `RESET_REQUEST_WINDOW_MINUTES`=60 min são **hipóteses** — quantos pedidos de link por hora contam como
  uso legítimo vs. abuso não foi medido com uso real. Validar antes de virar premissa fixa. Falta ainda o
  eixo por IP (a server action não lê o IP do request) — somar quando houver provedor de e-mail/borda real.
- **Gargalo de tempo no funil (D285)**: os limiares `STAGE_BOTTLENECK_SHARE`=0.5 (fatia do tempo de
  percurso concentrada na etapa PROPOSED para o nudge disparar), `STAGE_BOTTLENECK_CRITICAL_SHARE`=0.7 (fatia
  que vira crítico) e `STAGE_BOTTLENECK_MIN_SHOWS`=4 (amostra confiável de shows) são **hipóteses** — a
  distribuição natural do tempo por etapa num funil saudável varia por circuito/gênero. Validar com músicos
  antes de virar premissa fixa.
- **Erosão da faixa premium (D293)**: os limiares `PREMIUM_EROSION_MIN_POINTS`=0.15 (queda mínima da
  participação premium, em pontos, para o nudge disparar) e `PREMIUM_EROSION_CRITICAL_POINTS`=0.30
  (queda que vira crítico) são **hipóteses** — quantos pontos de participação da faixa "Acima de
  R$ 5.000" contam como "esvaziamento material/crítico" do topo varia por circuito/preço. Validar
  com músicos antes de virar premissa fixa.
- **Segurança em produção**: definir `AUTH_SECRET` forte e migrar para PostgreSQL antes
  de qualquer deploy real. Revisar advisories do Next (D6) e planejar upgrade p/ Next 15+.
