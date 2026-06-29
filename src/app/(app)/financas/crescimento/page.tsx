import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  yearlyHistory,
  type TxLike,
  type MetricDelta,
  type YearlyTotal,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function FinanceGrowthPage() {
  const user = await requireUser();

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

  const history = yearlyHistory(txs);

  // Escala das barras: maior receita/despesa anual da série.
  const peak = Math.max(
    1,
    ...history.years.map((y) => Math.max(y.income, y.expense)),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Crescimento ano a ano</h1>
          <p className="text-sm text-gray-500">
            Os seus anos lado a lado — se a carreira está faturando mais com o
            tempo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {history.years.length > 0 && (
            <a href="/financas/crescimento/export" className="btn-secondary">
              ⬇ CSV
            </a>
          )}
          <Link href="/financas" className="btn-secondary">
            ← Finanças
          </Link>
        </div>
      </div>

      {history.years.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>
            Ainda não há transações para revelar uma trajetória. Lance receitas e
            despesas para acompanhar o seu crescimento ano a ano.
          </p>
          <Link
            href="/financas/nova"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Lançar uma transação
          </Link>
        </div>
      ) : (
        <>
          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Resultado acumulado"
              value={formatMoney(history.net)}
              tone={history.net < 0 ? "red" : "brand"}
              hint={`em ${history.years.length === 1 ? "1 ano" : `${history.years.length} anos`}`}
            />
            <Stat
              label="Média por ano"
              value={formatMoney(history.avgNetPerYear)}
              tone={history.avgNetPerYear < 0 ? "red" : "gray"}
              hint="resultado médio anual"
            />
            <Stat
              label="Melhor ano"
              value={history.bestYear ? formatMoney(history.bestYear.net) : "—"}
              tone="emerald"
              hint={history.bestYear ? String(history.bestYear.year) : undefined}
            />
            <Stat
              label="Pior ano"
              value={history.worstYear ? formatMoney(history.worstYear.net) : "—"}
              tone={history.worstYear && history.worstYear.net < 0 ? "red" : "gray"}
              hint={history.worstYear ? String(history.worstYear.year) : undefined}
            />
          </div>

          {/* Tendência: resultado do último ano vs. o primeiro */}
          {history.trend && (
            <TrendCard
              delta={history.trend}
              firstYear={history.years[0]}
              lastYear={history.years[history.years.length - 1]}
            />
          )}

          {/* Ano a ano */}
          <section className="card overflow-x-auto">
            <h2 className="mb-1 font-semibold">Ano a ano</h2>
            <p className="mb-4 text-xs text-gray-500">
              A variação do resultado de cada ano é comparada ao ano anterior com
              movimento. Clique no ano para abrir o resumo mês a mês.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Ano</th>
                  <th className="pb-2 px-3 text-right font-medium">Receitas</th>
                  <th className="pb-2 px-3 text-right font-medium">Despesas</th>
                  <th className="pb-2 pl-3 text-right font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {history.years.map((y) => (
                  <tr key={y.year} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">
                      <Link
                        href={`/financas/anual?ano=${y.year}`}
                        className="hover:underline"
                      >
                        {y.year}
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-600">
                      {y.income > 0 ? formatMoney(y.income) : "—"}
                      <Bar value={y.income} peak={peak} tone="emerald" />
                    </td>
                    <td className="py-2 px-3 text-right text-red-600">
                      {y.expense > 0 ? formatMoney(y.expense) : "—"}
                      <Bar value={y.expense} peak={peak} tone="red" />
                    </td>
                    <td
                      className={
                        "py-2 pl-3 text-right font-medium " +
                        (y.net < 0 ? "text-red-600" : "text-gray-900")
                      }
                    >
                      {formatMoney(y.net)}
                      {y.netDelta && y.netDelta.previous !== 0 && (
                        <DeltaInline delta={y.netDelta} upIsGood />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="pt-2 pr-3">Total</td>
                  <td className="pt-2 px-3 text-right text-emerald-600">
                    {formatMoney(history.totalIncome)}
                  </td>
                  <td className="pt-2 px-3 text-right text-red-600">
                    {formatMoney(history.totalExpense)}
                  </td>
                  <td
                    className={
                      "pt-2 pl-3 text-right " +
                      (history.net < 0 ? "text-red-600" : "text-gray-900")
                    }
                  >
                    {formatMoney(history.net)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function TrendCard({
  delta,
  firstYear,
  lastYear,
}: {
  delta: MetricDelta;
  firstYear: YearlyTotal;
  lastYear: YearlyTotal;
}) {
  const colorClass =
    delta.direction === "up"
      ? "text-emerald-600"
      : delta.direction === "down"
        ? "text-red-600"
        : "text-gray-500";
  const arrow = delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "→";
  const pctLabel = delta.pct == null ? "novo" : `${Math.round(Math.abs(delta.pct) * 100)}%`;
  const headline =
    delta.direction === "up"
      ? "A sua carreira está crescendo"
      : delta.direction === "down"
        ? "A sua carreira está encolhendo"
        : "O seu resultado anual está estável";

  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Tendência de longo prazo
      </p>
      <p className={"mt-1 text-xl font-bold " + colorClass}>
        {headline}{" "}
        {delta.direction !== "flat" && (
          <span>
            {arrow} {formatMoney(Math.abs(delta.delta))}{" "}
            <span className="opacity-70">({pctLabel})</span>
          </span>
        )}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Comparando {firstYear.year} ({formatMoney(firstYear.net)}) com {lastYear.year}{" "}
        ({formatMoney(lastYear.net)}).
      </p>
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

/** Variação compacta para dentro de uma célula da tabela (seta + porcentagem). */
function DeltaInline({ delta, upIsGood }: { delta: MetricDelta; upIsGood: boolean }) {
  if (delta.direction === "flat") return null;
  const isGood = delta.direction === "up" ? upIsGood : !upIsGood;
  const colorClass = isGood ? "text-emerald-600" : "text-red-600";
  const arrow = delta.direction === "up" ? "▲" : "▼";
  const pctLabel =
    delta.pct == null ? "novo" : `${Math.round(Math.abs(delta.pct) * 100)}%`;
  return (
    <span className={"ml-2 text-xs font-normal " + colorClass}>
      {arrow} {pctLabel}
    </span>
  );
}

function Stat({
  label,
  value,
  tone = "gray",
  hint,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "red" | "brand" | "gray";
  hint?: string;
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    brand: "text-brand-700",
    gray: "text-gray-900",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 text-xl font-bold " + tones[tone]}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
