import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  funnelStageDurations,
  stageTimeConcentration,
  stageTimeConcentrationSegments,
  proposalOutcomeYears,
  compareFunnelStageDurations,
  indexStageDurationChanges,
  STAGE_DURATION_TREND_EPSILON,
  type StageDurationStat,
  type StageTimeShare,
  type StageTimeSegment,
  type ProposalOutcomeShowLike,
  type FunnelStageDurationsComparison,
  type StageDurationChange,
  type StageDurationRowStatus,
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

/** Participação (0..1) como percentual inteiro ("25%"), convenção das telas irmãs. */
function pctLabel(share: number): string {
  return `${Math.round(share * 100)}%`;
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

  // Comparativo por etapa {ano} × {ano-1}: quais etapas o funil passou a atravessar
  // mais rápido / mais devagar (D282 — fecha o "passo maior" adiado na D281,
  // espelhando compareProposalDeliberationByContact/D278 no eixo do funil inteiro).
  // Só com um ano específico e ambos os períodos com amostra — senão
  // "acelerou/desacelerou" enganaria. Reusa os MESMOS shows já carregados, recortando
  // o ano anterior pela mesma agregação pura (eixo da entrada da proposta), sem nova
  // consulta. O veredito ancora na mediana, a leitura principal da página.
  let comparison: FunnelStageDurationsComparison | null = null;
  let previousYear = 0;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previous = funnelStageDurations(shows, { year: previousYear });
    if (durations.totalSamples > 0 && previous.totalSamples > 0) {
      const c = compareFunnelStageDurations(durations, previous);
      // Só vale exibir se há de fato alguma etapa nos dois períodos.
      if (c.changes.length > 0) comparison = c;
    }
  }

  // Lookup por `status` para a coluna "vs. {ano-1}" da tabela: casa cada etapa
  // (período atual) com sua variação, ou marca "nova"/"—" (D282). Reusa o mesmo
  // comparativo já computado — zero lógica pura nova na página.
  const rowStatus = comparison ? indexStageDurationChanges(comparison) : null;

  // Onde o tempo se concentra: cada etapa como fração da soma das medianas — o
  // gargalo de tempo do funil num relance (D283). Derivado das MESMAS medianas já
  // exibidas (zero consulta, zero regra nova); a etapa dominante vira destaque e o
  // share vira coluna "% do percurso" na tabela.
  const concentration = stageTimeConcentration(durations);
  const shareByStatus = new Map(concentration.shares.map((s) => [s.status, s.share]));
  // Segmentos visíveis (naco > 0) da barra de composição — a FORMA de onde o tempo
  // se concentra num relance, além de só nomear a etapa dominante.
  const concentrationSegments = stageTimeConcentrationSegments(concentration);

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

          {concentration.dominant && (
            <TimeConcentrationCard
              dominant={concentration.dominant}
              segments={concentrationSegments}
            />
          )}

          {comparison && (
            <StageMoversCard
              comparison={comparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

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
                  {rowStatus && (
                    <th className="py-2 px-3 text-right font-medium">vs. {previousYear}</th>
                  )}
                  <th className="py-2 px-3 text-right font-medium">% do percurso</th>
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
                      {rowStatus && (
                        <td className="py-2 px-3 text-right">
                          <StageRowDelta
                            status={rowStatus(stage.status)}
                            year={previousYear}
                          />
                        </td>
                      )}
                      <td className="py-2 px-3 text-right tabular-nums text-gray-600">
                        {concentration.totalMedianDays > 0
                          ? pctLabel(shareByStatus.get(stage.status) ?? 0)
                          : "—"}
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
              A coluna <strong>% do percurso</strong> mostra o naco do tempo típico de travessia que
              fica em cada etapa (mediana da etapa ÷ soma das medianas) — onde o funil consome tempo.
              {rowStatus && (
                <>
                  {" "}
                  A coluna <strong>vs. {previousYear}</strong> mostra a variação da mediana de
                  permanência de cada etapa frente ao ano anterior —{" "}
                  <span className="text-emerald-600">verde</span> passou a atravessar mais rápido,{" "}
                  <span className="text-red-600">vermelho</span> passou a demorar mais,
                  &quot;nova&quot; só teve amostra neste ano.
                </>
              )}
            </p>
          </section>
        </>
      )}
    </div>
  );
}

/**
 * Card "Onde o tempo se concentra": a etapa que sozinha responde pelo maior naco do
 * tempo típico de percurso do funil (a etapa dominante de `stageTimeConcentration`,
 * D283) — o gargalo de tempo num relance. Composição das medianas (o mesmo espírito
 * de fontes de renda / composição de despesas), não a mediana do percurso inteiro.
 * A barra empilhada (`stageTimeConcentrationSegments`, D286) mostra a FORMA inteira
 * da composição além de nomear só a etapa dominante.
 */
function TimeConcentrationCard({
  dominant,
  segments,
}: {
  dominant: StageTimeShare;
  segments: StageTimeSegment[];
}) {
  const label = SHOW_STATUS_LABELS[dominant.status as ShowStatus] ?? dominant.status;
  return (
    <section className="card border-l-4 border-brand-400">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Onde o tempo se concentra
      </p>
      <p className="mt-1 text-sm text-gray-700">
        A etapa <strong>{label}</strong> concentra{" "}
        <strong className="text-brand-700">{pctLabel(dominant.share)}</strong> do tempo típico de
        percurso do funil (mediana de {daysLabel(dominant.medianDays)}) — é o maior gargalo de tempo.
      </p>
      {segments.length > 0 && <ConcentrationBar segments={segments} />}
    </section>
  );
}

/**
 * Barra empilhada da composição do tempo do funil: cada etapa de naco positivo
 * (`stageTimeConcentrationSegments`, D286) vira uma fatia proporcional ao seu share,
 * na ordem canônica, com legenda de etapa + percentual. A cor sólida de cada fatia
 * reusa `SHOW_STATUS_DOT` (a mesma do ponto na tabela), e a etapa dominante ganha um
 * anel para casar com o destaque textual do card.
 */
function ConcentrationBar({ segments }: { segments: StageTimeSegment[] }) {
  return (
    <div className="mt-3">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100"
        role="img"
        aria-label="Composição do tempo por etapa do funil"
      >
        {segments.map((seg) => {
          const status = seg.status as ShowStatus;
          return (
            <div
              key={seg.status}
              className={
                (SHOW_STATUS_DOT[status] ?? "bg-gray-400") +
                (seg.dominant ? " ring-1 ring-inset ring-white/60" : "")
              }
              style={{ width: `${seg.share * 100}%` }}
              title={`${SHOW_STATUS_LABELS[status] ?? seg.status}: ${pctLabel(seg.share)}`}
            />
          );
        })}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {segments.map((seg) => {
          const status = seg.status as ShowStatus;
          return (
            <li key={seg.status} className="flex items-center gap-1.5">
              <span
                className={
                  "inline-block h-2.5 w-2.5 rounded-full " +
                  (SHOW_STATUS_DOT[status] ?? "bg-gray-400")
                }
                aria-hidden
              />
              <span className={seg.dominant ? "font-semibold text-gray-800" : ""}>
                {SHOW_STATUS_LABELS[status] ?? seg.status}
              </span>
              <span className="tabular-nums text-gray-400">{pctLabel(seg.share)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Variação de permanência em dias com sinal (ex.: -12 → "−12 dias", 3 → "+3 dias"). */
function signedDaysLabel(delta: number): string {
  if (delta === 0) return "0 dias";
  const abs = Math.abs(delta);
  return `${delta > 0 ? "+" : "−"}${abs} ${abs === 1 ? "dia" : "dias"}`;
}

/**
 * Célula da coluna "vs. {ano-1}" na tabela por etapa: a variação da mediana de
 * permanência desta etapa frente ao ano anterior (`indexStageDurationChanges`,
 * D282). Descer a mediana é o sinal saudável (verde, atravessa mais rápido); subir
 * é a etapa emperrando (vermelho); dentro do limiar é estável (cinza). Uma etapa
 * com amostra só neste ano vira "nova"; a não comparável fica em "—".
 */
function StageRowDelta({
  status,
  year,
}: {
  status: StageDurationRowStatus;
  year: number;
}) {
  if (status.kind === "new") {
    return (
      <span className="text-xs text-gray-400" title={`Só teve amostra depois de ${year}`}>
        nova
      </span>
    );
  }
  if (status.kind === "none") {
    return <span className="text-gray-300">—</span>;
  }
  const { medianDaysDelta, trend } = status.change;
  const tone =
    trend === "faster"
      ? "text-emerald-600"
      : trend === "slower"
        ? "text-red-600"
        : "text-gray-500";
  return (
    <span className={"font-medium tabular-nums " + tone}>{signedDaysLabel(medianDaysDelta)}</span>
  );
}

/** Um lado do card de "movers": qual etapa acelerou ou desacelerou a travessia. */
function StageMoverBlock({
  title,
  change,
  tone,
}: {
  title: string;
  change: StageDurationChange | null;
  tone: "faster" | "slower";
}) {
  const valueClass = tone === "faster" ? "text-emerald-600" : "text-red-600";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
      {change ? (
        <>
          <p className="mt-1 truncate font-medium text-gray-900">
            {SHOW_STATUS_LABELS[change.status as ShowStatus] ?? change.status}
          </p>
          <p className={"mt-1 text-lg font-bold " + valueClass}>
            {signedDaysLabel(change.medianDaysDelta)}
          </p>
          <p className="text-xs text-gray-400">
            {daysLabel(change.previous.medianDays)} → {daysLabel(change.current.medianDays)}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-gray-400">
          Nenhuma etapa {tone === "faster" ? "acelerou" : "desacelerou"} mais de{" "}
          {STAGE_DURATION_TREND_EPSILON} dias
        </p>
      )}
    </div>
  );
}

/**
 * Card "Como mudou o ritmo do funil {ano} vs. {ano-1}": destaca a etapa que mais
 * acelerou (passou a ser atravessada mais rápido) e a que mais desacelerou (o show
 * ficou mais tempo parado) frente ao ano anterior (`compareFunnelStageDurations`,
 * D282). Como na deliberação, **descer** a mediana é o sinal saudável. Fecha o
 * rodapé com as etapas que ganharam/perderam amostra no recorte. Espelho de
 * `DeliberationMoversCard` no eixo do funil inteiro.
 */
function StageMoversCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: FunnelStageDurationsComparison;
  currentYear: number;
  previousYear: number;
}) {
  const { biggestSpeedup, biggestSlowdown, changes, newStages, droppedStages } = comparison;
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Como mudou o ritmo do funil · {currentYear} vs. {previousYear}
        </p>
        <span className="text-xs text-gray-400">
          {changes.length} {changes.length === 1 ? "etapa comparável" : "etapas comparáveis"}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <StageMoverBlock title="Passou a atravessar mais rápido" change={biggestSpeedup} tone="faster" />
        <StageMoverBlock title="Passou a demorar mais" change={biggestSlowdown} tone="slower" />
      </div>
      {(newStages.length > 0 || droppedStages.length > 0) && (
        <p className="text-xs text-gray-400">
          {newStages.length > 0 && (
            <>
              {newStages.length} {newStages.length === 1 ? "etapa ganhou" : "etapas ganharam"} amostra
              em {currentYear}
            </>
          )}
          {newStages.length > 0 && droppedStages.length > 0 && " · "}
          {droppedStages.length > 0 && (
            <>
              {droppedStages.length}{" "}
              {droppedStages.length === 1 ? "tinha amostra" : "tinham amostra"} em {previousYear} mas
              não em {currentYear}
            </>
          )}
          .
        </p>
      )}
    </section>
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
