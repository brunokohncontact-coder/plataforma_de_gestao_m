import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  expenseMix,
  expenseMixYears,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
  type DiversificationLevel,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

const LEVEL_LABELS: Record<DiversificationLevel, string> = {
  concentrated: "Despesa concentrada",
  moderate: "Concentração moderada",
  diversified: "Despesa pulverizada",
};

const LEVEL_TONES: Record<DiversificationLevel, string> = {
  concentrated: "bg-amber-50 text-amber-800",
  moderate: "bg-sky-50 text-sky-800",
  diversified: "bg-emerald-50 text-emerald-800",
};

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export default async function FinanceExpenseMixPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  // Recorte por período (ano). Os anos do seletor vêm só das transações que de
  // fato entram no mix (despesas), via `expenseMixYears`, para não oferecer um
  // ano sem despesa. Filtra-se ANTES de mapear/`expenseMix` (que segue puro,
  // agnóstico ao recorte), reusando o `filterShowsByYear` genérico da D108 sobre
  // as transações cruas (que têm `date: Date`). Espelho de `/financas/fontes-de-renda`.
  const availableYears = expenseMixYears(
    transactions.map((t) => ({
      type: t.type as TxLike["type"],
      amount: t.amount,
      category: t.category,
      date: t.date,
      received: t.received,
      showId: t.showId,
    })),
  );
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodTxs = filterShowsByYear(transactions, yearFilter);

  const allTxs: TxLike[] = periodTxs.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const mix = expenseMix(allTxs);
  const exportHref =
    "/financas/composicao-despesas/export" +
    (yearFilter === "all" ? "" : `?ano=${yearFilter}`);
  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Para onde vai o dinheiro</h1>
          <p className="text-sm text-gray-500">
            A composição das suas despesas por categoria e o quanto um único gasto domina
            o orçamento.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {mix.categoryCount > 0 && (
            <a
              href={exportHref}
              className="text-sm text-brand-700 hover:underline"
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/financas" className="text-sm text-gray-500 hover:underline">
            ← Finanças
          </Link>
        </div>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker
          years={availableYears}
          active={yearFilter}
          basePath="/financas/composicao-despesas"
        />
      )}

      {mix.categoryCount === 0 ? (
        <div className="card text-center text-gray-500">
          {yearFilter === "all" ? (
            <>
              <p>Ainda não há despesas para mostrar a composição dos seus gastos.</p>
              <Link
                href="/financas/nova"
                className="mt-3 inline-block text-brand-700 hover:underline"
              >
                Registrar a primeira despesa
              </Link>
            </>
          ) : (
            <p>Nenhuma despesa lançada em {periodLabel}.</p>
          )}
        </div>
      ) : (
        <>
          {/* Veredito de concentração */}
          <div className={"rounded-lg px-4 py-3 text-sm " + LEVEL_TONES[mix.level]}>
            <p className="font-semibold">{LEVEL_LABELS[mix.level]}</p>
            <p className="mt-0.5">
              {mix.level === "concentrated" && mix.top && (
                <>
                  {pct(mix.topShare)} dos seus gastos vão para{" "}
                  <strong>{mix.top.category}</strong>. É onde cortar um pouco rende mais —
                  vale revisar se dá para reduzir ou negociar essa conta.
                </>
              )}
              {mix.level === "moderate" && (
                <>
                  Seus gastos se dividem entre algumas categorias, mas poucas puxam a maior
                  parte. Equivale a {mix.effectiveCategories.toFixed(1)} rubricas de mesmo
                  tamanho.
                </>
              )}
              {mix.level === "diversified" && (
                <>
                  Seus gastos estão pulverizados em {mix.categoryCount} categorias —
                  equivale a {mix.effectiveCategories.toFixed(1)} rubricas de mesmo
                  tamanho. Nenhuma conta isolada domina o orçamento.
                </>
              )}
            </p>
          </div>

          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Despesa total" value={formatMoney(mix.total)} />
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Maior gasto
              </p>
              {mix.top && (
                <>
                  <p className="mt-1 truncate font-medium text-gray-900">
                    {mix.top.category}
                  </p>
                  <p className="mt-1 text-lg font-bold text-rose-600">
                    {pct(mix.topShare)}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      {formatMoney(mix.top.amount)}
                    </span>
                  </p>
                </>
              )}
            </div>
            <Stat
              label="Categorias de gasto"
              value={String(mix.categoryCount)}
              hint={`top 3 = ${pct(mix.top3Share)} da despesa`}
            />
          </div>

          {/* Composição por rubrica */}
          <section className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 text-right font-medium">Lançamentos</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Participação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mix.categories.map((c) => (
                  <tr key={c.category} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.category}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{c.count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-600">
                      {formatMoney(c.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-10 shrink-0 text-right text-xs text-gray-500">
                          {pct(c.share)}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                          <div
                            className="h-full rounded bg-rose-400"
                            style={{ width: `${Math.max(2, Math.round(c.share * 100))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <p className="text-xs text-gray-400">
            Considera as despesas lançadas (pagas e a pagar){" "}
            {yearFilter === "all" ? "de todos os anos" : `de ${periodLabel}`}, agrupadas
            pela categoria. O número efetivo de rubricas resume a concentração: quanto
            maior, mais pulverizado é o gasto. Espelho de{" "}
            <Link href="/financas/fontes-de-renda" className="hover:underline">
              Fontes de renda
            </Link>
            ; para os gastos que se repetem todo mês, veja{" "}
            <Link href="/financas/custos-fixos" className="hover:underline">
              Custos fixos
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
