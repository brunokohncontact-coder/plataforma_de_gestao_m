import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankContactsByProfit,
  clientConcentration,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
  type ShowLike,
  type ContactProfitContact,
  type ClientConcentration,
} from "@/lib/finance";
import { pickPayerContact } from "@/lib/billing";
import { formatMoney } from "@/lib/money";
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
          <Link href="/contatos/ranking" className="btn-secondary">
            Ranking
          </Link>
          <Link href="/contatos" className="btn-secondary">
            ← Contatos
          </Link>
        </div>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker years={availableYears} active={yearFilter} />
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

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Contratante</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê</th>
                  <th className="px-4 py-3 text-right font-medium">Extras</th>
                  <th className="px-4 py-3 text-right font-medium">Despesas</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê médio</th>
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
            extras e custos — distinto da <strong>média/show</strong>, que é o líquido por show.
          </p>
        </>
      )}
    </div>
  );
}

/** Seletor de período: "Todos" + uma pílula por ano com shows (mais recente primeiro). */
function PeriodPicker({
  years,
  active,
}: {
  years: number[];
  active: number | "all";
}) {
  const base =
    "rounded-full px-3 py-1 text-sm font-medium transition-colors";
  const on = "bg-brand-600 text-white";
  const off = "bg-gray-100 text-gray-600 hover:bg-gray-200";
  return (
    <nav aria-label="Período" className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Período
      </span>
      <Link
        href="/contatos/rentabilidade"
        className={base + " " + (active === "all" ? on : off)}
        aria-current={active === "all" ? "page" : undefined}
      >
        Todos
      </Link>
      {years.map((y) => (
        <Link
          key={y}
          href={`/contatos/rentabilidade?ano=${y}`}
          className={base + " " + (active === y ? on : off)}
          aria-current={active === y ? "page" : undefined}
        >
          {y}
        </Link>
      ))}
    </nav>
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
