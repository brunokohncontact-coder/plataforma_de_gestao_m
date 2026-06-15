import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  getWorkspaceTransactionsForCalc,
  getWorkspaceShows,
} from "@/lib/queries";
import {
  overallTotals,
  receivablesSummary,
  monthlyFinancialSummary,
  showProfitAndLoss,
} from "@/lib/finance";
import { formatBRL, formatDate, formatMonthLabel } from "@/lib/money";
import { Card, Badge } from "@/components/ui";
import { SHOW_STATUS_LABELS, type ShowStatus } from "@/lib/domain";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={
          "mt-1 text-2xl font-bold " +
          (tone === "pos" ? "text-emerald-600" : tone === "neg" ? "text-red-600" : "")
        }
      >
        {value}
      </p>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const wsId = user.workspaceId;

  const [txs, shows] = await Promise.all([
    getWorkspaceTransactionsForCalc(wsId),
    getWorkspaceShows(wsId),
  ]);

  const totals = overallTotals(txs);
  const recv = receivablesSummary(txs);
  const monthly = monthlyFinancialSummary(txs).slice(-6).reverse();

  const upcoming = shows
    .filter((s) => s.status !== "cancelled" && s.date >= new Date())
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const showsPnl = shows
    .map((s) => ({
      show: s,
      pnl: showProfitAndLoss(
        { id: s.id, feeAgreed: s.feeAgreed },
        s.transactions.map((t) => ({
          type: t.type as "income" | "expense",
          amount: t.amount,
          date: t.date,
          category: t.category,
          status: t.status as "received" | "pending",
          showId: t.showId,
        })),
      ),
    }))
    .sort((a, b) => b.pnl.net - a.pnl.net)
    .slice(0, 5);

  const empty = txs.length === 0 && shows.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Visão geral</h1>
        <p className="text-slate-500">Olá, {user.name}. Aqui está o resumo da sua carreira.</p>
      </div>

      {empty && (
        <Card>
          <p className="text-slate-600">
            Você ainda não tem dados. Comece adicionando seu primeiro{" "}
            <Link href="/dashboard/shows" className="font-medium text-brand-600 hover:underline">
              show
            </Link>{" "}
            ou uma{" "}
            <Link href="/dashboard/financas" className="font-medium text-brand-600 hover:underline">
              transação financeira
            </Link>
            .
          </p>
        </Card>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Receitas (total)" value={formatBRL(totals.income)} tone="pos" />
        <Stat label="Despesas (total)" value={formatBRL(totals.expense)} tone="neg" />
        <Stat
          label="Resultado líquido"
          value={formatBRL(totals.net)}
          tone={totals.net >= 0 ? "pos" : "neg"}
        />
        <Stat label="A receber (pendente)" value={formatBRL(recv.pendingIncome)} />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Próximos shows</h2>
          <Card>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum show futuro agendado.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2">
                    <div>
                      <Link
                        href={`/dashboard/shows/${s.id}`}
                        className="font-medium hover:text-brand-600"
                      >
                        {s.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {formatDate(s.date)}
                        {s.city ? ` · ${s.city}` : ""}
                      </p>
                    </div>
                    <Badge value={s.status} label={SHOW_STATUS_LABELS[s.status as ShowStatus]} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Rentabilidade por show</h2>
          <Card>
            {showsPnl.length === 0 ? (
              <p className="text-sm text-slate-500">Sem shows cadastrados.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {showsPnl.map(({ show, pnl }) => (
                  <li key={show.id} className="flex items-center justify-between py-2">
                    <Link
                      href={`/dashboard/shows/${show.id}`}
                      className="font-medium hover:text-brand-600"
                    >
                      {show.title}
                    </Link>
                    <span
                      className={
                        "font-semibold " + (pnl.net >= 0 ? "text-emerald-600" : "text-red-600")
                      }
                    >
                      {formatBRL(pnl.net)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Resumo mensal</h2>
        <Card>
          {monthly.length === 0 ? (
            <p className="text-sm text-slate-500">Sem transações lançadas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-2 font-medium">Mês</th>
                  <th className="pb-2 text-right font-medium">Receitas</th>
                  <th className="pb-2 text-right font-medium">Despesas</th>
                  <th className="pb-2 text-right font-medium">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={m.month} className="border-t border-slate-100">
                    <td className="py-2 capitalize">{formatMonthLabel(m.month)}</td>
                    <td className="py-2 text-right text-emerald-600">{formatBRL(m.income)}</td>
                    <td className="py-2 text-right text-red-600">{formatBRL(m.expense)}</td>
                    <td
                      className={
                        "py-2 text-right font-medium " +
                        (m.net >= 0 ? "text-slate-900" : "text-red-600")
                      }
                    >
                      {formatBRL(m.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>
    </div>
  );
}
