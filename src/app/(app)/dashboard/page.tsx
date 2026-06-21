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
  showPipeline,
  projectYearEnd,
  projectYearEndWithFixedCosts,
  compareYearEndToPrevious,
  recurringExpenses,
  type TxLike,
  type ReceivableShowLike,
  type ShowLike,
  type YearEndShowLike,
  type MetricDelta,
} from "@/lib/finance";
import { findScheduleConflicts } from "@/lib/shows";
import { formatMoney } from "@/lib/money";
import { formatDate, formatMonthKey } from "@/lib/format";
import { SHOW_STATUS_LABELS, SHOW_STATUS_COLORS, type ShowStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  const [transactions, shows, upcoming] = await Promise.all([
    prisma.transaction.findMany({ where: { userId: user.id } }),
    prisma.show.findMany({ where: { userId: user.id } }),
    prisma.show.findMany({
      where: { userId: user.id, date: { gte: new Date() }, status: { not: "CANCELLED" } },
      orderBy: { date: "asc" },
      take: 5,
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
  const monthly = totalsByMonth(txs).slice(-6);
  const categories = totalsByCategory(txs).slice(0, 5);
  const cashflow = projectCashflow(txs, { months: 6 });
  const hasProjection = cashflow.months.some((m) => m.income > 0 || m.expense > 0);

  // Projeção de fechamento do ano corrente (reaproveita os shows/transações já
  // carregados; sem consulta extra). Só vale a pena mostrar quando há um
  // componente futuro (pendência ou cachê agendado) que muda o caixa realizado.
  const currentYear = new Date().getFullYear();
  const forecast = projectYearEnd(txs, shows as YearEndShowLike[], currentYear);
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
  const pipeline = showPipeline(shows as ShowLike[]);
  const receivables = reconcileShowFees(shows as ReceivableShowLike[], txs);
  const receivablesAging = bucketReceivablesByAge(receivables);
  // Recebível "encalhado": parado há mais de 90 dias (balde "older" do aging).
  const staleReceivables = receivablesAging.buckets.find((b) => b.key === "older");
  const hasStaleReceivables = staleReceivables != null && staleReceivables.count > 0;

  // Conflitos de agenda ainda acionáveis (dias com 2+ shows de hoje em diante).
  const conflicts = findScheduleConflicts(shows);

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
