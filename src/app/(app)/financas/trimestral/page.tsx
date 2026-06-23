import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  quarterlySummary,
  type TxLike,
  type QuarterSummary,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

const MONTH_ABBR = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

/** Período abreviado do trimestre, ex.: "Jan–Mar". */
function quarterRange(q: QuarterSummary): string {
  const first = MONTH_ABBR[q.monthIndexes[0] - 1];
  const last = MONTH_ABBR[q.monthIndexes[q.monthIndexes.length - 1] - 1];
  return `${first}–${last}`;
}

function readParam(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

/** "YYYY" -> ano válido (1970–2999); fallback ao ano atual. */
function parseYear(raw: string | undefined, reference: Date = new Date()): number {
  if (raw) {
    const m = /^\d{4}$/.exec(raw.trim());
    if (m) {
      const y = Number(m[0]);
      if (y >= 1970 && y <= 2999) return y;
    }
  }
  return reference.getFullYear();
}

export default async function FinanceQuarterlyPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();
  const params = searchParams ?? {};
  const year = parseYear(readParam(params, "ano"));

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

  const summary = quarterlySummary(allTxs, year);
  const hasActivity = summary.totalIncome > 0 || summary.totalExpense > 0;

  // Escala das barras: maior movimentação trimestral (receita ou despesa) no ano.
  const peak = Math.max(
    1,
    ...summary.quarters.map((q) => Math.max(q.income, q.expense)),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Resumo trimestral</h1>
          <p className="text-sm text-gray-500">{year}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasActivity && (
            <a
              href={`/financas/trimestral/export?ano=${year}`}
              className="btn-secondary text-sm"
              download
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/financas" className="text-sm text-gray-500 hover:underline">
            ← Finanças
          </Link>
        </div>
      </div>

      {/* Navegação por ano */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/financas/trimestral?ano=${year - 1}`}
          className="btn-secondary"
          aria-label="Ano anterior"
        >
          ←
        </Link>
        <Link href="/financas/trimestral" className="text-sm text-brand-700 hover:underline">
          Ano atual
        </Link>
        <Link
          href={`/financas/trimestral?ano=${year + 1}`}
          className="btn-secondary"
          aria-label="Próximo ano"
        >
          →
        </Link>
      </div>

      {!hasActivity ? (
        <div className="card text-center text-gray-500">
          <p>Nenhuma transação em {year}.</p>
        </div>
      ) : (
        <>
          {/* Totais do ano */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Receitas do ano" value={summary.totalIncome} tone="emerald" />
            <Stat label="Despesas do ano" value={summary.totalExpense} tone="red" />
            <Stat label="Saldo do ano" value={summary.net} tone="brand" />
          </div>

          {/* Melhor / pior trimestre */}
          {(summary.best || summary.worst) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {summary.best && (
                <HighlightCard label="Melhor trimestre" quarter={summary.best} tone="emerald" />
              )}
              {summary.worst && (
                <HighlightCard label="Pior trimestre" quarter={summary.worst} tone="red" />
              )}
            </div>
          )}

          {/* Quebra trimestre a trimestre */}
          <section className="card overflow-x-auto">
            <h2 className="mb-4 font-semibold">Trimestre a trimestre</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Trimestre</th>
                  <th className="pb-2 px-3 text-right font-medium">Receitas</th>
                  <th className="pb-2 px-3 text-right font-medium">Despesas</th>
                  <th className="pb-2 pl-3 text-right font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {summary.quarters.map((q) => {
                  const empty = q.income === 0 && q.expense === 0;
                  return (
                    <tr
                      key={q.quarter}
                      className={"border-b last:border-0 " + (empty ? "text-gray-400" : "")}
                    >
                      <td className="py-2 pr-3">
                        <span className="font-medium">{q.label}</span>
                        <span className="ml-2 text-xs text-gray-400">{quarterRange(q)}</span>
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-600">
                        {q.income > 0 ? formatMoney(q.income) : "—"}
                        <Bar value={q.income} peak={peak} tone="emerald" />
                      </td>
                      <td className="py-2 px-3 text-right text-red-600">
                        {q.expense > 0 ? formatMoney(q.expense) : "—"}
                        <Bar value={q.expense} peak={peak} tone="red" />
                      </td>
                      <td
                        className={
                          "py-2 pl-3 text-right font-medium " +
                          (q.net < 0 ? "text-red-600" : empty ? "" : "text-gray-900")
                        }
                      >
                        {empty ? "—" : formatMoney(q.net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="pt-2 pr-3">Total</td>
                  <td className="pt-2 px-3 text-right text-emerald-600">
                    {formatMoney(summary.totalIncome)}
                  </td>
                  <td className="pt-2 px-3 text-right text-red-600">
                    {formatMoney(summary.totalExpense)}
                  </td>
                  <td
                    className={
                      "pt-2 pl-3 text-right " +
                      (summary.net < 0 ? "text-red-600" : "text-gray-900")
                    }
                  >
                    {formatMoney(summary.net)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          <p className="text-xs text-gray-500">
            Veja também o{" "}
            <Link href={`/financas/anual?ano=${year}`} className="text-brand-700 hover:underline">
              Resumo anual
            </Link>{" "}
            (mês a mês e por categoria).
          </p>
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
  quarter,
  tone,
}: {
  label: string;
  quarter: QuarterSummary;
  tone: "emerald" | "red";
}) {
  const textTone = quarter.net < 0 ? "text-red-600" : "text-gray-900";
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-lg font-bold">
          {quarter.label}{" "}
          <span className="text-sm font-normal text-gray-400">{quarterRange(quarter)}</span>
        </span>
        <span className={"text-lg font-bold " + textTone}>{formatMoney(quarter.net)}</span>
      </p>
      <p className="mt-1 text-xs text-gray-500">
        <span className={tone === "emerald" ? "text-emerald-600" : ""}>
          {formatMoney(quarter.income)} em receitas
        </span>{" "}
        · {formatMoney(quarter.expense)} em despesas
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "red" | "brand";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    brand: value < 0 ? "text-red-600" : "text-brand-700",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 text-xl font-bold " + tones[tone]}>{formatMoney(value)}</p>
    </div>
  );
}
