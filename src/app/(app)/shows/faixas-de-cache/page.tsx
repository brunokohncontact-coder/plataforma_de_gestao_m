import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  feeDistribution,
  type ReceivableShowLike,
  type FeeBandStat,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function FeeDistributionPage() {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    select: { id: true, date: true, status: true, fee: true },
  });

  const shows: ReceivableShowLike[] = rows.map((s) => ({
    id: s.id,
    fee: s.fee,
    status: s.status,
    date: s.date,
  }));

  const dist = feeDistribution(shows);

  // Escala das barras: maior nº de shows numa faixa (distribuição por contagem).
  const peakCount = Math.max(1, ...dist.bands.map((b) => b.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Faixas de cachê</h1>
          <p className="text-sm text-gray-500">
            Em que faixa de preço você mais toca e onde está concentrado o seu
            faturamento — o formato da sua tabela de cachês.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dist.totalShows > 0 && (
            <a
              href="/shows/faixas-de-cache/export"
              className="btn-secondary text-sm"
              download
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/shows" className="btn-secondary">
            ← Shows
          </Link>
        </div>
      </div>

      {dist.totalShows === 0 ? (
        <div className="card text-center text-gray-500">
          <p>
            Ainda não há shows realizados com cachê registrado para montar a
            distribuição. Marque um show como realizado e informe o cachê.
          </p>
          <Link
            href="/shows/novo"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Cadastrar um show
          </Link>
        </div>
      ) : (
        <>
          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Cachê médio" value={formatMoney(dist.avgFee)} tone="brand" />
            <Stat
              label="Cachê mediano"
              value={formatMoney(dist.medianFee)}
              tone="emerald"
              hint="metade cobra acima, metade abaixo"
            />
            <Stat
              label="Faixa típica"
              value={dist.modalBand?.label ?? "—"}
              hint={
                dist.modalBand
                  ? `${dist.modalBand.count} ${
                      dist.modalBand.count === 1 ? "show" : "shows"
                    } · ${pct(dist.modalBand.countShare)} dos shows`
                  : undefined
              }
            />
            <Stat
              label="Onde está o faturamento"
              value={dist.topValueBand?.label ?? "—"}
              hint={
                dist.topValueBand
                  ? `${pct(dist.topValueBand.feeShare)} do total · ${formatMoney(
                      dist.topValueBand.totalFee,
                    )}`
                  : undefined
              }
            />
          </div>

          {/* Distribuição por faixa */}
          <section className="card overflow-x-auto">
            <h2 className="mb-1 font-semibold">Distribuição por faixa de preço</h2>
            <p className="mb-4 text-xs text-gray-500">
              Considera apenas shows já realizados (PLAYED, ou confirmados com data
              passada) com cachê registrado. As barras mostram a quantidade de shows
              em cada faixa. As faixas são uma referência do mercado e podem não
              refletir o seu segmento.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Faixa</th>
                  <th className="pb-2 px-3 text-right font-medium">Shows</th>
                  <th className="pb-2 px-3 text-right font-medium">% dos shows</th>
                  <th className="pb-2 px-3 text-right font-medium">Faturamento</th>
                  <th className="pb-2 pl-3 text-right font-medium">% do faturam.</th>
                </tr>
              </thead>
              <tbody>
                {dist.bands.map((b) => (
                  <BandRow
                    key={b.key}
                    band={b}
                    peakCount={peakCount}
                    isModal={dist.modalBand?.key === b.key}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="py-2 pr-3">Total</td>
                  <td className="py-2 px-3 text-right">{dist.totalShows}</td>
                  <td className="py-2 px-3 text-right text-gray-400">100%</td>
                  <td className="py-2 px-3 text-right">{formatMoney(dist.totalFee)}</td>
                  <td className="py-2 pl-3 text-right text-gray-400">100%</td>
                </tr>
              </tfoot>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function BandRow({
  band,
  peakCount,
  isModal,
}: {
  band: FeeBandStat;
  peakCount: number;
  isModal: boolean;
}) {
  const empty = band.count === 0;
  return (
    <tr className="border-b last:border-0">
      <td className={"py-2 pr-3 " + (empty ? "text-gray-400" : "font-medium")}>
        {band.label}
        {isModal && (
          <span className="ml-2 rounded-full bg-brand-100 px-1.5 text-xs font-semibold text-brand-700">
            típica
          </span>
        )}
      </td>
      <td className="py-2 px-3 text-right">
        <span className={empty ? "text-gray-300" : "text-gray-900"}>{band.count}</span>
        <Bar value={band.count} peak={peakCount} />
      </td>
      <td className="py-2 px-3 text-right text-xs text-gray-500">
        {empty ? "—" : pct(band.countShare)}
      </td>
      <td className="py-2 px-3 text-right text-xs text-gray-500">
        {empty ? "—" : formatMoney(band.totalFee)}
      </td>
      <td className="py-2 pl-3 text-right text-xs text-gray-500">
        {empty ? "—" : pct(band.feeShare)}
      </td>
    </tr>
  );
}

/** Participação 0..1 → "42%" (inteiro). */
function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function Bar({ value, peak }: { value: number; peak: number }) {
  if (value <= 0) return null;
  const width = Math.max(2, Math.round((value / peak) * 100));
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded bg-gray-100">
      <div className="ml-auto h-full rounded bg-brand-400" style={{ width: `${width}%` }} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "gray",
  hint,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "red" | "brand" | "gray";
  hint?: string;
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
      <p className={"mt-1 text-xl font-bold " + tones[tone]}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
