import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { showPipeline, type ShowLike } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import {
  SHOW_STATUS_LABELS,
  SHOW_STATUS_COLORS,
  SHOW_STATUS_DOT,
  type ShowStatus,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function ShowFunnelPage() {
  const user = await requireUser();

  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    select: { id: true, status: true, fee: true },
  });

  const pipeline = showPipeline(shows as ShowLike[]);
  const maxCount = Math.max(1, ...pipeline.stages.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Funil de propostas</h1>
          <p className="text-sm text-gray-500">
            Onde estão seus shows hoje — da proposta ao palco — e quanto de cachê está em
            negociação ou confirmado, mas ainda não realizado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pipeline.total > 0 && (
            <a href="/shows/funil/export" className="btn-secondary text-sm" download>
              ⬇ CSV
            </a>
          )}
          <Link href="/shows" className="btn-secondary">
            ← Shows
          </Link>
        </div>
      </div>

      {pipeline.total === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhum show para analisar.</p>
          <Link href="/shows/novo" className="mt-3 inline-block text-brand-700 hover:underline">
            Cadastrar um show
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Cachê em aberto"
              value={formatMoney(pipeline.openValue)}
              hint={`${pipeline.openCount} ${pipeline.openCount === 1 ? "show" : "shows"} (proposto + confirmado)`}
              tone="brand"
            />
            <Stat
              label="Em negociação"
              value={formatMoney(pipeline.proposedValue)}
              hint={`${pipeline.proposedCount} proposto${pipeline.proposedCount === 1 ? "" : "s"}`}
              tone="amber"
            />
            <Stat
              label="Confirmado"
              value={formatMoney(pipeline.confirmedValue)}
              hint={`${pipeline.confirmedCount} a tocar`}
              tone="emerald"
            />
            <Stat
              label="Taxa de concretização"
              value={
                pipeline.conversionRate == null
                  ? "—"
                  : `${(pipeline.conversionRate * 100).toFixed(0)}%`
              }
              hint={
                pipeline.conversionRate == null
                  ? "sem shows decididos"
                  : `${pipeline.playedCount} de ${pipeline.decidedCount} decididos`
              }
              tone="gray"
            />
          </div>

          <section className="card">
            <h2 className="mb-1 font-semibold">Shows por etapa</h2>
            <p className="mb-4 text-xs text-gray-500">
              Retrato do estado atual de cada show (não um histórico de conversão).
            </p>
            <div className="space-y-4">
              {pipeline.stages.map((stage) => {
                const status = stage.status as ShowStatus;
                const pct = pipeline.total > 0 ? (stage.count / pipeline.total) * 100 : 0;
                return (
                  <div key={stage.status}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className={"inline-block h-2.5 w-2.5 rounded-full " + SHOW_STATUS_DOT[status]}
                          aria-hidden
                        />
                        <span className="font-medium">{SHOW_STATUS_LABELS[status]}</span>
                        <span className="text-gray-400">
                          {stage.count} {stage.count === 1 ? "show" : "shows"}
                        </span>
                      </span>
                      <span className="text-gray-500">
                        {stage.fee > 0 ? formatMoney(stage.fee) : "—"}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded bg-gray-100">
                      <div
                        className={"h-full rounded " + SHOW_STATUS_DOT[status]}
                        style={{ width: `${(stage.count / maxCount) * 100}%` }}
                        title={`${stage.count} de ${pipeline.total} (${pct.toFixed(0)}%)`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            {pipeline.stages.map((stage) => {
              const status = stage.status as ShowStatus;
              return (
                <Link
                  key={stage.status}
                  href={`/shows?status=${stage.status}`}
                  className="card flex items-center justify-between transition hover:border-brand-200 hover:bg-gray-50"
                >
                  <span className={"badge " + SHOW_STATUS_COLORS[status]}>
                    {SHOW_STATUS_LABELS[status]}
                  </span>
                  <span className="text-sm text-gray-500">
                    <strong className="text-gray-900">{stage.count}</strong>{" "}
                    {stage.count === 1 ? "show" : "shows"}
                    {stage.fee > 0 && (
                      <span className="ml-2 text-gray-400">· {formatMoney(stage.fee)}</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "gray",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "emerald" | "red" | "brand" | "amber" | "gray";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    brand: "text-brand-700",
    amber: "text-amber-600",
    gray: "text-gray-900",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 text-xl font-bold " + tones[tone]}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
