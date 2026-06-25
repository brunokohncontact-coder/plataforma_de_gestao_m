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
  paymentLag,
  paymentLagHeadline,
  showPipeline,
  projectYearEnd,
  projectYearEndWithFixedCosts,
  projectYearEndPessimistic,
  applyYearEndScenario,
  compareYearEndToPrevious,
  recurringExpenses,
  pendingFixedCosts,
  computeGoalProgress,
  compareGoalScenarios,
  goalRunRate,
  quarterlyGoalProgress,
  monthlyGoalProgress,
  cashRunway,
  cashBurnRunway,
  cashBurnHeadline,
  rankContactsByProfit,
  clientConcentration,
  clientConcentrationHeadline,
  rankCitiesByProfit,
  geoConcentration,
  geoConcentrationHeadline,
  type TxLike,
  type ContactProfitContact,
  type QuarterGoalStatus,
  type ReceivableShowLike,
  type PromisableShowLike,
  type ShowLike,
  type YearEndShowLike,
  type MetricDelta,
  type PaymentSpeedBucketKey,
} from "@/lib/finance";
import {
  findScheduleConflicts,
  findOpenWeekends,
  formatWeekendLabel,
  type ConflictShowLike,
} from "@/lib/shows";
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
