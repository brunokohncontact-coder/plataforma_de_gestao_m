import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  buildFunnelActivityFeed,
  groupFunnelActivityByMonth,
  summarizeFunnelActivityMonths,
  compareFunnelActivityMonths,
  parseFeedYear,
  feedYearRangeUtc,
  feedActivityYears,
  FUNNEL_ACTIVITY_KINDS,
  type FunnelActivityKind,
  type FunnelActivityYearComparison,
  type FunnelActivityKindChange,
} from "@/lib/shows";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

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

export default async function FunnelActivityRhythmPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  // Recorte por ano da atividade (`?ano=`, pelo `createdAt` do evento em UTC);
  // `null` = toda a carteira. Filtra no banco, então o ritmo passa a contar só os
  // meses do ano escolhido (a mesma convenção do feed em `/shows/funil/atividade`).
  const activeYear = parseFeedYear(searchParams?.ano);
  const yearRange = activeYear !== null ? feedYearRangeUtc(activeYear) : null;

  // Anos oferecidos no seletor — derivados do evento mais antigo e do mais novo da
  // carteira (dois pontos indexados, INDEPENDENTES do recorte atual, para o seletor
  // ficar estável mesmo dentro de um ano vazio).
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

  // O ritmo cobre a carteira INTEIRA (não uma janela) dentro do recorte de ano:
  // buscamos os eventos de status (índice `[userId]`, ordenados no banco) e
  // agregamos por mês. Só o essencial de cada evento — sem o show — porque o
  // ritmo é uma contagem.
  const events = await prisma.showStatusEvent.findMany({
    where: {
      userId: user.id,
      ...(yearRange ? { createdAt: { gte: yearRange.gte, lt: yearRange.lt } } : {}),
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

  const months = groupFunnelActivityByMonth(feed);
  const maxTotal = Math.max(1, ...months.map((m) => m.total));
  const totalTransitions = feed.length;
  const summary = summarizeFunnelActivityMonths(months);

  // Comparativo ano a ano do ritmo: só com um ano específico selecionado e ambos
  // os anos com atividade. Busca os eventos do ano anterior (índice `[userId]`,
  // recorte por `createdAt` em UTC), agrupa por mês e destila os movers por
  // natureza. Segue "esperar por um ano específico + amostra nos dois lados",
  // como o comparativo de sazonalidade (D215).
  let comparison: FunnelActivityYearComparison | null = null;
  if (activeYear !== null) {
    const prevRange = feedYearRangeUtc(activeYear - 1);
    const prevEvents = await prisma.showStatusEvent.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: prevRange.gte, lt: prevRange.lt },
      },
      orderBy: { createdAt: "desc" },
      select: { showId: true, fromStatus: true, toStatus: true, createdAt: true },
    });
    if (prevEvents.length > 0 && totalTransitions > 0) {
      const prevMonths = groupFunnelActivityByMonth(
        buildFunnelActivityFeed(
          prevEvents.map((e) => ({
            showId: e.showId,
            showTitle: "",
            showDate: null,
            fromStatus: e.fromStatus,
            toStatus: e.toStatus,
            at: e.createdAt,
          })),
        ),
      );
      comparison = compareFunnelActivityMonths(months, prevMonths);
    }
  }
  const monthlyAverage = summary.averagePerMonth.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  // O link de export espelha o recorte por ano para baixar exatamente o ritmo
  // exibido.
  const exportHref =
    activeYear !== null
      ? `/shows/funil/atividade/ritmo/export?ano=${activeYear}`
      : "/shows/funil/atividade/ritmo/export";

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
            <a href={exportHref} className="btn-secondary">
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

      {/* Seletor de período (ano da atividade, pelo `createdAt` do evento). Fica
          visível sempre que a carteira tem algum evento — inclusive dentro de um
          ano vazio — para o usuário poder trocar de ano ou voltar a "Todos". */}
      {years.length > 0 && (
        <PeriodPicker
          years={years}
          active={activeYear ?? "all"}
          basePath="/shows/funil/atividade/ritmo"
          ariaLabel="Período do ritmo"
        />
      )}

      {months.length === 0 ? (
        activeYear !== null ? (
          <div className="card text-sm text-gray-500">
            Nenhuma movimentação registrada em {activeYear}.{" "}
            <Link
              href="/shows/funil/atividade/ritmo"
              className="text-brand-600 hover:underline"
            >
              Ver todos os anos
            </Link>
            .
          </div>
        ) : (
          <div className="card text-sm text-gray-500">
            Nenhuma movimentação registrada ainda. Cadastre um show e mova-o pelo
            funil (proposto → confirmado → realizado) para ver o ritmo aqui.
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

          {/* Comparativo ano a ano — só quando há um ano selecionado e ambos os
              períodos têm atividade (o helper decide o resto). */}
          {comparison && activeYear !== null && (
            <RhythmComparison
              comparison={comparison}
              year={activeYear}
              previousYear={activeYear - 1}
              exportHref={`/shows/funil/atividade/ritmo/comparativo/export?ano=${activeYear}`}
            />
          )}

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

/** Inteiro assinado pt-BR: "+3" / "−2" / "0" (sinal de menos tipográfico). */
const signedInt = (n: number): string =>
  n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";

/** Média com no máximo uma casa decimal, em pt-BR. */
const formatAverage = (n: number): string =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });

/** Tom pelo sinal do delta: verde sobe, vermelho cai, cinza estável. */
const deltaTone = (delta: number): string =>
  delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-gray-400";

/**
 * Cartão do mover — a natureza que mais cresceu ou mais caiu de um ano para o
 * outro. `null` (nenhuma subiu/caiu) cai num placeholder neutro, como os movers
 * da sazonalidade.
 */
function MoverCard({
  label,
  change,
  tone,
}: {
  label: string;
  change: FunnelActivityKindChange | null;
  tone: "emerald" | "red";
}) {
  const ring = tone === "emerald" ? "border-emerald-200" : "border-red-200";
  const text = tone === "emerald" ? "text-emerald-600" : "text-red-600";
  return (
    <div className={"rounded-lg border p-3 " + ring}>
      <div className="text-xs text-gray-500">{label}</div>
      {change ? (
        <>
          <div className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-gray-900">
            <span
              className={"inline-block h-2.5 w-2.5 rounded-full " + KIND_META[change.kind].dot}
              aria-hidden="true"
            />
            {KIND_META[change.kind].label}
          </div>
          <div className={"text-sm font-semibold " + text}>
            {signedInt(change.delta)}{" "}
            <span className="font-normal text-gray-400">
              ({change.previous} → {change.current})
            </span>
          </div>
        </>
      ) : (
        <div className="mt-1 text-lg font-semibold text-gray-400">—</div>
      )}
    </div>
  );
}

/**
 * Comparativo ano a ano do ritmo (`compareFunnelActivityMonths`): quanto o funil
 * se movimentou mais/menos e qual natureza puxou a mudança. Espelha o card
 * "Temporada {ano} vs. {ano-1}" da sazonalidade (D215) no eixo do ritmo — total e
 * média no cabeçalho, os dois movers em destaque e a quebra por natureza numa
 * tabela para conferência.
 */
function RhythmComparison({
  comparison,
  year,
  previousYear,
  exportHref,
}: {
  comparison: FunnelActivityYearComparison;
  year: number;
  previousYear: number;
  exportHref: string;
}) {
  const { totalDelta, biggestGain, biggestDrop, byKind } = comparison;

  return (
    <section className="card">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          Ritmo {year} vs. {previousYear}
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
        Seu funil se movimentou mais ou menos do que no ano anterior, e qual
        natureza (cadastros, avanços, recuos, cancelamentos, reaberturas) explica a
        diferença.
      </p>

      {/* Totais e médias lado a lado. */}
      <dl className="mb-4 grid grid-cols-3 gap-4 text-sm">
        <div>
          <dt className="text-xs text-gray-500">Transições {year}</dt>
          <dd className="text-lg font-semibold text-gray-900">
            {comparison.totalCurrent}
          </dd>
          <dd className="text-xs text-gray-400">
            {previousYear}: {comparison.totalPrevious}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Média por mês</dt>
          <dd className="text-lg font-semibold text-gray-900">
            {formatAverage(comparison.averageCurrent)}
          </dd>
          <dd className="text-xs text-gray-400">
            {previousYear}: {formatAverage(comparison.averagePrevious)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Meses ativos</dt>
          <dd className="text-lg font-semibold text-gray-900">
            {comparison.monthCountCurrent}
          </dd>
          <dd className="text-xs text-gray-400">
            {previousYear}: {comparison.monthCountPrevious}
          </dd>
        </div>
      </dl>

      {/* Movers por natureza. */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <MoverCard label="Natureza que mais cresceu" change={biggestGain} tone="emerald" />
        <MoverCard label="Natureza que mais caiu" change={biggestDrop} tone="red" />
      </div>

      {/* Quebra por natureza — as cinco, mesmo as sem variação. */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500">
              <th className="pb-2 font-medium">Natureza</th>
              <th className="pb-2 px-3 text-right font-medium">{previousYear}</th>
              <th className="pb-2 px-3 text-right font-medium">{year}</th>
              <th className="pb-2 text-right font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            {byKind.map((change) => (
              <tr key={change.kind} className="border-b border-gray-100 last:border-0">
                <td className="py-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={"inline-block h-2 w-2 rounded-full " + KIND_META[change.kind].dot}
                      aria-hidden="true"
                    />
                    {KIND_META[change.kind].label}
                  </span>
                </td>
                <td className="py-1.5 px-3 text-right tabular-nums text-gray-500">
                  {change.previous}
                </td>
                <td className="py-1.5 px-3 text-right tabular-nums text-gray-900">
                  {change.current}
                </td>
                <td className={"py-1.5 text-right tabular-nums font-medium " + deltaTone(change.delta)}>
                  {signedInt(change.delta)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
