import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  clientConcentration,
  clientConcentrationYears,
  indexClientShareChanges,
  type ClientConcentrationLevel,
  type ClientShareRowStatus,
  type ClientShareTrend,
  type ContactRankLike,
} from "@/lib/contacts";
import {
  parseProfitYear,
  filterShowsByYear,
  compareClientConcentration,
  type ClientConcentrationComparison,
  type ClientConcentrationLike,
} from "@/lib/finance";
import { PeriodPicker } from "@/components/PeriodPicker";
import { formatMoney } from "@/lib/money";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

interface ConcentrationContact extends ContactRankLike {
  role: string;
}

const LEVEL_LABELS: Record<ClientConcentrationLevel, string> = {
  concentrated: "Carteira concentrada",
  moderate: "Concentração moderada",
  diversified: "Carteira diversificada",
};

const LEVEL_TONES: Record<ClientConcentrationLevel, string> = {
  concentrated: "bg-red-50 text-red-800",
  moderate: "bg-amber-50 text-amber-800",
  diversified: "bg-emerald-50 text-emerald-800",
};

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export default async function ContatosConcentracaoPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      role: true,
      shows: {
        select: {
          show: { select: { status: true, date: true, fee: true } },
        },
      },
    },
  });

  const items = contacts.map((c) => ({
    contact: { id: c.id, name: c.name, role: c.role } as ConcentrationContact,
    shows: c.shows.map((cs) => cs.show),
  }));

  // Recorte por período: anos ancorados nos shows que de fato entram na
  // concentração (não cancelados, com cachê), filtrando os shows de cada contato
  // pela `date` (UTC/D108) antes de agregar — a lógica pura segue intocada.
  const availableYears = clientConcentrationYears(items);
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodItems = items.map((it) => ({
    contact: it.contact,
    shows: filterShowsByYear(it.shows, yearFilter),
  }));

  const conc = clientConcentration(periodItems);

  // Comparativo ano a ano da concentração (espelha o card de `contatos/rentabilidade`
  // e o comparativo geográfico/D120): só faz sentido com um ano específico
  // selecionado e o ano anterior tendo contratante — caso contrário a leitura
  // "melhorou/piorou" seria enganosa. Reaproveita o mesmo recorte por ano UTC
  // (D108) e `compareClientConcentration` (zero lógica pura nova), sem nova consulta.
  let comparison: ClientConcentrationComparison<ClientConcentrationLike> | null =
    null;
  let previousYear = 0;
  // Lookup por contratante para a coluna "vs. {ano-1}" da tabela: o detalhe
  // por linha do card-manchete agregado (mesmo gate). null quando não há
  // comparativo — a coluna não é renderizada.
  let shareLookup:
    | ((contactId: string | null | undefined) => ClientShareRowStatus<ConcentrationContact>)
    | null = null;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousItems = items.map((it) => ({
      contact: it.contact,
      shows: filterShowsByYear(it.shows, previousYear),
    }));
    const previousConc = clientConcentration(previousItems);
    if (conc.clientCount > 0 && previousConc.clientCount > 0) {
      comparison = compareClientConcentration(conc, previousConc);
      shareLookup = indexClientShareChanges(conc, previousConc);
    }
  }

  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;
  const exportHref =
    "/contatos/concentracao/export" +
    (yearFilter === "all" ? "" : `?ano=${yearFilter}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Concentração de contratantes</h1>
          <p className="text-sm text-gray-500">
            Quanto da sua receita depende de poucos contratantes — o risco de
            perder um cliente que responde por boa parte do seu faturamento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {conc.clientCount > 0 && (
            <a href={exportHref} className="btn-secondary">
              ⬇ CSV
            </a>
          )}
          <Link href="/contatos/retencao" className="btn-secondary">
            Fidelização
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
          basePath="/contatos/concentracao"
        />
      )}

      {conc.clientCount === 0 ? (
        <div className="card text-center text-gray-500">
          <p>
            {yearFilter === "all"
              ? "Ainda não há cachê de contratantes para medir a concentração."
              : `Nenhum cachê de contratante em ${periodLabel}.`}
          </p>
          <p className="mt-1 text-sm">
            Vincule contatos aos seus shows (com cachê) na tela de detalhe do show.
          </p>
          <Link href="/shows" className="mt-3 inline-block text-brand-700 hover:underline">
            Ver shows
          </Link>
        </div>
      ) : (
        <>
          {/* Veredito de concentração */}
          <div className={"rounded-lg px-4 py-3 text-sm " + LEVEL_TONES[conc.level]}>
            <p className="font-semibold">{LEVEL_LABELS[conc.level]}</p>
            <p className="mt-0.5">
              {conc.level === "concentrated" && conc.top && (
                <>
                  {pct(conc.topShare)} do seu cachê vem de{" "}
                  <strong>{conc.top.contact.name}</strong>. Depender tanto de um único
                  contratante é um risco — perdê-lo abriria um buraco grande na agenda.
                  Vale cultivar novas frentes de booking.
                </>
              )}
              {conc.level === "moderate" && (
                <>
                  Sua receita vem de alguns contratantes, mas ainda é puxada por poucos.
                  Equivale a {conc.effectiveClients.toFixed(1)} contratantes de mesmo
                  tamanho.
                </>
              )}
              {conc.level === "diversified" && (
                <>
                  Seu cachê está bem distribuído entre {conc.clientCount} contratantes —
                  equivale a {conc.effectiveClients.toFixed(1)} de mesmo tamanho. Boa
                  proteção contra a perda de um único cliente.
                </>
              )}
            </p>
          </div>

          {/* Comparativo ano a ano — só com ano específico e o anterior tendo contratante */}
          {comparison && (
            <ClientComparisonCard
              comparison={comparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Cachê total da carteira" value={formatMoney(conc.totalFee)} />
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Maior contratante
              </p>
              {conc.top && (
                <>
                  <Link
                    href={`/contatos/${conc.top.contact.id}`}
                    className="mt-1 block truncate font-medium text-brand-700 hover:underline"
                  >
                    {conc.top.contact.name}
                  </Link>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {pct(conc.topShare)}
                    <span className="ml-2 text-sm font-normal text-emerald-600">
                      {formatMoney(conc.top.totalFee)}
                    </span>
                  </p>
                </>
              )}
            </div>
            <Stat
              label="Contratantes"
              value={String(conc.clientCount)}
              hint={`top 3 = ${pct(conc.top3Share)} do cachê`}
            />
          </div>

          {/* Composição por contratante */}
          <section className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Contratante</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê</th>
                  <th className="px-4 py-3 font-medium">Participação</th>
                  {shareLookup && (
                    <th className="px-4 py-3 text-right font-medium">
                      vs. {previousYear}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {conc.rows.map((r) => (
                  <tr key={r.contact.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/contatos/${r.contact.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {r.contact.name}
                      </Link>
                      <div className="mt-0.5">
                        <span className="badge bg-brand-50 text-brand-700">
                          {CONTACT_ROLE_LABELS[r.contact.role as ContactRole] ??
                            r.contact.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{r.activeShows}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {formatMoney(r.totalFee)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-10 shrink-0 text-right text-xs text-gray-500">
                          {pct(r.share)}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                          <div
                            className="h-full rounded bg-brand-400"
                            style={{ width: `${Math.max(2, Math.round(r.share * 100))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    {shareLookup && (
                      <td className="px-4 py-3 text-right">
                        <ShareDelta status={shareLookup(r.contact.id)} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <p className="text-xs text-gray-400">
            O cachê é por contato: um show com vários contatos conta para cada um. Shows
            cancelados e contatos sem cachê não entram. O número efetivo de contratantes
            resume a concentração: quanto maior, menos dependente você é de um só cliente.
            {shareLookup && (
              <>
                {" "}A coluna <strong>vs. {previousYear}</strong> mostra a variação da
                participação de cada contratante em pontos percentuais — 🔴 subiu (mais
                dependência dele), 🟢 caiu, cinza estável; “novo” apareceu só em{" "}
                {periodLabel}.
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}

/** Rótulo + tom do veredito de tendência da concentração entre dois anos. */
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
 * Card "Concentração {ano} vs. {ano-1}": compara a concentração de contratantes
 * do ano selecionado com a do ano anterior. Espelha o card homônimo de
 * `contatos/rentabilidade` (D122) e o card geográfico (D120) num eixo de cliente:
 * variação do maior contratante e dos clientes efetivos, com veredito de tendência.
 */
function ClientComparisonCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: ClientConcentrationComparison<ClientConcentrationLike>;
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

/** Cor da coluna "vs. {ano-1}" por direção da variação de share. Subir a
 * dependência de um contratante (`up`) é o sinal de concentração → vermelho,
 * na mesma moldura do card agregado; cair → verde; ruído → cinza. */
const SHARE_TREND_CLASSES: Record<ClientShareTrend, string> = {
  up: "text-red-600",
  down: "text-emerald-600",
  flat: "text-gray-400",
};

/** Célula "vs. {ano-1}" da tabela: variação de participação em p.p. com sinal,
 * "novo" para quem só faturou no ano atual, "—" para não comparáveis. */
function ShareDelta({
  status,
}: {
  status: ClientShareRowStatus<ConcentrationContact>;
}) {
  if (status.kind === "new") {
    return <span className="text-xs font-medium text-brand-600">novo</span>;
  }
  if (status.kind === "none") {
    return <span className="text-gray-300">—</span>;
  }
  return (
    <span className={"text-xs font-semibold " + SHARE_TREND_CLASSES[status.change.trend]}>
      {deltaPp(status.change.shareDelta)}
    </span>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
