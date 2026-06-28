import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { monthlySeasonality, type TxLike, type SeasonalMonth } from "@/lib/finance";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function FinanceSeasonalityPage() {
  const user = await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  const allTxs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const seasonality = monthlySeasonality(allTxs);
  const hasActivity = seasonality.months.some((m) => m.years > 0);

  // Escala das barras: maior média mensal (receita ou despesa) entre os meses.
  const peak = Math.max(
    1,
    ...seasonality.months.map((m) => Math.max(m.avgIncome, m.avgExpense)),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sazonalidade</h1>
          <p className="text-sm text-gray-500">
            Em que época do ano você costuma faturar mais
          </p>
        </div>
        <div className="flex items-center gap-4">
          {hasActivity && (
            <a
              href="/financas/sazonalidade/export"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/financas" className="text-sm text-gray-500 hover:underline">
            ← Finanças
          </Link>
        </div>
      </div>

      {!hasActivity ? (
        <div className="card text-center text-gray-500">
          <p>Ainda não há transações para revelar um padrão sazonal.</p>
          <Link
            href="/financas/nova"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Registrar a primeira
          </Link>
        </div>
      ) : (
        <>
          {seasonality.yearsObserved < 2 && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Você tem dados de apenas {seasonality.yearsObserved}{" "}
              {seasonality.yearsObserved === 1 ? "ano" : "anos"}. O padrão sazonal fica
              mais confiável com pelo menos dois anos de histórico — por enquanto a média
              de cada mês é o próprio mês.
            </p>
          )}

          {/* Melhor / pior mês típico */}
          {(seasonality.best || seasonality.worst) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {seasonality.best && (
                <HighlightCard label="Melhor mês típico" month={seasonality.best} tone="emerald" />
              )}
              {seasonality.worst && (
                <HighlightCard label="Mês mais fraco" month={seasonality.worst} tone="red" />
              )}
            </div>
          )}

          {/* Mês a mês (média por ano-ativo) */}
          <section className="card overflow-x-auto">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">Média por mês do ano</h2>
              <span className="text-xs text-gray-400">
                histórico: {seasonality.yearsObserved}{" "}
                {seasonality.yearsObserved === 1 ? "ano" : "anos"}
              </span>
            </div>
            <p className="mb-4 text-xs text-gray-500">
              Cada linha é a média de um mês do calendário entre os anos em que ele teve
              movimento.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Mês</th>
                  <th className="pb-2 px-3 text-right font-medium">Receita média</th>
                  <th className="pb-2 px-3 text-right font-medium">Despesa média</th>
                  <th className="pb-2 px-3 text-right font-medium">Resultado médio</th>
                  <th className="pb-2 pl-3 text-right font-medium">Anos</th>
                </tr>
              </thead>
              <tbody>
                {seasonality.months.map((m) => {
                  const empty = m.years === 0;
                  return (
                    <tr
                      key={m.monthIndex}
                      className={"border-b last:border-0 " + (empty ? "text-gray-400" : "")}
                    >
                      <td className="py-2 pr-3 font-medium">{MONTH_NAMES[m.monthIndex - 1]}</td>
                      <td className="py-2 px-3 text-right text-emerald-600">
                        {m.avgIncome > 0 ? formatMoney(m.avgIncome) : "—"}
                        <Bar value={m.avgIncome} peak={peak} tone="emerald" />
                      </td>
                      <td className="py-2 px-3 text-right text-red-600">
                        {m.avgExpense > 0 ? formatMoney(m.avgExpense) : "—"}
                        <Bar value={m.avgExpense} peak={peak} tone="red" />
                      </td>
                      <td
                        className={
                          "py-2 px-3 text-right font-medium " +
                          (empty ? "" : m.avgNet < 0 ? "text-red-600" : "text-gray-900")
                        }
                      >
                        {empty ? "—" : formatMoney(m.avgNet)}
                      </td>
                      <td className="py-2 pl-3 text-right text-xs text-gray-500">
                        {empty ? "—" : m.years}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function Bar({
  value,
  peak,
  tone,
}: {
  value: number;
  peak: number;
  tone: "emerald" | "red";
}) {
  if (value <= 0) return null;
  const barTone = tone === "emerald" ? "bg-emerald-400" : "bg-red-400";
  const width = Math.max(2, Math.round((value / peak) * 100));
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded bg-gray-100">
      <div className={"ml-auto h-full rounded " + barTone} style={{ width: `${width}%` }} />
    </div>
  );
}

function HighlightCard({
  label,
  month,
  tone,
}: {
  label: string;
  month: SeasonalMonth;
  tone: "emerald" | "red";
}) {
  const textTone = month.avgNet < 0 ? "text-red-600" : "text-gray-900";
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-lg font-bold">{MONTH_NAMES[month.monthIndex - 1]}</span>
        <span className={"text-lg font-bold " + textTone}>{formatMoney(month.avgNet)}</span>
      </p>
      <p className="mt-1 text-xs text-gray-500">
        <span className={tone === "emerald" ? "text-emerald-600" : ""}>
          {formatMoney(month.avgIncome)} em receitas
        </span>{" "}
        · {formatMoney(month.avgExpense)} em despesas · média de {month.years}{" "}
        {month.years === 1 ? "ano" : "anos"}
      </p>
    </div>
  );
}
