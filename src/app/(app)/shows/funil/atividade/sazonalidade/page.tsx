import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  buildFunnelActivityFeed,
  funnelActivitySeasonality,
  funnelActivitySeasonalityStall,
  countCurrentMonthFunnelActivity,
  compareFunnelActivitySeasonality,
  classifyFunnelActivitySeasonMonthChange,
  parseFeedYear,
  feedYearRangeUtc,
  feedActivityYears,
  FUNNEL_ACTIVITY_KINDS,
  type FunnelActivityKind,
  type FunnelActivitySeasonalityComparison,
  type FunnelActivitySeasonalityStall,
} from "@/lib/shows";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

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

/** Inteiro assinado pt-BR: "+3" / "−2" / "0" (sinal de menos tipográfico). */
const signedInt = (n: number): string =>
  n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";

/** Tom pelo sinal do delta: verde sobe, vermelho cai, cinza estável. */
const deltaTone = (delta: number): string =>
  delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-gray-400";

/** Eventos de status da carteira (índice `[userId]`), opcionalmente recortados por ano. */
async function loadSeason(
  userId: string,
  range: { gte: Date; lt: Date } | null,
) {
  const events = await prisma.showStatusEvent.findMany({
    where: {
      userId,
      ...(range ? { createdAt: { gte: range.gte, lt: range.lt } } : {}),
    },
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
  return { feed, season: funnelActivitySeasonality(feed) };
}

export default async function FunnelActivitySeasonalityPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  // A sazonalidade colapsa os anos num único calendário de 12 meses. O padrão de
  // fundo emerge somando TODAS as temporadas (o default), mas um recorte por ano
  // (`?ano=`, pelo `createdAt` do evento em UTC) revela a forma de um ano isolado
  // — o que habilita o comparativo ano a ano (D327). Segue o precedente da
  // sazonalidade de shows (`/shows/sazonalidade`), que também tem seletor.
  const activeYear = parseFeedYear(searchParams?.ano);
  const yearRange = activeYear !== null ? feedYearRangeUtc(activeYear) : null;

  // Anos oferecidos no seletor — do evento mais antigo e do mais novo da carteira
  // (dois pontos indexados, INDEPENDENTES do recorte atual, para o seletor ficar
  // estável mesmo dentro de um ano vazio).
  const [oldestEvent, newestEvent] = await Promise.all([
    prisma.showStatusEvent.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.showStatusEvent.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);
  const years = feedActivityYears(
    oldestEvent?.createdAt ?? null,
    newestEvent?.createdAt ?? null,
  );

  const { feed, season } = await loadSeason(user.id, yearRange);
  // Escala das barras: maior total entre os meses (mínimo 1 para não dividir por 0).
  const peak = Math.max(1, ...season.months.map((m) => m.total));

  // "Funil parado numa temporada forte" (D333): o detalhe da mesma leitura que o
  // Painel exibe como banner — cruza o pico histórico com o estado ATUAL do mês
  // corrente. Só faz sentido na visão de TODOS os anos (`activeYear === null`),
  // porque o nudge é sobre o mês corrente do ano corrente medido contra o padrão
  // de fundo somando todas as temporadas; num ano isolado a leitura seria de outro
  // recorte. Reaproveita o feed já carregado (zero I/O extra) para contar as
  // transições do mês/ano corrente e cruzá-las com o ritmo sazonal esperado.
  const stall: FunnelActivitySeasonalityStall | null =
    activeYear === null && season.totalTransitions > 0
      ? funnelActivitySeasonalityStall(
          season,
          countCurrentMonthFunnelActivity(feed),
        )
      : null;

  // Comparativo ano a ano: só com um ano específico selecionado e ambos os
  // períodos com transições. O ano anterior sai de uma consulta indexada
  // `[userId]` recortada por `createdAt` (mesmo padrão do ritmo, D331).
  let comparison: FunnelActivitySeasonalityComparison | null = null;
  if (activeYear !== null && season.totalTransitions > 0) {
    const { season: prevSeason } = await loadSeason(
      user.id,
      feedYearRangeUtc(activeYear - 1),
    );
    if (prevSeason.totalTransitions > 0) {
      comparison = compareFunnelActivitySeasonality(season, prevSeason);
    }
  }

  const exportHref =
    activeYear !== null
      ? `/shows/funil/atividade/sazonalidade/export?ano=${activeYear}`
      : "/shows/funil/atividade/sazonalidade/export";

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
            <a href={exportHref} className="btn-secondary" download>
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

      {/* Seletor de período (ano da atividade, pelo `createdAt` do evento). Fica
          visível sempre que a carteira tem algum evento — inclusive dentro de um
          ano vazio — para o usuário trocar de ano ou voltar a "Todos". */}
      {years.length > 0 && (
        <PeriodPicker
          years={years}
          active={activeYear ?? "all"}
          basePath="/shows/funil/atividade/sazonalidade"
          ariaLabel="Período da sazonalidade"
        />
      )}

      {season.totalTransitions === 0 ? (
        activeYear !== null ? (
          <div className="card text-sm text-gray-500">
            Nenhuma movimentação registrada em {activeYear}.{" "}
            <Link
              href="/shows/funil/atividade/sazonalidade"
              className="text-brand-600 hover:underline"
            >
              Ver todos os anos
            </Link>
            .
          </div>
        ) : (
          <div className="card text-sm text-gray-500">
            Nenhuma movimentação registrada ainda. Cadastre um show e mova-o pelo
            funil (proposto → confirmado → realizado) para ver a sazonalidade aqui.
          </div>
        )
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

          {/* Detalhe do "funil parado numa temporada forte" — o mesmo sinal que o
              Painel resume num banner, aqui com o ritmo do mês corrente vs. o
              esperado lado a lado. Só na visão de todos os anos (o stall é null nos
              recortes por ano). */}
          {stall?.show && stall.month && <StallDetail stall={stall} />}

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

          {/* Comparativo ano a ano — só com um ano selecionado e ambos os períodos
              com transições (o helper decide o resto). */}
          {comparison && activeYear !== null && (
            <SeasonalityComparison
              comparison={comparison}
              year={activeYear}
              previousYear={activeYear - 1}
              exportHref={`/shows/funil/atividade/sazonalidade/comparativo/export?ano=${activeYear}`}
            />
          )}

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

/**
 * Detalhe do **funil parado numa temporada forte** (`funnelActivitySeasonalityStall`):
 * o mesmo sinal que o Painel resume num banner, aqui aberto com o ritmo do mês
 * corrente lado a lado com o esperado. Cruza o pico histórico (este mês costuma
 * concentrar `lift`× o movimento do mês médio) com o estado ATUAL (você está
 * `shortfall`% abaixo do ritmo esperado para esta altura do mês) — a hora de voltar
 * a trabalhar o pipeline. Só renderiza quando `stall.show` (a página já garante).
 */
function StallDetail({ stall }: { stall: FunnelActivitySeasonalityStall }) {
  const month = stall.month!;
  const liftPct = Math.round((stall.lift - 1) * 100);
  const shortfallPct = Math.round(stall.shortfall * 100);
  return (
    <section className="card border-amber-200 bg-amber-50">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-amber-900">
          😴 Funil parado numa temporada forte
        </h2>
        <Link
          href="/shows/funil"
          className="text-sm font-medium text-amber-700 hover:underline"
        >
          Trabalhar o pipeline →
        </Link>
      </div>
      <p className="mt-1 text-sm text-amber-900">
        <strong className="capitalize">{month.label}</strong> costuma concentrar{" "}
        <strong>{liftPct}% mais</strong> movimento no funil que o mês médio, mas
        você está <strong>{shortfallPct}% abaixo</strong> do ritmo esperado para
        esta altura do mês.
      </p>
      {/* Micro-barra realizado × esperado: a faixa é o ritmo esperado (100%) e o
          preenchimento é o realizado até agora, para o vão do shortfall saltar num
          relance. O stall só dispara com `actual < expected`, mas mantemos o clamp
          por segurança numérica. */}
      <div className="mt-3">
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-amber-100"
          role="img"
          aria-label={`Realizadas ${stall.actual} de ~${formatAverage(
            stall.expected,
          )} esperadas a esta altura do mês (${shortfallPct}% abaixo do ritmo)`}
        >
          <div
            className="h-full rounded-full bg-amber-500"
            style={{
              width: `${Math.min(
                stall.expected > 0 ? stall.actual / stall.expected : 0,
                1,
              ) * 100}%`,
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-amber-700">
          <span>Realizadas {stall.actual}</span>
          <span>Esperadas ~{formatAverage(stall.expected)}</span>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-amber-200 bg-white/60 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-amber-700">
            Realizadas até agora
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-900">
            {stall.actual}
          </div>
          <div className="text-xs text-amber-700">
            {stall.actual === 1 ? "transição" : "transições"} neste mês
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-white/60 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-amber-700">
            Esperadas a esta altura
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-900">
            ~{formatAverage(stall.expected)}
          </div>
          <div className="text-xs text-amber-700">
            pelo ritmo típico do mês, proporcional aos dias já decorridos
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Comparativo ano a ano da sazonalidade (`compareFunnelActivitySeasonality`): em
 * que meses do calendário o trabalho de agendamento esquentou ou esfriou em
 * relação ao ano anterior. Espelha o comparativo da sazonalidade de shows (D215) e
 * do ritmo (D331) — delta total no cabeçalho, os dois movers (mês que mais
 * subiu/caiu) em destaque e a tabela dos 12 meses para conferência.
 */
function SeasonalityComparison({
  comparison,
  year,
  previousYear,
  exportHref,
}: {
  comparison: FunnelActivitySeasonalityComparison;
  year: number;
  previousYear: number;
  exportHref: string;
}) {
  const { totalDelta, biggestGain, biggestDrop, months } = comparison;

  return (
    <section className="card">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          Temporada {year} vs. {previousYear}
        </h2>
        <div className="flex items-center gap-3">
          <span className={"text-sm font-semibold " + deltaTone(totalDelta)}>
            {signedInt(totalDelta)}{" "}
            {Math.abs(totalDelta) === 1 ? "transição" : "transições"}
          </span>
          <a href={exportHref} className="text-xs text-brand-600 hover:underline">
            ⬇ CSV
          </a>
        </div>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        Em que meses do ano seu trabalho de agendamento esquentou ou esfriou em
        relação ao ano anterior — a forma da temporada mudou?
      </p>

      {/* Movers por mês do calendário. */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <MonthMoverCard label="Mês que mais esquentou" change={biggestGain} tone="emerald" />
        <MonthMoverCard label="Mês que mais esfriou" change={biggestDrop} tone="red" />
      </div>

      {/* Detalhe dos meses — só os com movimento em algum dos dois anos. */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500">
              <th className="pb-2 font-medium">Mês</th>
              <th className="pb-2 px-3 text-right font-medium">{previousYear}</th>
              <th className="pb-2 px-3 text-right font-medium">{year}</th>
              <th className="pb-2 text-right font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            {months
              .filter((m) => m.currentTotal > 0 || m.previousTotal > 0)
              .map((m) => {
                const trend = classifyFunnelActivitySeasonMonthChange(m);
                return (
                  <tr key={m.month} className="border-b border-gray-100 last:border-0">
                    <td className="py-1.5 capitalize">{m.label}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums text-gray-500">
                      {m.previousTotal}
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums text-gray-900">
                      {m.currentTotal}
                    </td>
                    <td
                      className={
                        "py-1.5 text-right tabular-nums font-medium " +
                        (trend === "up"
                          ? "text-emerald-600"
                          : trend === "down"
                            ? "text-red-600"
                            : "text-gray-400")
                      }
                    >
                      {signedInt(m.totalDelta)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Cartão do mover — o mês do calendário que mais esquentou ou esfriou de um ano
 * para o outro. `null` (nenhum subiu/caiu) cai num placeholder neutro.
 */
function MonthMoverCard({
  label,
  change,
  tone,
}: {
  label: string;
  change: FunnelActivitySeasonalityComparison["biggestGain"];
  tone: "emerald" | "red";
}) {
  const ring = tone === "emerald" ? "border-emerald-200" : "border-red-200";
  const text = tone === "emerald" ? "text-emerald-600" : "text-red-600";
  return (
    <div className={"rounded-lg border p-3 " + ring}>
      <div className="text-xs text-gray-500">{label}</div>
      {change ? (
        <>
          <div className="mt-1 text-lg font-semibold capitalize text-gray-900">
            {change.label}
          </div>
          <div className={"text-sm font-semibold " + text}>
            {signedInt(change.totalDelta)}{" "}
            <span className="font-normal text-gray-400">
              ({change.previousTotal} → {change.currentTotal})
            </span>
          </div>
        </>
      ) : (
        <div className="mt-1 text-lg font-semibold text-gray-400">—</div>
      )}
    </div>
  );
}
