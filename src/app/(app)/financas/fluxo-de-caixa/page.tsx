import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  projectCashflow,
  parseCashflowHorizon,
  CASHFLOW_HORIZON_OPTIONS,
  DEFAULT_CASHFLOW_HORIZON,
  type TxLike,
  type CashflowMonth,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatMonthKey } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Horizontes oferecidos no seletor (em meses) — compartilhados com a exportação. */
const HORIZON_OPTIONS = CASHFLOW_HORIZON_OPTIONS;
const DEFAULT_HORIZON = DEFAULT_CASHFLOW_HORIZON;

export default async function CashflowPage({
  searchParams,
}: {
  searchParams?: { meses?: string | string[] };
}) {
  const user = await requireUser();
  const horizon = parseCashflowHorizon(searchParams?.meses);

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const projection = projectCashflow(txs, { months: horizon });
  const hasPending = projection.months.some((m) => m.income > 0 || m.expense > 0);

  // Vale mais (saldo) e pior momento: o menor saldo projetado ao longo do horizonte.
  const lowest = projection.months.reduce<CashflowMonth | null>(
    (acc, m) => (acc === null || m.endBalance < acc.endBalance ? m : acc),
    null,
  );
  const endBalance =
    projection.months.length > 0
      ? projection.months[projection.months.length - 1].endBalance
      : projection.startBalance;
  const firstNegative = projection.months.find((m) => m.endBalance < 0) ?? null;

  // Escala das barras: maior fluxo (receita ou despesa) de um único mês.
  const peak = Math.max(
    1,
    ...projection.months.map((m) => Math.max(m.income, m.expense)),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fluxo de caixa projetado</h1>
          <p className="text-sm text-gray-500">
            Como o seu caixa evolui mês a mês com o que está a receber e a pagar
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasPending && (
            <a
              href={`/financas/fluxo-de-caixa/export${
                horizon === DEFAULT_HORIZON ? "" : `?meses=${horizon}`
              }`}
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

      {/* Seletor de horizonte */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500">Horizonte:</span>
        {HORIZON_OPTIONS.map((months) => {
          const active = months === horizon;
          return (
            <Link
              key={months}
              href={
                months === DEFAULT_HORIZON
                  ? "/financas/fluxo-de-caixa"
                  : `/financas/fluxo-de-caixa?meses=${months}`
              }
              className={
                "rounded-full px-3 py-1 text-sm transition " +
                (active
                  ? "bg-brand-700 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200")
              }
              aria-current={active ? "true" : undefined}
            >
              {months} meses
            </Link>
          );
        })}
      </div>

      {/* Destaques: caixa atual, saldo ao fim do horizonte, pior momento */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Caixa atual
          </p>
          <p className="mt-1 text-2xl font-bold">{formatMoney(projection.startBalance)}</p>
          <p className="mt-1 text-xs text-gray-500">o que já entrou e saiu de fato</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Saldo em {horizon} meses
          </p>
          <p
            className={
              "mt-1 text-2xl font-bold " + (endBalance < 0 ? "text-red-600" : "text-gray-900")
            }
          >
            {formatMoney(endBalance)}
          </p>
          <p className="mt-1 text-xs text-gray-500">caixa projetado ao fim do horizonte</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Pior momento
          </p>
          {lowest ? (
            <>
              <p
                className={
                  "mt-1 text-2xl font-bold " +
                  (lowest.endBalance < 0 ? "text-red-600" : "text-gray-900")
                }
              >
                {formatMoney(lowest.endBalance)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                menor saldo, em {formatMonthKey(lowest.month)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-gray-400">—</p>
          )}
        </div>
      </div>

      {firstNegative && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          ⚠ O caixa projetado fica <strong>negativo</strong> a partir de{" "}
          {formatMonthKey(firstNegative.month)}. Antecipe recebimentos, adie despesas ou
          renegocie prazos para não furar o caixa.
        </p>
      )}

      {!hasPending && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Não há contas a receber ou a pagar nos próximos {horizon} meses — a projeção apenas
          mantém o caixa atual. Registre pendências em{" "}
          <Link href="/financas/nova" className="font-medium underline">
            Finanças
          </Link>{" "}
          para enxergar o fluxo futuro.
        </p>
      )}

      {/* Mês a mês */}
      <section className="card overflow-x-auto">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">Mês a mês</h2>
          <span className="text-xs text-gray-400">
            a partir de {formatMoney(projection.startBalance)}
          </span>
        </div>
        <p className="mb-4 text-xs text-gray-500">
          Pendências são somadas pelo mês de vencimento; vencidas e de meses anteriores caem no
          mês atual. O saldo é acumulado a partir do caixa de hoje.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="pb-2 pr-3 font-medium">Mês</th>
              <th className="pb-2 px-3 text-right font-medium">A receber</th>
              <th className="pb-2 px-3 text-right font-medium">A pagar</th>
              <th className="pb-2 px-3 text-right font-medium">Variação</th>
              <th className="pb-2 pl-3 text-right font-medium">Saldo ao fim</th>
            </tr>
          </thead>
          <tbody>
            {projection.months.map((m) => (
              <tr key={m.month} className="border-b last:border-0">
                <td className="py-2 pr-3 font-medium">{formatMonthKey(m.month)}</td>
                <td className="py-2 px-3 text-right text-emerald-600">
                  {m.income > 0 ? formatMoney(m.income) : "—"}
                  <Bar value={m.income} peak={peak} tone="emerald" />
                </td>
                <td className="py-2 px-3 text-right text-red-600">
                  {m.expense > 0 ? formatMoney(m.expense) : "—"}
                  <Bar value={m.expense} peak={peak} tone="red" />
                </td>
                <td
                  className={
                    "py-2 px-3 text-right " +
                    (m.net === 0 ? "text-gray-400" : m.net > 0 ? "text-emerald-600" : "text-red-600")
                  }
                >
                  {m.net === 0
                    ? "—"
                    : (m.net > 0 ? "+" : "−") + formatMoney(Math.abs(m.net))}
                </td>
                <td
                  className={
                    "py-2 pl-3 text-right font-medium " +
                    (m.endBalance < 0 ? "text-red-600" : "text-gray-900")
                  }
                >
                  {formatMoney(m.endBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
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
