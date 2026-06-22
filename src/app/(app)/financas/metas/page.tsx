import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  projectYearEnd,
  applyYearEndScenario,
  computeGoalProgress,
  compareGoalScenarios,
  type GoalScenarioComparison,
  type TxLike,
  type YearEndShowLike,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { centsToInputValue } from "@/lib/format";
import { GoalForm } from "./GoalForm";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteRevenueGoalAction } from "./actions";

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

const pct = (ratio: number) => `${Math.round(ratio * 100)}%`;

export default async function GoalsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();
  const params = searchParams ?? {};
  const year = parseYear(readParam(params, "ano"));

  const [goal, transactions, shows] = await Promise.all([
    prisma.revenueGoal.findUnique({
      where: { userId_year: { userId: user.id, year } },
    }),
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

  const forecast = projectYearEnd(txs, shows as YearEndShowLike[], year);
  const conservativeForecast = applyYearEndScenario(forecast, "conservative");
  const progress = goal
    ? computeGoalProgress(
        { goal: goal.amount, realized: forecast.realizedIncome, projected: forecast.projectedIncome, year },
        {},
      )
    : null;
  // Compara a meta contra os dois cenários da projeção do ano (otimista × só
  // confirmados), para revelar quando ela só fecha contando shows a confirmar.
  const scenarios = goal
    ? compareGoalScenarios(
        {
          goal: goal.amount,
          realized: forecast.realizedIncome,
          year,
          projectedOptimistic: forecast.projectedIncome,
          projectedConservative: conservativeForecast.projectedIncome,
        },
        {},
      )
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Meta de faturamento</h1>
          <p className="text-sm text-gray-500">
            Quanto você quer faturar no ano e como está a corrida até lá · {year}
          </p>
        </div>
        <Link href="/financas" className="text-sm text-gray-500 hover:underline">
          ← Finanças
        </Link>
      </div>

      {/* Navegação por ano */}
      <div className="flex items-center justify-between gap-2">
        <Link href={`/financas/metas?ano=${year - 1}`} className="btn-secondary" aria-label="Ano anterior">
          ←
        </Link>
        <Link href="/financas/metas" className="text-sm text-brand-700 hover:underline">
          Ano atual
        </Link>
        <Link href={`/financas/metas?ano=${year + 1}`} className="btn-secondary" aria-label="Próximo ano">
          →
        </Link>
      </div>

      {progress && goal ? (
        <>
          <ProgressCard progress={progress} scenarios={scenarios} />

          <section className="card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Ajustar a meta de {year}</h2>
              <DeleteButton
                action={deleteRevenueGoalAction}
                id={String(year)}
                trigger="Remover meta"
                triggerClassName="text-sm text-red-600 hover:underline"
                triggerTitle="Remover meta"
                groupLabel="Confirmar remoção da meta"
              />
            </div>
            <GoalForm year={year} defaultAmount={centsToInputValue(goal.amount)} />
          </section>
        </>
      ) : (
        <section className="card space-y-4">
          <div>
            <h2 className="font-semibold">Definir a meta de {year}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Ainda não há meta para {year}. Defina quanto quer faturar e acompanhe o progresso ao
              longo do ano.
            </p>
          </div>
          <GoalForm year={year} />
        </section>
      )}
    </div>
  );
}

function ProgressCard({
  progress,
  scenarios,
}: {
  progress: NonNullable<ReturnType<typeof computeGoalProgress>>;
  scenarios: GoalScenarioComparison | null;
}) {
  const realizedWidth = Math.min(100, Math.round(progress.realizedRatio * 100));
  const projectedWidth = Math.min(100, Math.round(progress.projectedRatio * 100));
  const hit = progress.realized >= progress.goal;

  return (
    <section className="card space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Recebido de {formatMoney(progress.goal)}
          </p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">
            {formatMoney(progress.realized)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">{pct(progress.realizedRatio)}</p>
          <p className="text-xs text-gray-500">da meta</p>
        </div>
      </div>

      {/* Barra de progresso: faixa do projetado (clara) sob a do realizado. */}
      <div className="space-y-1.5">
        <div className="relative h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-brand-200"
            style={{ width: `${projectedWidth}%` }}
            aria-hidden
          />
          <div
            className={"absolute inset-y-0 left-0 rounded-full " + (hit ? "bg-emerald-500" : "bg-brand-500")}
            style={{ width: `${realizedWidth}%` }}
            aria-hidden
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand-500 align-middle" />
            Recebido
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand-200 align-middle" />
            Projetado: {formatMoney(progress.projected)} ({pct(progress.projectedRatio)})
          </span>
        </div>
      </div>

      <PaceMessage progress={progress} />

      {scenarios?.diverges && <ConservativeFloorMessage scenarios={scenarios} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label={hit ? "Meta batida" : "Falta receber"}
          value={hit ? "✓" : formatMoney(progress.remaining)}
          tone={hit ? "good" : "neutral"}
        />
        <Stat
          label="Projeção do ano"
          value={formatMoney(progress.projected)}
          tone={progress.onTrackToHit ? "good" : "bad"}
        />
        {progress.isCurrentYear && (
          <Stat
            label="Ano decorrido"
            value={pct(progress.yearElapsed)}
            tone="neutral"
          />
        )}
      </div>
    </section>
  );
}

function PaceMessage({ progress }: { progress: NonNullable<ReturnType<typeof computeGoalProgress>> }) {
  if (progress.isPastYear) {
    const hit = progress.realized >= progress.goal;
    return (
      <p
        className={
          "rounded-lg px-4 py-3 text-sm " +
          (hit ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800")
        }
      >
        {hit
          ? `Você bateu a meta de ${progress.year}: recebeu ${formatMoney(progress.realized)} de ${formatMoney(progress.goal)}.`
          : `${progress.year} fechou em ${formatMoney(progress.realized)}, abaixo da meta de ${formatMoney(progress.goal)} (faltaram ${formatMoney(progress.remaining)}).`}
      </p>
    );
  }

  if (!progress.isCurrentYear) {
    return (
      <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
        {progress.year} ainda não começou. A projeção considera os cachês já agendados para o ano.
      </p>
    );
  }

  // Ano corrente — ritmo frente ao esperado linear até agora.
  const tone =
    progress.pace === "ahead"
      ? "bg-emerald-50 text-emerald-800"
      : progress.pace === "behind"
        ? "bg-amber-50 text-amber-800"
        : "bg-gray-50 text-gray-700";
  const label =
    progress.pace === "ahead"
      ? "Você está adiantado"
      : progress.pace === "behind"
        ? "Você está atrasado"
        : "Você está no ritmo";
  const expected = formatMoney(progress.expectedByNow);
  const delta = formatMoney(Math.abs(progress.paceDelta));

  return (
    <p className={"rounded-lg px-4 py-3 text-sm " + tone}>
      <strong>{label}.</strong>{" "}
      {progress.pace == null
        ? `A meta começa a ser cobrada conforme o ano avança.`
        : progress.pace === "behind"
          ? `Para o ritmo da meta, esperava-se ${expected} recebidos até agora — faltam ${delta}.`
          : `Pelo ritmo da meta, esperava-se ${expected} até agora; você está ${delta} ${progress.paceDelta >= 0 ? "à frente" : "atrás"}.`}
    </p>
  );
}

function ConservativeFloorMessage({ scenarios }: { scenarios: GoalScenarioComparison }) {
  const { conservative, tentativeGap, hitsEvenConservatively } = scenarios;
  const tone = hitsEvenConservatively
    ? "bg-emerald-50 text-emerald-800"
    : "bg-amber-50 text-amber-800";
  const floor = formatMoney(conservative.projected);
  const ratio = pct(conservative.projectedRatio);
  const gap = formatMoney(tentativeGap);

  return (
    <p className={"rounded-lg px-4 py-3 text-sm " + tone}>
      <strong>{hitsEvenConservatively ? "Folga real." : "Atenção ao piso."}</strong>{" "}
      {hitsEvenConservatively
        ? `Mesmo contando só os shows já confirmados, a projeção fica em ${floor} (${ratio} da meta) — você bate a meta sem depender dos ${gap} em cachês ainda a confirmar.`
        : `Tirando os ${gap} em cachês de shows ainda a confirmar, a projeção cai para ${floor} (${ratio} da meta) — abaixo do alvo. Hoje a meta só fecha se esses shows se confirmarem.`}
    </p>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "bad" | "neutral";
}) {
  const color =
    tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-amber-600" : "text-gray-900";
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 text-lg font-bold " + color}>{value}</p>
    </div>
  );
}
