import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankContactsByProfit,
  clientConcentration,
  compareClientConcentration,
  compareContactMargins,
  MIN_MEDIAN_FEE_SAMPLE,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
  type ShowLike,
  type ContactProfitContact,
  type ClientConcentration,
  type ClientConcentrationComparison,
  type ContactMarginComparison,
} from "@/lib/finance";
import { pickPayerContact } from "@/lib/billing";
import { formatMoney } from "@/lib/money";
import { PeriodPicker } from "@/components/PeriodPicker";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function roleLabel(role: string): string {
  return CONTACT_ROLE_LABELS[role as ContactRole] ?? CONTACT_ROLE_LABELS.OTHER;
}

const CANCELLED = "CANCELLED";

export default async function ContactProfitabilityPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  // Shows com os contatos vinculados (para resolver o pagador) e as transações
  // vinculadas (para o P&L). A regra de atribuição (um pagador por show) e a
  // agregação ficam na lógica pura testada (pickPayerContact + rankContactsByProfit).
  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        fee: true,
        status: true,
        date: true,
        contacts: {
          select: { contact: { select: { id: true, name: true, role: true } } },
        },
      },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, showId: { not: null } },
      select: { type: true, amount: true, showId: true },
    }),
  ]);

  type ShowRow = (typeof shows)[number];

  // Anos disponíveis no seletor de período: apenas dos shows que entram na
  // agregação (não cancelados), para não oferecer um ano que ficaria vazio.
  const availableYears = showProfitYears(
    shows.filter((s) => s.status !== CANCELLED).map((s) => s.date),
  );
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodShows = filterShowsByYear(shows, yearFilter);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: "",
    date: new Date(),
    received: true,
    showId: t.showId,
  }));

  const getPayer = (show: ShowRow): ContactProfitContact | null => {
    const picked = pickPayerContact(show.contacts.map((cs) => cs.contact));
    return picked ? { id: picked.id, name: picked.name, role: picked.role } : null;
  };

  const report = rankContactsByProfit(
    periodShows as (ShowLike & ShowRow)[],
    txs,
    getPayer as (s: ShowLike & ShowRow) => ContactProfitContact | null,
  );

  const concentration = clientConcentration(report.rows);

  // Comparativo ano a ano da concentração de clientes (espelha computeDelta/D33 e
  // o comparativo geográfico/D120): só faz sentido com um ano específico
  // selecionado e o ano anterior tendo contratante — caso contrário a leitura
  // "melhorou/piorou" seria enganosa. Reaproveita o mesmo recorte por ano UTC
  // (D108) sobre os shows já carregados (sem nova consulta).
  let clientComparison: ClientConcentrationComparison | null = null;
  let marginComparison: ContactMarginComparison | null = null;
  let previousYear = 0;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousReport = rankContactsByProfit(
      filterShowsByYear(shows, previousYear) as (ShowLike & ShowRow)[],
      txs,
      getPayer as (s: ShowLike & ShowRow) => ContactProfitContact | null,
    );
    const previousConcentration = clientConcentration(previousReport.rows);
    // Exige contratante identificado nos DOIS períodos para comparar de verdade.
    if (concentration.clientCount > 0 && previousConcentration.clientCount > 0) {
      clientComparison = compareClientConcentration(
        concentration,
        previousConcentration,
      );
    }
    // Quais casas apertaram a margem (D372): cruza os contratantes presentes nos
    // dois anos. Só exibe se houver ao menos um em comum — senão a leitura é vazia.
    const margins = compareContactMargins(report, previousReport);
    if (margins.comparedCount > 0) marginComparison = margins;
  }

  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rentabilidade por contratante</h1>
          <p className="text-sm text-gray-500">
            Quais clientes realmente dão dinheiro — resultado (cachê + extras − despesas) somado por
            quem paga o cachê. Cada show conta para um único contratante. Shows cancelados são ignorados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.count > 0 && (
            <a
              href={`/contatos/rentabilidade/export${yearFilter === "all" ? "" : `?ano=${yearFilter}`}`}
              className="btn-secondary text-sm"
              download
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/contatos/rentabilidade/por-papel" className="btn-secondary">
            Por papel
          </Link>
          <Link href="/contatos/ranking" className="btn-secondary">
            Ranking
          </Link>
          <Link href="/contatos" className="btn-secondary">
            ← Contatos
          </Link>
        </div>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker years={availableYears} active={yearFilter} basePath="/contatos/rentabilidade" />
      )}

      {report.count === 0 ? (
        <div className="card text-center text-gray-500">
          {yearFilter === "all" ? (
            <>
              <p>Nenhum show para analisar.</p>
              <p className="mt-1 text-sm">
                Vincule contatos aos seus shows na tela de detalhe do show para ver a rentabilidade por contratante.
              </p>
              <Link href="/shows" className="mt-3 inline-block text-brand-700 hover:underline">
                Ver shows
              </Link>
            </>
          ) : (
            <>
              <p>Nenhum show em {periodLabel}.</p>
              <p className="mt-1 text-sm">
                Escolha outro período acima para ver a rentabilidade por contratante.
              </p>
              <Link
                href="/contatos/rentabilidade"
                className="mt-3 inline-block text-brand-700 hover:underline"
              >
                Ver todos os anos
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Contratantes identificados" value={String(report.contactCount)} />
            <Stat
              label="Resultado líquido total"
              value={formatMoney(report.totalNet)}
              tone={report.totalNet >= 0 ? "brand" : "red"}
            />
            <Stat
              label="Mais rentável"
              value={report.best ? report.best.contact!.name : "—"}
              tone="emerald"
            />
          </div>

          {report.best &&
            report.worst &&
            report.best.contact!.id !== report.worst.contact!.id && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Highlight
                  label="Mais rentável"
                  contactId={report.best.contact!.id}
                  title={report.best.contact!.name}
                  subtitle={`${report.best.showCount} ${report.best.showCount === 1 ? "show" : "shows"} · ${roleLabel(report.best.contact!.role)}`}
                  value={formatMoney(report.best.totalNet)}
                  tone="emerald"
                />
                <Highlight
                  label="Menos rentável"
                  contactId={report.worst.contact!.id}
                  title={report.worst.contact!.name}
                  subtitle={`${report.worst.showCount} ${report.worst.showCount === 1 ? "show" : "shows"} · ${roleLabel(report.worst.contact!.role)}`}
                  value={formatMoney(report.worst.totalNet)}
                  tone={report.worst.totalNet >= 0 ? "brand" : "red"}
                />
              </div>
            )}

          {concentration.clientCount > 0 && (
            <ConcentrationCard concentration={concentration} />
          )}

          {clientComparison && (
            <ClientComparisonCard
              comparison={clientComparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          {marginComparison && (
            <MarginComparisonCard
              comparison={marginComparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Contratante</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 text-right font-medium">No vermelho</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê</th>
                  <th className="px-4 py-3 text-right font-medium">Extras</th>
                  <th className="px-4 py-3 text-right font-medium">Despesas</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê médio</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê mediano</th>
                  <th className="px-4 py-3 text-right font-medium">Resultado</th>
                  <th className="px-4 py-3 text-right font-medium">Média/show</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.rows.map((row) => (
                  <tr key={row.contact?.id ?? "__sem_contratante__"} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {row.contact ? (
                        <>
                          <Link
                            href={`/contatos/${row.contact.id}`}
                            className="font-medium text-brand-700 hover:underline"
                          >
                            {row.contact.name}
                          </Link>
                          <div className="mt-0.5">
                            <span className="badge bg-brand-50 text-brand-700">
                              {roleLabel(row.contact.role)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="font-medium italic text-gray-400">Sem contratante</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.showCount}</td>
                    <td className="px-4 py-3 text-right">
                      {row.lossCount > 0 ? (
                        <span
                          className="font-medium text-red-600"
                          title={`${row.lossCount} de ${row.showCount} ${row.showCount === 1 ? "show" : "shows"} deram prejuízo (resultado negativo)`}
                        >
                          {row.lossCount}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatMoney(row.totalFee)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {row.totalExtra > 0 ? formatMoney(row.totalExtra) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {row.totalExpenses > 0 ? "−" + formatMoney(row.totalExpenses) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {row.showCount > 0 ? formatMoney(row.avgFee) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {row.showCount >= MIN_MEDIAN_FEE_SAMPLE ? (
                        formatMoney(row.medianFee)
                      ) : (
                        <span
                          className="text-gray-400"
                          title={`Precisa de ao menos ${MIN_MEDIAN_FEE_SAMPLE} shows para a mediana ser confiável`}
                        >
                          —
                        </span>
                      )}
                    </td>
                    <td
                      className={
                        "px-4 py-3 text-right font-semibold " +
                        (row.totalNet >= 0 ? "text-emerald-600" : "text-red-600")
                      }
                    >
                      {formatMoney(row.totalNet)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {formatMoney(row.avgNet)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400">
            Quem paga é escolhido por papel (contratante/produtor antes da casa), um por show, para
            o resultado não ser contado em dobro. Shows sem contato vinculado aparecem como “Sem
            contratante”. Diferente do ranking, que mede o cachê bruto e conta um show para cada contato.
            O <strong>cachê médio</strong> mostra o nível de preço praticado (cachê ÷ shows), antes de
            extras e custos — distinto da <strong>média/show</strong>, que é o líquido por show. O{" "}
            <strong>cachê mediano</strong> é o preço típico (metade dos shows acima, metade abaixo),
            robusto a um show fora da curva; aparece só com {MIN_MEDIAN_FEE_SAMPLE} shows ou mais (com
            poucos, a mediana não é confiável). A coluna <strong>No vermelho</strong> conta quantos
            shows do contratante deram prejuízo (resultado negativo): um cliente lucrativo no total
            pode esconder shows no vermelho.
          </p>
        </>
      )}
    </div>
  );
}

/** Rótulo + tom (cor/emoji) do veredito de concentração de clientes. */
const CONCENTRATION_VERDICT: Record<
  ClientConcentration["level"],
  { label: string; emoji: string; classes: string; note: string }
> = {
  concentrated: {
    label: "Concentrada",
    emoji: "🔴",
    classes: "border-red-200 bg-red-50 text-red-800",
    note: "Boa parte da receita vem de poucos contratantes — se um sair, o baque é grande. Vale diversificar a carteira.",
  },
  moderate: {
    label: "Moderada",
    emoji: "🟡",
    classes: "border-amber-200 bg-amber-50 text-amber-800",
    note: "A receita depende de um punhado de contratantes. Conquistar novos clientes reduz o risco.",
  },
  diversified: {
    label: "Diversificada",
    emoji: "🟢",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    note: "A receita está bem distribuída entre vários contratantes — pouca dependência de um único cliente.",
  },
};

/** Formata uma participação 0..1 como porcentagem inteira (ex.: 0,6 → "60%"). */
function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/**
 * Card "Concentração de clientes": mede o risco de depender de poucos
 * contratantes (sobre a receita bruta, distinto da rentabilidade líquida).
 */
function ConcentrationCard({
  concentration,
}: {
  concentration: ClientConcentration;
}) {
  const verdict = CONCENTRATION_VERDICT[concentration.level];
  const { top, clientCount } = concentration;
  return (
    <div className={"card border " + verdict.classes}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Concentração de clientes
        </p>
        <span className="badge bg-white/70 font-semibold">
          {verdict.emoji} {verdict.label}
        </span>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-2xl font-bold">{pct(concentration.topShare)}</p>
          <p className="text-xs opacity-80">
            da receita vem de{" "}
            {top ? (
              <Link href={`/contatos/${top.contact.id}`} className="underline">
                {top.contact.name}
              </Link>
            ) : (
              "—"
            )}{" "}
            (maior contratante)
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">{pct(concentration.top3Share)}</p>
          <p className="text-xs opacity-80">
            nos 3 maiores de {clientCount}{" "}
            {clientCount === 1 ? "contratante" : "contratantes"}
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">
            {concentration.effectiveClients.toFixed(1)}
          </p>
          <p className="text-xs opacity-80">
            clientes efetivos (como se fossem N de mesmo tamanho)
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs opacity-90">{verdict.note}</p>
    </div>
  );
}

/** Rótulo + tom do veredito de tendência da concentração de clientes entre dois anos. */
const CLIENT_TREND: Record<
  ClientConcentrationComparison["trend"],
  { label: string; emoji: string; classes: string; note: string }
> = {
  improved: {
    label: "Mais distribuída",
    emoji: "🟢",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    note: "A receita ficou menos dependente de um único contratante em relação ao ano anterior — risco de carteira em queda.",
  },
  worsened: {
    label: "Mais concentrada",
    emoji: "🔴",
    classes: "border-red-200 bg-red-50 text-red-800",
    note: "A receita passou a depender mais de poucos contratantes que no ano anterior — vale conquistar clientes novos para reduzir o risco.",
  },
  stable: {
    label: "Estável",
    emoji: "⚪",
    classes: "border-gray-200 bg-gray-50 text-gray-700",
    note: "A dependência de contratantes ficou praticamente igual à do ano anterior.",
  },
};

/** Formata uma variação em pontos percentuais com sinal (ex.: −0,12 → "−12 p.p."). */
function deltaPp(delta: number): string {
  const points = Math.round(delta * 100);
  if (points === 0) return "0 p.p.";
  return `${points > 0 ? "+" : "−"}${Math.abs(points)} p.p.`;
}

/** Formata a variação de clientes efetivos com sinal (ex.: 1,3 → "+1,3"). */
function deltaClients(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return "0";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(1)}`;
}

/**
 * Card "Concentração {ano} vs. {ano-1}": compara a concentração de clientes do
 * ano selecionado com a do ano anterior (espelha computeDelta/D33 e o card
 * geográfico/D120 num eixo de cliente). Mostra a variação do maior contratante e
 * dos clientes efetivos, com um veredito de tendência (mais distribuída × mais
 * concentrada).
 */
function ClientComparisonCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: ClientConcentrationComparison;
  currentYear: number;
  previousYear: number;
}) {
  const trend = CLIENT_TREND[comparison.trend];
  const { current, previous } = comparison;
  return (
    <div className={"card border " + trend.classes}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Concentração {currentYear} vs. {previousYear}
        </p>
        <span className="badge bg-white/70 font-semibold">
          {trend.emoji} {trend.label}
        </span>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-2xl font-bold">{deltaPp(comparison.topShareDelta)}</p>
          <p className="text-xs opacity-80">
            no maior contratante: {pct(previous.topShare)} ({previousYear}) →{" "}
            {pct(current.topShare)} ({currentYear})
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">
            {deltaClients(comparison.effectiveClientsDelta)}
          </p>
          <p className="text-xs opacity-80">
            clientes efetivos: {previous.effectiveClients.toFixed(1)} →{" "}
            {current.effectiveClients.toFixed(1)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs opacity-90">{trend.note}</p>
    </div>
  );
}

/**
 * Card "Margem por contratante {ano} vs. {ano-1}": dos contratantes que voltaram
 * de um ano para o outro, quais apertaram a margem líquida (cachês achatados,
 * despesas maiores) — a decisão acionável "renegocie cachê/despesas com essas
 * casas". Espelha por PESSOA os nudges de piora de margem do Painel (D367/D368),
 * usando `compareContactMargins` (D372). Só quem aparece nos dois anos entra.
 */
function MarginComparisonCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: ContactMarginComparison;
  currentYear: number;
  previousYear: number;
}) {
  const { squeezedCount, comparedCount, changes, bestGain } = comparison;
  const squeezed = changes.filter((c) => c.marginDelta < 0).slice(0, 5);
  const anySqueeze = squeezedCount > 0;
  const classes = anySqueeze
    ? "border-red-200 bg-red-50 text-red-800"
    : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return (
    <div className={"card border " + classes}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Margem por contratante {currentYear} vs. {previousYear}
        </p>
        <div className="flex items-center gap-2">
          <span className="badge bg-white/70 font-semibold">
            {anySqueeze
              ? `🔴 ${squeezedCount} ${squeezedCount === 1 ? "casa apertando" : "casas apertando"} a margem`
              : "🟢 Ninguém apertou a margem"}
          </span>
          <a
            href={`/contatos/rentabilidade/comparativo-margem/export?ano=${currentYear}`}
            className="badge bg-white/70 font-semibold hover:underline"
            download
          >
            ⬇ CSV
          </a>
        </div>
      </div>

      {squeezed.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {squeezed.map((c) => (
            <li
              key={c.contact.id}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
            >
              <Link
                href={`/contatos/${c.contact.id}`}
                className="font-medium underline"
              >
                {c.contact.name}
              </Link>
              <span className="text-sm">
                margem {pct(c.previousMargin)} → {pct(c.currentMargin)}{" "}
                <strong>({deltaPp(c.marginDelta)})</strong>
                <span className="opacity-70">
                  {" · "}
                  resultado {c.netDelta >= 0 ? "+" : "−"}
                  {formatMoney(Math.abs(c.netDelta))}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm opacity-90">
          Nenhum dos {comparedCount}{" "}
          {comparedCount === 1 ? "contratante comparado" : "contratantes comparados"}{" "}
          teve a margem cair de forma relevante em relação ao ano anterior.
        </p>
      )}

      {bestGain && (
        <p className="mt-3 text-xs opacity-90">
          Maior avanço:{" "}
          <Link href={`/contatos/${bestGain.contact.id}`} className="underline">
            {bestGain.contact.name}
          </Link>{" "}
          ganhou {deltaPp(bestGain.marginDelta)} de margem ({pct(bestGain.previousMargin)}{" "}
          → {pct(bestGain.currentMargin)}).
        </p>
      )}

      <p className="mt-3 text-xs opacity-80">
        Compara só quem contratou nos dois anos ({comparedCount}{" "}
        {comparedCount === 1 ? "contratante" : "contratantes"}). Margem = resultado
        líquido ÷ receita bruta; uma queda pode vir de cachê menor ou de mais despesas.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "gray",
}: {
  label: string;
  value: string;
  tone?: "emerald" | "red" | "brand" | "gray";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    brand: "text-brand-700",
    gray: "text-gray-900",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 truncate text-xl font-bold " + tones[tone]}>{value}</p>
    </div>
  );
}

function Highlight({
  label,
  contactId,
  title,
  subtitle,
  value,
  tone,
}: {
  label: string;
  contactId: string;
  title: string;
  subtitle: string;
  value: string;
  tone: "emerald" | "red" | "brand";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    brand: "text-brand-700",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <Link
        href={`/contatos/${contactId}`}
        className="mt-1 block truncate font-medium text-brand-700 hover:underline"
      >
        {title}
      </Link>
      <p className="text-xs text-gray-500">{subtitle}</p>
      <p className={"mt-1 text-lg font-bold " + tones[tone]}>{value}</p>
    </div>
  );
}
