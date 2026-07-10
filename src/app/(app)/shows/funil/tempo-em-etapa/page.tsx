import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  funnelStageDurations,
  proposalOutcomeYears,
  type StageDurationStat,
  type ProposalOutcomeShowLike,
} from "@/lib/shows";
import { parseProfitYear } from "@/lib/finance";
import {
  SHOW_STATUS_LABELS,
  SHOW_STATUS_DOT,
  type ShowStatus,
} from "@/lib/domain";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

/** Dias inteiros como texto pt-BR ("1 dia" / "N dias"). */
function daysLabel(n: number): string {
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}

export default async function StageDurationsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  // Só precisamos dos eventos de status de cada show — a agregação é pura sobre
  // eles. Ordenados por data para a linha do tempo (o helper reordena, mas isto
  // mantém a consulta previsível e barata).
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    select: {
      statusEvents: {
        select: { fromStatus: true, toStatus: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Anos do seletor: só os que têm coorte (entrada em PROPOSED), pelo mesmo eixo
  // (data da proposta) da conversão e da quebra por contratante — o recorte
  // reaproveita `proposalOutcomeYears`/`opts.year`, mantendo a paridade com as
  // telas irmãs do funil (D276/D243). Ver D281.
  const availableYears = proposalOutcomeYears(shows as ProposalOutcomeShowLike[]);
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);

  const durations = funnelStageDurations(shows, {
    year: yearFilter === "all" ? "all" : yearFilter,
  });
  const maxMedian = Math.max(1, ...durations.stages.map((s) => s.medianDays));
  const periodLabel =
    yearFilter === "all" ? "todas as propostas" : `propostas de ${yearFilter}`;
  const exportHref =
    yearFilter === "all"
      ? "/shows/funil/tempo-em-etapa/export"
      : `/shows/funil/tempo-em-etapa/export?ano=${yearFilter}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tempo em cada etapa</h1>
          <p className="text-sm text-gray-500">
            Quanto tempo, tipicamente, um show fica em cada etapa do funil antes de sair —
            avançando ou sendo cancelado. Enquanto o funil mostra <em>onde</em> os shows estão,
            isto mostra a <em>velocidade</em> com que atravessam.{" "}
            <span className="text-gray-400">Recorte: {periodLabel}.</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {durations.totalSamples > 0 && (
            <Link href={exportHref} className="btn-secondary">
              ⬇ CSV
            </Link>
          )}
          <Link href="/shows/funil/tempo-em-etapa/por-contratante" className="btn-secondary">
            Por contratante
          </Link>
          <Link href="/shows/funil" className="btn-secondary">
            ← Funil
          </Link>
        </div>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker
          years={availableYears}
          active={yearFilter}
          basePath="/shows/funil/tempo-em-etapa"
          ariaLabel="Ano da proposta"
        />
      )}

      {durations.totalSamples === 0 ? (
        <div className="card text-center text-gray-500">
          {yearFilter === "all" ? (
            <>
              <p>Ainda não há histórico de mudanças de status para medir.</p>
              <p className="mt-2 text-sm">
                O tempo em cada etapa é calculado a partir das transições de status registradas a
                partir de agora (proposta → confirmado → realizado). Conforme você movimenta shows
                pelo funil, esta leitura vai se formando.
              </p>
            </>
          ) : (
            <p>
              Nenhuma proposta de <strong>{yearFilter}</strong> teve transição cronometrada para
              medir. Experimente outro ano ou <strong>Todos</strong>.
            </p>
          )}
          <Link
            href="/shows/funil"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Ver o funil de propostas
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            Baseado em <strong>{durations.totalSamples}</strong>{" "}
            {durations.totalSamples === 1 ? "transição cronometrada" : "transições cronometradas"} de{" "}
            <strong>{durations.showCount}</strong>{" "}
            {durations.showCount === 1 ? "show" : "shows"}. A permanência na etapa atual (ainda em
            aberto) não entra na conta.
          </p>

          <section className="card">
            <h2 className="mb-4 font-semibold">Permanência mediana por etapa</h2>
            <div className="space-y-4">
              {durations.stages.map((stage) => (
                <StageBar key={stage.status} stage={stage} maxMedian={maxMedian} />
              ))}
            </div>
          </section>

          <section className="card overflow-x-auto">
            <h2 className="mb-3 font-semibold">Detalhe</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-3 font-medium">Etapa</th>
                  <th className="py-2 px-3 text-right font-medium">Transições</th>
                  <th className="py-2 px-3 text-right font-medium">Mediana</th>
                  <th className="py-2 px-3 text-right font-medium">Média</th>
                  <th className="py-2 px-3 text-right font-medium">Mín</th>
                  <th className="py-2 pl-3 text-right font-medium">Máx</th>
                </tr>
              </thead>
              <tbody>
                {durations.stages.map((stage) => {
                  const status = stage.status as ShowStatus;
                  const label = SHOW_STATUS_LABELS[status] ?? stage.status;
                  return (
                    <tr key={stage.status} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-2">
                          <span
                            className={
                              "inline-block h-2.5 w-2.5 rounded-full " +
                              (SHOW_STATUS_DOT[status] ?? "bg-gray-400")
                            }
                            aria-hidden
                          />
                          <span className="font-medium">{label}</span>
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-600">
                        {stage.count}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold tabular-nums">
                        {daysLabel(stage.medianDays)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-600">
                        {daysLabel(stage.averageDays)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-500">
                        {daysLabel(stage.shortestDays)}
                      </td>
                      <td className="py-2 pl-3 text-right tabular-nums text-gray-500">
                        {daysLabel(stage.longestDays)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-gray-400">
              A mediana é a leitura principal (resistente a um caso fora da curva); a média fica
              como referência. Cada etapa soma tanto as saídas por avanço quanto por cancelamento.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function StageBar({
  stage,
  maxMedian,
}: {
  stage: StageDurationStat;
  maxMedian: number;
}) {
  const status = stage.status as ShowStatus;
  const label = SHOW_STATUS_LABELS[status] ?? stage.status;
  const dot = SHOW_STATUS_DOT[status] ?? "bg-gray-400";
  const pct = (stage.medianDays / maxMedian) * 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2">
          <span className={"inline-block h-2.5 w-2.5 rounded-full " + dot} aria-hidden />
          <span className="font-medium">{label}</span>
          <span className="text-gray-400">
            {stage.count} {stage.count === 1 ? "transição" : "transições"}
          </span>
        </span>
        <span className="font-semibold text-gray-700">{daysLabel(stage.medianDays)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded bg-gray-100">
        <div
          className={"h-full rounded " + dot}
          style={{ width: `${Math.max(pct, stage.medianDays > 0 ? 4 : 0)}%` }}
          title={`Mediana ${daysLabel(stage.medianDays)} · média ${daysLabel(stage.averageDays)}`}
        />
      </div>
    </div>
  );
}
