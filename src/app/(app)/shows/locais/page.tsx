import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankVenuesByProfit,
  geoConcentration,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
  type VenueShowLike,
  type GeoConcentration,
  type DiversificationLevel,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

const CANCELLED = "CANCELLED";

export default async function VenueProfitabilityPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id },
      select: { id: true, fee: true, status: true, venue: true, city: true, date: true },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, showId: { not: null } },
      select: { type: true, amount: true, showId: true },
    }),
  ]);

  // Inclui `date` para recortar por ano antes de agregar (mesmo padrão da
  // rentabilidade por contratante, ver D108). O recorte é só uma filtragem
  // prévia — a regra de agrupamento por local e o P&L seguem intocados.
  const venueShows: (VenueShowLike & { date: Date })[] = shows.map((s) => ({
    id: s.id,
    fee: s.fee,
    status: s.status,
    venue: s.venue,
    city: s.city,
    date: s.date,
  }));

  // Anos disponíveis no seletor: apenas dos shows que entram na agregação
  // (não cancelados), para não oferecer um ano que ficaria vazio.
  const availableYears = showProfitYears(
    venueShows.filter((s) => s.status !== CANCELLED).map((s) => s.date),
  );
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodShows = filterShowsByYear(venueShows, yearFilter);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: "",
    date: new Date(),
    received: true,
    showId: t.showId,
  }));

  const report = rankVenuesByProfit(periodShows, txs);
  // Risco de depender de poucas casas (sobre a receita bruta, ignora "Sem local").
  // Reaproveita o mesmo `geoConcentration` da atuação por cidade (D113), aqui num
  // eixo de casa/local em vez de cidade — ver D116.
  const concentration = geoConcentration(report.rows);

  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rentabilidade por local</h1>
          <p className="text-sm text-gray-500">
            Quais casas valem a pena — soma do resultado (cachê + extras − despesas) de todos os
            shows no mesmo local. Shows cancelados são ignorados.
          </p>
        </div>
        <Link href="/shows" className="btn-secondary">
          ← Shows
        </Link>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker years={availableYears} active={yearFilter} basePath="/shows/locais" />
      )}

      {report.count === 0 ? (
        <div className="card text-center text-gray-500">
          {yearFilter === "all" ? (
            <>
              <p>Nenhum show para analisar.</p>
              <Link
                href="/shows/novo"
                className="mt-3 inline-block text-brand-700 hover:underline"
              >
                Cadastrar um show
              </Link>
            </>
          ) : (
            <>
              <p>Nenhum show em {periodLabel}.</p>
              <p className="mt-1 text-sm">
                Escolha outro período acima para ver a rentabilidade por local.
              </p>
              <Link
                href="/shows/locais"
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
            <Stat label="Locais analisados" value={String(report.count)} />
            <Stat
              label="Resultado líquido total"
              value={formatMoney(report.totalNet)}
              tone={report.totalNet >= 0 ? "brand" : "red"}
            />
            <Stat
              label="Local mais rentável"
              value={report.best ? report.best.name : "—"}
              tone="emerald"
            />
          </div>

          {report.best && report.worst && report.best.key !== report.worst.key && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Highlight
                label="Mais rentável"
                title={report.best.name}
                subtitle={`${report.best.showCount} ${report.best.showCount === 1 ? "show" : "shows"}`}
                value={formatMoney(report.best.totalNet)}
                tone="emerald"
              />
              <Highlight
                label="Menos rentável"
                title={report.worst.name}
                subtitle={`${report.worst.showCount} ${report.worst.showCount === 1 ? "show" : "shows"}`}
                value={formatMoney(report.worst.totalNet)}
                tone={report.worst.totalNet >= 0 ? "brand" : "red"}
              />
            </div>
          )}

          {concentration.placeCount > 0 && (
            <VenueConcentrationCard concentration={concentration} />
          )}

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Local</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê</th>
                  <th className="px-4 py-3 text-right font-medium">Extras</th>
                  <th className="px-4 py-3 text-right font-medium">Despesas</th>
                  <th className="px-4 py-3 text-right font-medium">Resultado</th>
                  <th className="px-4 py-3 text-right font-medium">Média/show</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.rows.map((row) => (
                  <tr key={row.key || "__sem_local__"} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className={
                          "font-medium " +
                          (row.key === "" ? "italic text-gray-400" : "text-gray-900")
                        }
                      >
                        {row.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.showCount}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatMoney(row.totalFee)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {row.totalExtra > 0 ? formatMoney(row.totalExtra) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {row.totalExpenses > 0 ? "−" + formatMoney(row.totalExpenses) : "—"}
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
            Os shows são agrupados pelo local; quando não há local informado, usamos a cidade. Shows
            sem local nem cidade aparecem como “Sem local”.
          </p>
        </>
      )}
    </div>
  );
}

/** Rótulo + tom (cor/emoji) do veredito de concentração por casa/local. */
const VENUE_VERDICT: Record<
  DiversificationLevel,
  { label: string; emoji: string; classes: string; note: string }
> = {
  concentrated: {
    label: "Concentrada",
    emoji: "🔴",
    classes: "border-red-200 bg-red-50 text-red-800",
    note: "Boa parte da receita vem de poucas casas — se um contratante esfriar ou uma casa fechar, o baque é grande. Vale prospectar novos palcos.",
  },
  moderate: {
    label: "Moderada",
    emoji: "🟡",
    classes: "border-amber-200 bg-amber-50 text-amber-800",
    note: "A receita depende de um punhado de casas. Tocar em novos palcos reduz o risco de depender de poucos.",
  },
  diversified: {
    label: "Diversificada",
    emoji: "🟢",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    note: "A receita está bem espalhada entre várias casas — pouca dependência de um único palco.",
  },
};

/** Formata uma participação 0..1 como porcentagem inteira (ex.: 0,6 → "60%"). */
function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/**
 * Card "Concentração por casa": mede o risco de a receita depender de poucas
 * casas/locais (sobre a receita bruta, distinto da rentabilidade líquida).
 * Reaproveita `geoConcentration` (D113) num eixo de casa em vez de cidade —
 * é o recorte mais granular do mesmo risco geográfico (D116). Ignora o grupo
 * "Sem local" (chave "").
 */
function VenueConcentrationCard({
  concentration,
}: {
  concentration: GeoConcentration;
}) {
  const verdict = VENUE_VERDICT[concentration.level];
  const { top, placeCount } = concentration;
  return (
    <div className={"card border " + verdict.classes}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Concentração por casa
        </p>
        <span className="badge bg-white/70 font-semibold">
          {verdict.emoji} {verdict.label}
        </span>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-2xl font-bold">{pct(concentration.topShare)}</p>
          <p className="text-xs opacity-80">
            da receita vem de {top ? top.name : "—"} (maior casa)
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">{pct(concentration.top3Share)}</p>
          <p className="text-xs opacity-80">
            nas 3 maiores de {placeCount} {placeCount === 1 ? "casa" : "casas"}
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">
            {concentration.effectivePlaces.toFixed(1)}
          </p>
          <p className="text-xs opacity-80">
            casas efetivas (como se fossem N de mesmo tamanho)
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs opacity-90">{verdict.note}</p>
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
      <p className="mt-1 truncate font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
      <p className={"mt-1 text-lg font-bold " + tones[tone]}>{value}</p>
    </div>
  );
}
