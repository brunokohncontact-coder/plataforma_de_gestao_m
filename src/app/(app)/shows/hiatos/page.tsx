import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  showGaps,
  gapDistribution,
  MIN_SHOW_GAP_SAMPLE,
  type ShowGapShowLike,
  type ShowGap,
  type GapBucket,
  type GapDistribution,
} from "@/lib/shows";
import { MONTH_NAMES_LONG } from "@/lib/calendar";

export const dynamic = "force-dynamic";

/** "YYYY-MM-DD" → "10 mar 2026" (rótulo compacto, UTC, sem escorregar de fuso). */
function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const month = MONTH_NAMES_LONG[m - 1]?.slice(0, 3).toLowerCase() ?? "";
  return `${d} ${month} ${y}`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export default async function ShowGapsPage() {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    select: { date: true, status: true },
  });

  const shows: ShowGapShowLike[] = rows.map((s) => ({
    date: s.date,
    status: s.status,
  }));

  const report = showGaps(shows);
  const distribution = gapDistribution(report);
  const smallSample = report.showDays < MIN_SHOW_GAP_SAMPLE;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hiatos entre shows</h1>
          <p className="text-sm text-gray-500">
            Quanto tempo passa entre um gig e o outro — as maiores secas de
            agenda e há quanto tempo você não sobe ao palco.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.gaps.length > 0 && (
            <a href="/shows/hiatos/export" className="btn-secondary text-sm" download>
              ⬇ CSV
            </a>
          )}
          <Link href="/shows" className="btn-secondary">
            ← Shows
          </Link>
        </div>
      </div>

      {report.showDays === 0 ? (
        <div className="card text-center text-gray-500">
          <p>
            Ainda não há shows firmes (confirmados ou realizados) para medir os
            intervalos da agenda. Confirme um show ou marque-o como realizado.
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Seca atual"
              value={
                report.currentGapDays == null
                  ? "—"
                  : plural(report.currentGapDays, "dia", "dias")
              }
              tone={
                report.currentGapDays != null && report.currentGapDays >= 30
                  ? "red"
                  : "brand"
              }
              hint={
                report.currentGapDays == null
                  ? "nenhum show passado ainda"
                  : report.daysUntilNext != null
                    ? `próximo show em ${plural(report.daysUntilNext, "dia", "dias")}`
                    : "desde o último show — nada agendado à frente"
              }
            />
            <Stat
              label="Maior seca"
              value={report.longest ? plural(report.longest.days, "dia", "dias") : "—"}
              tone="red"
              hint={
                report.longest
                  ? `${dayLabel(report.longest.fromDay)} → ${dayLabel(report.longest.toDay)}`
                  : "precisa de ao menos dois shows"
              }
            />
            <Stat
              label="Espaçamento típico"
              value={
                report.medianGapDays > 0
                  ? plural(report.medianGapDays, "dia", "dias")
                  : "—"
              }
              tone="brand"
              hint={
                report.averageGapDays > 0
                  ? `média de ${plural(report.averageGapDays, "dia", "dias")} entre shows`
                  : "mediana entre gigs consecutivos"
              }
            />
            <Stat
              label="Dias de show"
              value={String(report.showDays)}
              hint={
                report.firstDay && report.lastDay
                  ? `${dayLabel(report.firstDay)} → ${dayLabel(report.lastDay)}`
                  : undefined
              }
            />
          </div>

          {report.currentGapVsTypical != null && (
            <CurrentGapReading
              ratio={report.currentGapVsTypical}
              currentDays={report.currentGapDays ?? 0}
              medianDays={report.medianGapDays}
            />
          )}

          {report.currentGapVsLongest != null &&
            report.currentGapVsLongest >= RECORD_GAP_NEAR &&
            report.longest != null && (
              <RecordGapReading
                ratio={report.currentGapVsLongest}
                currentDays={report.currentGapDays ?? 0}
                longestDays={report.longest.days}
              />
            )}

          {smallSample && (
            <div className="card border-amber-200 bg-amber-50 text-sm text-amber-800">
              Amostra pequena ({plural(report.showDays, "dia de show", "dias de show")}).
              O espaçamento típico fica mais confiável a partir de{" "}
              {MIN_SHOW_GAP_SAMPLE} dias de show.
            </div>
          )}

          {distribution.total >= 2 && (
            <GapDistributionSection distribution={distribution} />
          )}

          {report.gaps.length > 0 && (
            <section className="card overflow-x-auto">
              <h2 className="mb-1 font-semibold">Maiores secas</h2>
              <p className="mb-4 text-xs text-gray-500">
                Considera só shows firmes (confirmados ou realizados) — propostas
                em aberto ainda podem cair e não entram. Vários shows no mesmo dia
                contam como um só dia de agenda. Cada linha é o intervalo, em dias
                corridos, entre um show e o seguinte.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="pb-2 pr-3 font-medium">Período</th>
                    <th className="pb-2 pl-3 text-right font-medium">Dias sem show</th>
                  </tr>
                </thead>
                <tbody>
                  {report.gaps.map((gap) => (
                    <GapRow
                      key={`${gap.fromDay}_${gap.toDay}`}
                      gap={gap}
                      peak={report.longest?.days ?? gap.days}
                    />
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** 2.5 → "2,5", 2 → "2" (vírgula decimal pt-BR, sem casa quando inteiro). */
function formatRatio(n: number): string {
  return (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace(".", ",");
}

/**
 * A partir de quantos múltiplos do recorde a leitura "seca vs. recorde" aparece.
 * Limiar de APRESENTAÇÃO (0,9× — encostando no recorde): abaixo disso a seca
 * atual ainda está longe do pior hiato já vivido e o aviso seria ruído.
 */
const RECORD_GAP_NEAR = 0.9;

/**
 * Interpreta a seca atual em relação ao espaçamento típico. Os limiares (1,5× /
 * 2×) são de APRESENTAÇÃO — quando a espera vira "esticada" ou "fora do comum" —
 * e vivem aqui, não na lógica pura (que só devolve o múltiplo `currentGapVsTypical`).
 */
function CurrentGapReading({
  ratio,
  currentDays,
  medianDays,
}: {
  ratio: number;
  currentDays: number;
  medianDays: number;
}) {
  const typical = `o espaçamento típico (${plural(medianDays, "dia", "dias")} entre gigs)`;

  let className: string;
  let text: string;
  if (ratio >= 2) {
    className = "border-red-200 bg-red-50 text-red-800";
    text = `🌵 Seca fora do comum: sua espera atual (${plural(
      currentDays,
      "dia",
      "dias",
    )}) já é ${formatRatio(ratio)}× ${typical}. Boa hora para prospectar.`;
  } else if (ratio >= 1.5) {
    className = "border-amber-200 bg-amber-50 text-amber-800";
    text = `⏳ Espera esticada: a seca atual (${plural(
      currentDays,
      "dia",
      "dias",
    )}) está ${formatRatio(ratio)}× ${typical}.`;
  } else if (ratio >= 1) {
    className = "border-gray-200 bg-gray-50 text-gray-700";
    text = `A espera atual (${plural(
      currentDays,
      "dia",
      "dias",
    )}) está no ritmo de sempre — ${formatRatio(ratio)}× ${typical}.`;
  } else {
    className = "border-emerald-200 bg-emerald-50 text-emerald-800";
    text = `🎸 Dentro do ritmo: você tocou há ${plural(
      currentDays,
      "dia",
      "dias",
    )}, abaixo ${typical}.`;
  }

  return <div className={`card text-sm ${className}`}>{text}</div>;
}

/**
 * Interpreta a seca atual contra o RECORDE (maior hiato já registrado). Dimensão
 * distinta de `CurrentGapReading` (que mede contra o espaçamento típico/mediana):
 * aqui o baseline é o extremo — o pior hiato já vivido pelo músico. Os limiares
 * (≥ 1× recorde batido/igualado; ≥ 0,9× encostando) são de APRESENTAÇÃO e vivem
 * na UI, não na lógica pura (que só devolve o múltiplo `currentGapVsLongest`).
 */
function RecordGapReading({
  ratio,
  currentDays,
  longestDays,
}: {
  ratio: number;
  currentDays: number;
  longestDays: number;
}) {
  const record = `a sua maior seca já registrada (${plural(longestDays, "dia", "dias")})`;
  const current = plural(currentDays, "dia", "dias");

  let className: string;
  let text: string;
  if (ratio >= 1) {
    className = "border-red-200 bg-red-50 text-red-800";
    text = `🏜️ Recorde de seca: você nunca passou tanto tempo sem tocar. A espera atual (${current}) já ${
      ratio > 1 ? "superou" : "igualou"
    } ${record}. Priorize a prospecção.`;
  } else {
    className = "border-amber-200 bg-amber-50 text-amber-800";
    text = `⚠️ Perto do recorde: a seca atual (${current}) está encostando em ${record} — ${formatRatio(
      ratio,
    )}× dela.`;
  }

  return <div className={`card text-sm ${className}`}>{text}</div>;
}

/** 0.42 → "42%" (participação inteira, pt-BR). */
function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/**
 * Distribuição das secas por faixa de duração — a FORMA da agenda, além dos
 * extremos (Maiores secas) e do centro (Espaçamento típico). Uma barra por faixa
 * com a contagem e a participação; destaca a faixa mais cheia (`busiest`), a
 * "cara" da cadência. A lógica de repartição vive em `gapDistribution` (pura);
 * aqui é só apresentação.
 */
function GapDistributionSection({ distribution }: { distribution: GapDistribution }) {
  const peak = Math.max(1, ...distribution.buckets.map((b) => b.count));
  return (
    <section className="card">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Distribuição das secas</h2>
        <a
          href="/shows/hiatos/distribuicao/export"
          className="btn-secondary text-xs"
          download
        >
          ⬇ CSV
        </a>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        Como os {plural(distribution.total, "hiato", "hiatos")} entre gigs se
        repartem por duração. Uma cadência regular concentra tudo nas faixas
        curtas; muitos intervalos longos revelam um padrão de festa-ou-fome.
        {distribution.busiest && (
          <>
            {" "}
            A maior parte cai em <strong>{distribution.busiest.label.toLowerCase()}</strong>.
          </>
        )}
      </p>
      <ul className="space-y-2">
        {distribution.buckets.map((bucket) => (
          <GapBucketRow
            key={bucket.label}
            bucket={bucket}
            peak={peak}
            highlight={bucket.label === distribution.busiest?.label}
          />
        ))}
      </ul>
    </section>
  );
}

function GapBucketRow({
  bucket,
  peak,
  highlight,
}: {
  bucket: GapBucket;
  peak: number;
  highlight: boolean;
}) {
  const width =
    bucket.count > 0 ? Math.max(2, Math.round((bucket.count / peak) * 100)) : 0;
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-32 shrink-0 text-gray-600">{bucket.label}</span>
      <span className="relative flex h-4 flex-1 items-center overflow-hidden rounded bg-gray-100">
        {width > 0 && (
          <span
            className={`h-full rounded ${highlight ? "bg-brand-500" : "bg-brand-300"}`}
            style={{ width: `${width}%` }}
          />
        )}
      </span>
      <span className="w-24 shrink-0 text-right tabular-nums text-gray-700">
        {bucket.count > 0 ? (
          <>
            {plural(bucket.count, "seca", "secas")}{" "}
            <span className="text-gray-400">({formatShare(bucket.share)})</span>
          </>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </span>
    </li>
  );
}

function GapRow({ gap, peak }: { gap: ShowGap; peak: number }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-3 font-medium">
        {dayLabel(gap.fromDay)} <span className="text-gray-400">→</span>{" "}
        {dayLabel(gap.toDay)}
      </td>
      <td className="py-2 pl-3 text-right text-gray-900">
        {gap.days}
        <Bar value={gap.days} peak={peak} />
      </td>
    </tr>
  );
}

function Bar({ value, peak }: { value: number; peak: number }) {
  if (value <= 0) return null;
  const width = Math.max(2, Math.round((value / Math.max(1, peak)) * 100));
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
