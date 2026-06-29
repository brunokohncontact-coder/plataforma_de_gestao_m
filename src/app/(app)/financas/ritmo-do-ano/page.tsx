import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { yearToDatePace, type TxLike, type YearToDatePace } from "@/lib/finance";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const VERDICT_META: Record<
  YearToDatePace["verdict"],
  { label: string; tone: string; icon: string; blurb: string }
> = {
  ahead: {
    label: "À frente do ano passado",
    tone: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    icon: "🚀",
    blurb: "Você acumula mais receita que no mesmo ponto do ano passado. Bom ritmo — siga firme.",
  },
  onPace: {
    label: "Em linha com o ano passado",
    tone: "bg-brand-50 text-brand-800 ring-brand-200",
    icon: "🎯",
    blurb: "O ano caminha no mesmo ritmo do anterior até esta época.",
  },
  behind: {
    label: "Atrás do ano passado",
    tone: "bg-amber-50 text-amber-900 ring-amber-200",
    icon: "🐢",
    blurb:
      "Até agora você acumula menos que no mesmo ponto do ano passado. Vale empurrar prospecção ou cobrança.",
  },
  insufficient: {
    label: "Sem base de comparação",
    tone: "bg-gray-50 text-gray-700 ring-gray-200",
    icon: "📭",
    blurb: "Ainda não há receita no mesmo período do ano passado para servir de referência.",
  },
};

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

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

export default async function YearPacePage() {
  const user = await requireUser();

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

  const pace = yearToDatePace(allTxs);
  const verdict = VERDICT_META[pace.verdict];
  const elapsedPct = Math.round(pace.elapsed * 100);
  const cutoffLabel = `${pace.cutoffDay} de ${MONTH_NAMES[pace.cutoffMonth]}`;
  const hasCurrentYear = pace.income > 0 || pace.expense > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ritmo do ano</h1>
          <p className="text-sm text-gray-500">
            Como vai {pace.year} até {cutoffLabel}, comparado ao mesmo ponto de {pace.lastYear}
          </p>
        </div>
        <Link href="/financas" className="text-sm text-gray-500 hover:underline">
          ← Finanças
        </Link>
      </div>

      {/* Progresso do ano */}
      <div className="card">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium">
            Dia {pace.dayOfYear} de {pace.daysInYear}
          </span>
          <span className="text-gray-500">{elapsedPct}% do ano decorrido</span>
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

      {!hasCurrentYear && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nenhum lançamento em {pace.year} ainda. Os números abaixo refletem o ano assim que você
          registrar a primeira transação.
        </p>
      )}

      {/* Receita acumulada nos dois anos */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Metric
          label={`Receita em ${pace.year} até aqui`}
          value={pace.income}
          hint={`acumulado de 1º de janeiro a ${cutoffLabel}`}
        />
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {pace.lastYear} no mesmo ponto
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatMoney(pace.lastYearIncome)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {pace.lastYearHasMovement
              ? `acumulado até ${cutoffLabel} de ${pace.lastYear}`
              : `sem lançamentos em ${pace.lastYear} até esta época`}
          </p>
        </div>
      </section>

      {/* Tabela acumulado vs. mesmo período do ano anterior */}
      <section className="card overflow-x-auto">
        <h2 className="mb-1 font-semibold">
          {pace.year} × {pace.lastYear} (mesmo período)
        </h2>
        <p className="mb-4 text-xs text-gray-500">
          Compara o acumulado do ano corrente, de 1º de janeiro até {cutoffLabel}, com o mesmo
          intervalo do ano passado — a mesma fração do ano dos dois lados (igual com igual). Não é
          uma projeção do fechamento; para isso, veja a Projeção de fechamento.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="pb-2 pr-3 font-medium"></th>
              <th className="pb-2 px-3 text-right font-medium">{pace.year} até aqui</th>
              <th className="pb-2 px-3 text-right font-medium">{pace.lastYear} no mesmo ponto</th>
              <th className="pb-2 pl-3 text-right font-medium">Variação</th>
            </tr>
          </thead>
          <tbody>
            <Row
              label="Receitas"
              delta={pace.incomeVsLastYear}
              goodWhenUp
              insufficient={pace.verdict === "insufficient"}
            />
            <Row label="Despesas" delta={pace.expenseVsLastYear} goodWhenUp={false} />
            <Row label="Resultado" delta={pace.netVsLastYear} goodWhenUp strong />
          </tbody>
        </table>
      </section>

      <p className="text-xs text-gray-400">
        O acumulado é medido por regime de competência (pela data do lançamento), em UTC. O período do
        ano anterior vai de 1º de janeiro até o mesmo mês/dia — quando o dia não existe no ano passado
        (ex.: 29 de fevereiro), o corte recua para o último dia do mês.
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
