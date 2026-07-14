import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  buildFunnelActivityFeed,
  funnelActivitySeasonality,
  FUNNEL_ACTIVITY_KINDS,
  type FunnelActivityKind,
} from "@/lib/shows";

export const dynamic = "force-dynamic";

/** Aparência de cada natureza — tom e rótulo curto (espelha o ritmo e o feed). */
const KIND_META: Record<FunnelActivityKind, { dot: string; label: string }> = {
  create: { dot: "bg-amber-500", label: "Cadastros" },
  advance: { dot: "bg-emerald-500", label: "Avanços" },
  regress: { dot: "bg-orange-500", label: "Recuos" },
  cancel: { dot: "bg-gray-400", label: "Cancelamentos" },
  reopen: { dot: "bg-blue-500", label: "Reaberturas" },
};

/** Média com no máximo uma casa decimal, em pt-BR ("2,3"). */
const formatAverage = (n: number): string =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });

export default async function FunnelActivitySeasonalityPage() {
  const user = await requireUser();

  // A sazonalidade colapsa TODOS os anos num único calendário de 12 meses — não há
  // recorte por ano (diferente do ritmo): o padrão só emerge somando as temporadas.
  // Buscamos os eventos de status da carteira inteira (índice `[userId]`) e só o
  // essencial de cada um (é uma contagem por mês do calendário, sem o show).
  const events = await prisma.showStatusEvent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { showId: true, fromStatus: true, toStatus: true, createdAt: true },
  });

  const feed = buildFunnelActivityFeed(
    events.map((e) => ({
      showId: e.showId,
      showTitle: "",
      showDate: null,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      at: e.createdAt,
    })),
  );

  const season = funnelActivitySeasonality(feed);
  // Escala das barras: maior total entre os meses (mínimo 1 para não dividir por 0).
  const peak = Math.max(1, ...season.months.map((m) => m.total));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sazonalidade da atividade do funil</h1>
          <p className="text-sm text-gray-500">
            Em que meses do ano você costuma fazer o trabalho de agendamento —
            cadastros, avanços, negociação — somando todas as temporadas. Distinto
            do ritmo (a linha do tempo mês a mês): aqui os anos colapsam num único
            calendário, revelando quando o telefone toca e quando é hora de
            prospectar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {season.totalTransitions > 0 && (
            <a
              href="/shows/funil/atividade/sazonalidade/export"
              className="btn-secondary"
              download
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/funil/atividade/ritmo" className="btn-secondary">
            📊 Ritmo mensal
          </Link>
          <Link href="/shows/funil/atividade" className="btn-secondary">
            🕒 Feed
          </Link>
          <Link href="/shows/funil" className="btn-secondary">
            ← Funil
          </Link>
        </div>
      </div>

      {season.totalTransitions === 0 ? (
        <div className="card text-sm text-gray-500">
          Nenhuma movimentação registrada ainda. Cadastre um show e mova-o pelo
          funil (proposto → confirmado → realizado) para ver a sazonalidade aqui.
        </div>
      ) : (
        <>
          {/* Legenda das naturezas — a mesma paleta das barras. */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {FUNNEL_ACTIVITY_KINDS.map((kind) => (
              <span key={kind} className="inline-flex items-center gap-1.5">
                <span
                  className={"inline-block h-2 w-2 rounded-full " + KIND_META[kind].dot}
                  aria-hidden="true"
                />
                {KIND_META[kind].label}
              </span>
            ))}
          </div>

          {/* Destaques da temporada de agendamento. */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Mês mais movimentado
              </p>
              <p className="mt-1 text-lg font-bold capitalize text-brand-700">
                {season.busiest ? season.busiest.label : "—"}
              </p>
              {season.busiest && (
                <p className="mt-0.5 text-sm text-gray-500">
                  {season.busiest.total}{" "}
                  {season.busiest.total === 1 ? "transição" : "transições"} ·{" "}
                  {formatAverage(season.busiest.avgPerYear)}/ano
                </p>
              )}
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Mês mais calmo
              </p>
              <p className="mt-1 text-lg font-bold capitalize text-amber-600">
                {season.quietest ? season.quietest.label : "—"}
              </p>
              {season.quietest && (
                <p className="mt-0.5 text-sm text-gray-500">
                  {season.quietest.total}{" "}
                  {season.quietest.total === 1 ? "transição" : "transições"} ·{" "}
                  {formatAverage(season.quietest.avgPerYear)}/ano
                </p>
              )}
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Natureza predominante
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-lg font-bold text-gray-900">
                {season.dominantKind ? (
                  <>
                    <span
                      className={
                        "inline-block h-2.5 w-2.5 rounded-full " +
                        KIND_META[season.dominantKind].dot
                      }
                      aria-hidden="true"
                    />
                    {KIND_META[season.dominantKind].label}
                  </>
                ) : (
                  "—"
                )}
              </p>
              {season.dominantKind && (
                <p className="mt-0.5 text-sm text-gray-500">
                  {season.byKind[season.dominantKind]} no total
                </p>
              )}
            </div>
          </div>

          {/* Transições por mês do ano (jan→dez), barra empilhada por natureza. */}
          <section className="card">
            <h2 className="mb-1 font-semibold">Transições por mês do ano</h2>
            <p className="mb-4 text-xs text-gray-500">
              {season.totalTransitions}{" "}
              {season.totalTransitions === 1 ? "transição" : "transições"} em{" "}
              {season.yearsObserved}{" "}
              {season.yearsObserved === 1 ? "ano" : "anos"} de histórico. Cada mês
              soma todas as temporadas; a barra é proporcional ao mês mais
              movimentado.
            </p>
            <div className="space-y-4">
              {season.months.map((month) => {
                const isBusiest =
                  season.busiest?.month === month.month && month.total > 0;
                const isQuietest =
                  season.quietest?.month === month.month &&
                  month.total > 0 &&
                  season.busiest?.month !== month.month;
                return (
                  <div key={month.month}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium capitalize text-gray-900">
                        {month.label}
                        {isBusiest && (
                          <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-700">
                            mais movimentado
                          </span>
                        )}
                        {isQuietest && (
                          <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-600">
                            mais calmo
                          </span>
                        )}
                      </span>
                      <span className="text-gray-400">
                        {month.total === 0 ? (
                          "—"
                        ) : (
                          <>
                            {month.total}{" "}
                            {month.total === 1 ? "transição" : "transições"}
                            {month.years > 1 && (
                              <span className="ml-1">
                                ({formatAverage(month.avgPerYear)}/ano)
                              </span>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                    {month.total > 0 && (
                      <>
                        <div
                          className="flex h-3 overflow-hidden rounded bg-gray-100"
                          style={{ width: `${(month.total / peak) * 100}%` }}
                          title={`${month.total} de ${peak} (mês mais movimentado)`}
                        >
                          {FUNNEL_ACTIVITY_KINDS.map((kind) => {
                            const n = month.byKind[kind];
                            if (n === 0) return null;
                            return (
                              <div
                                key={kind}
                                className={"h-full " + KIND_META[kind].dot}
                                style={{ width: `${(n / month.total) * 100}%` }}
                                title={`${KIND_META[kind].label}: ${n}`}
                              />
                            );
                          })}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                          {FUNNEL_ACTIVITY_KINDS.filter(
                            (k) => month.byKind[k] > 0,
                          ).map((kind) => (
                            <span
                              key={kind}
                              className="inline-flex items-center gap-1"
                            >
                              <span
                                className={
                                  "inline-block h-1.5 w-1.5 rounded-full " +
                                  KIND_META[kind].dot
                                }
                                aria-hidden="true"
                              />
                              {KIND_META[kind].label} {month.byKind[kind]}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <p className="text-xs text-gray-400">
            Meses sem nenhuma transição aparecem zerados para você ver os vales da
            temporada — a época em que o funil costuma esfriar e prospectar rende
            mais. &ldquo;/ano&rdquo; é a média por ano em que houve movimento
            naquele mês, não diluída por anos vazios de um histórico curto.
          </p>
        </>
      )}
    </div>
  );
}
