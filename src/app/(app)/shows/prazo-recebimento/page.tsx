import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  paymentLag,
  paymentLagYears,
  comparePaymentLag,
  parseProfitYear,
  filterShowsByYear,
  MIN_MEDIAN_LAG_SAMPLE,
  type PaymentLagComparison,
  type PaymentSpeedBucketKey,
  type ReceivableShowLike,
  type TxLike,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** Texto pt-BR para um prazo em dias (negativo = adiantado). */
function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} d adiantado`;
  if (days === 0) return "no dia";
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}

const BUCKET_TONES: Record<PaymentSpeedBucketKey, string> = {
  onTime: "bg-emerald-400",
  d7: "bg-emerald-400",
  d30: "bg-amber-400",
  d60: "bg-orange-400",
  slow: "bg-red-400",
};

export default async function PaymentLagPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  // Shows não cancelados (a data deles é a âncora do prazo) e as receitas já
  // recebidas vinculadas a shows. A regra de quem entra e o cálculo do prazo
  // ficam na lógica pura (paymentLag).
  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id, status: { not: "CANCELLED" } },
      orderBy: { date: "asc" },
      select: { id: true, fee: true, status: true, date: true, title: true, venue: true, city: true },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, type: "INCOME", received: true, showId: { not: null } },
      select: { type: true, amount: true, category: true, date: true, received: true, showId: true },
    }),
  ]);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  type Gig = ReceivableShowLike & {
    title: string;
    venue: string | null;
    city: string | null;
  };

  // Recorte por período (ano): só oferece os anos com prazo mensurável
  // (`paymentLagYears` — shows não cancelados que já receberam algo), para o
  // seletor nunca cair numa lista vazia. Filtra os shows (prisma, `date: Date`)
  // pelo ano da `date` (`filterShowsByYear`, D108) antes de agregar — o DSO
  // médio/mediano, os baldes e a tabela saem recortados sem tocar a lógica pura
  // de `paymentLag` (o eixo é quando o show aconteceu, não quando o dinheiro
  // entrou).
  const availableYears = paymentLagYears(shows, txs);
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;

  const lag = paymentLag(filterShowsByYear(shows, yearFilter) as Gig[], txs);

  // Comparativo ano a ano do DSO: com um ano específico selecionado, computa o
  // prazo de recebimento do ano anterior sobre os MESMOS registros já carregados
  // (recorte por `date` UTC, D108 — sem nova consulta) e mede a variação da
  // mediana/média. Ao contrário do booking lead time (subir a mediana é melhora),
  // aqui **descer** o DSO é a melhora. Só faz sentido com ambos os períodos tendo
  // recebimento (senão a comparação de medianas seria enganosa). Espelha o card
  // ano a ano de `/shows/antecedencia` (D187), item adiado na D192.
  let comparison: PaymentLagComparison<Gig> | null = null;
  let previousYear = 0;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousLag = paymentLag(filterShowsByYear(shows, previousYear) as Gig[], txs);
    if (lag.showCount > 0 && previousLag.showCount > 0) {
      comparison = comparePaymentLag(lag, previousLag);
    }
  }

  type Row = (typeof lag.rows)[number];
  const showInfo = (r: Row) =>
    r.show as ReceivableShowLike & { title: string; venue: string | null; city: string | null };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prazo de recebimento</h1>
          <p className="text-sm text-gray-500">
            Depois que você toca, em quanto tempo o cachê entra no caixa. Mede o dinheiro
            que já caiu — complementa os <Link href="/shows/a-receber" className="text-brand-700 hover:underline">cachês a receber</Link>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lag.rows.length > 0 && (
            <a
              href={`/shows/prazo-recebimento/export${
                yearFilter === "all" ? "" : `?ano=${yearFilter}`
              }`}
              className="btn-secondary text-sm"
              download
            >
              ⬇ CSV
            </a>
          )}
          {comparison && (
            <a
              href={`/shows/prazo-recebimento/comparativo/export?ano=${yearFilter}`}
              className="btn-secondary text-sm"
              download
            >
              ⬇ CSV vs {previousYear}
            </a>
          )}
          <Link href="/shows/prazo-recebimento/por-contratante" className="btn-secondary">
            Por contratante
          </Link>
          <Link href="/shows" className="btn-secondary">
            ← Shows
          </Link>
        </div>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker
          years={availableYears}
          active={yearFilter}
          basePath="/shows/prazo-recebimento"
        />
      )}

      {lag.showCount === 0 ? (
        <div className="card text-center text-gray-500">
          {yearFilter === "all" ? (
            <>
              <p>
                Ainda não há cachês recebidos e vinculados a shows para medir o seu prazo de
                recebimento.
              </p>
              <Link
                href="/shows/a-receber"
                className="mt-3 inline-block text-brand-700 hover:underline"
              >
                Ver cachês a receber
              </Link>
            </>
          ) : (
            <>
              <p>Nenhum cachê recebido de shows de {periodLabel}.</p>
              <p className="mt-1 text-sm">
                Escolha outro período acima para ver o prazo de recebimento.
              </p>
              <Link
                href="/shows/prazo-recebimento"
                className="mt-3 inline-block text-brand-700 hover:underline"
              >
                Ver todos os anos
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Prazo médio (ponderado)
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900">{daysLabel(lag.avgDays)}</p>
              <p className="mt-1 text-xs text-gray-400">
                média de quando cada real entrou após o show
              </p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Prazo mediano (ponderado)
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900">{daysLabel(lag.medianDays)}</p>
              <p className="mt-1 text-xs text-gray-400">
                metade do faturamento já tinha entrado — resiste a um atraso isolado
              </p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Recebido analisado
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-600">
                {formatMoney(lag.totalReceived)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {lag.showCount} {lag.showCount === 1 ? "show" : "shows"} ·{" "}
                {lag.paymentCount} {lag.paymentCount === 1 ? "recebimento" : "recebimentos"}
              </p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Recebimento mais lento
              </p>
              {lag.slowest && (
                <>
                  <p className="mt-1 truncate font-medium text-gray-900">
                    {showInfo(lag.slowest).title}
                  </p>
                  <p className="mt-1 text-lg font-bold text-red-600">
                    {daysLabel(lag.slowest.avgDays)}
                  </p>
                </>
              )}
            </div>
          </div>

          {comparison && (
            <PaymentLagComparisonCard
              comparison={comparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          {/* Distribuição por velocidade */}
          <section className="card">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">
              Quanto do dinheiro entrou em cada prazo
            </h2>
            <div className="space-y-2">
              {lag.buckets.map((b) => (
                <div key={b.key} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 text-gray-600">{b.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                    <div
                      className={"h-full rounded " + BUCKET_TONES[b.key]}
                      style={{ width: `${Math.round(b.share * 100)}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-xs text-gray-500">
                    {pct(b.share)}
                  </span>
                  <span className="w-28 shrink-0 text-right text-gray-500">
                    {formatMoney(b.received)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Por show, do mais lento ao mais rápido */}
          <section className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Show</th>
                  <th className="px-4 py-3 text-right font-medium">Recebido</th>
                  <th className="px-4 py-3 text-right font-medium">Recebimentos</th>
                  <th className="px-4 py-3 text-right font-medium">Prazo médio</th>
                  <th className="px-4 py-3 text-right font-medium">Pior prazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lag.rows.map((r) => {
                  const info = showInfo(r);
                  return (
                    <tr key={info.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/shows/${info.id}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {info.title}
                        </Link>
                        <p className="text-xs text-gray-400">
                          {formatDate(info.date)}
                          {info.venue ? ` · ${info.venue}` : info.city ? ` · ${info.city}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                        {formatMoney(r.received)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{r.paymentCount}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {daysLabel(r.avgDays)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {daysLabel(r.lastDays)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <p className="text-xs text-gray-400">
            Considera só receitas já recebidas e vinculadas a um show. O prazo de cada
            show pondera os recebimentos pelo valor; o prazo médio geral pondera todo o
            dinheiro que entrou. O prazo mediano marca o dia em que metade do faturamento
            já tinha entrado — não se deixa puxar por um único recebimento muito atrasado.
            Prazo negativo = pago adiantado (antes do show).
          </p>
        </>
      )}
    </div>
  );
}

/** Rótulo + tom do veredito do comparativo ano a ano do DSO. Ao contrário do
 * booking lead time, aqui **descer** o prazo é a melhora (verde). */
const PAYMENT_LAG_TREND: Record<
  PaymentLagComparison["trend"],
  { label: string; emoji: string; classes: string; note: string }
> = {
  improved: {
    label: "Recebendo mais rápido",
    emoji: "🟢",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    note: "O prazo mediano de recebimento caiu em relação ao ano anterior — o cachê está entrando mais cedo no caixa, com menos tempo de dinheiro parado.",
  },
  worsened: {
    label: "Recebendo mais devagar",
    emoji: "🔴",
    classes: "border-red-200 bg-red-50 text-red-800",
    note: "O prazo mediano de recebimento subiu em relação ao ano anterior — o dinheiro está demorando mais a cair. Vale reforçar a cobrança e combinar prazos mais curtos ao fechar os shows.",
  },
  stable: {
    label: "Estável",
    emoji: "⚪",
    classes: "border-gray-200 bg-gray-50 text-gray-700",
    note: "O prazo mediano de recebimento ficou praticamente igual ao do ano anterior.",
  },
};

/** Formata uma variação em dias com sinal (ex.: 12 → "+12 dias", -1 → "−1 dia"). */
function daysDelta(delta: number): string {
  if (delta === 0) return "0 dias";
  const abs = Math.abs(delta);
  return `${delta > 0 ? "+" : "−"}${abs} ${abs === 1 ? "dia" : "dias"}`;
}

/**
 * Card "Prazo de recebimento {ano} vs. {ano-1}": compara o DSO mediano do ano
 * selecionado com o do ano anterior (espelha o comparativo ano a ano de
 * `/shows/antecedencia`, D187, mas no eixo de dinheiro). Mostra a variação da
 * mediana e da média, com um veredito de tendência. Ao contrário do booking lead
 * time, aqui **descer** o prazo é a melhora — o cachê entra mais cedo.
 */
function PaymentLagComparisonCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: PaymentLagComparison;
  currentYear: number;
  previousYear: number;
}) {
  const trend = PAYMENT_LAG_TREND[comparison.trend];
  const { current, previous } = comparison;
  const smallSample =
    current.showCount < MIN_MEDIAN_LAG_SAMPLE || previous.showCount < MIN_MEDIAN_LAG_SAMPLE;
  return (
    <div className={"card border " + trend.classes}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Prazo de recebimento {currentYear} vs. {previousYear}
        </p>
        <span className="badge bg-white/70 font-semibold">
          {trend.emoji} {trend.label}
        </span>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-2xl font-bold">{daysDelta(comparison.medianDaysDelta)}</p>
          <p className="text-xs opacity-80">
            mediana: {daysLabel(previous.medianDays)} ({previousYear}) →{" "}
            {daysLabel(current.medianDays)} ({currentYear})
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">{daysDelta(comparison.avgDaysDelta)}</p>
          <p className="text-xs opacity-80">
            média: {daysLabel(previous.avgDays)} → {daysLabel(current.avgDays)}
          </p>
        </div>
      </div>
      {smallSample && (
        <p className="mt-3 text-xs opacity-90">
          Amostra pequena em ao menos um dos anos — a mediana ainda é sensível a casos isolados.
        </p>
      )}
      <p className="mt-3 text-xs opacity-90">{trend.note}</p>
    </div>
  );
}
