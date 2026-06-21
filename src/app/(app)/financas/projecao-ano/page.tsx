import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  projectYearEnd,
  projectYearEndWithFixedCosts,
  recurringExpenses,
  type TxLike,
  type YearEndShowLike,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

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

export default async function YearEndForecastPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();
  const params = searchParams ?? {};
  const year = parseYear(readParam(params, "ano"));

  // Todas as transações entram: as do ano alimentam os totais, e as vinculadas
  // a shows (de qualquer período) abatem o cachê agendado para não contar duas
  // vezes. Os shows do ano fornecem a receita futura ainda não lançada.
  const [transactions, shows] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id },
      select: { type: true, amount: true, date: true, received: true, showId: true },
    }),
    prisma.show.findMany({
      where: {
        userId: user.id,
        date: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      select: { id: true, fee: true, status: true, date: true },
    }),
  ]);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: "",
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const f = projectYearEnd(txs, shows as YearEndShowLike[], year);

  // Cenário "com custos fixos": estima o custo fixo recorrente que ainda deve
  // se repetir até dezembro (D39) e o soma às despesas projetadas, dando uma
  // leitura mais conservadora do fechamento (ver D62). Opt-in: a projeção crua
  // segue como número principal.
  const fixedCost = recurringExpenses(txs).estimatedMonthlyFixedCost;
  const scenario = projectYearEndWithFixedCosts(f, txs, fixedCost);

  const hasAnything =
    f.realizedIncome > 0 ||
    f.pendingIncome > 0 ||
    f.scheduledIncome > 0 ||
    f.realizedExpense > 0 ||
    f.pendingExpense > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Projeção de fechamento</h1>
          <p className="text-sm text-gray-500">
            Como o ano {year} deve fechar somando o que já entrou, o que está
            pendente e os cachês de shows futuros ainda não lançados.
          </p>
        </div>
        <Link href="/financas" className="text-sm text-gray-500 hover:underline">
          ← Finanças
        </Link>
      </div>

      {/* Navegação por ano */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/financas/projecao-ano?ano=${year - 1}`}
          className="btn-secondary"
          aria-label="Ano anterior"
        >
          ←
        </Link>
        <Link
          href="/financas/projecao-ano"
          className="text-sm text-brand-700 hover:underline"
        >
          Ano atual
        </Link>
        <Link
          href={`/financas/projecao-ano?ano=${year + 1}`}
          className="btn-secondary"
          aria-label="Próximo ano"
        >
          →
        </Link>
      </div>

      {!hasAnything ? (
        <div className="card text-center text-gray-500">
          <p>Nada lançado nem agendado para {year}.</p>
        </div>
      ) : (
        <>
          {/* Resultado projetado do ano (o número que importa) */}
          <section
            className={
              "card border-l-4 " +
              (f.projectedResult < 0 ? "border-red-400" : "border-emerald-400")
            }
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Resultado projetado do ano
            </p>
            <p
              className={
                "mt-1 text-3xl font-bold " +
                (f.projectedResult < 0 ? "text-red-600" : "text-emerald-600")
              }
            >
              {formatMoney(f.projectedResult)}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {formatMoney(f.projectedIncome)} em receitas projetadas −{" "}
              {formatMoney(f.projectedExpense)} em despesas.
              {f.realizedResult !== f.projectedResult && (
                <>
                  {" "}
                  Hoje, o caixa realizado do ano está em{" "}
                  <span
                    className={
                      "font-medium " +
                      (f.realizedResult < 0 ? "text-red-600" : "text-gray-900")
                    }
                  >
                    {formatMoney(f.realizedResult)}
                  </span>
                  .
                </>
              )}
            </p>
          </section>

          {/* Cenário com custos fixos (D62): mais conservador que a projeção crua */}
          {scenario.applicable && scenario.estimatedRemainingFixedCost > 0 && (
            <section className="card border-l-4 border-amber-400">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Cenário com custos fixos
              </p>
              <p
                className={
                  "mt-1 text-2xl font-bold " +
                  (scenario.projectedResultWithFixed < 0
                    ? "text-red-600"
                    : "text-emerald-600")
                }
              >
                {formatMoney(scenario.projectedResultWithFixed)}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                A projeção crua não inventa despesas futuras. Somando o custo fixo
                típico de {formatMoney(scenario.monthlyFixedCost)}/mês a{" "}
                {scenario.monthsEstimated}{" "}
                {scenario.monthsEstimated === 1
                  ? "mês ainda sem despesa lançada"
                  : "meses ainda sem despesa lançada"}{" "}
                (+{formatMoney(scenario.estimatedRemainingFixedCost)} em despesas),
                o ano deve fechar mais perto disto. Ajuste o custo fixo em{" "}
                <Link
                  href="/financas/custos-fixos"
                  className="text-brand-700 hover:underline"
                >
                  Custos fixos
                </Link>
                .
              </p>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Receitas projetadas: realizado + pendente + agendado */}
            <section className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Receitas projetadas</h2>
                <span className="font-semibold text-emerald-600">
                  {formatMoney(f.projectedIncome)}
                </span>
              </div>
              <ul className="space-y-3">
                <CompositionRow
                  label="Já recebido"
                  hint="entrou no caixa"
                  value={f.realizedIncome}
                  total={f.projectedIncome}
                  tone="emerald"
                />
                <CompositionRow
                  label="A receber (lançado)"
                  hint="pendências já registradas"
                  value={f.pendingIncome}
                  total={f.projectedIncome}
                  tone="amber"
                />
                <CompositionRow
                  label="Cachês agendados"
                  hint={
                    f.scheduledShowCount > 0
                      ? `${f.scheduledShowCount} show${
                          f.scheduledShowCount > 1 ? "s" : ""
                        } futuro${f.scheduledShowCount > 1 ? "s" : ""}, ainda não lançado${
                          f.scheduledShowCount > 1 ? "s" : ""
                        }`
                      : "nenhum show futuro pendente"
                  }
                  value={f.scheduledIncome}
                  total={f.projectedIncome}
                  tone="sky"
                />
              </ul>
              {f.scheduledIncome > 0 && (
                <p className="mt-3 text-xs text-gray-500">
                  Dos cachês agendados, {formatMoney(f.scheduledConfirmed)} são de
                  shows confirmados e {formatMoney(f.scheduledTentative)} ainda a
                  confirmar.
                </p>
              )}
            </section>

            {/* Despesas projetadas: realizado + pendente (sem projeção futura) */}
            <section className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Despesas projetadas</h2>
                <span className="font-semibold text-red-600">
                  {formatMoney(f.projectedExpense)}
                </span>
              </div>
              <ul className="space-y-3">
                <CompositionRow
                  label="Já pago"
                  hint="saiu do caixa"
                  value={f.realizedExpense}
                  total={f.projectedExpense}
                  tone="red"
                />
                <CompositionRow
                  label="A pagar (lançado)"
                  hint="pendências já registradas"
                  value={f.pendingExpense}
                  total={f.projectedExpense}
                  tone="amber"
                />
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                A projeção não inventa despesas futuras: custos recorrentes ainda
                não lançados não entram. Para estimá-los, veja{" "}
                <Link
                  href="/financas/custos-fixos"
                  className="text-brand-700 hover:underline"
                >
                  Custos fixos
                </Link>
                .
              </p>
            </section>
          </div>

          <p className="text-xs text-gray-400">
            Receitas projetadas = já recebido + a receber lançado + cachês de
            shows futuros do ano ainda não lançados (cada cachê é abatido do que já
            foi registrado para o show, sem dupla contagem). Despesas projetadas =
            já pago + a pagar lançado.
          </p>
        </>
      )}
    </div>
  );
}

function CompositionRow({
  label,
  hint,
  value,
  total,
  tone,
}: {
  label: string;
  hint: string;
  value: number;
  total: number;
  tone: "emerald" | "amber" | "sky" | "red";
}) {
  const barTone =
    tone === "emerald"
      ? "bg-emerald-400"
      : tone === "amber"
        ? "bg-amber-400"
        : tone === "sky"
          ? "bg-sky-400"
          : "bg-red-400";
  const share = total > 0 ? value / total : 0;
  return (
    <li>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
        <span>
          {label}{" "}
          <span className="text-xs text-gray-400">· {hint}</span>
        </span>
        <span className="whitespace-nowrap text-gray-700">
          {formatMoney(value)}
          <span className="ml-1 text-xs text-gray-400">
            ({Math.round(share * 100)}%)
          </span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-gray-100">
        <div
          className={"h-full rounded " + barTone}
          style={{ width: `${value > 0 ? Math.max(2, Math.round(share * 100)) : 0}%` }}
        />
      </div>
    </li>
  );
}
