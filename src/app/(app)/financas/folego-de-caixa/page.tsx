import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  cashRunway,
  CRITICAL_RUNWAY_MONTHS,
  HEALTHY_RUNWAY_MONTHS,
  type RunwayVerdict,
  type TxLike,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Formata um número de meses com no máximo uma casa decimal (pt-BR). */
function formatMonths(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

const VERDICT_STYLE: Record<
  Exclude<RunwayVerdict, "no-cost" | "negative">,
  { box: string; emoji: string; label: string }
> = {
  healthy: { box: "bg-green-50 text-green-800", emoji: "✅", label: "Fôlego confortável" },
  tight: { box: "bg-amber-50 text-amber-800", emoji: "🟡", label: "Fôlego apertado" },
  critical: { box: "bg-red-50 text-red-800", emoji: "🔴", label: "Fôlego crítico" },
};

export default async function CashRunwayPage() {
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

  const runway = cashRunway(txs);
  const { currentCash, monthlyFixedCost, runwayMonths, depletionDate, verdict } = runway;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fôlego de caixa</h1>
          <p className="text-sm text-gray-500">
            Se as receitas parassem hoje, por quantos meses seu caixa cobre os custos fixos
          </p>
        </div>
        <Link href="/financas" className="text-sm text-gray-500 hover:underline">
          ← Finanças
        </Link>
      </div>

      {verdict === "no-cost" ? (
        <div className="card text-center text-gray-500">
          <p>
            Ainda não há custos fixos detectados. O fôlego de caixa aparece aqui quando uma mesma
            categoria de despesa se repete por pelo menos três meses.
          </p>
          <Link
            href="/financas/custos-fixos"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Ver custos fixos
          </Link>
        </div>
      ) : verdict === "negative" ? (
        <section className="card">
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            🔴 Seu caixa atual está em <strong>{formatMoney(currentCash)}</strong> — no zero ou
            negativo. Não há fôlego a medir: o foco é recompor o caixa antes de pensar em meses de
            reserva.
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Stat label="Caixa atual" value={formatMoney(currentCash)} hint="Recebido − pago (só o que entrou/saiu)" />
            <Stat
              label="Custo fixo mensal"
              value={formatMoney(monthlyFixedCost)}
              hint="Soma das contas recorrentes ativas"
            />
          </div>
        </section>
      ) : (
        <>
          {/* Destaque: meses de fôlego */}
          <section className="card">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Meses de fôlego
            </p>
            <p className="mt-1 text-4xl font-bold text-gray-900">
              {formatMonths(runwayMonths!)}
              <span className="ml-2 text-base font-normal text-gray-500">
                {runwayMonths === 1 ? "mês" : "meses"}
              </span>
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Com {formatMoney(currentCash)} em caixa e um custo fixo de{" "}
              {formatMoney(monthlyFixedCost)}/mês, é por quanto tempo você se sustentaria sem
              nenhuma receita nova entrando.
            </p>

            <div className={"mt-4 rounded-lg px-4 py-3 text-sm " + VERDICT_STYLE[verdict].box}>
              {VERDICT_STYLE[verdict].emoji} <strong>{VERDICT_STYLE[verdict].label}.</strong>{" "}
              {verdict === "healthy" ? (
                <>
                  Você tem {HEALTHY_RUNWAY_MONTHS} meses ou mais de reserva — uma folga saudável para
                  atravessar uma temporada mais fraca.
                </>
              ) : verdict === "tight" ? (
                <>
                  Entre {CRITICAL_RUNWAY_MONTHS} e {HEALTHY_RUNWAY_MONTHS} meses de reserva. Dá para
                  respirar, mas vale reforçar o caixa antes da próxima baixa de agenda.
                </>
              ) : (
                <>
                  Menos de {CRITICAL_RUNWAY_MONTHS} meses de reserva. Um mês fraco já aperta — priorize
                  cobrar o que está a receber e segurar gastos não essenciais.
                </>
              )}
            </div>

            {depletionDate && (
              <p className="mt-3 text-sm text-gray-500">
                No ritmo de custos atual, o caixa zeraria por volta de{" "}
                <strong>{formatDate(depletionDate)}</strong> se nada novo entrar.
              </p>
            )}
          </section>

          {/* Os números por trás */}
          <section className="grid gap-4 sm:grid-cols-2">
            <Stat
              label="Caixa atual"
              value={formatMoney(currentCash)}
              hint="Recebido − pago (só o que entrou/saiu; pendências não contam)"
            />
            <Stat
              label="Custo fixo mensal"
              value={formatMoney(monthlyFixedCost)}
              hint="Soma das contas recorrentes ainda ativas"
            />
          </section>

          <p className="text-xs text-gray-400">
            Indicador de resiliência (fundo de emergência), não fechamento contábil: o caixa é só o
            realizado e o custo fixo é estimado das despesas recorrentes. Os limiares de{" "}
            {CRITICAL_RUNWAY_MONTHS} e {HEALTHY_RUNWAY_MONTHS} meses são referência de planejamento
            (ajuste conforme sua realidade). Veja{" "}
            <Link href="/financas/custos-fixos" className="hover:underline">
              Custos fixos
            </Link>{" "}
            e{" "}
            <Link href="/shows/a-receber" className="hover:underline">
              Cachês a receber
            </Link>{" "}
            para agir sobre os dois lados.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}
