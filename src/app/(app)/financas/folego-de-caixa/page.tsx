import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  cashRunway,
  cashBurnRunway,
  cashFlowByMonth,
  cashFlowTrend,
  parseBurnWindow,
  BURN_WINDOW_PRESETS,
  CRITICAL_RUNWAY_MONTHS,
  HEALTHY_RUNWAY_MONTHS,
  type RunwayVerdict,
  type BurnRunwayVerdict,
  type CashBurnRunway,
  type CashFlowMonth,
  type CashFlowTrend,
  type TxLike,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Formata um número de meses com no máximo uma casa decimal (pt-BR). */
function formatMonths(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

const VERDICT_STYLE: Record<
  Exclude<RunwayVerdict, "no-cost" | "negative">,
  { box: string; emoji: string; label: string }
> = {
  healthy: { box: "bg-green-50 text-green-800", emoji: "✅", label: "Fôlego confortável" },
  tight: { box: "bg-amber-50 text-amber-800", emoji: "🟡", label: "Fôlego apertado" },
  critical: { box: "bg-red-50 text-red-800", emoji: "🔴", label: "Fôlego crítico" },
};

export default async function CashRunwayPage({
  searchParams,
}: {
  searchParams?: { meses?: string | string[] };
}) {
  const user = await requireUser();

  const burnWindow = parseBurnWindow(searchParams?.meses);

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const runway = cashRunway(txs);
  const { currentCash, monthlyFixedCost, runwayMonths, depletionDate, verdict } = runway;

  // Cenário alternativo (completo): fôlego pelo ritmo de gasto real dos últimos meses,
  // incluindo custos variáveis e descontando a receita que de fato entrou (D101). A
  // janela é parametrizável via ?meses= (saneada por parseBurnWindow, D102).
  const burn = cashBurnRunway(txs, { months: burnWindow });
  // Detalhamento mês a mês da mesma janela: revela a tendência que a média esconde (D104).
  const burnMonths = cashFlowByMonth(txs, { months: burnWindow });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fôlego de caixa</h1>
          <p className="text-sm text-gray-500">
            Se as receitas parassem hoje, por quantos meses seu caixa cobre os custos fixos
          </p>
        </div>
        <Link href="/financas" className="text-sm text-gray-500 hover:underline">
          ← Finanças
        </Link>
      </div>

      {verdict === "no-cost" ? (
        <div className="card text-center text-gray-500">
          <p>
            Ainda não há custos fixos detectados. O fôlego de caixa aparece aqui quando uma mesma
            categoria de despesa se repete por pelo menos três meses.
          </p>
          <Link
            href="/financas/custos-fixos"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Ver custos fixos
          </Link>
        </div>
      ) : verdict === "negative" ? (
        <section className="card">
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            🔴 Seu caixa atual está em <strong>{formatMoney(currentCash)}</strong> — no zero ou
            negativo. Não há fôlego a medir: o foco é recompor o caixa antes de pensar em meses de
            reserva.
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Stat label="Caixa atual" value={formatMoney(currentCash)} hint="Recebido − pago (só o que entrou/saiu)" />
            <Stat
              label="Custo fixo mensal"
              value={formatMoney(monthlyFixedCost)}
              hint="Soma das contas recorrentes ativas"
            />
          </div>
        </section>
      ) : (
        <>
          {/* Destaque: meses de fôlego */}
          <section className="card">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Meses de fôlego
            </p>
            <p className="mt-1 text-4xl font-bold text-gray-900">
              {formatMonths(runwayMonths!)}
              <span className="ml-2 text-base font-normal text-gray-500">
                {runwayMonths === 1 ? "mês" : "meses"}
              </span>
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Com {formatMoney(currentCash)} em caixa e um custo fixo de{" "}
              {formatMoney(monthlyFixedCost)}/mês, é por quanto tempo você se sustentaria sem
              nenhuma receita nova entrando.
            </p>

            <div className={"mt-4 rounded-lg px-4 py-3 text-sm " + VERDICT_STYLE[verdict].box}>
              {VERDICT_STYLE[verdict].emoji} <strong>{VERDICT_STYLE[verdict].label}.</strong>{" "}
              {verdict === "healthy" ? (
                <>
                  Você tem {HEALTHY_RUNWAY_MONTHS} meses ou mais de reserva — uma folga saudável para
                  atravessar uma temporada mais fraca.
                </>
              ) : verdict === "tight" ? (
                <>
                  Entre {CRITICAL_RUNWAY_MONTHS} e {HEALTHY_RUNWAY_MONTHS} meses de reserva. Dá para
                  respirar, mas vale reforçar o caixa antes da próxima baixa de agenda.
                </>
              ) : (
                <>
                  Menos de {CRITICAL_RUNWAY_MONTHS} meses de reserva. Um mês fraco já aperta — priorize
                  cobrar o que está a receber e segurar gastos não essenciais.
                </>
              )}
            </div>

            {depletionDate && (
              <p className="mt-3 text-sm text-gray-500">
                No ritmo de custos atual, o caixa zeraria por volta de{" "}
                <strong>{formatDate(depletionDate)}</strong> se nada novo entrar.
              </p>
            )}
          </section>

          {/* Os números por trás */}
          <section className="grid gap-4 sm:grid-cols-2">
            <Stat
              label="Caixa atual"
              value={formatMoney(currentCash)}
              hint="Recebido − pago (só o que entrou/saiu; pendências não contam)"
            />
            <Stat
              label="Custo fixo mensal"
              value={formatMoney(monthlyFixedCost)}
              hint="Soma das contas recorrentes ainda ativas"
            />
          </section>

          <p className="text-xs text-gray-400">
            Indicador de resiliência (fundo de emergência), não fechamento contábil: o caixa é só o
            realizado e o custo fixo é estimado das despesas recorrentes. Os limiares de{" "}
            {CRITICAL_RUNWAY_MONTHS} e {HEALTHY_RUNWAY_MONTHS} meses são referência de planejamento
            (ajuste conforme sua realidade). Veja{" "}
            <Link href="/financas/custos-fixos" className="hover:underline">
              Custos fixos
            </Link>{" "}
            e{" "}
            <Link href="/shows/a-receber" className="hover:underline">
              Cachês a receber
            </Link>{" "}
            para agir sobre os dois lados.
          </p>
        </>
      )}

      {/*
        Cenário alternativo (sempre visível): fôlego pelo ritmo de gasto real, que
        independe de haver custo fixo recorrente detectado — é útil justamente quando o
        número de cima não tem o que medir (sem custo fixo) ou para a foto completa.
      */}
      <BurnRunwayCard burn={burn} window={burnWindow} months={burnMonths} />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}

const BURN_VERDICT_STYLE: Record<
  Exclude<BurnRunwayVerdict, "negative">,
  { box: string; emoji: string; label: string }
> = {
  surplus: { box: "bg-green-50 text-green-800", emoji: "📈", label: "Caixa crescendo" },
  healthy: { box: "bg-green-50 text-green-800", emoji: "✅", label: "Fôlego confortável" },
  tight: { box: "bg-amber-50 text-amber-800", emoji: "🟡", label: "Fôlego apertado" },
  critical: { box: "bg-red-50 text-red-800", emoji: "🔴", label: "Fôlego crítico" },
};

/**
 * Cenário alternativo: fôlego pelo ritmo de gasto real (burn rate), incluindo custos
 * variáveis e descontando a receita já recebida na janela. Complementa o número de
 * cima (que só cobre o custo fixo) com a foto completa do caixa.
 */
function BurnRunwayCard({
  burn,
  window,
  months,
}: {
  burn: CashBurnRunway;
  window: number;
  months: CashFlowMonth[];
}) {
  const {
    windowMonths,
    avgMonthlyNet,
    monthlyBurn,
    currentCash,
    runwayMonths,
    depletionDate,
    verdict,
  } = burn;

  // O CSV (e a tira) só fazem sentido com algum movimento de caixa na janela.
  const hasMovement = months.some((m) => m.received !== 0 || m.paid !== 0);

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Cenário alternativo · ritmo de gasto real
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {hasMovement && (
            <a
              href={`/financas/folego-de-caixa/export?meses=${window}`}
              className="btn-secondary"
            >
              ⬇ CSV
            </a>
          )}
          <div className="flex flex-wrap items-center gap-1" aria-label="Janela de meses">
          {BURN_WINDOW_PRESETS.map((m) => {
            const active = m === window;
            return (
              <Link
                key={m}
                href={`/financas/folego-de-caixa?meses=${m}`}
                aria-current={active ? "true" : undefined}
                className={
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors " +
                  (active
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200")
                }
              >
                {m}m
              </Link>
            );
          })}
          </div>
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Olhando os últimos {windowMonths} meses fechados — gastos variáveis incluídos e a receita
        que de fato entrou descontada — qual foi a queima média de caixa?
      </p>

      <MonthlyFlowStrip months={months} />

      <CashFlowTrendBadge trend={cashFlowTrend(months)} />

      {verdict === "surplus" ? (
        <div className={"mt-4 rounded-lg px-4 py-3 text-sm " + BURN_VERDICT_STYLE.surplus.box}>
          {BURN_VERDICT_STYLE.surplus.emoji}{" "}
          <strong>{BURN_VERDICT_STYLE.surplus.label}.</strong> No período, entrou em média{" "}
          <strong>{formatMoney(avgMonthlyNet)}/mês</strong> a mais do que saiu. No ritmo atual você
          não está queimando caixa — o fôlego, por este cenário, é ilimitado.
        </div>
      ) : verdict === "negative" ? (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          🔴 O caixa atual ({formatMoney(currentCash)}) está no zero ou negativo. Mesmo com uma
          queima de {formatMoney(monthlyBurn)}/mês, não há reserva a medir até recompor o caixa.
        </div>
      ) : (
        <>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {formatMonths(runwayMonths!)}
            <span className="ml-2 text-base font-normal text-gray-500">
              {runwayMonths === 1 ? "mês" : "meses"}
            </span>
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Queimando <strong>{formatMoney(monthlyBurn)}/mês</strong> em média, os{" "}
            {formatMoney(currentCash)} em caixa duram esse tempo se nada mudar.
          </p>
          <div className={"mt-4 rounded-lg px-4 py-3 text-sm " + BURN_VERDICT_STYLE[verdict].box}>
            {BURN_VERDICT_STYLE[verdict].emoji} <strong>{BURN_VERDICT_STYLE[verdict].label}.</strong>{" "}
            {verdict === "healthy" ? (
              <>São {HEALTHY_RUNWAY_MONTHS} meses ou mais de reserva no seu ritmo de gasto real.</>
            ) : verdict === "tight" ? (
              <>
                Entre {CRITICAL_RUNWAY_MONTHS} e {HEALTHY_RUNWAY_MONTHS} meses no ritmo atual — atenção
                aos gastos variáveis, não só aos fixos.
              </>
            ) : (
              <>
                Menos de {CRITICAL_RUNWAY_MONTHS} meses no ritmo atual. O gasto total (não só o fixo)
                está consumindo o caixa rápido.
              </>
            )}
          </div>
          {depletionDate && (
            <p className="mt-3 text-sm text-gray-500">
              Mantido esse ritmo, o caixa zeraria por volta de{" "}
              <strong>{formatDate(depletionDate)}</strong>.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** Rótulo curto "mmm" (pt-BR) de uma chave "YYYY-MM". */
function monthShortLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "");
}

/**
 * Tira mês a mês do fluxo de caixa realizado na janela (D104) — a textura por trás da
 * média de queima. Cada coluna é o líquido do mês: barra para cima (verde, o caixa
 * cresceu) ou para baixo (vermelho, queimou), com altura proporcional ao maior |líquido|
 * da janela. Some quando não há nenhum movimento no período, para não virar uma régua
 * vazia.
 */
function MonthlyFlowStrip({ months }: { months: CashFlowMonth[] }) {
  const hasMovement = months.some((m) => m.received !== 0 || m.paid !== 0);
  if (!hasMovement) return null;

  const maxAbs = Math.max(1, ...months.map((m) => Math.abs(m.net)));

  return (
    <figure className="mt-4">
      <div
        className="flex items-stretch gap-1 overflow-x-auto"
        role="img"
        aria-label="Fluxo de caixa líquido mês a mês na janela analisada"
      >
        {months.map((m) => {
          const pct = Math.round((Math.abs(m.net) / maxAbs) * 100);
          const positive = m.net >= 0;
          return (
            <div
              key={m.monthKey}
              className="flex min-w-[1.75rem] flex-1 flex-col items-center gap-1"
              title={`${monthShortLabel(m.monthKey)}: ${formatMoney(m.net)}`}
            >
              <div className="flex h-8 w-full items-end justify-center">
                {positive && (
                  <div className="w-2.5 rounded-t bg-green-400" style={{ height: `${pct}%` }} />
                )}
              </div>
              <div className="h-px w-full bg-gray-200" />
              <div className="flex h-8 w-full items-start justify-center">
                {!positive && (
                  <div className="w-2.5 rounded-b bg-red-400" style={{ height: `${pct}%` }} />
                )}
              </div>
              <span className="text-[10px] leading-none text-gray-400">
                {monthShortLabel(m.monthKey)}
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-1 text-xs text-gray-400">
        Líquido por mês (recebido − pago): acima da linha o caixa cresceu, abaixo queimou.
      </figcaption>
    </figure>
  );
}

const TREND_STYLE: Record<
  Exclude<CashFlowTrend["direction"], "insufficient">,
  { box: string; emoji: string; label: string; hint: string }
> = {
  accelerating: {
    box: "bg-red-50 text-red-800",
    emoji: "📉",
    label: "Queima acelerando",
    hint: "os meses recentes da janela queimaram mais caixa que os do começo — a média suaviza essa piora.",
  },
  easing: {
    box: "bg-green-50 text-green-800",
    emoji: "📈",
    label: "Queima aliviando",
    hint: "os meses recentes da janela vêm melhores que os do começo — o caixa está se recompondo.",
  },
  stable: {
    box: "bg-gray-50 text-gray-700",
    emoji: "➡️",
    label: "Ritmo estável",
    hint: "começo e fim da janela têm fluxo parecido — a média representa bem o período.",
  },
};

/**
 * Veredito de tendência da queima na janela (acelerando × aliviando × estável), derivado
 * de `cashFlowTrend` sobre o mesmo `cashFlowByMonth` da tira. Some quando a janela é curta
 * demais para partir em duas metades comparáveis (`insufficient`), para não afirmar uma
 * direção sem amostra. Complementa a média (um número só) com a direção que ela esconde.
 */
function CashFlowTrendBadge({ trend }: { trend: CashFlowTrend }) {
  if (trend.direction === "insufficient") return null;
  const style = TREND_STYLE[trend.direction];
  return (
    <div className={"mt-3 rounded-lg px-4 py-3 text-sm " + style.box}>
      {style.emoji} <strong>{style.label}.</strong> Comparando a primeira metade da janela (média{" "}
      <strong>{formatMoney(trend.olderAvgNet)}/mês</strong>) com a mais recente (
      <strong>{formatMoney(trend.recentAvgNet)}/mês</strong>), {style.hint}
    </div>
  );
}
