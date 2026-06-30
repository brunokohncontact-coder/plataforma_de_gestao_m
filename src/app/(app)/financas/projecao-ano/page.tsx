import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  projectYearEnd,
  applyYearEndScenario,
  yearEndScenarioView,
  projectYearEndWithFixedCosts,
  projectYearEndPessimistic,
  compareYearEndToPrevious,
  computeGoalProgress,
  recurringExpenses,
  type MetricDelta,
  type RevenueGoalProgress,
  type TxLike,
  type YearEndScenarioChoice,
  type YearEndShowLike,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";

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

export default async function YearEndForecastPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();
  const params = searchParams ?? {};
  const year = parseYear(readParam(params, "ano"));
  const rawCenario = readParam(params, "cenario");
  const mode: YearEndScenarioChoice =
    rawCenario === "conservador"
      ? "conservative"
      : rawCenario === "pessimista"
        ? "pessimistic"
        : "optimistic";

  /** Slug pt-BR de cada cenário na query (otimista é o default, sem ?cenario). */
  const CENARIO_SLUG: Record<YearEndScenarioChoice, string> = {
    optimistic: "",
    conservative: "conservador",
    pessimistic: "pessimista",
  };
  /** Preserva o ano ao trocar de cenário (e omite ?cenario no modo otimista). */
  const scenarioHref = (m: YearEndScenarioChoice) =>
    "/financas/projecao-ano?ano=" +
    year +
    (CENARIO_SLUG[m] ? `&cenario=${CENARIO_SLUG[m]}` : "");

  // Todas as transações entram: as do ano alimentam os totais, e as vinculadas
  // a shows (de qualquer período) abatem o cachê agendado para não contar duas
  // vezes. Os shows do ano (e do ano anterior, p/ a comparação) fornecem a
  // receita futura ainda não lançada.
  const [transactions, shows, goal] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id },
      select: { type: true, amount: true, date: true, received: true, showId: true },
    }),
    prisma.show.findMany({
      where: {
        userId: user.id,
        date: {
          gte: new Date(Date.UTC(year - 1, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      select: { id: true, fee: true, status: true, date: true },
    }),
    prisma.revenueGoal.findUnique({
      where: { userId_year: { userId: user.id, year } },
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

  const fRaw = projectYearEnd(txs, shows as YearEndShowLike[], year);
  const fixedCost = recurringExpenses(txs).estimatedMonthlyFixedCost;

  // Seletor de três cenários (D73): otimista (forecast cru) × conservador (só
  // confirmados — D66) × pior caso (conservador + custo fixo recorrente futuro —
  // D68). `yearEndScenarioView` normaliza o cenário escolhido num formato comum
  // (totais + composição). O número principal e a composição abaixo seguem `view`.
  const view = yearEndScenarioView(fRaw, txs, fixedCost, mode);

  // Comparação com o fechamento do ano anterior: "estou indo melhor que ano
  // passado?". Para um ano já encerrado, projectYearEnd degrada para o resultado
  // de competência lançado (sem shows futuros) — o fechamento real (ver D63). O
  // cenário também se aplica ao ano anterior por consistência (sem efeito quando
  // já encerrado, pois não há shows futuros tentativos nem meses a estimar).
  const prevView = yearEndScenarioView(
    projectYearEnd(txs, shows as YearEndShowLike[], year - 1),
    txs,
    fixedCost,
    mode,
  );
  const comparison = compareYearEndToPrevious(view, prevView);

  // Projeção vs. meta de faturamento (D78): se há meta para o ano, cruza-a com a
  // receita PROJETADA do cenário escolhido (não o resultado) — responde "no ritmo
  // atual, eu bato a meta?". Diferente de /financas/metas, que sempre usa o
  // cenário otimista: aqui o número segue o seletor, então o conservador/pior caso
  // pode revelar que a meta só fecha contando shows ainda a confirmar.
  // Reusa o helper puro já testado `computeGoalProgress`.
  const goalProgress = goal
    ? computeGoalProgress(
        {
          goal: goal.amount,
          realized: view.realizedIncome,
          projected: view.projectedIncome,
          year,
        },
        {},
      )
    : null;

  // Gating do seletor: o conservador só difere do otimista quando há cachê
  // tentativo a descartar; o pior caso só difere do conservador quando há custo
  // fixo futuro a somar. O grupo aparece quando há ao menos um piso a oferecer.
  const pessimistic = projectYearEndPessimistic(fRaw, txs, fixedCost);
  const hasTentative = fRaw.scheduledTentative > 0;
  const hasPessimistic = pessimistic.estimatedRemainingFixedCost > 0;
  const showSelector = hasTentative || hasPessimistic;

  // Cenário "com custos fixos" (D62): estima o custo fixo recorrente que ainda
  // deve se repetir até dezembro e o soma às despesas — uma leitura mais
  // conservadora. Card opt-in mostrado só fora do modo "pior caso" (lá o custo
  // fixo já está embutido no número principal). Base = forecast do modo atual.
  const baseForecast =
    mode === "pessimistic" ? null : applyYearEndScenario(fRaw, mode);
  const scenario = baseForecast
    ? projectYearEndWithFixedCosts(baseForecast, txs, fixedCost)
    : null;

  const hasAnything =
    fRaw.realizedIncome > 0 ||
    fRaw.pendingIncome > 0 ||
    fRaw.scheduledIncome > 0 ||
    fRaw.realizedExpense > 0 ||
    fRaw.pendingExpense > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Projeção de fechamento</h1>
          <p className="text-sm text-gray-500">
            Como o ano {year} deve fechar somando o que já entrou, o que está
            pendente e os cachês de shows futuros ainda não lançados.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasAnything && (
            <a
              href={
                "/financas/projecao-ano/export?ano=" +
                year +
                (CENARIO_SLUG[mode] ? `&cenario=${CENARIO_SLUG[mode]}` : "")
              }
              className="btn-secondary"
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/financas" className="text-sm text-gray-500 hover:underline">
            ← Finanças
          </Link>
        </div>
      </div>

      {/* Navegação por ano */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/financas/projecao-ano?ano=${year - 1}`}
          className="btn-secondary"
          aria-label="Ano anterior"
        >
          ←
        </Link>
        <Link
          href="/financas/projecao-ano"
          className="text-sm text-brand-700 hover:underline"
        >
          Ano atual
        </Link>
        <Link
          href={`/financas/projecao-ano?ano=${year + 1}`}
          className="btn-secondary"
          aria-label="Próximo ano"
        >
          →
        </Link>
      </div>

      {/* Seletor de cenário (D73): otimista (inclui shows a confirmar) ×
          conservador (só confirmados) × pior caso (só confirmados + custo fixo
          recorrente futuro). Conservador só aparece quando há cachê tentativo a
          descartar; pior caso só quando há custo fixo futuro a somar. */}
      {showSelector && (
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Cenário da projeção"
        >
          <span className="text-sm text-gray-500">Cenário:</span>
          <ScenarioPill
            href={scenarioHref("optimistic")}
            active={mode === "optimistic"}
            label="Otimista"
          />
          {hasTentative && (
            <ScenarioPill
              href={scenarioHref("conservative")}
              active={mode === "conservative"}
              label="Conservador"
            />
          )}
          {hasPessimistic && (
            <ScenarioPill
              href={scenarioHref("pessimistic")}
              active={mode === "pessimistic"}
              label="Pior caso"
            />
          )}
          <span className="text-xs text-gray-400">
            {mode === "pessimistic"
              ? "só confirmados e somando os custos fixos futuros"
              : mode === "conservative"
                ? "considerando só os shows confirmados"
                : "incluindo shows ainda a confirmar"}
          </span>
        </div>
      )}

      {!hasAnything ? (
        <div className="card text-center text-gray-500">
          <p>Nada lançado nem agendado para {year}.</p>
        </div>
      ) : (
        <>
          {/* Resultado projetado do ano (o número que importa) */}
          <section
            className={
              "card border-l-4 " +
              (view.projectedResult < 0 ? "border-red-400" : "border-emerald-400")
            }
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Resultado projetado do ano
              {mode === "conservative" && " · conservador"}
              {mode === "pessimistic" && " · pior caso"}
            </p>
            <p
              className={
                "mt-1 text-3xl font-bold " +
                (view.projectedResult < 0 ? "text-red-600" : "text-emerald-600")
              }
            >
              {formatMoney(view.projectedResult)}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {formatMoney(view.projectedIncome)} em receitas projetadas −{" "}
              {formatMoney(view.projectedExpense)} em despesas.
              {view.realizedResult !== view.projectedResult && (
                <>
                  {" "}
                  Hoje, o caixa realizado do ano está em{" "}
                  <span
                    className={
                      "font-medium " +
                      (view.realizedResult < 0 ? "text-red-600" : "text-gray-900")
                    }
                  >
                    {formatMoney(view.realizedResult)}
                  </span>
                  .
                </>
              )}
            </p>
          </section>

          {/* Projeção vs. meta de faturamento (D78). Mostra o card quando há meta;
              senão, um convite discreto para definir uma. O número comparado é a
              RECEITA projetada do cenário atual (não o resultado), pois a meta é de
              faturamento. */}
          {goalProgress ? (
            <GoalCard progress={goalProgress} year={year} mode={mode} />
          ) : (
            <p className="text-sm text-gray-500">
              Defina uma{" "}
              <Link
                href={`/financas/metas?ano=${year}`}
                className="text-brand-700 hover:underline"
              >
                meta de faturamento para {year}
              </Link>{" "}
              para acompanhar se a projeção a alcança.
            </p>
          )}

          {/* Comparação com o fechamento do ano anterior (D63) */}
          {comparison.hasPreviousData && (
            <section className="card">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-semibold">vs. {comparison.previousYear}</h2>
                <DeltaBadge delta={comparison.result} goodWhenUp />
              </div>
              <p className="text-sm text-gray-600">
                {comparison.result.delta === 0 ? (
                  <>
                    A projeção de {year} ({formatMoney(view.projectedResult)}) está
                    em linha com o fechamento de {comparison.previousYear} (
                    {formatMoney(comparison.result.previous)}).
                  </>
                ) : (
                  <>
                    Se nada mudar, {year} deve fechar{" "}
                    <span
                      className={
                        "font-medium " +
                        (comparison.result.delta > 0
                          ? "text-emerald-600"
                          : "text-red-600")
                      }
                    >
                      {formatMoney(Math.abs(comparison.result.delta))}{" "}
                      {comparison.result.delta > 0 ? "acima" : "abaixo"}
                    </span>{" "}
                    do fechamento de {comparison.previousYear} (
                    {formatMoney(comparison.result.previous)}).
                  </>
                )}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <CompareRow
                  label="Receitas"
                  delta={comparison.income}
                  goodWhenUp
                />
                <CompareRow
                  label="Despesas"
                  delta={comparison.expense}
                  goodWhenUp={false}
                />
              </div>
            </section>
          )}

          {/* Cenário com custos fixos (D62): mais conservador que a projeção crua.
              Oculto no modo "pior caso", onde o custo fixo já está no número
              principal (D73). */}
          {scenario && scenario.estimatedRemainingFixedCost > 0 && (
            <section className="card border-l-4 border-amber-400">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Cenário com custos fixos
              </p>
              <p
                className={
                  "mt-1 text-2xl font-bold " +
                  (scenario.projectedResultWithFixed < 0
                    ? "text-red-600"
                    : "text-emerald-600")
                }
              >
                {formatMoney(scenario.projectedResultWithFixed)}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                A projeção crua não inventa despesas futuras. Somando o custo fixo
                típico de {formatMoney(scenario.monthlyFixedCost)}/mês a{" "}
                {scenario.monthsEstimated}{" "}
                {scenario.monthsEstimated === 1
                  ? "mês ainda sem despesa lançada"
                  : "meses ainda sem despesa lançada"}{" "}
                (+{formatMoney(scenario.estimatedRemainingFixedCost)} em despesas),
                o ano deve fechar mais perto disto. Ajuste o custo fixo em{" "}
                <Link
                  href="/financas/custos-fixos"
                  className="text-brand-700 hover:underline"
                >
                  Custos fixos
                </Link>
                .
              </p>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Receitas projetadas: realizado + pendente + agendado */}
            <section className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Receitas projetadas</h2>
                <span className="font-semibold text-emerald-600">
                  {formatMoney(view.projectedIncome)}
                </span>
              </div>
              <ul className="space-y-3">
                <CompositionRow
                  label="Já recebido"
                  hint="entrou no caixa"
                  value={view.realizedIncome}
                  total={view.projectedIncome}
                  tone="emerald"
                />
                <CompositionRow
                  label="A receber (lançado)"
                  hint="pendências já registradas"
                  value={view.pendingIncome}
                  total={view.projectedIncome}
                  tone="amber"
                />
                <CompositionRow
                  label="Cachês agendados"
                  hint={
                    view.scheduledShowCount > 0
                      ? `${view.scheduledShowCount} show${
                          view.scheduledShowCount > 1 ? "s" : ""
                        } futuro${view.scheduledShowCount > 1 ? "s" : ""}, ainda não lançado${
                          view.scheduledShowCount > 1 ? "s" : ""
                        }`
                      : "nenhum show futuro pendente"
                  }
                  value={view.scheduledIncome}
                  total={view.projectedIncome}
                  tone="sky"
                />
              </ul>
              {view.droppedTentative > 0 ? (
                <p className="mt-3 text-xs text-gray-500">
                  {mode === "pessimistic" ? "Pior caso" : "Cenário conservador"}:{" "}
                  {formatMoney(view.droppedTentative)} em cachês de shows ainda a
                  confirmar ficaram de fora da projeção.
                </p>
              ) : (
                view.scheduledIncome > 0 &&
                view.scheduledTentative > 0 && (
                  <p className="mt-3 text-xs text-gray-500">
                    Dos cachês agendados, {formatMoney(view.scheduledConfirmed)} são
                    de shows confirmados e {formatMoney(view.scheduledTentative)}{" "}
                    ainda a confirmar.
                  </p>
                )
              )}
            </section>

            {/* Despesas projetadas: realizado + pendente (sem projeção futura) */}
            <section className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Despesas projetadas</h2>
                <span className="font-semibold text-red-600">
                  {formatMoney(view.projectedExpense)}
                </span>
              </div>
              <ul className="space-y-3">
                <CompositionRow
                  label="Já pago"
                  hint="saiu do caixa"
                  value={view.realizedExpense}
                  total={view.projectedExpense}
                  tone="red"
                />
                <CompositionRow
                  label="A pagar (lançado)"
                  hint="pendências já registradas"
                  value={view.pendingExpense}
                  total={view.projectedExpense}
                  tone="amber"
                />
                {view.estimatedRemainingFixedCost > 0 && (
                  <CompositionRow
                    label="Custo fixo estimado"
                    hint="recorrente, meses futuros sem lançamento"
                    value={view.estimatedRemainingFixedCost}
                    total={view.projectedExpense}
                    tone="amber"
                  />
                )}
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                {view.estimatedRemainingFixedCost > 0 ? (
                  <>
                    O pior caso soma o custo fixo recorrente que ainda deve se
                    repetir até dezembro às despesas lançadas. Ajuste-o em{" "}
                  </>
                ) : (
                  <>
                    A projeção não inventa despesas futuras: custos recorrentes
                    ainda não lançados não entram. Para estimá-los, veja{" "}
                  </>
                )}
                <Link
                  href="/financas/custos-fixos"
                  className="text-brand-700 hover:underline"
                >
                  Custos fixos
                </Link>
                .
              </p>
            </section>
          </div>

          <p className="text-xs text-gray-400">
            Receitas projetadas = já recebido + a receber lançado + cachês de
            shows futuros do ano ainda não lançados (cada cachê é abatido do que já
            foi registrado para o show, sem dupla contagem). Despesas projetadas =
            já pago + a pagar lançado
            {view.estimatedRemainingFixedCost > 0
              ? " + custo fixo recorrente futuro estimado (pior caso)"
              : ""}
            .
          </p>
        </>
      )}
    </div>
  );
}

/** Botão-pílula de um cenário no seletor (estado ativo via aria-pressed). */
function ScenarioPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={
        "rounded-full px-3 py-1 text-sm font-medium " +
        (active
          ? "bg-brand-600 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200")
      }
    >
      {label}
    </Link>
  );
}

/**
 * Card "vs. meta": cruza a receita projetada do cenário atual com a meta de
 * faturamento do ano. O número que importa é se a projeção alcança a meta e por
 * quanto (sobra/falta), com barra do realizado sob a do projetado (espelha o card
 * de /financas/metas, mas aqui o projetado segue o cenário selecionado).
 */
function GoalCard({
  progress,
  year,
  mode,
}: {
  progress: RevenueGoalProgress;
  year: number;
  mode: YearEndScenarioChoice;
}) {
  const hits = progress.onTrackToHit;
  const gap = Math.abs(progress.projected - progress.goal);
  const realizedWidth = Math.min(100, Math.round(progress.realizedRatio * 100));
  const projectedWidth = Math.min(100, Math.round(progress.projectedRatio * 100));
  const scenarioWord =
    mode === "conservative"
      ? " (conservador)"
      : mode === "pessimistic"
        ? " (pior caso)"
        : "";

  return (
    <section
      className={"card border-l-4 " + (hits ? "border-emerald-400" : "border-amber-400")}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">vs. meta de {year}</h2>
        <span
          className={
            "rounded-full px-2 py-0.5 text-xs font-medium " +
            (hits ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")
          }
        >
          {Math.round(progress.projectedRatio * 100)}% da meta
        </span>
      </div>

      <p className="text-sm text-gray-600">
        {progress.goal === 0 ? (
          <>A meta de {year} está em {formatMoney(0)}.</>
        ) : hits ? (
          <>
            A projeção{scenarioWord} de{" "}
            <span className="font-medium text-emerald-600">
              {formatMoney(progress.projected)}
            </span>{" "}
            {gap === 0 ? "atinge exatamente" : "supera"} a meta de{" "}
            {formatMoney(progress.goal)}
            {gap > 0 && (
              <>
                {" "}
                — sobra de{" "}
                <span className="font-medium text-emerald-600">{formatMoney(gap)}</span>
              </>
            )}
            .
          </>
        ) : (
          <>
            A projeção{scenarioWord} de{" "}
            <span className="font-medium">{formatMoney(progress.projected)}</span> fica{" "}
            <span className="font-medium text-amber-600">{formatMoney(gap)}</span> abaixo
            da meta de {formatMoney(progress.goal)}.
          </>
        )}
      </p>

      {/* Barra de progresso: faixa do projetado (clara) sob a do realizado. */}
      <div className="mt-4 space-y-1.5">
        <div className="relative h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-brand-200"
            style={{ width: `${projectedWidth}%` }}
            aria-hidden
          />
          <div
            className={
              "absolute inset-y-0 left-0 rounded-full " +
              (hits ? "bg-emerald-500" : "bg-brand-500")
            }
            style={{ width: `${realizedWidth}%` }}
            aria-hidden
          />
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 text-xs text-gray-500">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand-500 align-middle" />
            Já recebido: {formatMoney(progress.realized)} (
            {Math.round(progress.realizedRatio * 100)}%)
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand-200 align-middle" />
            Projetado: {formatMoney(progress.projected)}
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Meta de faturamento (receita), não de resultado. Ajuste-a em{" "}
        <Link href={`/financas/metas?ano=${year}`} className="text-brand-700 hover:underline">
          Metas
        </Link>
        .
      </p>
    </section>
  );
}

/** Formata a variação relativa de um MetricDelta como "+25%", "−10%" ou "novo". */
function formatPct(delta: MetricDelta): string {
  if (delta.pct === null) return "novo";
  if (delta.delta === 0) return "0%";
  const sign = delta.delta > 0 ? "+" : "−";
  return `${sign}${Math.round(Math.abs(delta.pct) * 100)}%`;
}

/** Pílula com a variação % do delta, colorida conforme bom/ruim para a métrica. */
function DeltaBadge({
  delta,
  goodWhenUp,
}: {
  delta: MetricDelta;
  goodWhenUp: boolean;
}) {
  const good = delta.delta === 0 ? null : delta.delta > 0 === goodWhenUp;
  const tone =
    good === null
      ? "bg-gray-100 text-gray-600"
      : good
        ? "bg-emerald-100 text-emerald-700"
        : "bg-red-100 text-red-700";
  return (
    <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + tone}>
      {formatPct(delta)}
    </span>
  );
}

/** Linha de uma métrica na comparação: rótulo, valor atual e variação vs. anterior. */
function CompareRow({
  label,
  delta,
  goodWhenUp,
}: {
  label: string;
  delta: MetricDelta;
  goodWhenUp: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-600">{label}</span>
        <DeltaBadge delta={delta} goodWhenUp={goodWhenUp} />
      </div>
      <p className="mt-1 font-semibold">{formatMoney(delta.current)}</p>
      <p className="text-xs text-gray-400">
        ano anterior: {formatMoney(delta.previous)}
      </p>
    </div>
  );
}

function CompositionRow({
  label,
  hint,
  value,
  total,
  tone,
}: {
  label: string;
  hint: string;
  value: number;
  total: number;
  tone: "emerald" | "amber" | "sky" | "red";
}) {
  const barTone =
    tone === "emerald"
      ? "bg-emerald-400"
      : tone === "amber"
        ? "bg-amber-400"
        : tone === "sky"
          ? "bg-sky-400"
          : "bg-red-400";
  const share = total > 0 ? value / total : 0;
  return (
    <li>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
        <span>
          {label}{" "}
          <span className="text-xs text-gray-400">· {hint}</span>
        </span>
        <span className="whitespace-nowrap text-gray-700">
          {formatMoney(value)}
          <span className="ml-1 text-xs text-gray-400">
            ({Math.round(share * 100)}%)
          </span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-gray-100">
        <div
          className={"h-full rounded " + barTone}
          style={{ width: `${value > 0 ? Math.max(2, Math.round(share * 100)) : 0}%` }}
        />
      </div>
    </li>
  );
}
