import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankRolesByProfit,
  MIN_MEDIAN_FEE_SAMPLE,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
  type ShowLike,
  type ContactProfitContact,
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

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Papel</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
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
