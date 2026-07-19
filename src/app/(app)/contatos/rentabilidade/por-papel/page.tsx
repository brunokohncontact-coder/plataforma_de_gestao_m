import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankRolesByProfit,
  roleConcentration,
  compareRoleConcentration,
  compareRoleMargins,
  MIN_MEDIAN_FEE_SAMPLE,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
  type ShowLike,
  type ContactProfitContact,
  type RoleConcentration,
  type RoleConcentrationComparison,
  type RoleMarginComparison,
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

export default async function RoleProfitabilityPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  // Mesma consulta da rentabilidade por contratante (D105): shows com os contatos
  // vinculados (para resolver o pagador) e as transações vinculadas (para o P&L).
  // A atribuição (um pagador por show) e a agregação ficam na lógica pura testada
  // (pickPayerContact + rankRolesByProfit).
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

  const report = rankRolesByProfit(
    periodShows as (ShowLike & ShowRow)[],
    txs,
    getPayer as (s: ShowLike & ShowRow) => ContactProfitContact | null,
  );

  const concentration = roleConcentration(report.rows);

  // Comparativo ano a ano da concentração por papel (espelha o card por
  // contratante/D139 e o geográfico/D120 num eixo de papel): só faz sentido com
  // um ano específico selecionado e o ano anterior tendo papel identificado —
  // caso contrário a leitura "melhorou/piorou" seria enganosa. Reaproveita o
  // mesmo recorte por ano UTC (D108) sobre os shows já carregados (sem nova consulta).
  let roleComparison: RoleConcentrationComparison | null = null;
  let marginComparison: RoleMarginComparison | null = null;
  let previousYear = 0;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousReport = rankRolesByProfit(
      filterShowsByYear(shows, previousYear) as (ShowLike & ShowRow)[],
      txs,
      getPayer as (s: ShowLike & ShowRow) => ContactProfitContact | null,
    );
    const previousConcentration = roleConcentration(previousReport.rows);
    // Exige papel identificado nos DOIS períodos para comparar de verdade.
    if (concentration.roleCount > 0 && previousConcentration.roleCount > 0) {
      roleComparison = compareRoleConcentration(
        concentration,
        previousConcentration,
      );
    }
    // Quais TIPOS de comprador apertaram a margem (D375): cruza os papéis
    // presentes nos dois anos. Só exibe se houver ao menos um em comum — senão a
    // leitura é vazia. Reusa a `previousReport` já computada (sem nova consulta).
    const margins = compareRoleMargins(report, previousReport);
    if (margins.comparedCount > 0) marginComparison = margins;
  }

  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rentabilidade por papel</h1>
          <p className="text-sm text-gray-500">
            Que tipo de comprador (casa de show, produtor, contratante…) dá mais dinheiro — resultado
            (cachê + extras − despesas) somado pelo papel de quem paga. Um rollup acima da
            rentabilidade por contratante. Cada show conta para um único papel; cancelados são ignorados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.count > 0 && (
            <a
              href={`/contatos/rentabilidade/por-papel/export${yearFilter === "all" ? "" : `?ano=${yearFilter}`}`}
              className="btn-secondary text-sm"
              download
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/contatos/rentabilidade" className="btn-secondary">
            Por contratante
          </Link>
          <Link href="/contatos" className="btn-secondary">
            ← Contatos
          </Link>
        </div>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker
          years={availableYears}
          active={yearFilter}
          basePath="/contatos/rentabilidade/por-papel"
        />
      )}

      {report.count === 0 ? (
        <div className="card text-center text-gray-500">
          {yearFilter === "all" ? (
            <>
              <p>Nenhum show para analisar.</p>
              <p className="mt-1 text-sm">
                Vincule contatos aos seus shows na tela de detalhe do show para ver a rentabilidade por papel.
              </p>
              <Link href="/shows" className="mt-3 inline-block text-brand-700 hover:underline">
                Ver shows
              </Link>
            </>
          ) : (
            <>
              <p>Nenhum show em {periodLabel}.</p>
              <p className="mt-1 text-sm">
                Escolha outro período acima para ver a rentabilidade por papel.
              </p>
              <Link
                href="/contatos/rentabilidade/por-papel"
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
            <Stat label="Papéis identificados" value={String(report.roleCount)} />
            <Stat
              label="Resultado líquido total"
              value={formatMoney(report.totalNet)}
              tone={report.totalNet >= 0 ? "brand" : "red"}
            />
            <Stat
              label="Papel mais rentável"
              value={report.best ? roleLabel(report.best.role!) : "—"}
              tone="emerald"
            />
          </div>

          {report.best &&
            report.worst &&
            report.best.role !== report.worst.role && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Highlight
                  label="Mais rentável"
                  title={roleLabel(report.best.role!)}
                  subtitle={`${report.best.showCount} ${report.best.showCount === 1 ? "show" : "shows"}`}
                  value={formatMoney(report.best.totalNet)}
                  tone="emerald"
                />
                <Highlight
                  label="Menos rentável"
                  title={roleLabel(report.worst.role!)}
                  subtitle={`${report.worst.showCount} ${report.worst.showCount === 1 ? "show" : "shows"}`}
                  value={formatMoney(report.worst.totalNet)}
                  tone={report.worst.totalNet >= 0 ? "brand" : "red"}
                />
              </div>
            )}

          {concentration.roleCount > 0 && (
            <ConcentrationCard concentration={concentration} />
          )}

          {roleComparison && (
            <RoleComparisonCard
              comparison={roleComparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          {marginComparison && (
            <RoleMarginComparisonCard
              comparison={marginComparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Papel</th>
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
                  <tr key={row.role ?? "__sem_contratante__"} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {row.role ? (
                        <span className="badge bg-brand-50 font-medium text-brand-700">
                          {roleLabel(row.role)}
                        </span>
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
            Quem paga é escolhido por papel (contratante/produtor antes da casa), um por show, e o
            show é somado no <strong>papel</strong> desse pagador — vários contratantes do mesmo papel
            entram no mesmo grupo. Shows sem contato vinculado aparecem como “Sem contratante”. Ajuda a
            decidir onde investir prospecção: que tipo de comprador rende mais por show. O{" "}
            <strong>cachê médio</strong> é o nível de preço (cachê ÷ shows); o{" "}
            <strong>cachê mediano</strong> é o preço típico (metade dos shows acima, metade abaixo),
            robusto a um show fora da curva — aparece só com {MIN_MEDIAN_FEE_SAMPLE} shows ou mais.
            A coluna <strong>No vermelho</strong> conta quantos shows do papel deram prejuízo
            (resultado negativo): um canal lucrativo no total pode esconder shows no vermelho.
          </p>
        </>
      )}
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
  title,
  subtitle,
  value,
  tone,
}: {
  label: string;
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
      <p className="mt-1 block truncate font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
      <p className={"mt-1 text-lg font-bold " + tones[tone]}>{value}</p>
    </div>
  );
}

/** Rótulo + tom (cor/emoji) do veredito de concentração por papel. */
const CONCENTRATION_VERDICT: Record<
  RoleConcentration["level"],
  { label: string; emoji: string; classes: string; note: string }
> = {
  concentrated: {
    label: "Concentrada",
    emoji: "🔴",
    classes: "border-red-200 bg-red-50 text-red-800",
    note: "Boa parte da receita vem de um único tipo de comprador — se esse canal secar, o baque é grande. Vale prospectar outros tipos de contratante.",
  },
  moderate: {
    label: "Moderada",
    emoji: "🟡",
    classes: "border-amber-200 bg-amber-50 text-amber-800",
    note: "A receita depende de poucos tipos de comprador. Abrir frente em outros canais reduz o risco.",
  },
  diversified: {
    label: "Diversificada",
    emoji: "🟢",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    note: "A receita está bem distribuída entre vários tipos de comprador — pouca dependência de um único canal.",
  },
};

/** Formata uma participação 0..1 como porcentagem inteira (ex.: 0,6 → "60%"). */
function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/**
 * Card "Concentração por papel": mede o risco de depender de um único tipo de
 * comprador (sobre a receita bruta, distinto da rentabilidade líquida). Espelha
 * o card de concentração de clientes (D109) num eixo de papel.
 */
function ConcentrationCard({
  concentration,
}: {
  concentration: RoleConcentration;
}) {
  const verdict = CONCENTRATION_VERDICT[concentration.level];
  const { top, roleCount } = concentration;
  return (
    <div className={"card border " + verdict.classes}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Concentração por papel
        </p>
        <span className="badge bg-white/70 font-semibold">
          {verdict.emoji} {verdict.label}
        </span>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-2xl font-bold">{pct(concentration.topShare)}</p>
          <p className="text-xs opacity-80">
            da receita vem de {top ? roleLabel(top.role) : "—"} (maior papel)
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">{pct(concentration.top3Share)}</p>
          <p className="text-xs opacity-80">
            nos 3 maiores de {roleCount} {roleCount === 1 ? "papel" : "papéis"}
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">
            {concentration.effectiveRoles.toFixed(1)}
          </p>
          <p className="text-xs opacity-80">
            papéis efetivos (como se fossem N de mesmo tamanho)
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs opacity-90">{verdict.note}</p>
    </div>
  );
}

/** Rótulo + tom do veredito de tendência da concentração por papel entre dois anos. */
const ROLE_TREND: Record<
  RoleConcentrationComparison["trend"],
  { label: string; emoji: string; classes: string; note: string }
> = {
  improved: {
    label: "Mais distribuída",
    emoji: "🟢",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    note: "A receita ficou menos dependente de um único tipo de comprador em relação ao ano anterior — risco de canal em queda.",
  },
  worsened: {
    label: "Mais concentrada",
    emoji: "🔴",
    classes: "border-red-200 bg-red-50 text-red-800",
    note: "A receita passou a depender mais de poucos tipos de comprador que no ano anterior — vale abrir frente em outros canais para reduzir o risco.",
  },
  stable: {
    label: "Estável",
    emoji: "⚪",
    classes: "border-gray-200 bg-gray-50 text-gray-700",
    note: "A dependência de tipos de comprador ficou praticamente igual à do ano anterior.",
  },
};

/** Formata uma variação em pontos percentuais com sinal (ex.: −0,12 → "−12 p.p."). */
function deltaPp(delta: number): string {
  const points = Math.round(delta * 100);
  if (points === 0) return "0 p.p.";
  return `${points > 0 ? "+" : "−"}${Math.abs(points)} p.p.`;
}

/** Formata a variação de papéis efetivos com sinal (ex.: 1,3 → "+1,3"). */
function deltaRoles(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return "0";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(1)}`;
}

/**
 * Card "Concentração por papel {ano} vs. {ano-1}": compara a concentração por
 * tipo de comprador do ano selecionado com a do ano anterior (espelha o card por
 * contratante/D139 num eixo de papel). Mostra a variação do maior papel e dos
 * papéis efetivos, com um veredito de tendência (mais distribuída × mais concentrada).
 */
function RoleComparisonCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: RoleConcentrationComparison;
  currentYear: number;
  previousYear: number;
}) {
  const trend = ROLE_TREND[comparison.trend];
  const { current, previous } = comparison;
  return (
    <div className={"card border " + trend.classes}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Concentração por papel {currentYear} vs. {previousYear}
        </p>
        <span className="badge bg-white/70 font-semibold">
          {trend.emoji} {trend.label}
        </span>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-2xl font-bold">{deltaPp(comparison.topShareDelta)}</p>
          <p className="text-xs opacity-80">
            no maior papel: {pct(previous.topShare)} ({previousYear}) →{" "}
            {pct(current.topShare)} ({currentYear})
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">
            {deltaRoles(comparison.effectiveRolesDelta)}
          </p>
          <p className="text-xs opacity-80">
            papéis efetivos: {previous.effectiveRoles.toFixed(1)} →{" "}
            {current.effectiveRoles.toFixed(1)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs opacity-90">{trend.note}</p>
    </div>
  );
}

/**
 * Card "Margem por papel {ano} vs. {ano-1}": dos TIPOS de comprador que voltaram
 * de um ano para o outro, quais apertaram a margem líquida (cachês achatados,
 * despesas maiores) — a decisão acionável "que tipo de canal está achatando o
 * cachê". Rollup por papel do card por contratante (D372/D373); usa
 * `compareRoleMargins` (D375). Só papel presente nos dois anos entra.
 */
function RoleMarginComparisonCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: RoleMarginComparison;
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
          Margem por papel {currentYear} vs. {previousYear}
        </p>
        <div className="flex items-center gap-2">
          <a
            href={`/contatos/rentabilidade/por-papel/comparativo-margem/export?ano=${currentYear}`}
            className="btn-secondary text-xs"
            download
          >
            ⬇ CSV
          </a>
          <span className="badge bg-white/70 font-semibold">
            {anySqueeze
              ? `🔴 ${squeezedCount} ${squeezedCount === 1 ? "canal apertando" : "canais apertando"} a margem`
              : "🟢 Nenhum canal apertou a margem"}
          </span>
        </div>
      </div>

      {squeezed.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {squeezed.map((c) => (
            <li
              key={c.role}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
            >
              <span className="font-medium">{roleLabel(c.role)}</span>
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
          {comparedCount === 1 ? "papel comparado" : "papéis comparados"} teve a
          margem cair de forma relevante em relação ao ano anterior.
        </p>
      )}

      {bestGain && (
        <p className="mt-3 text-xs opacity-90">
          Maior avanço: <strong>{roleLabel(bestGain.role)}</strong> ganhou{" "}
          {deltaPp(bestGain.marginDelta)} de margem ({pct(bestGain.previousMargin)}{" "}
          → {pct(bestGain.currentMargin)}).
        </p>
      )}

      <p className="mt-3 text-xs opacity-80">
        Compara só os papéis presentes nos dois anos ({comparedCount}{" "}
        {comparedCount === 1 ? "papel" : "papéis"}). Margem = resultado líquido ÷
        receita bruta; uma queda pode vir de cachê menor ou de mais despesas. Um
        rollup do comparativo por contratante — vale renegociar o canal inteiro.
      </p>
    </div>
  );
}
