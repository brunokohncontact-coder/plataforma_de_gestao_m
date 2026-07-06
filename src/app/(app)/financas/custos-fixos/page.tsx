import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { recurringExpenses, pendingFixedCosts, type TxLike } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { centsToInputValue } from "@/lib/format";

export const dynamic = "force-dynamic";

const MONTH_ABBR = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const MONTH_FULL = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "YYYY-MM" -> "mmm/aa" (ex.: "jun/26"). */
function formatMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const abbr = MONTH_ABBR[m - 1] ?? key;
  return `${abbr}/${String(y).slice(2)}`;
}

/** "YYYY-MM" -> "junho de 2026". */
function formatMonthLong(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const name = MONTH_FULL[m - 1] ?? key;
  return `${name} de ${y}`;
}

/** Link para a Nova transação já com tipo/categoria/valor/data pré-preenchidos. */
function lancarHref(category: string, typicalAmount: number, today: string): string {
  const params = new URLSearchParams({
    tipo: "EXPENSE",
    categoria: category,
    valor: centsToInputValue(typicalAmount),
    data: today,
  });
  return `/financas/nova?${params.toString()}`;
}

export default async function FixedCostsPage() {
  const user = await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, type: "EXPENSE" },
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

  const report = recurringExpenses(allTxs);
  const { categories, estimatedMonthlyFixedCost, monthsObserved } = report;
  const activeCount = categories.filter((c) => c.active).length;

  // Lembrete acionável: custos fixos que costumam cair todo mês mas ainda não
  // foram lançados no mês corrente — com link para lançar com um clique.
  const pending = pendingFixedCosts(allTxs);
  const today = new Date().toISOString().slice(0, 10);

  // Escala das barras: maior conta típica entre as categorias recorrentes.
  const peak = Math.max(1, ...categories.map((c) => c.avgPerActiveMonth));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Custos fixos</h1>
          <p className="text-sm text-gray-500">
            As despesas que se repetem mês a mês — quanto você precisa faturar só para se manter
          </p>
        </div>
        <div className="flex items-center gap-3">
          {categories.length > 0 && (
            <a href="/financas/custos-fixos/export" className="btn-secondary">
              ⬇ CSV
            </a>
          )}
          <Link href="/financas" className="text-sm text-gray-500 hover:underline">
            ← Finanças
          </Link>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>
            Ainda não há um padrão de despesas recorrentes. Custos fixos aparecem aqui quando uma
            mesma categoria de despesa se repete por pelo menos três meses.
          </p>
          <Link
            href="/financas/nova"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Registrar uma despesa
          </Link>
        </div>
      ) : (
        <>
          {/* Custo fixo mensal estimado */}
          <section className="card">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Custo fixo mensal estimado
            </p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {formatMoney(estimatedMonthlyFixedCost)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Soma da conta típica de {activeCount}{" "}
              {activeCount === 1 ? "categoria recorrente ativa" : "categorias recorrentes ativas"}.
              É o piso que você precisa faturar todo mês só para cobrir o que é fixo.
            </p>
          </section>

          {/* Contas fixas a lançar no mês corrente (lembrete acionável) */}
          {pending.pending.length > 0 ? (
            <section className="card border-amber-200 bg-amber-50/40">
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold text-amber-900">
                  ⏰ A lançar em {formatMonthLong(pending.month)}
                </h2>
                <span className="text-sm font-medium text-amber-800">
                  {formatMoney(pending.totalPending)} em{" "}
                  {pending.pending.length}{" "}
                  {pending.pending.length === 1 ? "conta" : "contas"}
                </span>
              </div>
              <p className="mb-3 text-xs text-amber-800/80">
                Custos fixos que costumam cair todo mês e ainda não foram lançados neste mês. O
                valor sugerido é a conta típica — confira e ajuste ao lançar.
                {pending.loggedCount > 0 && (
                  <> {pending.loggedCount} já {pending.loggedCount === 1 ? "lançada" : "lançadas"}.</>
                )}
              </p>
              <ul className="divide-y divide-amber-200/70">
                {pending.pending.map((c) => (
                  <li
                    key={c.category}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-gray-900">{c.category}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        típico {formatMoney(c.typicalAmount)} · última {formatMonthKey(c.lastMonth)}
                      </span>
                    </div>
                    <Link
                      href={lancarHref(c.category, c.typicalAmount, today)}
                      className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                    >
                      Lançar {formatMoney(c.typicalAmount)} →
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            activeCount > 0 && (
              <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                ✓ Todos os custos fixos já foram lançados em {formatMonthLong(pending.month)}.
              </p>
            )
          )}

          {monthsObserved < 3 && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Você tem despesas em apenas {monthsObserved}{" "}
              {monthsObserved === 1 ? "mês" : "meses"}. A detecção de custos fixos fica mais
              confiável com alguns meses de histórico.
            </p>
          )}

          {/* Categorias recorrentes */}
          <section className="card overflow-x-auto">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">Despesas recorrentes</h2>
              <span className="text-xs text-gray-400">
                {categories.length}{" "}
                {categories.length === 1 ? "categoria" : "categorias"}
              </span>
            </div>
            <p className="mb-4 text-xs text-gray-500">
              Categorias de despesa que apareceram em três meses ou mais. A conta típica é a média
              por mês em que a despesa ocorreu. Categorias sem lançamento recente são marcadas como
              encerradas e ficam de fora do custo fixo estimado.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Categoria</th>
                  <th className="pb-2 px-3 text-right font-medium">Conta típica/mês</th>
                  <th className="pb-2 px-3 text-right font-medium">Meses</th>
                  <th className="pb-2 px-3 text-right font-medium">Última</th>
                  <th className="pb-2 pl-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr
                    key={c.category}
                    className={"border-b last:border-0 " + (c.active ? "" : "text-gray-400")}
                  >
                    <td className="py-2 pr-3 font-medium">
                      {c.category}
                      {!c.active && (
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-gray-500">
                          encerrada
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-red-600">
                      {formatMoney(c.avgPerActiveMonth)}
                      <Bar value={c.avgPerActiveMonth} peak={peak} dimmed={!c.active} />
                    </td>
                    <td className="py-2 px-3 text-right text-xs text-gray-500">
                      {c.monthsActive}
                      {c.monthsSpan > c.monthsActive && (
                        <span className="text-gray-400"> de {c.monthsSpan}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-xs text-gray-500">
                      {formatMonthKey(c.lastMonth)}
                    </td>
                    <td className="py-2 pl-3 text-right text-gray-700">
                      {formatMoney(c.total)}
                    </td>
                  </tr>
                ))}
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
  dimmed,
}: {
  value: number;
  peak: number;
  dimmed: boolean;
}) {
  if (value <= 0) return null;
  const width = Math.max(2, Math.round((value / peak) * 100));
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded bg-gray-100">
      <div
        className={"ml-auto h-full rounded " + (dimmed ? "bg-gray-300" : "bg-red-400")}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
