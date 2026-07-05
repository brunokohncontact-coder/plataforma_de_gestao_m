import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  currentMonthPace,
  monthYoYPace,
  parseBurnWindow,
  BURN_WINDOW_PRESETS,
  type TxLike,
  type MonthPace,
  type MonthYoYPace,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatMonthKey } from "@/lib/format";

export const dynamic = "force-dynamic";

const VERDICT_META: Record<
  MonthPace["verdict"],
  { label: string; tone: string; icon: string; blurb: string }
> = {
  ahead: {
    label: "Acima do ritmo",
    tone: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    icon: "🚀",
    blurb: "Você está faturando acima de um mês típico. Bom momento para guardar a folga.",
  },
  onPace: {
    label: "No ritmo",
    tone: "bg-brand-50 text-brand-800 ring-brand-200",
    icon: "🎯",
    blurb: "O mês caminha no ritmo de um mês normal.",
  },
  behind: {
    label: "Abaixo do ritmo",
    tone: "bg-amber-50 text-amber-900 ring-amber-200",
    icon: "🐢",
    blurb: "O mês está rendendo abaixo do normal. Vale empurrar prospecção ou cobrança.",
  },
  insufficient: {
    label: "Sem base de comparação",
    tone: "bg-gray-50 text-gray-700 ring-gray-200",
    icon: "📭",
    blurb: "Ainda não há meses anteriores com receita para servir de referência.",
  },
};

const YOY_META: Record<MonthYoYPace["verdict"], { label: string; tone: string; icon: string }> = {
  ahead: { label: "Acima do ano passado", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200", icon: "🚀" },
  onPace: { label: "Em linha com o ano passado", tone: "bg-brand-50 text-brand-800 ring-brand-200", icon: "🎯" },
  behind: { label: "Abaixo do ano passado", tone: "bg-amber-50 text-amber-900 ring-amber-200", icon: "🐢" },
  insufficient: { label: "Sem base de comparação", tone: "bg-gray-50 text-gray-700 ring-gray-200", icon: "📭" },
};

/** "+25%" / "−30%" / "—" a partir do `pct` de um MetricDelta. */
function formatPct(pct: number | null): string {
  if (pct === null) return "—";
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(Math.round(pct * 100))}%`;
}

function deltaTone(direction: "up" | "down" | "flat", goodWhenUp: boolean): string {
  if (direction === "flat") return "text-gray-500";
  const isGood = direction === "up" ? goodWhenUp : !goodWhenUp;
  return isGood ? "text-emerald-700" : "text-red-700";
}

export default async function MonthPacePage({
  searchParams,
}: {
  searchParams?: { meses?: string | string[] };
}) {
  const user = await requireUser();
  const windowMonths = parseBurnWindow(searchParams?.meses);

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

  const pace = currentMonthPace(allTxs, { months: windowMonths });
  const yoy = monthYoYPace(allTxs);
  const yoyVerdict = YOY_META[yoy.verdict];
  const verdict = VERDICT_META[pace.verdict];
  const elapsedPct = Math.round(pace.elapsed * 100);
  const hasCurrentMonth = pace.income > 0 || pace.expense > 0;
  // O CSV só faz sentido quando há algum número real para comparar — movimento no
  // mês corrente, um "mês típico" de referência ou o mesmo mês do ano anterior.
  const hasData = hasCurrentMonth || pace.baselineMonths > 0 || yoy.lastYearHasMovement;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ritmo do mês</h1>
          <p className="text-sm text-gray-500">
            Como vai {formatMonthKey(pace.month)} até agora, comparado a um mês típico
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {hasData && (
            <a href={`/financas/ritmo-do-mes/export?meses=${windowMonths}`} className="btn-secondary">
              ⬇ CSV
            </a>
          )}
          <div className="flex flex-wrap items-center gap-1" aria-label="Janela do mês típico">
            {BURN_WINDOW_PRESETS.map((m) => {
              const active = m === windowMonths;
              return (
                <Link
                  key={m}
                  href={`/financas/ritmo-do-mes?meses=${m}`}
                  aria-current={active ? "true" : undefined}
                  className={
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors " +
                    (active
                      ? "bg-brand-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200")
                  }
                >
                  {m}m
                </Link>
              );
            })}
          </div>
          <Link href="/financas" className="text-sm text-gray-500 hover:underline">
            ← Finanças
          </Link>
        </div>
      </div>

      {/* Progresso do mês */}
      <div className="card">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium">
            Dia {pace.dayOfMonth} de {pace.daysInMonth}
          </span>
          <span className="text-gray-500">{elapsedPct}% do mês decorrido</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${elapsedPct}%` }} />
        </div>
      </div>

      {/* Veredito */}
      <div className={`card ring-1 ${verdict.tone}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            {verdict.icon}
          </span>
          <div>
            <p className="font-semibold">{verdict.label}</p>
            <p className="text-sm opacity-90">{verdict.blurb}</p>
          </div>
        </div>
      </div>

      {!hasCurrentMonth && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nenhum lançamento em {formatMonthKey(pace.month)} ainda. Os números abaixo refletem o mês
          assim que você registrar a primeira transação.
        </p>
      )}

      {/* Receita: já lançado, esperado e projetado */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Receita até agora"
          value={pace.income}
          hint={
            pace.verdict === "insufficient"
              ? "neste mês"
              : `esperado a esta altura: ${formatMoney(pace.expectedIncomeByNow)}`
          }
        />
        <Metric
          label="Projeção do mês"
          value={pace.projectedIncome}
          hint={`extrapolando o ritmo atual (${elapsedPct}% do mês)`}
        />
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-gray-500">Mês típico</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatMoney(pace.baselineIncome)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {pace.baselineMonths > 0
              ? `média de ${pace.baselineMonths} ${
                  pace.baselineMonths === 1 ? "mês" : "meses"
                } com movimento`
              : "sem meses anteriores com receita"}
          </p>
        </div>
      </section>

      {/* Tabela projeção vs. mês típico */}
      <section className="card overflow-x-auto">
        <h2 className="mb-1 font-semibold">Projeção do mês × mês típico</h2>
        <p className="mb-4 text-xs text-gray-500">
          A projeção extrapola o que já foi lançado pela fração do mês decorrida. Cedo no mês ela é
          sensível a um único lançamento — leia como estimativa, não como certeza.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="pb-2 pr-3 font-medium"></th>
              <th className="pb-2 px-3 text-right font-medium">Projeção do mês</th>
              <th className="pb-2 px-3 text-right font-medium">Mês típico</th>
              <th className="pb-2 pl-3 text-right font-medium">Variação</th>
            </tr>
          </thead>
          <tbody>
            <Row
              label="Receitas"
              delta={pace.incomeVsBaseline}
              goodWhenUp
              insufficient={pace.verdict === "insufficient"}
            />
            <Row label="Despesas" delta={pace.expenseVsBaseline} goodWhenUp={false} />
            <Row label="Resultado" delta={pace.netVsBaseline} goodWhenUp strong />
          </tbody>
        </table>
      </section>

      {/* Comparação sazonal: o mesmo mês, um ano atrás */}
      <section className="card overflow-x-auto">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Mesmo mês no ano passado</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${yoyVerdict.tone}`}>
            <span aria-hidden>{yoyVerdict.icon}</span> {yoyVerdict.label}
          </span>
        </div>
        <p className="mb-4 text-xs text-gray-500">
          Compara a projeção de {formatMonthKey(yoy.month)} com {formatMonthKey(yoy.lastYearMonth)}{" "}
          fechado — um eixo sazonal (mês cheio × mês cheio), útil quando o trabalho tem alta e baixa
          temporada.
        </p>
        {yoy.lastYearHasMovement ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="pb-2 pr-3 font-medium"></th>
                <th className="pb-2 px-3 text-right font-medium">Projeção do mês</th>
                <th className="pb-2 px-3 text-right font-medium">{formatMonthKey(yoy.lastYearMonth)}</th>
                <th className="pb-2 pl-3 text-right font-medium">Variação</th>
              </tr>
            </thead>
            <tbody>
              <Row
                label="Receitas"
                delta={yoy.incomeVsLastYear}
                goodWhenUp
                insufficient={yoy.verdict === "insufficient"}
              />
              <Row label="Despesas" delta={yoy.expenseVsLastYear} goodWhenUp={false} />
              <Row label="Resultado" delta={yoy.netVsLastYear} goodWhenUp strong />
            </tbody>
          </table>
        ) : null}
        {yoy.lastYearHasMovement && (
          <p className="mt-4 border-t pt-3 text-xs text-gray-500">
            Sem depender da projeção: até hoje (dia {yoy.dayOfMonth}) você lançou{" "}
            <strong className="tabular-nums">{formatMoney(yoy.income)}</strong> em receita, contra{" "}
            <strong className="tabular-nums">{formatMoney(yoy.lastYearIncomeToDate)}</strong> até o
            mesmo dia de {formatMonthKey(yoy.lastYearMonth)} (
            <span className={deltaTone(yoy.incomeToDateVsLastYear.direction, true)}>
              {formatPct(yoy.incomeToDateVsLastYear.pct)}
            </span>
            ).
          </p>
        )}
        {!yoy.lastYearHasMovement && (
          <p className="text-sm text-gray-500">
            Não há lançamentos em {formatMonthKey(yoy.lastYearMonth)} para comparar. Esta leitura
            sazonal aparece assim que houver um ano de histórico no mesmo mês.
          </p>
        )}
      </section>

      <p className="text-xs text-gray-400">
        O mês corrente é medido por regime de competência (pela data do lançamento). O “mês típico” é
        a média dos meses fechados com movimento dos últimos {windowMonths} meses; o comparativo
        sazonal usa o mesmo mês do ano anterior, já fechado.
      </p>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{formatMoney(value)}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}

function Row({
  label,
  delta,
  goodWhenUp,
  strong,
  insufficient,
}: {
  label: string;
  delta: { current: number; previous: number; pct: number | null; direction: "up" | "down" | "flat" };
  goodWhenUp: boolean;
  strong?: boolean;
  insufficient?: boolean;
}) {
  return (
    <tr className="border-b last:border-0">
      <td className={`py-2 pr-3 ${strong ? "font-semibold" : ""}`}>{label}</td>
      <td className="py-2 px-3 text-right tabular-nums">{formatMoney(delta.current)}</td>
      <td className="py-2 px-3 text-right tabular-nums text-gray-500">{formatMoney(delta.previous)}</td>
      <td
        className={`py-2 pl-3 text-right tabular-nums ${
          insufficient ? "text-gray-400" : deltaTone(delta.direction, goodWhenUp)
        }`}
      >
        {insufficient ? "—" : formatPct(delta.pct)}
      </td>
    </tr>
  );
}
