import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { computeBreakEven, type TxLike, type BreakEvenShowLike } from "@/lib/finance";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

/** Formata um número de shows/mês com no máximo uma casa decimal (pt-BR). */
function formatRate(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export default async function BreakEvenPage() {
  const user = await requireUser();

  const [transactions, shows] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    }),
    prisma.show.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      select: { id: true, fee: true, status: true, date: true },
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

  const showLikes: BreakEvenShowLike[] = shows.map((s) => ({
    id: s.id,
    fee: s.fee,
    status: s.status,
    date: s.date,
  }));

  const analysis = computeBreakEven(showLikes, txs);
  const {
    monthlyFixedCost,
    avgNetPerShow,
    showsConsidered,
    avgShowsPerMonth,
    showsNeeded,
    covered,
  } = analysis;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ponto de equilíbrio</h1>
          <p className="text-sm text-gray-500">
            Quantos shows por mês você precisa fazer só para cobrir seus custos fixos
          </p>
        </div>
        <div className="flex items-center gap-3">
          {monthlyFixedCost > 0 && (
            <a href="/financas/ponto-de-equilibrio/export" className="btn-secondary">
              ⬇ CSV
            </a>
          )}
          <Link href="/financas" className="text-sm text-gray-500 hover:underline">
            ← Finanças
          </Link>
        </div>
      </div>

      {monthlyFixedCost <= 0 ? (
        <div className="card text-center text-gray-500">
          <p>
            Ainda não há custos fixos detectados. O ponto de equilíbrio aparece aqui quando uma
            mesma categoria de despesa se repete por pelo menos três meses.
          </p>
          <Link href="/financas/custos-fixos" className="mt-3 inline-block text-brand-700 hover:underline">
            Ver custos fixos
          </Link>
        </div>
      ) : (
        <>
          {/* Destaque: a meta de shows/mês */}
          <section className="card">
            {showsNeeded == null ? (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Não dá para estimar a meta
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  {showsConsidered === 0
                    ? "Você ainda não tem shows realizados (Confirmados já passados ou marcados como Realizados). Registre seus shows para estimar quantos precisa por mês."
                    : "Em média, seus shows não estão deixando resultado positivo — então nenhum número de shows cobre o custo fixo. Reveja o cachê acordado ou os custos por show."}
                </p>
                {showsConsidered > 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    Resultado médio por show: {formatMoney(avgNetPerShow)} · custo fixo mensal:{" "}
                    {formatMoney(monthlyFixedCost)}.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Shows por mês para se sustentar
                </p>
                <p className="mt-1 text-4xl font-bold text-gray-900">
                  {showsNeeded}
                  <span className="ml-2 text-base font-normal text-gray-500">
                    {showsNeeded === 1 ? "show/mês" : "shows/mês"}
                  </span>
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Com um custo fixo de {formatMoney(monthlyFixedCost)}/mês e um resultado médio de{" "}
                  {formatMoney(avgNetPerShow)} por show, é quantos shows típicos precisam acontecer
                  num mês só para cobrir o que é fixo.
                </p>

                <div
                  className={
                    "mt-4 rounded-lg px-4 py-3 text-sm " +
                    (covered
                      ? "bg-green-50 text-green-800"
                      : "bg-amber-50 text-amber-800")
                  }
                >
                  {covered ? (
                    <>
                      ✅ No seu ritmo atual de <strong>{formatRate(avgShowsPerMonth)}</strong>{" "}
                      {avgShowsPerMonth === 1 ? "show" : "shows"}/mês, você já cobre o custo fixo.
                    </>
                  ) : (
                    <>
                      ⚠️ Seu ritmo atual é de <strong>{formatRate(avgShowsPerMonth)}</strong>{" "}
                      {avgShowsPerMonth === 1 ? "show" : "shows"}/mês — abaixo da meta de{" "}
                      <strong>{showsNeeded}</strong>. Faltam shows (ou cachês maiores) para fechar a
                      conta do mês.
                    </>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Os três números por trás da conta */}
          <section className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Custo fixo mensal"
              value={formatMoney(monthlyFixedCost)}
              hint="Soma das contas recorrentes ativas"
            />
            <Stat
              label="Resultado médio por show"
              value={formatMoney(avgNetPerShow)}
              hint={`Média de ${showsConsidered} ${
                showsConsidered === 1 ? "show realizado" : "shows realizados"
              } (cachê + extras − custos do show)`}
            />
            <Stat
              label="Ritmo atual"
              value={`${formatRate(avgShowsPerMonth)} ${
                avgShowsPerMonth === 1 ? "show" : "shows"
              }/mês`}
              hint="Shows realizados ÷ meses de histórico"
            />
          </section>

          <p className="text-xs text-gray-400">
            Estimativa de planejamento, não fechamento contábil: custos fixos e custos por show são
            tratados como blocos separados. Veja{" "}
            <Link href="/financas/custos-fixos" className="hover:underline">
              Custos fixos
            </Link>{" "}
            e{" "}
            <Link href="/shows/rentabilidade" className="hover:underline">
              Rentabilidade por show
            </Link>{" "}
            para o detalhe.
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
  hint: string;
}) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}
