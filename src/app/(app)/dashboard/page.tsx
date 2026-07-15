import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  summarizeFinances,
  summarizeOverdue,
  totalsByMonth,
  totalsByCategory,
  computeShowPnL,
  projectCashflow,
  reconcileShowFees,
  bucketReceivablesByAge,
  summarizePaymentPromises,
  receivablesAwaitingPromise,
  awaitingPromiseHeadline,
  promisesDueSoonHeadline,
  PROMISE_DUE_SOON_DAYS,
  paymentLag,
  paymentLagHeadline,
  paymentLagByContact,
  comparePaymentLagByContact,
  contactPaymentLagRiseHeadline,
  showPipeline,
  projectYearEnd,
  projectYearEndWithFixedCosts,
  projectYearEndPessimistic,
  applyYearEndScenario,
  compareYearEndToPrevious,
  recurringExpenses,
  pendingFixedCosts,
  filterShowsByYear,
  computeBreakEven,
  breakEvenHeadline,
  computeGoalProgress,
  compareGoalScenarios,
  goalRunRate,
  quarterlyGoalProgress,
  monthlyGoalProgress,
  cashRunway,
  cashBurnRunway,
  cashBurnHeadline,
  yearToDatePace,
  yearToDatePaceHeadline,
  feeDistribution,
  compareFeeDistribution,
  feeDropHeadline,
  feePremiumErosionHeadline,
  rankContactsByProfit,
  clientConcentration,
  clientConcentrationHeadline,
  rankCitiesByProfit,
  geoConcentration,
  geoConcentrationHeadline,
  gigSeasonality,
  gigSeasonalityHeadline,
  gigSeasonalityLull,
  findCitiesToReengage,
  citiesToReengageHeadline,
  type CityReengageShowLike,
  type TxLike,
  type ContactProfitContact,
  type QuarterGoalStatus,
  type ReceivableShowLike,
  type PromisableShowLike,
  type ShowLike,
  type BreakEvenShowLike,
  type YearEndShowLike,
  type MetricDelta,
  type PaymentSpeedBucketKey,
} from "@/lib/finance";
import {
  findScheduleConflicts,
  findOpenWeekends,
  formatWeekendLabel,
  bookingLeadTime,
  bookingLeadTimeHeadline,
  bookingLeadTimeByContact,
  compareBookingLeadTimeByContact,
  contactBookingLeadTimeDropHeadline,
  findStaleProposals,
  staleProposalsHeadline,
  funnelStageDurations,
  stageTimeBottleneckHeadline,
  proposalOutcomes,
  compareProposalOutcomes,
  proposalConversionHeadline,
  proposalOutcomesByContact,
  compareContactProposalOutcomes,
  contactConversionDropHeadline,
  showGaps,
  currentDrySpellHeadline,
  proposalDeliberationByContact,
  slowDeliberatorHeadline,
  compareProposalDeliberationByContact,
  contactDeliberationRiseHeadline,
  buildFunnelActivityFeed,
  funnelActivitySeasonality,
  funnelActivitySeasonalityHeadline,
  funnelActivitySeasonalityLull,
  type ConflictShowLike,
  type LeadTimeShowLike,
  type StaleProposalShowLike,
  type StageDurationShowLike,
  type ProposalOutcomeShowLike,
  type ShowGapShowLike,
} from "@/lib/shows";
import {
  cancellationByContact,
  cancellationHeadline,
  pipelineByContact,
  pipelineByContactHeadline,
  type ContactRankLike,
} from "@/lib/contacts";
import { pickPayerContact } from "@/lib/billing";
import { formatMoney } from "@/lib/money";
import { formatDate, formatMonthKey } from "@/lib/format";
import { SHOW_STATUS_LABELS, SHOW_STATUS_COLORS, type ShowStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";

// Cor da mini-barra das tiras compactas do card de meta (trimestre e mês), por
// status (mesma semântica das cores da página de Metas: batido=verde, abaixo=âmbar,
// em andamento=marca, a seguir=cinza). `MonthGoalStatus` é alias de `QuarterGoalStatus`.
// Ver D85 / quarterlyGoalProgress, D87 / monthlyGoalProgress.
const GOAL_BAR: Record<QuarterGoalStatus, string> = {
  hit: "bg-emerald-500",
  missed: "bg-amber-500",
  "in-progress": "bg-brand-500",
  upcoming: "bg-gray-300",
};

export default async function DashboardPage() {
  const user = await requireUser();

  const currentYear = new Date().getFullYear();
  const [transactions, shows, upcoming, revenueGoal] = await Promise.all([
    prisma.transaction.findMany({ where: { userId: user.id } }),
    prisma.show.findMany({
      where: { userId: user.id },
      include: {
        contacts: {
          select: { contact: { select: { id: true, name: true, role: true } } },
        },
        // Histórico de status: alimenta a coorte da conversão real (proposta →
        // palco) do nudge de conversão caindo (D245). Só toStatus/createdAt bastam
        // à agregação, mas incluímos fromStatus para casar o shape de StatusEventLike.
        statusEvents: {
          select: { fromStatus: true, toStatus: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.show.findMany({
      where: { userId: user.id, date: { gte: new Date() }, status: { not: "CANCELLED" } },
      orderBy: { date: "asc" },
      take: 5,
    }),
    prisma.revenueGoal.findUnique({
      where: { userId_year: { userId: user.id, year: currentYear } },
    }),
  ]);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const summary = summarizeFinances(txs);
  const overdue = summarizeOverdue(txs);
  // Custos fixos recorrentes ainda não lançados neste mês (lembrete acionável).
  const fixedCostsDue = pendingFixedCosts(txs);
  const monthly = totalsByMonth(txs).slice(-6);
  const categories = totalsByCategory(txs).slice(0, 5);
  const cashflow = projectCashflow(txs, { months: 6 });
  const hasProjection = cashflow.months.some((m) => m.income > 0 || m.expense > 0);

  // Projeção de fechamento do ano corrente (reaproveita os shows/transações já
  // carregados; sem consulta extra). Só vale a pena mostrar quando há um
  // componente futuro (pendência ou cachê agendado) que muda o caixa realizado.
  const forecast = projectYearEnd(txs, shows as YearEndShowLike[], currentYear);
  // Progresso da meta de faturamento do ano corrente (reaproveita o forecast já
  // computado; sem consulta extra além do lookup da meta). Só vira card quando o
  // usuário definiu uma meta para o ano.
  const goalProgress = revenueGoal
    ? computeGoalProgress(
        {
          goal: revenueGoal.amount,
          realized: forecast.realizedIncome,
          projected: forecast.projectedIncome,
          year: currentYear,
        },
        {},
      )
    : null;
  const hasForecast =
    forecast.scheduledIncome > 0 ||
    forecast.pendingIncome > 0 ||
    forecast.pendingExpense > 0;
  // "Estou indo melhor que ano passado?": compara a projeção do ano com o
  // fechamento do anterior (D63). Os shows do ano anterior já vêm na mesma
  // consulta `shows`, então não há I/O extra; só vira badge quando há base.
  const yoy = compareYearEndToPrevious(
    forecast,
    projectYearEnd(txs, shows as YearEndShowLike[], currentYear - 1),
  );
  // Cenário conservador "com custos fixos": soma o custo fixo recorrente típico
  // (D39) aos meses futuros do ano sem despesa lançada, fechando a assimetria da
  // projeção crua (D60/D62). Opt-in: só vira linha quando há custo fixo a estimar.
  const fixedScenario = projectYearEndWithFixedCosts(
    forecast,
    txs,
    recurringExpenses(txs).estimatedMonthlyFixedCost,
  );
  const hasFixedScenario =
    fixedScenario.applicable && fixedScenario.estimatedRemainingFixedCost > 0;
  // Piso conservador: "e se só os shows JÁ confirmados se pagarem?" (D66). Remove
  // os cachês de shows ainda a confirmar da receita projetada. Só vira linha
  // quando há cachê tentativo a descartar (caso contrário coincide com o cru).
  const conservative = applyYearEndScenario(forecast, "conservative");
  const hasConservativeFloor = forecast.scheduledTentative > 0;
  // Piso conservador da META: "bato a meta mesmo que só os shows confirmados se
  // paguem?". Reaproveita as duas projeções já computadas (otimista = forecast,
  // conservadora = `conservative`); sem I/O nem recálculo. Só vira aviso no card
  // de meta quando os cenários divergem (há cachê a confirmar separando-os) — ver D79.
  const goalScenarios =
    revenueGoal && goalProgress
      ? compareGoalScenarios(
          {
            goal: revenueGoal.amount,
            realized: forecast.realizedIncome,
            year: currentYear,
            projectedOptimistic: forecast.projectedIncome,
            projectedConservative: conservative.projectedIncome,
          },
          {},
        )
      : null;
  // Ritmo necessário no resto do ano (D81): o número acionável que falta ao
  // `pace` — "preciso receber R$ X/mês para fechar a meta". Reaproveita o
  // `goalProgress` já computado (sem I/O nem recálculo). Só vira linha no card
  // quando é acionável (ano corrente, meta > 0) e a meta ainda não foi batida.
  const goalRun = goalProgress ? goalRunRate(goalProgress, {}) : null;
  // Meta por trimestre (D85): quebra a meta anual em 4 alvos iguais cruzados com o
  // recebido (caixa) de cada trimestre, respondendo "em qual trimestre fiquei para
  // trás?". Reaproveita as transações já carregadas (sem I/O extra). Só vira a tira
  // compacta no card de meta quando há meta definida para o ano corrente.
  const quarterly = revenueGoal
    ? quarterlyGoalProgress(txs, currentYear, revenueGoal.amount, {})
    : null;
  // Meta por mês (D87): a mesma quebra, em 12 alvos iguais — uma tira-sparkline que
  // mostra de relance em qual mês o ritmo caiu. O detalhe está em /financas/metas.
  const monthlyGoal = revenueGoal
    ? monthlyGoalProgress(txs, currentYear, revenueGoal.amount, {})
    : null;
  // Pior caso: cruza os dois eixos conservadores num só piso — receita só de shows
  // confirmados (D66) E despesa somando o custo fixo recorrente futuro (D62), ver
  // D68. Só vira linha quando AMBOS os eixos mordem; sem um deles, o pior caso
  // coincide com a linha "Só confirmados" ou "Com custos fixos" já mostrada acima.
  const pessimistic = projectYearEndPessimistic(
    forecast,
    txs,
    recurringExpenses(txs).estimatedMonthlyFixedCost,
  );
  const hasPessimisticFloor =
    pessimistic.droppedTentative > 0 &&
    pessimistic.estimatedRemainingFixedCost > 0;
  const pipeline = showPipeline(shows as ShowLike[]);
  const receivables = reconcileShowFees(shows as PromisableShowLike[], txs);
  const receivablesAging = bucketReceivablesByAge(receivables);
  // Recebível "encalhado": parado há mais de 90 dias (balde "older" do aging).
  const staleReceivables = receivablesAging.buckets.find((b) => b.key === "older");
  const hasStaleReceivables = staleReceivables != null && staleReceivables.count > 0;
  // Promessas de pagamento furadas: contratante prometeu pagar e a data passou.
  const receivablePromises = summarizePaymentPromises(receivables.rows);
  // Cobrança que ainda nem começou: recebíveis vencidos há ≥30 dias para os quais
  // NENHUMA promessa foi registrada — o dinheiro mais fácil de esquecer (D287). O
  // sinal já vive na tela /shows/a-receber; aqui vira segmento do banner de recebíveis.
  const awaitingPromiseHead = awaitingPromiseHeadline(
    receivablesAwaitingPromise(receivables.rows),
  );
  // Lado positivo dos recebíveis: das promessas que o contratante fez e ainda estão
  // no prazo, quais vencem já-já — o dinheiro que se pode esperar na semana (D291).
  const promisesDueSoon = promisesDueSoonHeadline(receivablePromises);

  // Prazo de recebimento realizado (DSO): sobre o cachê que JÁ entrou, em quantos
  // dias depois do show o dinheiro caiu no caixa. Reaproveita os shows/transações
  // já carregados. Só vira card com amostra mínima de shows pagos (ver D70).
  const lagHeadline = paymentLagHeadline(
    paymentLag(shows as ReceivableShowLike[], txs),
  );

  // Conflitos de agenda ainda acionáveis (dias com 2+ shows de hoje em diante).
  const conflicts = findScheduleConflicts(shows);

  // Próximo fim de semana livre (sexta→domingo sem nenhum show) na janela das
  // próximas 12 semanas — a "receita na mesa" mais próxima (D96/findOpenWeekends).
  // Reaproveita os shows já carregados (sem I/O extra). Só vira nudge quando o
  // artista já tem agenda futura (upcoming > 0) — num cadastro vazio todo fim de
  // semana está livre e o aviso seria ruído, não oportunidade.
  const openWeekends = findOpenWeekends(shows as ConflictShowLike[], { weeks: 12 });
  const nextOpenWeekend =
    openWeekends.nextOpenFriday != null
      ? openWeekends.weekends.find((w) => w.friday === openWeekends.nextOpenFriday)
      : undefined;
  const showOpenWeekend = nextOpenWeekend != null && upcoming.length > 0;

  // Fôlego de caixa (D99): "se as receitas parassem hoje, por quantos meses o caixa
  // realizado cobre os custos fixos?". Reaproveita as transações já carregadas (sem
  // I/O extra). Só vira nudge quando o veredito morde (tight/critical) — com fôlego
  // saudável ou sem custo fixo a medir o aviso seria ruído, não alerta. Nesses dois
  // vereditos `runwayMonths` é sempre um número (não-null).
  const runway = cashRunway(txs);
  const showRunway = runway.verdict === "tight" || runway.verdict === "critical";
  const runwayCritical = runway.verdict === "critical";

  // Fôlego de caixa pelo burn rate realizado (D101): "ao meu ritmo real de gasto dos
  // últimos meses, por quantos meses o caixa me sustenta?". Complementa o nudge acima
  // (que cobre só o custo fixo) incluindo custos variáveis e descontando a receita que
  // entrou — só dispara quando o músico de fato queima caixa no ritmo recente. Mesma
  // disciplina: vira nudge só quando o fôlego morde (tight/critical), via cashBurnHeadline.
  const burnHeadline = cashBurnHeadline(cashBurnRunway(txs));

  // Ponto de equilíbrio (D68/break-even): "meu ritmo de shows cobre o custo fixo
  // do mês?". Reaproveita os shows e transações já carregados (sem I/O extra):
  // computeBreakEven estima a meta de shows/mês (custo fixo ÷ resultado médio por
  // show) e a compara com o ritmo atual. Vira nudge só quando há uma meta a bater
  // e o ritmo NÃO a cobre (breakEvenHeadline → show); com a conta já coberta, sem
  // custo fixo ou show médio no vermelho o aviso seria ruído. Detalhe completo em
  // /financas/ponto-de-equilibrio.
  const breakEven = breakEvenHeadline(computeBreakEven(shows as BreakEvenShowLike[], txs));

  // Ritmo do ano (D162): "estou atrás de onde eu estava nesta época do ano passado?".
  // Compara o acumulado de receita do ano corrente (1º jan → hoje, competência) com o
  // mesmo período do ano anterior (yearToDatePace) — apples-to-apples, sem projeção.
  // Reaproveita as transações já carregadas. Vira nudge só quando está de fato atrás
  // (yearToDatePaceHeadline → verdict "behind"); com ritmo bom/em linha ou sem base de
  // comparação o aviso seria ruído. O detalhe completo está em /financas/ritmo-do-ano.
  const ytdPaceHeadline = yearToDatePaceHeadline(yearToDatePace(txs));

  // Queda do cachê típico (D274): "meu show mediano passou a pagar menos que no ano
  // passado?". Reaproveita os shows já carregados: recorta por ano UTC (D108) e roda
  // a mesma distribuição por faixa da tela /shows/faixas-de-cache sobre o ano corrente
  // e o anterior, comparando o cachê MEDIANO (compareFeeDistribution/D187). Vira nudge
  // só quando o preço típico de fato CAIU com amostra confiável nos dois anos
  // (feeDropHeadline → trend "down" + ≥ FEE_DROP_MIN_SAMPLE shows priced cada) — uma
  // erosão de preço é um risco acionável (revisar tabela/mix de contratantes); um cachê
  // subindo é boa notícia e não precisa de banner. O detalhe está em /shows/faixas-de-cache.
  const feeComparison = compareFeeDistribution(
    feeDistribution(filterShowsByYear(shows, currentYear) as ReceivableShowLike[]),
    feeDistribution(filterShowsByYear(shows, currentYear - 1) as ReceivableShowLike[]),
  );
  const feeDropHead = feeDropHeadline(feeComparison);
  // Erosão da faixa premium (D293): o topo da tabela (cachês acima de R$ 5.000)
  // esvaziou de um ano para o outro — a piora que a MEDIANA não vê. Reaproveita o
  // MESMO comparativo já computado; dispara só quando a mediana NÃO está em queda
  // (mutuamente exclusivo com feeDropHead, para não somar um segundo banner de
  // cachê ao Painel). Detalhe em /shows/faixas-de-cache.
  const feePremiumErosionHead = feePremiumErosionHeadline(feeComparison);

  // Concentração de clientes (D109): "quanto da minha receita depende de poucos
  // contratantes?". Reaproveita os shows (com contatos) e transações já carregados;
  // atribui cada show a um pagador (pickPayerContact) e mede a dispersão da receita
  // bruta entre contratantes. Vira nudge só quando a carteira está de fato
  // concentrada (clientConcentrationHeadline) — com receita diversificada o aviso
  // seria ruído. O detalhe completo está em /contatos/rentabilidade.
  const getPayer = (show: (typeof shows)[number]): ContactProfitContact | null => {
    const picked = pickPayerContact(show.contacts.map((cs) => cs.contact));
    return picked ? { id: picked.id, name: picked.name, role: picked.role } : null;
  };
  const concentrationHeadline = clientConcentrationHeadline(
    clientConcentration(
      rankContactsByProfit(shows as ShowLike[], txs, getPayer as (s: ShowLike) => ContactProfitContact | null)
        .rows,
    ),
  );

  // Concentração geográfica (D113): "quanto da minha receita depende de poucas
  // cidades?". Análogo geográfico do nudge de clientes acima — reaproveita os
  // shows (com cidade) e transações já carregados, agrega o P&L por cidade
  // (rankCitiesByProfit) e mede a dispersão da receita bruta entre praças. Vira
  // nudge só quando a atuação está de fato concentrada (geoConcentrationHeadline);
  // o detalhe completo está em /shows/cidades.
  const geoHeadline = geoConcentrationHeadline(
    geoConcentration(rankCitiesByProfit(shows, txs).rows),
  );

  // Cancelamentos por contratante (D177/D178): "algum contratante fura o
  // combinado com frequência?". Reaproveita os shows (com contatos) já
  // carregados — sem I/O extra: pivota show×contato para agrupar os shows por
  // contratante e mede a taxa de cancelamento de cada um. Vira nudge só quando
  // há um contratante CONFIÁVEL (amostra suficiente) furando acima do limiar —
  // uma taxa alta com 1–2 shows é ruído, não padrão (cancellationHeadline
  // resolve isso no gate). O detalhe está em /contatos/cancelamentos.
  interface DashCancelContact extends ContactRankLike {
    role: string;
  }
  const cancelByContact = new Map<
    string,
    { contact: DashCancelContact; shows: { status: string; date: Date; fee: number }[] }
  >();
  for (const s of shows) {
    for (const cs of s.contacts) {
      const c = cs.contact;
      let entry = cancelByContact.get(c.id);
      if (!entry) {
        entry = { contact: { id: c.id, name: c.name, role: c.role }, shows: [] };
        cancelByContact.set(c.id, entry);
      }
      entry.shows.push({ status: s.status, date: s.date, fee: s.fee });
    }
  }
  const cancellationHead = cancellationHeadline(
    cancellationByContact([...cancelByContact.values()]),
  );

  // Funil por contratante (D183/D184): "meu pipeline futuro depende demais de um
  // pagador só?". Reaproveita o MESMO pivô show×contato já montado acima (zero
  // I/O extra) para agregar o cachê em aberto (PROPOSED + CONFIRMED) por
  // contratante. Vira nudge só quando o maior concentra metade ou mais do
  // pipeline aberto — receita futura refém de um deal (pipelineByContactHeadline
  // resolve isso no gate). Distinto da concentração de RECEITA (já realizada):
  // aqui o eixo é o que está por vir. O detalhe está em /contatos/funil.
  const pipelineHead = pipelineByContactHeadline(
    pipelineByContact([...cancelByContact.values()]),
  );

  // Sazonalidade dos shows (D133/D134): "qual o próximo mês forte chegando?".
  // Reaproveita os shows já carregados (sem I/O extra): agrega os shows
  // realizados por mês do calendário (gigSeasonality) e a manchete escolhe o
  // mês mais cedo, à frente, cujo faturamento histórico bate acima da média.
  // Vira nudge só com amostra mínima e um pico de fato à frente — antecedência
  // para prospectar/precificar. O detalhe completo está em /shows/sazonalidade.
  const season = gigSeasonality(shows as ReceivableShowLike[]);
  const seasonHeadline = gigSeasonalityHeadline(season);
  // Lado do vale (D135): o próximo mês FRACO à frente — antecedência para
  // prospectar e encher a agenda antes da baixa. Reaproveita a mesma
  // `gigSeasonality` (zero I/O extra). Para não adensar o Painel, cede a vez ao
  // nudge de mês forte: aparece só quando NÃO há um pico chegando (no máximo um
  // nudge de sazonalidade por vez).
  const seasonLull = gigSeasonalityLull(season);

  // Sazonalidade da ATIVIDADE do funil (D333/D326): "minha temporada de
  // agendamento está chegando?". Reaproveita os statusEvents já carregados com os
  // shows (sem I/O extra): monta o feed de transições da carteira inteira, colapsa
  // em funnelActivitySeasonality (12 meses do calendário) e a manchete aponta o
  // próximo mês forte de agendamento à frente — antecedência para prospectar antes
  // do funil esfriar (distinto de `seasonHeadline`, que é o eixo de FATURAMENTO).
  // CEDE A VEZ aos nudges de sazonalidade de shows (forte/vale): para não empilhar
  // banners de temporada, só aparece quando nenhum deles está no ar (no máximo um
  // nudge sazonal por vez). O detalhe está em /shows/funil/atividade/sazonalidade.
  const funnelSeason =
    seasonHeadline.show || seasonLull.show
      ? null
      : funnelActivitySeasonality(
          buildFunnelActivityFeed(
            shows.flatMap((s) =>
              s.statusEvents.map((e) => ({
                showId: s.id,
                showTitle: "",
                showDate: null,
                fromStatus: e.fromStatus,
                toStatus: e.toStatus,
                at: e.createdAt,
              })),
            ),
          ),
        );
  const funnelSeasonHeadline = funnelSeason
    ? funnelActivitySeasonalityHeadline(funnelSeason)
    : null;
  // Lado do vale da atividade do funil: o próximo mês FRACO de agendamento à
  // frente — antecedência para não deixar o funil esfriar num mês em que você
  // historicamente afrouxa a prospecção. Reaproveita a mesma `funnelSeason` (zero
  // I/O extra) e cede a vez ao mês forte de agendamento acima: aparece só quando
  // NÃO há um pico de agendamento chegando (no máximo um nudge sazonal por vez).
  const funnelSeasonLull =
    funnelSeason && !funnelSeasonHeadline?.show
      ? funnelActivitySeasonalityLull(funnelSeason)
      : null;

  // Antecedência de agendamento (D185): "estou fechando shows em cima da hora?".
  // Reaproveita os shows já carregados (createdAt vem na consulta, sem I/O extra):
  // bookingLeadTime mede a antecedência mediana entre cadastrar e tocar e o nudge
  // só aparece quando a amostra é confiável E a mediana cai na faixa apertada
  // (≤ 14 dias; crítico ≤ 7). Curto = pouco fôlego para prospectar/precificar —
  // a mesma tese de planejar com folga dos nudges de fins de semana e sazonalidade.
  // O detalhe completo está em /shows/antecedencia.
  const leadHeadline = bookingLeadTimeHeadline(
    bookingLeadTime(shows as LeadTimeShowLike[]),
  );

  // Antecedência caindo COM UM CONTRATANTE (D196 no Painel): "quem, dos meus
  // parceiros recorrentes, passou a me fechar em cima da hora?". Reaproveita os
  // shows já carregados (date+createdAt+contacts, sem I/O extra): monta a
  // antecedência por contratante deste ano e do anterior (pickPayerContact, o mesmo
  // eixo dos recebíveis), compara e destila o parceiro de maior perda de folga com
  // amostra confiável nas duas coortes (contactBookingLeadTimeDropHeadline resolve o
  // gate). CEDE A VEZ ao nudge absoluto de antecedência (D185): quando a agenda
  // inteira já vem em cima da hora, o Painel conta a história maior e o detalhe por
  // contratante espera o clique; este brilha quando a carteira segue com folga na
  // média mas uma relação específica apertou. O detalhe está em
  // /shows/antecedencia/por-contratante.
  const leadBooker = (s: (typeof shows)[number]) => {
    const picked = pickPayerContact(s.contacts.map((cs) => cs.contact));
    return picked ? { id: picked.id, name: picked.name } : null;
  };
  const leadDropHead = leadHeadline.show
    ? null // o nudge absoluto já está no ar; cede a vez (evita banner duplo)
    : contactBookingLeadTimeDropHeadline(
        compareBookingLeadTimeByContact(
          bookingLeadTimeByContact(filterShowsByYear(shows, currentYear), leadBooker),
          bookingLeadTimeByContact(filterShowsByYear(shows, currentYear - 1), leadBooker),
        ),
      );

  // Prazo de recebimento PIORANDO com um contratante (D194 no Painel): "quem, dos
  // meus pagadores recorrentes, passou a me deixar esperando mais tempo pelo cachê?".
  // Reaproveita os shows/transações já carregados (o mesmo `leadBooker`/pickPayerContact
  // dos recebíveis): monta o prazo por contratante deste ano e do anterior, compara
  // (comparePaymentLagByContact) e destila o pagador de maior alta de prazo com amostra
  // confiável nas duas coortes (contactPaymentLagRiseHeadline resolve o gate). Ancora na
  // MÉDIA (avgDays), como o comparativo. CEDE A VEZ ao nudge absoluto de DSO
  // (paymentLagHeadline): quando o caixa inteiro já demora, o Painel conta a história
  // maior e o detalhe por pagador espera o clique; este brilha quando o DSO segue
  // saudável na média mas uma relação específica desacelerou. Fecha a paridade dos
  // eixos por-contratante no Painel (antecedência/D272, conversão/D248, deliberação/D277
  // já ecoavam; faltava o do recebimento). O detalhe está em
  // /shows/prazo-recebimento/por-contratante.
  const lagRiseHead = lagHeadline.show
    ? null // o nudge absoluto de DSO já está no ar; cede a vez (evita banner duplo)
    : contactPaymentLagRiseHeadline(
        comparePaymentLagByContact(
          paymentLagByContact(
            filterShowsByYear(shows, currentYear) as (ReceivableShowLike &
              (typeof shows)[number])[],
            txs,
            leadBooker,
          ),
          paymentLagByContact(
            filterShowsByYear(shows, currentYear - 1) as (ReceivableShowLike &
              (typeof shows)[number])[],
            txs,
            leadBooker,
          ),
        ),
      );

  // Seca atual (D262–D264): "faz tempo que não subo ao palco e nada está agendado?".
  // Reaproveita os shows já carregados (só date+status, sem I/O extra): showGaps mede
  // a seca atual e a contextualiza pelo hábito (mediana) e pelo recorde, e o nudge só
  // aparece quando a espera é fora do comum (≥ 2× o espaçamento típico) E não há gig
  // firme à frente — aí prospectar é a ação. Escala para vermelho quando a seca já
  // igualou/superou o recorde. O detalhe completo está em /shows/hiatos.
  const drySpell = currentDrySpellHeadline(showGaps(shows as ShowGapShowLike[]));

  // Propostas paradas (D240): "quais propostas em aberto pedem uma decisão agora?".
  // Reaproveita os shows já carregados (zero I/O extra): findStaleProposals varre os
  // PROPOSED e staleProposalsHeadline destila só o subconjunto que aperta — vencidas
  // (data já passou) ou iminentes (data logo à frente e já parada). As "cold" (paradas
  // mas com data distante) ficam de fora do nudge (são follow-up, não urgência) e
  // vivem só na página /shows/funil/paradas. Sem os statusEvents na consulta do Painel,
  // o "tempo parado" cai para createdAt (um show nasce PROPOSED, então é bom proxy); a
  // página carrega o histórico completo para precisão. Ver D241.
  const staleHeadline = staleProposalsHeadline(
    findStaleProposals(shows as StaleProposalShowLike[]),
  );

  // Conversão real caindo (D245): "das propostas que decidi neste ano, uma fração
  // menor virou palco que ano passado?". Reaproveita os shows já carregados — os
  // statusEvents agora vêm na mesma consulta (sem I/O extra): monta a coorte deste
  // ano e a do ano anterior pela data de entrada da proposta no funil (proposalOutcomes)
  // e compara a taxa de conversão real. Vira nudge só quando a conversão de fato CAIU,
  // com amostra confiável em ambas as coortes (proposalConversionHeadline resolve o
  // gate) — uma melhora é boa notícia e não vira alerta. O detalhe está em
  // /shows/funil/conversao.
  const conversionHead = proposalConversionHeadline(
    compareProposalOutcomes(
      proposalOutcomes(shows as ProposalOutcomeShowLike[], { year: currentYear }),
      proposalOutcomes(shows as ProposalOutcomeShowLike[], { year: currentYear - 1 }),
    ),
  );

  // Conversão caindo COM UM CONTRATANTE (D248 no Painel): "com quem minhas
  // propostas passaram a fechar bem menos?". Reaproveita o mesmo pivô show×contato
  // (agora carregando os statusEvents já presentes na consulta) para montar a
  // coorte de cada contratante neste ano e no anterior (proposalOutcomesByContact),
  // comparar e destilar o contratante de maior queda confiável. Vira nudge só
  // quando de fato caiu além do piso, com amostra confiável nas duas coortes
  // (contactConversionDropHeadline resolve o gate). CEDE A VEZ ao nudge geral de
  // conversão (D245): quando a carteira inteira já caiu, o Painel conta a história
  // maior e o detalhe por contratante espera o clique; este nudge brilha quando a
  // carteira empata mas uma relação específica azedou. O detalhe está em
  // /shows/funil/conversao/contratantes.
  interface DashConversionContact {
    id: string;
    name: string;
  }
  const conversionByContact = new Map<
    string,
    { contact: DashConversionContact; shows: ProposalOutcomeShowLike[] }
  >();
  for (const s of shows) {
    for (const cs of s.contacts) {
      const c = cs.contact;
      let entry = conversionByContact.get(c.id);
      if (!entry) {
        entry = { contact: { id: c.id, name: c.name }, shows: [] };
        conversionByContact.set(c.id, entry);
      }
      entry.shows.push({ statusEvents: s.statusEvents } as ProposalOutcomeShowLike);
    }
  }
  const conversionContactItems = [...conversionByContact.values()];
  const contactConversionHead = conversionHead.show
    ? null // o nudge geral já está no ar; cede a vez (evita banner duplo)
    : contactConversionDropHeadline(
        compareContactProposalOutcomes(
          proposalOutcomesByContact(conversionContactItems, { year: currentYear }),
          proposalOutcomesByContact(conversionContactItems, { year: currentYear - 1 }),
        ),
      );

  // Contratante mais lento a decidir (D275 no Painel): "quem me deixa mais tempo
  // com a proposta na mesa?". Reaproveita o MESMO pivô show×contato já montado para
  // a conversão por contratante (as shows carregam statusEvents, o único campo que a
  // deliberação precisa — zero I/O extra): proposalDeliberationByContact roda o motor
  // de tempo-em-etapa por contratante e destila o `slowest`, e slowDeliberatorHeadline
  // só vira nudge quando a mediana dele é materialmente pior que a típica da carteira
  // (≥ 2× o mediano geral E ≥ 7 dias em absoluto). Escala para vermelho a ≥ 3× o
  // típico. O detalhe está em /shows/funil/tempo-em-etapa/por-contratante.
  const slowDeliberator = slowDeliberatorHeadline(
    proposalDeliberationByContact(conversionContactItems),
  );

  // Deliberação DESACELERANDO com um contratante (D278 no Painel): "quem, dos meus
  // parceiros recorrentes, passou a demorar materialmente mais para decidir uma
  // proposta que no ano passado?". Reaproveita o MESMO pivô show×contato (as shows
  // carregam statusEvents, o único campo que a deliberação precisa — zero I/O extra):
  // monta a deliberação por contratante da coorte deste ano e da do anterior
  // (proposalDeliberationByContact recorta pela entrada da proposta no funil, D276),
  // compara (compareProposalDeliberationByContact) e destila o contratante de maior
  // alta de decisão com amostra confiável nas duas coortes (contactDeliberationRiseHeadline
  // resolve o gate). CEDE A VEZ ao nudge absoluto de deliberação (slowDeliberatorHeadline):
  // quando alguém já decide bem mais devagar que a carteira, o Painel conta essa história
  // e o detalhe por contratante espera o clique; este brilha quando a carteira decide num
  // ritmo saudável mas uma relação específica azedou de um ano para o outro. Fecha a
  // paridade dos eixos por-contratante no Painel (antecedência/D272, recebimento/D279,
  // conversão/D248 já ecoavam a piora ano a ano; faltava o da deliberação). O detalhe está
  // em /shows/funil/tempo-em-etapa/por-contratante.
  const deliberationRiseHead = slowDeliberator.show
    ? null // o nudge absoluto de deliberação já está no ar; cede a vez (evita banner duplo)
    : contactDeliberationRiseHeadline(
        compareProposalDeliberationByContact(
          proposalDeliberationByContact(conversionContactItems, { year: currentYear }),
          proposalDeliberationByContact(conversionContactItems, { year: currentYear - 1 }),
        ),
      );

  // Gargalo de TEMPO no funil (D285 no Painel): "de todo o tempo que um show leva do
  // primeiro contato ao palco, o grosso fica esperando decisão da proposta?".
  // Reaproveita os shows já carregados (os statusEvents vêm na mesma consulta — zero
  // I/O extra): funnelStageDurations mede a permanência por etapa e
  // stageTimeBottleneckHeadline destila o caso ESTRUTURAL e acionável — quando a etapa
  // PROPOSED concentra a maior fatia (≥ 50%) do tempo típico de percurso, com amostra
  // confiável. É a leitura de COMPOSIÇÃO histórica (stageTimeConcentration/D283) no
  // Painel: distinta de staleProposalsHeadline (propostas paradas AGORA, por deal) e
  // slowDeliberatorHeadline (QUEM decide devagar, por contratante). Por ser a história
  // maior e mais lenta, CEDE A VEZ aos nudges concretos da mesma família: se qualquer
  // um deles já conta o problema da decisão (proposta parada agora, ou um contratante
  // específico lento/desacelerando), o Painel não repete o recado estrutural. Brilha no
  // caso em que nada está parado hoje e ninguém em especial arrasta, mas a carteira,
  // vista de cima, gasta o percurso todo na decisão. O detalhe está em
  // /shows/funil/tempo-em-etapa.
  const proposalDelayNudgeActive =
    staleHeadline.show ||
    slowDeliberator.show ||
    (deliberationRiseHead?.show ?? false);
  const timeBottleneckHead = proposalDelayNudgeActive
    ? null // um nudge concreto da decisão já está no ar; cede a vez (evita banner duplo)
    : stageTimeBottleneckHeadline(
        funnelStageDurations(shows as StageDurationShowLike[]),
      );

  // Oportunidade de rebooking (D229): a praça mais esquecida que vale um retorno —
  // cidade onde já toquei (com lastro, ≥ 2 shows), nada agendado adiante e há > 90
  // dias sem show. Reaproveita os shows já carregados (city vem na consulta, sem I/O
  // extra); a disciplina anti-ruído (só relações com track record) vive na
  // citiesToReengageHeadline. O detalhe completo está em /shows/cidades/revisitar.
  const reengageHeadline = citiesToReengageHeadline(
    findCitiesToReengage(shows as CityReengageShowLike[]),
  );

  // Rentabilidade: top shows realizados por resultado
  const playedShows = shows.filter((s) => s.status === "PLAYED");
  const showPnls = playedShows
    .map((s) => ({ show: s, pnl: computeShowPnL({ id: s.id, fee: s.fee }, txs) }))
    .sort((a, b) => b.pnl.net - a.pnl.net);

  const maxMonthly = Math.max(1, ...monthly.map((m) => Math.max(m.income, m.expense)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Painel</h1>
      </div>

      {/* Aviso de pendências vencidas */}
      {(overdue.income > 0 || overdue.expense > 0) && (
        <Link
          href="/financas?status=pending"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 transition hover:bg-red-100"
        >
          <span className="font-semibold">⚠ Pendências vencidas</span>
          {overdue.income > 0 && (
            <span>
              A receber: <strong>{formatMoney(overdue.income)}</strong>
              <span className="text-red-500"> ({overdue.incomeCount})</span>
            </span>
          )}
          {overdue.expense > 0 && (
            <span>
              A pagar: <strong>{formatMoney(overdue.expense)}</strong>
              <span className="text-red-500"> ({overdue.expenseCount})</span>
            </span>
          )}
        </Link>
      )}

      {/* Aviso de cachês a receber de shows já realizados; escala para vermelho
          quando há dinheiro parado há mais de 90 dias (recebível encalhado). */}
      {receivables.count > 0 && (
        <Link
          href="/shows/a-receber"
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (hasStaleReceivables
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">🎤 Cachês a receber</span>
          <span>
            <strong>{formatMoney(receivables.totalOutstanding)}</strong> em{" "}
            {receivables.count} {receivables.count === 1 ? "show realizado" : "shows realizados"}
          </span>
          {hasStaleReceivables && (
            <span className="font-semibold text-red-700">
              🚨 {formatMoney(staleReceivables!.totalOutstanding)} parado há mais de 90 dias
              <span className="font-normal text-red-500">
                {" "}
                ({staleReceivables!.count})
              </span>
            </span>
          )}
          {receivablePromises.brokenCount > 0 && (
            <span className="font-semibold text-red-700">
              🤝 {formatMoney(receivablePromises.brokenOutstanding)} em{" "}
              {receivablePromises.brokenCount === 1
                ? "promessa vencida"
                : "promessas vencidas"}
              <span className="font-normal text-red-500">
                {" "}
                ({receivablePromises.brokenCount})
              </span>
            </span>
          )}
          {awaitingPromiseHead.show && (
            <span
              className={
                "font-semibold " +
                (awaitingPromiseHead.critical ? "text-red-700" : "text-amber-700")
              }
            >
              🔔 {formatMoney(awaitingPromiseHead.totalOutstanding)} sem cobrança iniciada
              <span
                className={
                  "font-normal " +
                  (awaitingPromiseHead.critical ? "text-red-500" : "text-amber-600")
                }
              >
                {" "}
                ({awaitingPromiseHead.count})
              </span>
            </span>
          )}
          {promisesDueSoon.show && (
            <span className="font-semibold text-emerald-700">
              💰 {formatMoney(promisesDueSoon.totalOutstanding)} prometido{" "}
              {promisesDueSoon.nextDays === 0
                ? "para hoje"
                : `nos próximos ${PROMISE_DUE_SOON_DAYS} dias`}
              <span className="font-normal text-emerald-600">
                {" "}
                ({promisesDueSoon.count})
              </span>
            </span>
          )}
          <span className={hasStaleReceivables ? "text-red-600" : "text-amber-600"}>Ver →</span>
        </Link>
      )}

      {/* Aviso de conflitos de agenda futuros (dias com mais de um show). */}
      {conflicts.upcomingDayCount > 0 && (
        <Link
          href="/shows/conflitos"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 transition hover:bg-amber-100"
        >
          <span className="font-semibold">📅 Conflito de agenda</span>
          <span>
            <strong>
              {conflicts.upcomingDayCount}{" "}
              {conflicts.upcomingDayCount === 1 ? "dia" : "dias"}
            </strong>{" "}
            com mais de um show marcado
          </span>
          <span className="text-amber-600">Revisar →</span>
        </Link>
      )}

      {/* Oportunidade: próximo fim de semana livre (sexta→domingo sem show). */}
      {showOpenWeekend && nextOpenWeekend && (
        <Link
          href="/shows/fins-de-semana-livres"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 transition hover:bg-brand-100"
        >
          <span className="font-semibold">🎸 Fim de semana livre</span>
          <span>
            Próximo aberto:{" "}
            <strong className="capitalize">
              {formatWeekendLabel(nextOpenWeekend.friday, nextOpenWeekend.days[2])}
            </strong>
            {openWeekends.openCount > 1 && (
              <span className="text-brand-600">
                {" "}
                · {openWeekends.openCount} de {openWeekends.total} fins de semana livres
              </span>
            )}
          </span>
          <span className="text-brand-600">Agendar →</span>
        </Link>
      )}

      {/* Oportunidade: próximo mês forte da temporada (sazonalidade dos shows). */}
      {seasonHeadline.show && seasonHeadline.month && (
        <Link
          href="/shows/sazonalidade"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 transition hover:bg-brand-100"
        >
          <span className="font-semibold">📈 Mês forte chegando</span>
          <span>
            <strong>{seasonHeadline.month.label}</strong>{" "}
            {seasonHeadline.monthsAhead === 1
              ? "(mês que vem)"
              : `(daqui a ${seasonHeadline.monthsAhead} meses)`}{" "}
            historicamente rende{" "}
            <strong>
              {Math.round((seasonHeadline.lift - 1) * 100)}% acima
            </strong>{" "}
            do mês médio.
          </span>
          <span className="text-brand-600">Prospectar →</span>
        </Link>
      )}

      {/* Vale da temporada: próximo mês fraco à frente (sazonalidade dos shows).
          Cede a vez ao nudge de mês forte para não adensar o Painel. */}
      {!seasonHeadline.show && seasonLull.show && seasonLull.month && (
        <Link
          href="/shows/sazonalidade"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 transition hover:bg-amber-100"
        >
          <span className="font-semibold">🍂 Mês fraco à frente</span>
          <span>
            <strong>{seasonLull.month.label}</strong>{" "}
            {seasonLull.monthsAhead === 1
              ? "(mês que vem)"
              : `(daqui a ${seasonLull.monthsAhead} meses)`}{" "}
            historicamente rende{" "}
            <strong>
              {Math.round(seasonLull.shortfall * 100)}% abaixo
            </strong>{" "}
            do mês médio — prospecte com antecedência.
          </span>
          <span className="text-amber-600">Prospectar →</span>
        </Link>
      )}

      {/* Oportunidade: temporada de agendamento chegando (sazonalidade da ATIVIDADE
          do funil — quando você costuma fazer o trabalho de prospecção). Cede a vez
          aos nudges de sazonalidade de FATURAMENTO acima (no máximo um por vez). */}
      {funnelSeasonHeadline?.show && funnelSeasonHeadline.month && (
        <Link
          href="/shows/funil/atividade/sazonalidade"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 transition hover:bg-brand-100"
        >
          <span className="font-semibold">📣 Temporada de agendamento chegando</span>
          <span>
            <strong>{funnelSeasonHeadline.month.label}</strong>{" "}
            {funnelSeasonHeadline.monthsAhead === 1
              ? "(mês que vem)"
              : `(daqui a ${funnelSeasonHeadline.monthsAhead} meses)`}{" "}
            costuma concentrar{" "}
            <strong>
              {Math.round((funnelSeasonHeadline.lift - 1) * 100)}% mais
            </strong>{" "}
            movimento no funil que o mês médio — comece a prospectar antes.
          </span>
          <span className="text-brand-600">Prospectar →</span>
        </Link>
      )}

      {/* Atenção: vale de agendamento chegando (sazonalidade da ATIVIDADE do funil —
          mês em que você historicamente afrouxa a prospecção). Cede a vez ao mês
          forte de agendamento acima e aos nudges de FATURAMENTO (no máximo um por
          vez). */}
      {funnelSeasonLull?.show && funnelSeasonLull.month && (
        <Link
          href="/shows/funil/atividade/sazonalidade"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition hover:bg-amber-100"
        >
          <span className="font-semibold">🥶 Vale de agendamento chegando</span>
          <span>
            <strong>{funnelSeasonLull.month.label}</strong>{" "}
            {funnelSeasonLull.monthsAhead === 1
              ? "(mês que vem)"
              : `(daqui a ${funnelSeasonLull.monthsAhead} meses)`}{" "}
            costuma concentrar{" "}
            <strong>
              {Math.round(funnelSeasonLull.shortfall * 100)}% menos
            </strong>{" "}
            movimento no funil que o mês médio — mantenha o pipeline em movimento.
          </span>
          <span className="text-amber-600">Prospectar →</span>
        </Link>
      )}

      {/* Oportunidade: praça esquecida que vale um retorno (rebooking geográfico).
          A cidade com lastro (≥ 2 shows) parada há mais tempo e sem nada agendado. */}
      {reengageHeadline.show && reengageHeadline.city && (
        <Link
          href="/shows/cidades/revisitar"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 transition hover:bg-brand-100"
        >
          <span className="font-semibold">📍 Praça para revisitar</span>
          <span>
            <strong>{reengageHeadline.city.name}</strong> — sem show há{" "}
            <strong>{reengageHeadline.city.daysSinceLastShow} dias</strong> (
            {reengageHeadline.city.pastShows}{" "}
            {reengageHeadline.city.pastShows === 1 ? "show" : "shows"} no histórico)
            {reengageHeadline.total > 1 && (
              <span className="text-brand-600">
                {" "}
                · +{reengageHeadline.total - 1}{" "}
                {reengageHeadline.total - 1 === 1 ? "praça fria" : "praças frias"}
              </span>
            )}
          </span>
          <span className="text-brand-600">Reagendar →</span>
        </Link>
      )}

      {/* Aviso de custos fixos recorrentes ainda não lançados neste mês. */}
      {fixedCostsDue.pending.length > 0 && (
        <Link
          href="/financas/custos-fixos"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 transition hover:bg-amber-100"
        >
          <span className="font-semibold">⏰ Custos fixos a lançar</span>
          <span>
            <strong>{formatMoney(fixedCostsDue.totalPending)}</strong> em{" "}
            {fixedCostsDue.pending.length}{" "}
            {fixedCostsDue.pending.length === 1 ? "conta" : "contas"} ainda sem lançamento neste mês
          </span>
          <span className="text-amber-600">Lançar →</span>
        </Link>
      )}

      {/* Fôlego de caixa apertado/crítico: por quantos meses o caixa cobre os custos
          fixos (D99). Escala para vermelho quando o fôlego é crítico (< 3 meses). */}
      {showRunway && (
        <Link
          href="/financas/folego-de-caixa"
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (runwayCritical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {runwayCritical ? "🔴" : "🛟"} Fôlego de caixa{" "}
            {runwayCritical ? "crítico" : "apertado"}
          </span>
          <span>
            O caixa cobre{" "}
            <strong>
              {runway.runwayMonths!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{" "}
              {runway.runwayMonths === 1 ? "mês" : "meses"}
            </strong>{" "}
            de custos fixos ({formatMoney(runway.monthlyFixedCost)}/mês)
          </span>
          <span className={runwayCritical ? "text-red-600" : "text-amber-600"}>Ver →</span>
        </Link>
      )}

      {/* Fôlego de caixa pelo ritmo real de gasto (D101): inclui custos variáveis e
          desconta a receita que entrou — só aparece quando o caixa de fato queima
          (tight/critical). Escala para vermelho no crítico (< 3 meses). */}
      {burnHeadline.show && (
        <Link
          href="/financas/folego-de-caixa"
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (burnHeadline.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {burnHeadline.critical ? "🔴" : "🔥"} Ritmo de gasto{" "}
            {burnHeadline.critical ? "crítico" : "apertado"}
          </span>
          <span>
            No ritmo real o caixa dura{" "}
            <strong>
              {burnHeadline.runwayMonths!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{" "}
              {burnHeadline.runwayMonths === 1 ? "mês" : "meses"}
            </strong>{" "}
            (queima de {formatMoney(burnHeadline.monthlyBurn)}/mês)
          </span>
          <span className={burnHeadline.critical ? "text-red-600" : "text-amber-600"}>Ver →</span>
        </Link>
      )}

      {/* Ponto de equilíbrio (break-even): o ritmo de shows/mês não cobre o custo fixo
          do mês — só aparece quando há meta a bater e ela não está coberta. Escala para
          vermelho quando o ritmo cai a ≤ metade da meta. */}
      {breakEven.show && (
        <Link
          href="/financas/ponto-de-equilibrio"
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (breakEven.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {breakEven.critical ? "🔴" : "⚖️"} Abaixo do ponto de equilíbrio
          </span>
          <span>
            Seu ritmo de{" "}
            <strong>
              {breakEven.avgShowsPerMonth.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{" "}
              {breakEven.avgShowsPerMonth === 1 ? "show" : "shows"}/mês
            </strong>{" "}
            está abaixo dos{" "}
            <strong>
              {breakEven.showsNeeded} {breakEven.showsNeeded === 1 ? "show" : "shows"}/mês
            </strong>{" "}
            para cobrir o custo fixo ({formatMoney(breakEven.monthlyFixedCost)}/mês)
          </span>
          <span className={breakEven.critical ? "text-red-600" : "text-amber-600"}>Ver →</span>
        </Link>
      )}

      {/* Ritmo do ano (D162): acumulado de receita do ano corrente vs. o mesmo período
          do ano passado — só aparece quando está atrás (behind). Escala para vermelho
          no atraso acentuado (≤ 75% do ano passado). */}
      {ytdPaceHeadline.show && (
        <Link
          href="/financas/ritmo-do-ano"
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (ytdPaceHeadline.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {ytdPaceHeadline.critical ? "🔴" : "🐢"} Atrás do ritmo de {ytdPaceHeadline.lastYear}
          </span>
          <span>
            Até agora você acumula{" "}
            <strong>{formatMoney(ytdPaceHeadline.income)}</strong> em receita —{" "}
            {ytdPaceHeadline.pct !== null && (
              <strong>{Math.round(Math.abs(ytdPaceHeadline.pct) * 100)}% abaixo</strong>
            )}{" "}
            do mesmo ponto de {ytdPaceHeadline.lastYear} ({formatMoney(ytdPaceHeadline.lastYearIncome)}).
          </span>
          <span className={ytdPaceHeadline.critical ? "text-red-600" : "text-amber-600"}>Ver →</span>
        </Link>
      )}

      {/* Queda do cachê típico (D274): o show mediano passou a pagar menos que no ano
          passado — só aparece quando o preço típico de fato caiu (com amostra confiável).
          Escala para vermelho quando a mediana afunda 25% ou mais. */}
      {feeDropHead.show && (
        <Link
          href={`/shows/faixas-de-cache?ano=${currentYear}`}
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (feeDropHead.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {feeDropHead.critical ? "🔴" : "🔻"} Cachê típico em queda
          </span>
          <span>
            O show mediano de {currentYear} paga{" "}
            <strong>{formatMoney(feeDropHead.currentMedian)}</strong>
            {feeDropHead.pct !== null && (
              <>
                {" "}
                — <strong>{Math.round(Math.abs(feeDropHead.pct) * 100)}% abaixo</strong>
              </>
            )}{" "}
            do típico de {currentYear - 1} ({formatMoney(feeDropHead.previousMedian)}). Hora de
            revisar a tabela e o mix de contratantes.
          </span>
          <span className={feeDropHead.critical ? "text-red-600" : "text-amber-600"}>Ver →</span>
        </Link>
      )}

      {/* Erosão da faixa premium (D293): o topo da tabela de cachês (acima de
          R$ 5.000) esvaziou vs. o ano passado, mesmo com a mediana firme — a piora
          que o nudge da mediana não capta. Só aparece quando o cachê típico NÃO
          está em queda (senão o titular é o banner acima). Vermelho quando a
          participação premium cai 30 p.p. ou mais. */}
      {feePremiumErosionHead.show && (
        <Link
          href={`/shows/faixas-de-cache?ano=${currentYear}`}
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (feePremiumErosionHead.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {feePremiumErosionHead.critical ? "🔴" : "🔻"} Faixa premium esvaziando
          </span>
          <span>
            Os cachês acima de R$ 5.000 caíram de{" "}
            <strong>{Math.round(feePremiumErosionHead.premiumSharePrevious * 100)}%</strong> para{" "}
            <strong>{Math.round(feePremiumErosionHead.premiumShareCurrent * 100)}%</strong> dos shows
            de {currentYear - 1} para {currentYear}, mesmo com o cachê típico firme. Hora de
            reforçar os contratantes de topo.
          </span>
          <span className={feePremiumErosionHead.critical ? "text-red-600" : "text-amber-600"}>
            Ver →
          </span>
        </Link>
      )}

      {concentrationHeadline.show && (
        <Link
          href="/contatos/rentabilidade"
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (concentrationHeadline.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {concentrationHeadline.critical ? "🔴" : "🟠"} Carteira{" "}
            {concentrationHeadline.critical ? "muito concentrada" : "concentrada"}
          </span>
          <span>
            <strong>{Math.round(concentrationHeadline.topShare * 100)}%</strong> da
            receita vem de{" "}
            <strong>
              {concentrationHeadline.top
                ? concentrationHeadline.top.name
                : "um único contratante"}
            </strong>
            {concentrationHeadline.clientCount > 1
              ? ` (de ${concentrationHeadline.clientCount} contratantes)`
              : ""}{" "}
            — diversificar a carteira reduz o risco
          </span>
          <span
            className={
              concentrationHeadline.critical ? "text-red-600" : "text-amber-600"
            }
          >
            Ver →
          </span>
        </Link>
      )}

      {geoHeadline.show && (
        <Link
          href="/shows/cidades"
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (geoHeadline.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {geoHeadline.critical ? "🔴" : "🟠"} Atuação{" "}
            {geoHeadline.critical ? "muito concentrada" : "concentrada"}
          </span>
          <span>
            <strong>{Math.round(geoHeadline.topShare * 100)}%</strong> da receita
            vem de{" "}
            <strong>{geoHeadline.top ? geoHeadline.top.name : "uma única cidade"}</strong>
            {geoHeadline.placeCount > 1
              ? ` (de ${geoHeadline.placeCount} cidades)`
              : ""}{" "}
            — abrir praças novas reduz o risco
          </span>
          <span
            className={geoHeadline.critical ? "text-red-600" : "text-amber-600"}
          >
            Ver →
          </span>
        </Link>
      )}

      {cancellationHead.show && cancellationHead.contact && (
        <Link
          href="/contatos/cancelamentos"
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (cancellationHead.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {cancellationHead.critical ? "🔴" : "🟠"} Contratante que fura o combinado
          </span>
          <span>
            <strong>{cancellationHead.contact.name}</strong> cancelou{" "}
            <strong>
              {cancellationHead.cancelledShows} de {cancellationHead.totalShows} shows
            </strong>{" "}
            ({Math.round(cancellationHead.cancellationRate * 100)}%
            {cancellationHead.lostFee > 0
              ? `, ${formatMoney(cancellationHead.lostFee)} de cachê perdido`
              : ""}
            )
            {cancellationHead.flaggedCount > 1
              ? ` — e mais ${cancellationHead.flaggedCount - 1} com taxa alta`
              : ""}
          </span>
          <span
            className={
              cancellationHead.critical ? "text-red-600" : "text-amber-600"
            }
          >
            Ver →
          </span>
        </Link>
      )}

      {pipelineHead.show && pipelineHead.contact && (
        <Link
          href="/contatos/funil"
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (pipelineHead.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {pipelineHead.critical ? "🔴" : "🟠"} Pipeline concentrado num contratante
          </span>
          <span>
            <strong>{formatMoney(pipelineHead.openValue)}</strong> em cachê a fechar
            ({Math.round(pipelineHead.topShare * 100)}% do pipeline aberto) está com{" "}
            <strong>{pipelineHead.contact.name}</strong> —{" "}
            {pipelineHead.contactCount === 1
              ? "toda a agenda futura depende dele"
              : "vale diversificar a prospecção"}
          </span>
          <span
            className={pipelineHead.critical ? "text-red-600" : "text-amber-600"}
          >
            Ver →
          </span>
        </Link>
      )}

      {leadHeadline.show && (
        <Link
          href="/shows/antecedencia"
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (leadHeadline.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {leadHeadline.critical ? "🔴" : "🟠"} Você fecha shows em cima da hora
          </span>
          <span>
            Os shows entram na agenda com <strong>{daysLabel(leadHeadline.medianDays)}</strong> de
            antecedência mediana (média de {daysLabel(leadHeadline.avgDays)} sobre{" "}
            {leadHeadline.sample}{" "}
            {leadHeadline.sample === 1 ? "show" : "shows"}) — vale prospectar com mais folga
          </span>
          <span
            className={leadHeadline.critical ? "text-red-600" : "text-amber-600"}
          >
            Ver →
          </span>
        </Link>
      )}

      {/* Um contratante recorrente passou a fechar em cima da hora (D196 no Painel):
          cede a vez ao nudge absoluto acima; brilha quando a carteira segue com folga
          na média mas uma relação específica apertou. */}
      {leadDropHead?.show && leadDropHead.contact && (
        <Link
          href={`/shows/antecedencia/por-contratante?ano=${currentYear}`}
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (leadDropHead.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {leadDropHead.critical ? "🔴" : "📉"} {leadDropHead.contact.name} passou a fechar em cima da hora
          </span>
          <span>
            Em {currentYear} fecha com <strong>{daysLabel(leadDropHead.currentMedianDays)}</strong> de
            antecedência mediana (sobre {leadDropHead.sample}{" "}
            {leadDropHead.sample === 1 ? "show" : "shows"}) —{" "}
            <strong>{daysLabel(leadDropHead.dropDays)} a menos</strong> que em {currentYear - 1}{" "}
            ({daysLabel(leadDropHead.previousMedianDays)})
            {leadDropHead.others > 0 && (
              <span className={leadDropHead.critical ? "text-red-600" : "text-amber-600"}>
                {" "}
                · +{leadDropHead.others}{" "}
                {leadDropHead.others === 1 ? "contratante apertou" : "contratantes apertaram"}
              </span>
            )}
          </span>
          <span className={leadDropHead.critical ? "text-red-600" : "text-amber-600"}>
            Ver →
          </span>
        </Link>
      )}

      {/* Seca atual fora do comum e nada agendado (D262–D264): faz tempo que você
          não sobe ao palco — bem além do seu espaçamento típico — e não há gig
          firme à frente. Só dispara na cauda (≥ 2× o hábito) e vira vermelho
          quando a seca já igualou/superou o recorde. Detalhe em /shows/hiatos. */}
      {drySpell.show && (
        <Link
          href="/shows/hiatos"
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (drySpell.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {drySpell.critical ? "🔴" : "🟠"} Faz {daysLabel(drySpell.days)} que você não toca
          </span>
          <span>
            {drySpell.critical
              ? "Você nunca ficou tanto tempo sem show — "
              : "Seca fora do comum — "}
            <strong>{formatRatio(drySpell.ratio)}×</strong> o intervalo típico de{" "}
            {daysLabel(drySpell.typicalDays)} entre gigs, e nada está agendado. Boa hora
            para prospectar.
          </span>
          <span className={drySpell.critical ? "text-red-600" : "text-amber-600"}>
            Prospectar →
          </span>
        </Link>
      )}

      {/* Propostas paradas que pedem decisão agora: vencidas (data passou ainda em
          PROPOSED) ou iminentes (data logo à frente e já parada). Só o subconjunto
          acionável vira nudge; o detalhe completo (inclusive as "cold") está em
          /shows/funil/paradas. Escala para vermelho quando há proposta vencida. */}
      {staleHeadline.show && staleHeadline.top && (
        <Link
          href="/shows/funil/paradas"
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (staleHeadline.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {staleHeadline.critical ? "🔴" : "🟠"} Propostas paradas —{" "}
            {staleHeadline.actionableCount}{" "}
            {staleHeadline.actionableCount === 1 ? "pede" : "pedem"} decisão
          </span>
          <span>
            <strong>{staleHeadline.top.title}</strong>{" "}
            {staleHeadline.top.daysUntilShow < 0
              ? `venceu há ${daysLabel(-staleHeadline.top.daysUntilShow)}`
              : staleHeadline.top.daysUntilShow === 0
                ? "é hoje"
                : `é daqui a ${daysLabel(staleHeadline.top.daysUntilShow)}`}
            {staleHeadline.actionableFee > 0 && (
              <>
                {" "}
                · <strong>{formatMoney(staleHeadline.actionableFee)}</strong> em risco
              </>
            )}
            {staleHeadline.totalStale > staleHeadline.actionableCount && (
              <span className={staleHeadline.critical ? "text-red-600" : "text-amber-600"}>
                {" "}
                (+{staleHeadline.totalStale - staleHeadline.actionableCount} sem resposta)
              </span>
            )}
          </span>
          <span className={staleHeadline.critical ? "text-red-600" : "text-amber-600"}>
            Ver →
          </span>
        </Link>
      )}

      {/* Contratante mais lento a decidir (D275/D277): quem deixa suas propostas
          mais tempo na mesa que o típico da carteira — vale cobrar a decisão. Só
          dispara quando a mediana dele é ≥ 2× o mediano geral E ≥ 7 dias em
          absoluto; vermelho a ≥ 3× o típico. Detalhe em
          /shows/funil/tempo-em-etapa/por-contratante. */}
      {slowDeliberator.show && slowDeliberator.contact && (
        <Link
          href="/shows/funil/tempo-em-etapa/por-contratante"
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (slowDeliberator.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {slowDeliberator.critical ? "🔴" : "🐌"} {slowDeliberator.contact.name} demora a decidir
          </span>
          <span>
            Leva <strong>{daysLabel(slowDeliberator.medianDays)}</strong> em mediana para
            decidir suas propostas (sobre {slowDeliberator.sample}{" "}
            {slowDeliberator.sample === 1 ? "decisão" : "decisões"}) —{" "}
            <strong>{formatRatio(slowDeliberator.ratio)}× o típico</strong> de{" "}
            {daysLabel(slowDeliberator.typicalDays)} da carteira. Vale cobrar a decisão.
          </span>
          <span className={slowDeliberator.critical ? "text-red-600" : "text-amber-600"}>
            Ver →
          </span>
        </Link>
      )}

      {/* Um contratante recorrente passou a decidir mais devagar (D278 no Painel):
          cede a vez ao nudge absoluto acima; brilha quando a carteira decide num ritmo
          saudável na média mas uma relação específica arrastou a decisão ano a ano. */}
      {deliberationRiseHead?.show && deliberationRiseHead.contact && (
        <Link
          href={`/shows/funil/tempo-em-etapa/por-contratante?ano=${currentYear}`}
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (deliberationRiseHead.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {deliberationRiseHead.critical ? "🔴" : "🐌"} {deliberationRiseHead.contact.name} passou a decidir mais devagar
          </span>
          <span>
            Em {currentYear} leva <strong>{daysLabel(deliberationRiseHead.currentMedianDays)}</strong> em
            mediana para decidir suas propostas (sobre {deliberationRiseHead.sample}{" "}
            {deliberationRiseHead.sample === 1 ? "decisão" : "decisões"}) —{" "}
            <strong>{daysLabel(deliberationRiseHead.riseDays)} a mais</strong> que em {currentYear - 1}{" "}
            ({daysLabel(deliberationRiseHead.previousMedianDays)})
            {deliberationRiseHead.others > 0 && (
              <span className={deliberationRiseHead.critical ? "text-red-600" : "text-amber-600"}>
                {" "}
                · +{deliberationRiseHead.others}{" "}
                {deliberationRiseHead.others === 1 ? "contratante desacelerou" : "contratantes desaceleraram"}
              </span>
            )}
          </span>
          <span className={deliberationRiseHead.critical ? "text-red-600" : "text-amber-600"}>
            Ver →
          </span>
        </Link>
      )}

      {/* Gargalo de tempo no funil (D285): a maior parte do tempo típico até o palco
          fica na proposta, esperando decisão. Leitura estrutural (composição histórica);
          cede a vez aos nudges concretos da decisão (propostas paradas / contratante
          lento). Vermelho quando a fatia é o grosso do percurso (≥ 70%). Detalhe em
          /shows/funil/tempo-em-etapa. */}
      {timeBottleneckHead?.show && (
        <Link
          href="/shows/funil/tempo-em-etapa"
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (timeBottleneckHead.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {timeBottleneckHead.critical ? "🔴" : "⏳"} O funil empaca na decisão
          </span>
          <span>
            <strong>{Math.round(timeBottleneckHead.share * 100)}%</strong> do tempo típico
            até o palco fica na proposta esperando resposta —{" "}
            <strong>{daysLabel(timeBottleneckHead.medianDays)}</strong> em mediana de{" "}
            {daysLabel(timeBottleneckHead.totalMedianDays)} de percurso (sobre{" "}
            {timeBottleneckHead.sample}{" "}
            {timeBottleneckHead.sample === 1 ? "show" : "shows"}). Vale cobrar decisão mais cedo.
          </span>
          <span className={timeBottleneckHead.critical ? "text-red-600" : "text-amber-600"}>
            Ver →
          </span>
        </Link>
      )}

      {/* Conversão real caindo (D245): das propostas decididas neste ano, uma
          fração menor virou palco que na coorte do ano passado. Só com amostra
          confiável em ambas as coortes e uma queda material. Vermelho na queda forte. */}
      {conversionHead.show && (
        <Link
          href={`/shows/funil/conversao?ano=${currentYear}`}
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (conversionHead.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {conversionHead.critical ? "🔴" : "📉"} Conversão de propostas caindo
          </span>
          <span>
            Das propostas decididas em {currentYear},{" "}
            <strong>{Math.round(conversionHead.currentRate * 100)}%</strong> viraram palco (
            {conversionHead.won} de {conversionHead.decided}) —{" "}
            <strong>{Math.round(conversionHead.drop * 100)} p.p. abaixo</strong> de{" "}
            {currentYear - 1} ({Math.round(conversionHead.previousRate * 100)}%)
          </span>
          <span className={conversionHead.critical ? "text-red-600" : "text-amber-600"}>
            Ver →
          </span>
        </Link>
      )}

      {/* Conversão caindo com um contratante específico (cede a vez ao nudge geral
          acima). Aponta de quem revisar preço/relação/disponibilidade. */}
      {contactConversionHead?.show && contactConversionHead.contact && (
        <Link
          href={`/shows/funil/conversao/contratantes?ano=${currentYear}`}
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (contactConversionHead.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {contactConversionHead.critical ? "🔴" : "📉"} Conversão caindo com{" "}
            {contactConversionHead.contact.name}
          </span>
          <span>
            Das propostas decididas em {currentYear},{" "}
            <strong>{Math.round(contactConversionHead.currentRate * 100)}%</strong> viraram
            palco ({contactConversionHead.won} de {contactConversionHead.decided}) —{" "}
            <strong>{Math.round(contactConversionHead.drop * 100)} p.p. abaixo</strong> de{" "}
            {currentYear - 1} ({Math.round(contactConversionHead.previousRate * 100)}%)
            {contactConversionHead.others > 0 && (
              <span className={contactConversionHead.critical ? "text-red-600" : "text-amber-600"}>
                {" "}
                · +{contactConversionHead.others}{" "}
                {contactConversionHead.others === 1 ? "contratante esfriou" : "contratantes esfriaram"}
              </span>
            )}
          </span>
          <span className={contactConversionHead.critical ? "text-red-600" : "text-amber-600"}>
            Ver →
          </span>
        </Link>
      )}

      {/* Cards de resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Saldo (competência)" value={summary.balance} tone="brand" />
        <SummaryCard label="Caixa (realizado)" value={summary.cashBalance} tone="emerald" />
        <SummaryCard label="A receber" value={summary.pendingIncome} tone="amber" />
        <SummaryCard label="A pagar" value={summary.pendingExpense} tone="red" />
      </div>

      {/* Projeção de fechamento do ano corrente */}
      {hasForecast && (
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Projeção de {currentYear}</h2>
            <Link
              href="/financas/projecao-ano"
              className="text-sm text-brand-700 hover:underline"
            >
              Ver detalhe
            </Link>
          </div>
          <Link
            href="/financas/projecao-ano"
            className={
              "block rounded-lg border-l-4 bg-gray-50 px-4 py-3 transition hover:bg-gray-100 " +
              (forecast.projectedResult < 0 ? "border-red-400" : "border-emerald-400")
            }
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Resultado projetado do ano
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p
                className={
                  "text-2xl font-bold " +
                  (forecast.projectedResult < 0 ? "text-red-600" : "text-emerald-600")
                }
              >
                {formatMoney(forecast.projectedResult)}
              </p>
              {yoy.hasPreviousData && (
                <YoYBadge delta={yoy.result} previousYear={yoy.previousYear} />
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {formatMoney(forecast.projectedIncome)} em receitas −{" "}
              {formatMoney(forecast.projectedExpense)} em despesas.
              {forecast.realizedResult !== forecast.projectedResult && (
                <>
                  {" "}
                  Caixa realizado hoje:{" "}
                  <span
                    className={
                      "font-medium " +
                      (forecast.realizedResult < 0 ? "text-red-600" : "text-gray-700")
                    }
                  >
                    {formatMoney(forecast.realizedResult)}
                  </span>
                  .
                </>
              )}
            </p>
            {forecast.scheduledIncome > 0 && (
              <p className="mt-1 text-xs text-sky-700">
                Inclui {formatMoney(forecast.scheduledIncome)} de{" "}
                {forecast.scheduledShowCount}{" "}
                {forecast.scheduledShowCount === 1 ? "show" : "shows"} futuro
                {forecast.scheduledShowCount === 1 ? "" : "s"} ainda não lançado
                {forecast.scheduledShowCount === 1 ? "" : "s"}.
              </p>
            )}
            {hasConservativeFloor && (
              <p className="mt-2 border-t border-gray-200 pt-2 text-xs text-gray-600">
                <span className="font-medium">Só confirmados:</span>{" "}
                <span
                  className={
                    "font-semibold " +
                    (conservative.projectedResult < 0
                      ? "text-red-600"
                      : "text-emerald-600")
                  }
                >
                  {formatMoney(conservative.projectedResult)}
                </span>{" "}
                <span className="text-gray-500">
                  deixando de fora {formatMoney(forecast.scheduledTentative)} de{" "}
                  {forecast.scheduledTentativeCount}{" "}
                  {forecast.scheduledTentativeCount === 1
                    ? "show ainda a confirmar"
                    : "shows ainda a confirmar"}
                  .
                </span>
              </p>
            )}
            {hasFixedScenario && (
              <p className="mt-2 border-t border-gray-200 pt-2 text-xs text-amber-700">
                <span className="font-medium">Com custos fixos:</span>{" "}
                <span
                  className={
                    "font-semibold " +
                    (fixedScenario.projectedResultWithFixed < 0
                      ? "text-red-600"
                      : "text-emerald-600")
                  }
                >
                  {formatMoney(fixedScenario.projectedResultWithFixed)}
                </span>{" "}
                <span className="text-gray-500">
                  somando {formatMoney(fixedScenario.monthlyFixedCost)}/mês em{" "}
                  {fixedScenario.monthsEstimated}{" "}
                  {fixedScenario.monthsEstimated === 1
                    ? "mês ainda sem despesa lançada"
                    : "meses ainda sem despesa lançada"}
                  .
                </span>
              </p>
            )}
            {hasPessimisticFloor && (
              <p className="mt-2 border-t border-gray-200 pt-2 text-xs text-rose-700">
                <span className="font-medium">Pior caso:</span>{" "}
                <span
                  className={
                    "font-semibold " +
                    (pessimistic.projectedResult < 0
                      ? "text-red-600"
                      : "text-emerald-600")
                  }
                >
                  {formatMoney(pessimistic.projectedResult)}
                </span>{" "}
                <span className="text-gray-500">
                  cruzando os dois cenários cautelosos — só {formatMoney(pessimistic.projectedIncome)}{" "}
                  de receita (sem os {formatMoney(pessimistic.droppedTentative)} a confirmar) e{" "}
                  {formatMoney(pessimistic.projectedExpense)} de despesa (+
                  {formatMoney(pessimistic.estimatedRemainingFixedCost)} de custo fixo).
                </span>
              </p>
            )}
          </Link>
        </section>
      )}

      {/* Meta de faturamento do ano: progresso e ritmo */}
      {goalProgress && (
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Meta de {currentYear}</h2>
            <Link href="/financas/metas" className="text-sm text-brand-700 hover:underline">
              Ver detalhe
            </Link>
          </div>
          <Link
            href="/financas/metas"
            className="block rounded-lg bg-gray-50 px-4 py-3 transition hover:bg-gray-100"
          >
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-emerald-600">
                  {formatMoney(goalProgress.realized)}
                </span>{" "}
                de {formatMoney(goalProgress.goal)}
              </p>
              <p className="text-lg font-bold text-gray-900">
                {Math.round(goalProgress.realizedRatio * 100)}%
              </p>
            </div>
            <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-gray-200">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-brand-200"
                style={{ width: `${Math.min(100, Math.round(goalProgress.projectedRatio * 100))}%` }}
                aria-hidden
              />
              <div
                className={
                  "absolute inset-y-0 left-0 rounded-full " +
                  (goalProgress.realized >= goalProgress.goal ? "bg-emerald-500" : "bg-brand-500")
                }
                style={{ width: `${Math.min(100, Math.round(goalProgress.realizedRatio * 100))}%` }}
                aria-hidden
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {goalProgress.pace === "ahead"
                ? "No ritmo da meta — você está adiantado."
                : goalProgress.pace === "behind"
                  ? `Atrás do ritmo da meta — faltam ${formatMoney(Math.abs(goalProgress.paceDelta))} para o esperado até agora.`
                  : goalProgress.pace === "on-track"
                    ? "Você está no ritmo da meta."
                    : `Projeção do ano: ${formatMoney(goalProgress.projected)}.`}
            </p>
            {/* Piso conservador: só aparece quando os cenários divergem (há cachê
                a confirmar). Verde quando a meta resiste só com confirmados; âmbar
                quando ela depende dos shows ainda a confirmar para fechar. */}
            {goalScenarios?.diverges && (
              <p
                className={
                  "mt-2 rounded-md px-3 py-2 text-xs " +
                  (goalScenarios.hitsEvenConservatively
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-amber-50 text-amber-800")
                }
              >
                <span className="font-semibold">
                  {goalScenarios.hitsEvenConservatively ? "Folga real." : "Atenção ao piso."}
                </span>{" "}
                {goalScenarios.hitsEvenConservatively
                  ? `Só com shows confirmados, a projeção fica em ${formatMoney(goalScenarios.conservative.projected)} (${Math.round(goalScenarios.conservative.projectedRatio * 100)}% da meta) — você não depende dos ${formatMoney(goalScenarios.tentativeGap)} a confirmar.`
                  : `Sem os ${formatMoney(goalScenarios.tentativeGap)} de shows a confirmar, a projeção cai para ${formatMoney(goalScenarios.conservative.projected)} (${Math.round(goalScenarios.conservative.projectedRatio * 100)}% da meta) — a meta só fecha se eles se confirmarem.`}
              </p>
            )}
            {/* Ritmo necessário (D81): o número acionável — quanto receber por mês
                no resto do ano para fechar a meta. Cor pelo esforço (verde/âmbar/
                vermelho); só aparece quando é acionável e a meta ainda não fechou. */}
            {goalRun?.applicable && goalRun.verdict !== "hit" && (
              <p
                className={
                  "mt-2 rounded-md px-3 py-2 text-xs " +
                  (goalRun.verdict === "on-pace"
                    ? "bg-emerald-50 text-emerald-800"
                    : goalRun.verdict === "stretch"
                      ? "bg-amber-50 text-amber-800"
                      : goalRun.verdict === "hard"
                        ? "bg-red-50 text-red-800"
                        : "bg-gray-50 text-gray-700")
                }
              >
                <span className="font-semibold">
                  Ritmo necessário: {formatMoney(goalRun.requiredPerMonth)}/mês
                </span>{" "}
                {goalRun.verdict === "unknown"
                  ? `pelos próximos ${goalRun.monthsRemaining === 1 ? "1 mês" : `${goalRun.monthsRemaining} meses`} até dezembro.`
                  : goalRun.gapPerMonth > 0
                    ? `— ${formatMoney(goalRun.gapPerMonth)} a mais por mês do que vem recebendo (${formatMoney(goalRun.currentPerMonth)}/mês).`
                    : `no seu ritmo atual de ${formatMoney(goalRun.currentPerMonth)}/mês você cobre. Mantenha o passo.`}
              </p>
            )}
            {/* Por trimestre (D85): tira compacta de 4 mini-barras (uma por trimestre,
                cor pelo status) que mostra de relance em qual trimestre o ritmo caiu.
                Só aparece com meta > 0. O detalhe completo está em /financas/metas. */}
            {quarterly && quarterly.goal > 0 && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <div className="mb-2 flex items-baseline justify-between text-xs text-gray-500">
                  <span className="font-medium text-gray-600">Por trimestre</span>
                  <span>{quarterly.hitCount} de 4 batidos</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {quarterly.quarters.map((q) => {
                    const isCurrent = quarterly.currentQuarter === q.quarter;
                    return (
                      <div key={q.quarter} className="space-y-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={"h-full rounded-full " + GOAL_BAR[q.status]}
                            style={{ width: `${Math.min(100, Math.round(q.ratio * 100))}%` }}
                            aria-hidden
                          />
                        </div>
                        <p
                          className={
                            "text-center text-[11px] " +
                            (isCurrent ? "font-semibold text-brand-700" : "text-gray-400")
                          }
                        >
                          {q.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Por mês (D87): a granularidade fina da tira trimestral — 12 mini-barras
                (uma por mês, cor pelo status) revelam exatamente em qual mês o ritmo
                caiu. Só aparece com meta > 0. O detalhe está em /financas/metas. */}
            {monthlyGoal && monthlyGoal.goal > 0 && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <div className="mb-2 flex items-baseline justify-between text-xs text-gray-500">
                  <span className="font-medium text-gray-600">Por mês</span>
                  <span>{monthlyGoal.hitCount} de 12 batidos</span>
                </div>
                <div className="grid grid-cols-12 gap-1">
                  {monthlyGoal.months.map((m) => {
                    const isCurrent = monthlyGoal.currentMonth === m.month;
                    return (
                      <div key={m.month} className="space-y-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={"h-full rounded-full " + GOAL_BAR[m.status]}
                            style={{ width: `${Math.min(100, Math.round(m.ratio * 100))}%` }}
                            aria-hidden
                          />
                        </div>
                        <p
                          className={
                            "text-center text-[9px] leading-tight " +
                            (isCurrent ? "font-semibold text-brand-700" : "text-gray-400")
                          }
                        >
                          {m.label.charAt(0).toUpperCase()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Link>
        </section>
      )}

      {/* Projeção de caixa */}
      {hasProjection && (
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Projeção de caixa</h2>
            <Link href="/financas?status=pending" className="text-sm text-brand-700 hover:underline">
              Ver pendências
            </Link>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            A partir do caixa atual ({formatMoney(cashflow.startBalance)}), somando o que está
            a receber e a pagar pelo mês de vencimento.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {cashflow.months.map((m) => (
              <div key={m.month} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {formatMonthKey(m.month)}
                </p>
                <p
                  className={
                    "mt-1 text-lg font-bold " +
                    (m.endBalance < 0 ? "text-red-600" : "text-gray-900")
                  }
                  title="Saldo projetado ao fim do mês"
                >
                  {formatMoney(m.endBalance)}
                </p>
                {m.net !== 0 && (
                  <p
                    className={
                      "mt-0.5 text-xs " + (m.net >= 0 ? "text-emerald-600" : "text-red-600")
                    }
                  >
                    {m.net >= 0 ? "+" : "−"}
                    {formatMoney(Math.abs(m.net))}
                  </p>
                )}
              </div>
            ))}
          </div>
          {cashflow.months.some((m) => m.endBalance < 0) && (
            <p className="mt-3 text-xs text-red-600">
              ⚠ Caixa projetado fica negativo em algum mês — revise os prazos de recebimento
              ou despesas.
            </p>
          )}
        </section>
      )}

      {/* Funil de propostas: cachê em aberto e taxa de concretização */}
      {pipeline.total > 0 && (
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Funil de propostas</h2>
            <Link href="/shows/funil" className="text-sm text-brand-700 hover:underline">
              Ver funil
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/shows/funil"
              className="rounded-lg border border-gray-100 bg-gray-50 p-3 transition hover:bg-gray-100"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Cachê em aberto
              </p>
              <p className="mt-1 text-xl font-bold text-brand-700">
                {formatMoney(pipeline.openValue)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {pipeline.openCount} {pipeline.openCount === 1 ? "show" : "shows"} (proposto +
                confirmado)
              </p>
            </Link>
            <Link
              href="/shows?status=PROPOSED"
              className="rounded-lg border border-gray-100 bg-gray-50 p-3 transition hover:bg-gray-100"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Em negociação
              </p>
              <p className="mt-1 text-xl font-bold text-amber-600">
                {formatMoney(pipeline.proposedValue)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {pipeline.proposedCount} proposto{pipeline.proposedCount === 1 ? "" : "s"}
              </p>
            </Link>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Taxa de concretização
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {pipeline.conversionRate == null
                  ? "—"
                  : `${(pipeline.conversionRate * 100).toFixed(0)}%`}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {pipeline.conversionRate == null
                  ? "sem shows decididos"
                  : `${pipeline.playedCount} de ${pipeline.decidedCount} decididos`}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Prazo de recebimento realizado (DSO): quanto tempo o cachê leva para
          cair no caixa depois do show. */}
      {lagHeadline.show && (
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Prazo de recebimento</h2>
            <Link
              href="/shows/prazo-recebimento"
              className="text-sm text-brand-700 hover:underline"
            >
              Ver detalhe
            </Link>
          </div>
          <Link
            href="/shows/prazo-recebimento"
            className={
              "block rounded-lg border-l-4 bg-gray-50 px-4 py-3 transition hover:bg-gray-100 " +
              LAG_BORDER_TONES[lagHeadline.bucket]
            }
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Mediana — metade do cachê entra até
            </p>
            <p className={"mt-1 text-2xl font-bold " + LAG_TEXT_TONES[lagHeadline.bucket]}>
              {daysLabel(lagHeadline.medianDays)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Média de {daysLabel(lagHeadline.avgDays)} sobre{" "}
              {lagHeadline.showCount}{" "}
              {lagHeadline.showCount === 1 ? "show pago" : "shows pagos"}.
              {lagHeadline.skewed && (
                <span className="text-amber-700">
                  {" "}
                  A média é puxada por algum recebimento bem atrasado — a mediana
                  reflete melhor o prazo típico.
                </span>
              )}
            </p>
          </Link>
        </section>
      )}

      {/* Prazo de recebimento piorando COM UM CONTRATANTE (D194 no Painel): um
          pagador recorrente passou a te deixar esperando materialmente mais tempo
          pelo cachê de um ano para o outro. Cede a vez ao nudge absoluto de DSO
          acima; brilha quando o caixa segue saudável na média mas uma relação
          específica desacelerou. Vermelho no crítico (≥ 30 dias a mais). */}
      {lagRiseHead?.show && lagRiseHead.contact && (
        <Link
          href="/shows/prazo-recebimento/por-contratante"
          className={
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm transition " +
            (lagRiseHead.critical
              ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")
          }
        >
          <span className="font-semibold">
            {lagRiseHead.critical ? "🔴" : "🐢"} {lagRiseHead.contact.name} passou a pagar mais devagar
          </span>
          <span>
            Em {currentYear} o cachê entra em{" "}
            <strong>{daysLabel(lagRiseHead.currentAvgDays)}</strong> em média (sobre{" "}
            {lagRiseHead.sample}{" "}
            {lagRiseHead.sample === 1 ? "show pago" : "shows pagos"}) —{" "}
            <strong>{daysLabel(lagRiseHead.riseDays)} a mais</strong> que em {currentYear - 1}{" "}
            ({daysLabel(lagRiseHead.previousAvgDays)})
            {lagRiseHead.others > 0 && (
              <span className={lagRiseHead.critical ? "text-red-600" : "text-amber-600"}>
                {" "}
                · +{lagRiseHead.others}{" "}
                {lagRiseHead.others === 1
                  ? "pagador desacelerou"
                  : "pagadores desaceleraram"}
              </span>
            )}
          </span>
          <span className={lagRiseHead.critical ? "text-red-600" : "text-amber-600"}>
            Ver →
          </span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximos shows */}
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Próximos shows</h2>
            <Link
              href="/shows/calendario"
              className="text-sm text-brand-700 hover:underline"
            >
              Ver agenda
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyHint>
              Nenhum show futuro.{" "}
              <Link href="/shows/novo" className="text-brand-700 hover:underline">
                Adicionar show
              </Link>
            </EmptyHint>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcoming.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <Link href={`/shows/${s.id}`} className="font-medium hover:underline">
                      {s.title}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {formatDate(s.date)}
                      {s.city ? ` · ${s.city}` : ""}
                    </p>
                  </div>
                  <span className={"badge " + SHOW_STATUS_COLORS[s.status as ShowStatus]}>
                    {SHOW_STATUS_LABELS[s.status as ShowStatus]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Fluxo mensal */}
        <section className="card">
          <h2 className="mb-4 font-semibold">Fluxo dos últimos meses</h2>
          {monthly.length === 0 ? (
            <EmptyHint>Sem transações ainda.</EmptyHint>
          ) : (
            <div className="space-y-3">
              {monthly.map((m) => (
                <div key={m.month}>
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>{formatMonthKey(m.month)}</span>
                    <span className={m.net >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {formatMoney(m.net)}
                    </span>
                  </div>
                  <div className="flex h-2 gap-1">
                    <div
                      className="rounded bg-emerald-400"
                      style={{ width: `${(m.income / maxMonthly) * 50}%` }}
                      title={`Receita ${formatMoney(m.income)}`}
                    />
                    <div
                      className="rounded bg-red-400"
                      style={{ width: `${(m.expense / maxMonthly) * 50}%` }}
                      title={`Despesa ${formatMoney(m.expense)}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Rentabilidade por show */}
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Rentabilidade por show</h2>
            <span className="text-xs text-gray-400">realizados</span>
          </div>
          {showPnls.length === 0 ? (
            <EmptyHint>Marque shows como “realizado” para ver o resultado.</EmptyHint>
          ) : (
            <ul className="divide-y divide-gray-100">
              {showPnls.slice(0, 5).map(({ show, pnl }) => (
                <li key={show.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <Link href={`/shows/${show.id}`} className="font-medium hover:underline">
                      {show.title}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {formatMoney(pnl.fee)} cachê · {formatMoney(pnl.expenses)} despesas
                    </p>
                  </div>
                  <span
                    className={
                      "font-semibold " + (pnl.net >= 0 ? "text-emerald-600" : "text-red-600")
                    }
                  >
                    {formatMoney(pnl.net)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Categorias */}
        <section className="card">
          <h2 className="mb-4 font-semibold">Maiores categorias</h2>
          {categories.length === 0 ? (
            <EmptyHint>Sem dados de categoria.</EmptyHint>
          ) : (
            <ul className="divide-y divide-gray-100">
              {categories.map((c) => (
                <li key={c.category} className="flex items-center justify-between py-2 text-sm">
                  <span>{c.category}</span>
                  <span className="text-gray-500">
                    {c.income > 0 && (
                      <span className="text-emerald-600">+{formatMoney(c.income)} </span>
                    )}
                    {c.expense > 0 && (
                      <span className="text-red-600">−{formatMoney(c.expense)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "brand" | "emerald" | "amber" | "red";
}) {
  const tones: Record<string, string> = {
    brand: "text-brand-700",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 text-2xl font-bold " + tones[tone]}>{formatMoney(value)}</p>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-sm text-gray-400">{children}</p>;
}

/** Cor da borda do card de prazo, por balde de velocidade do DSO (mais lento = mais quente). */
const LAG_BORDER_TONES: Record<PaymentSpeedBucketKey, string> = {
  onTime: "border-emerald-400",
  d7: "border-emerald-400",
  d30: "border-amber-400",
  d60: "border-orange-400",
  slow: "border-red-400",
};

/** Cor do número do card de prazo, por balde de velocidade do DSO. */
const LAG_TEXT_TONES: Record<PaymentSpeedBucketKey, string> = {
  onTime: "text-emerald-600",
  d7: "text-emerald-600",
  d30: "text-amber-600",
  d60: "text-orange-600",
  slow: "text-red-600",
};

/** Texto pt-BR para um prazo em dias (negativo = recebido adiantado). */
function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} dias adiantado`;
  if (days === 0) return "no mesmo dia";
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}

/** 2,5 → "2,5"; 2 → "2" (vírgula decimal pt-BR, sem casa quando inteiro). */
function formatRatio(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/**
 * Pílula compacta "▲/▼ X% vs. {ano-1}" para o card de projeção do Painel.
 * Resultado subindo é bom (verde); descendo é ruim (vermelho); empate neutro.
 * Mostra o sinal só pelo valor — quem chama garante `hasPreviousData`.
 */
function YoYBadge({ delta, previousYear }: { delta: MetricDelta; previousYear: number }) {
  const up = delta.delta > 0;
  const flat = delta.delta === 0;
  const tone = flat
    ? "bg-gray-100 text-gray-600"
    : up
      ? "bg-emerald-100 text-emerald-700"
      : "bg-red-100 text-red-700";
  const pct =
    delta.pct === null
      ? ""
      : ` ${up ? "+" : "−"}${Math.round(Math.abs(delta.pct) * 100)}%`;
  const arrow = flat ? "→" : up ? "▲" : "▼";
  return (
    <span
      className={"rounded-full px-2 py-0.5 text-xs font-medium " + tone}
      title={`Fechamento de ${previousYear}: ${formatMoney(delta.previous)}`}
    >
      {arrow}
      {pct} vs. {previousYear}
    </span>
  );
}
