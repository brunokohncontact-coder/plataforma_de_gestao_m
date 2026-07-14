import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  buildFunnelActivityFeed,
  groupFunnelActivityByMonth,
  summarizeFunnelActivityMonths,
  FUNNEL_ACTIVITY_KINDS,
  type FunnelActivityKind,
} from "@/lib/shows";

export const dynamic = "force-dynamic";

/** Aparência de cada natureza — tom e rótulo curto (espelha a tela do feed). */
const KIND_META: Record<FunnelActivityKind, { dot: string; label: string }> = {
  create: { dot: "bg-amber-500", label: "Cadastros" },
  advance: { dot: "bg-emerald-500", label: "Avanços" },
  regress: { dot: "bg-orange-500", label: "Recuos" },
  cancel: { dot: "bg-gray-400", label: "Cancelamentos" },
  reopen: { dot: "bg-blue-500", label: "Reaberturas" },
};

/**
 * Rótulo pt-BR "julho de 2025" de uma chave de mês "YYYY-MM" — sempre em UTC (a
 * mesma convenção de `monthKey`), para o cabeçalho bater com a chave sem deriva
 * de fuso.
 */
const formatMonthHeader = (month: string): string => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

export default async function FunnelActivityRhythmPage() {
  const user = await requireUser();

  // O ritmo cobre a carteira INTEIRA (não uma janela): buscamos todos os eventos
  // de status (índice `[userId]`, ordenados no banco) e agregamos por mês. Só o
  // essencial de cada evento — sem o show — porque o ritmo é uma contagem.
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

  const months = groupFunnelActivityByMonth(feed);
  const maxTotal = Math.max(1, ...months.map((m) => m.total));
  const totalTransitions = feed.length;
  const summary = summarizeFunnelActivityMonths(months);
  const monthlyAverage = summary.averagePerMonth.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ritmo da atividade do funil</h1>
          <p className="text-sm text-gray-500">
            Quantas transições de status você registrou por mês — o pulso do seu
            funil ao longo do tempo. Meses cheios são de negociação intensa;
            meses vazios, de calmaria. Cada barra soma cadastros, avanços,
            recuos, cancelamentos e reaberturas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {months.length > 0 && (
            <a href="/shows/funil/atividade/ritmo/export" className="btn-secondary">
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/funil/atividade" className="btn-secondary">
            🕒 Feed
          </Link>
          <Link href="/shows/funil" className="btn-secondary">
            ← Funil
          </Link>
        </div>
      </div>

      {months.length === 0 ? (
        <div className="card text-sm text-gray-500">
          Nenhuma movimentação registrada ainda. Cadastre um show e mova-o pelo
          funil (proposto → confirmado → realizado) para ver o ritmo aqui.
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

          {/* Leituras do ritmo: mês mais/menos movimentado, média mensal e
              natureza predominante — o resumo acionável sobre as barras. */}
          <section className="card">
            <h2 className="mb-3 font-semibold">Resumo do ritmo</h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-gray-500">Média por mês</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {monthlyAverage}
                </dd>
                <dd className="text-xs text-gray-400">
                  {totalTransitions} em {summary.monthCount}{" "}
                  {summary.monthCount === 1 ? "mês" : "meses"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Mês mais movimentado</dt>
                <dd className="text-lg font-semibold capitalize text-gray-900">
                  {summary.busiest ? formatMonthHeader(summary.busiest.month) : "—"}
                </dd>
                {summary.busiest && (
                  <dd className="text-xs text-gray-400">
                    {summary.busiest.total}{" "}
                    {summary.busiest.total === 1 ? "transição" : "transições"}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-xs text-gray-500">Mês mais calmo</dt>
                <dd className="text-lg font-semibold capitalize text-gray-900">
                  {summary.quietest ? formatMonthHeader(summary.quietest.month) : "—"}
                </dd>
                {summary.quietest && (
                  <dd className="text-xs text-gray-400">
                    {summary.quietest.total}{" "}
                    {summary.quietest.total === 1 ? "transição" : "transições"}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-xs text-gray-500">Natureza predominante</dt>
                <dd className="flex items-center gap-1.5 text-lg font-semibold text-gray-900">
                  {summary.dominantKind ? (
                    <>
                      <span
                        className={
                          "inline-block h-2.5 w-2.5 rounded-full " +
                          KIND_META[summary.dominantKind].dot
                        }
                        aria-hidden="true"
                      />
                      {KIND_META[summary.dominantKind].label}
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
                {summary.dominantKind && (
                  <dd className="text-xs text-gray-400">
                    {summary.byKind[summary.dominantKind]} no total
                  </dd>
                )}
              </div>
            </dl>
          </section>

          <section className="card">
            <h2 className="mb-1 font-semibold">Transições por mês</h2>
            <p className="mb-4 text-xs text-gray-500">
              {totalTransitions}{" "}
              {totalTransitions === 1 ? "transição" : "transições"} em{" "}
              {months.length} {months.length === 1 ? "mês" : "meses"}, do mais
              recente ao mais antigo.
            </p>
            <div className="space-y-4">
              {months.map((month) => (
                <div key={month.month}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium capitalize text-gray-900">
                      {formatMonthHeader(month.month)}
                    </span>
                    <span className="text-gray-400">
                      {month.total}{" "}
                      {month.total === 1 ? "transição" : "transições"}
                    </span>
                  </div>
                  {/* Barra empilhada por natureza; a largura total é
                      proporcional ao mês mais movimentado. */}
                  <div
                    className="flex h-3 overflow-hidden rounded bg-gray-100"
                    style={{ width: `${(month.total / maxTotal) * 100}%` }}
                    title={`${month.total} de ${maxTotal} (mês mais movimentado)`}
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
                  {/* Contagens por natureza (só as não-zeradas) sob a barra. */}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    {FUNNEL_ACTIVITY_KINDS.filter((k) => month.byKind[k] > 0).map(
                      (kind) => (
                        <span key={kind} className="inline-flex items-center gap-1">
                          <span
                            className={
                              "inline-block h-1.5 w-1.5 rounded-full " +
                              KIND_META[kind].dot
                            }
                            aria-hidden="true"
                          />
                          {KIND_META[kind].label} {month.byKind[kind]}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
