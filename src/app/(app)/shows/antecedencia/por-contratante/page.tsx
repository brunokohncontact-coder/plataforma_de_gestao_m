import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  bookingLeadTimeByContact,
  bookingLeadTimeYears,
  compareBookingLeadTimeByContact,
  indexContactBookingLeadTimeChanges,
  parseLeadTimeScope,
  MIN_LEAD_TIME_SAMPLE,
  LEAD_TIME_TREND_EPSILON,
  type BookingLeadTimeScope,
  type LeadTimeShowLike,
  type BookingLeadTimeByContactComparison,
  type ContactBookingLeadTimeChange,
  type ContactBookingLeadTimeRowStatus,
} from "@/lib/shows";
import { parseProfitYear, filterShowsByYear, type ProfitYearFilter } from "@/lib/finance";
import { pickPayerContact } from "@/lib/billing";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

/** Contato resolvido como contratante de um show (campos usados na página). */
interface BookerContact {
  id: string;
  name: string;
  role: string;
}

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** Texto pt-BR para uma antecedência em dias (>= 0). */
function daysLabel(days: number): string {
  if (days === 0) return "no mesmo dia";
  if (days === 1) return "1 dia";
  if (days < 60) return `${days} dias`;
  const months = Math.round(days / 30);
  return `${days} dias (~${months} ${months === 1 ? "mês" : "meses"})`;
}

function roleLabel(role: string): string {
  return CONTACT_ROLE_LABELS[role as ContactRole] ?? CONTACT_ROLE_LABELS.OTHER;
}

const SCOPE_OPTIONS: { value: BookingLeadTimeScope; label: string }[] = [
  { value: "all", label: "Todos os shows" },
  { value: "firm", label: "Só confirmados/realizados" },
];

/**
 * Seletor de escopo da amostra (D190): "Todos os shows" (não cancelados, inclui
 * propostas) × "Só confirmados/realizados" (compromissos firmes). Espelha o
 * `ScopePicker` da tela-mãe `/shows/antecedencia`, preservando o ano ativo em
 * cada link via `buildHref`. Server component puro.
 */
function ScopePicker({
  active,
  buildHref,
}: {
  active: BookingLeadTimeScope;
  buildHref: (over?: { scope?: BookingLeadTimeScope }) => string;
}) {
  const base = "rounded-full px-3 py-1 text-sm font-medium transition-colors";
  const on = "bg-brand-600 text-white";
  const off = "bg-gray-100 text-gray-600 hover:bg-gray-200";
  return (
    <nav aria-label="Escopo da amostra" className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Escopo</span>
      {SCOPE_OPTIONS.map((opt) => (
        <Link
          key={opt.value}
          href={buildHref({ scope: opt.value })}
          className={base + " " + (active === opt.value ? on : off)}
          aria-current={active === opt.value ? "page" : undefined}
        >
          {opt.label}
        </Link>
      ))}
    </nav>
  );
}

/** Rótulo de mediana confiável ou o traço quando a amostra é fina. */
function MedianCell({ sample, medianDays }: { sample: number; medianDays: number }) {
  if (sample >= MIN_LEAD_TIME_SAMPLE) return <>{daysLabel(medianDays)}</>;
  return (
    <span
      className="text-gray-300"
      title={`A mediana exige ao menos ${MIN_LEAD_TIME_SAMPLE} shows mensuráveis (este tem ${sample})`}
    >
      —
    </span>
  );
}

export default async function BookingLeadTimeByContactPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  // Shows com os contatos vinculados — quem responde pelo show é escolhido por
  // papel (`pickPayerContact`, o mesmo eixo dos recebíveis). A regra de
  // antecedência (escopo, mediana, faixas) vive na lógica pura.
  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    include: { contacts: { include: { contact: true } } },
  });

  const scope = parseLeadTimeScope(searchParams?.escopo);

  // Recorte por período (ano), reaproveitando os helpers da D108 e espelhando a
  // tela-mãe `/shows/antecedencia` (D186). Os anos do seletor vêm só dos shows
  // com antecedência mensurável no escopo ativo (`bookingLeadTimeYears`), para
  // não oferecer um ano que renderiza vazio. Filtra-se os registros ANTES de
  // `bookingLeadTimeByContact`, que segue agnóstico ao recorte por ano.
  const availableYears = bookingLeadTimeYears(rows, scope);
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodRows = filterShowsByYear(rows, yearFilter);

  type ShowRow = (typeof rows)[number];
  const getBooker = (show: ShowRow): BookerContact | null => {
    const picked = pickPayerContact(show.contacts.map((cs) => cs.contact));
    return picked ? { id: picked.id, name: picked.name, role: picked.role } : null;
  };

  const report = bookingLeadTimeByContact(
    periodRows as (LeadTimeShowLike & ShowRow)[],
    getBooker as (s: LeadTimeShowLike & ShowRow) => BookerContact | null,
    scope,
  );

  // Comparativo por contratante {ano} × {ano-1}: quem passou a te fechar com mais
  // folga / mais em cima da hora (D196 — fecha o "passo maior" adiado nas D268/D269,
  // espelhando comparePaymentLagByContact/D194). Só com um ano específico e ambos os
  // períodos com amostra mensurável — senão "ganhou/perdeu folga" enganaria. Reusa os
  // mesmos shows já carregados (recorte por `date`, D108) sob o MESMO escopo, sem nova
  // consulta. O veredito por contratante ancora na mediana, o eixo por que a página
  // ordena e destaca.
  let comparison: BookingLeadTimeByContactComparison<BookerContact> | null = null;
  let previousYear = 0;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousReport = bookingLeadTimeByContact(
      filterShowsByYear(rows, previousYear) as (LeadTimeShowLike & ShowRow)[],
      getBooker as (s: LeadTimeShowLike & ShowRow) => BookerContact | null,
      scope,
    );
    if (report.sample > 0 && previousReport.sample > 0) {
      const c = compareBookingLeadTimeByContact(report, previousReport);
      // Só vale exibir se há de fato algum contratante nos dois períodos.
      if (c.changes.length > 0) comparison = c;
    }
  }

  // Lookup por `contact.id` para a coluna "vs. {ano-1}" da tabela: casa cada linha
  // (período atual) com sua variação, ou marca "novo"/"—" (D196). Reusa o mesmo
  // comparativo já computado — zero lógica pura nova na página.
  const rowStatus = comparison ? indexContactBookingLeadTimeChanges(comparison) : null;

  // Monta uma query preservando ano+escopo (para o export, o ScopePicker e o
  // PeriodPicker). Omite o padrão de cada eixo (ano="all", escopo="all") para
  // manter as URLs limpas. Espelha o `buildHref` da tela-mãe.
  const buildHref = (over: { scope?: BookingLeadTimeScope; year?: ProfitYearFilter } = {}): string => {
    const nextScope = over.scope ?? scope;
    const nextYear = over.year ?? yearFilter;
    const q = new URLSearchParams();
    if (nextYear !== "all") q.set("ano", String(nextYear));
    if (nextScope !== "all") q.set("escopo", nextScope);
    const qs = q.toString();
    return qs ? `/shows/antecedencia/por-contratante?${qs}` : "/shows/antecedencia/por-contratante";
  };
  const exportHref = (() => {
    const q = new URLSearchParams();
    if (yearFilter !== "all") q.set("ano", String(yearFilter));
    if (scope === "firm") q.set("escopo", "firm");
    const qs = q.toString();
    return qs
      ? `/shows/antecedencia/por-contratante/export?${qs}`
      : "/shows/antecedencia/por-contratante/export";
  })();

  const scopeLabel =
    scope === "firm" ? "só shows confirmados/realizados" : "todos os shows não cancelados";
  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Antecedência por contratante</h1>
          <p className="text-sm text-gray-500">
            Quem te fecha com folga e quem só chama em cima da hora. Quebra a{" "}
            <Link href="/shows/antecedencia" className="text-brand-700 hover:underline">
              antecedência de agendamento
            </Link>{" "}
            por quem responde por cada show.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {report.rows.length > 0 && (
            <a href={exportHref} className="btn-secondary text-sm" download>
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/antecedencia" className="btn-secondary">
            ← Antecedência
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <ScopePicker active={scope} buildHref={buildHref} />
        {availableYears.length > 0 && (
          <PeriodPicker
            years={availableYears}
            active={yearFilter}
            basePath="/shows/antecedencia/por-contratante"
            ariaLabel="Período da antecedência"
            params={scope === "firm" ? { escopo: "firm" } : undefined}
          />
        )}
      </div>

      {report.sample === 0 ? (
        <div className="card text-center text-gray-500">
          <p>
            Ainda não há shows com antecedência mensurável ({scopeLabel}
            {yearFilter === "all" ? "" : `, ${periodLabel}`}) para medir por contratante.
          </p>
          <p className="mt-1 text-sm">
            A antecedência compara quando o show entrou na agenda com a data em que acontece —
            lançamentos retroativos e cancelados não entram.
          </p>
          {(scope === "firm" || yearFilter !== "all") && (
            <Link
              href={buildHref({ scope: "all", year: "all" })}
              className="mt-3 inline-block text-brand-700 hover:underline"
            >
              Ver todos os shows
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Antecedência mediana (geral)
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {daysLabel(report.overall.medianDays)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {report.contactCount}{" "}
                {report.contactCount === 1 ? "contratante" : "contratantes"} · {report.sample}{" "}
                {report.sample === 1 ? "show mensurável" : "shows mensuráveis"}
                {yearFilter === "all" ? "" : ` · ${periodLabel}`}
              </p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Fecha com mais folga
              </p>
              {report.mostLeadTime?.contact ? (
                <>
                  <p className="mt-1 truncate font-medium text-gray-900">
                    {report.mostLeadTime.contact.name}
                  </p>
                  <p className="mt-1 text-lg font-bold text-emerald-600">
                    {daysLabel(report.mostLeadTime.leadTime.medianDays)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-400">— (amostra fina demais)</p>
              )}
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Fecha em cima da hora
              </p>
              {report.leastLeadTime?.contact ? (
                <>
                  <p className="mt-1 truncate font-medium text-gray-900">
                    {report.leastLeadTime.contact.name}
                  </p>
                  <p className="mt-1 text-lg font-bold text-red-600">
                    {daysLabel(report.leastLeadTime.leadTime.medianDays)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-400">— (amostra fina demais)</p>
              )}
            </div>
          </div>

          {comparison && (
            <LeadTimeMoversCard
              comparison={comparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          {/* Por contratante, do mais em cima da hora ao de maior folga */}
          <section className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Contratante</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 text-right font-medium">Antec. mediana</th>
                  {rowStatus && (
                    <th className="px-4 py-3 text-right font-medium">vs. {previousYear}</th>
                  )}
                  <th className="px-4 py-3 text-right font-medium">Antec. média</th>
                  <th className="px-4 py-3 text-right font-medium">Menor–maior</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.rows.map((r) => (
                  <tr key={r.contact?.id ?? "__none__"} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {r.contact ? (
                        <Link
                          href={`/contatos/${r.contact.id}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {r.contact.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-gray-500">Sem contratante</span>
                      )}
                      <p className="text-xs text-gray-400">
                        {r.contact ? roleLabel(r.contact.role) : "shows sem contato vinculado"}
                        {" · "}
                        {pct(r.share)} da agenda mensurável
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{r.leadTime.sample}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      <MedianCell
                        sample={r.leadTime.sample}
                        medianDays={r.leadTime.medianDays}
                      />
                    </td>
                    {rowStatus && (
                      <td className="px-4 py-3 text-right">
                        <LeadTimeRowDelta
                          status={rowStatus(r.contact?.id)}
                          year={previousYear}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-gray-500">
                      {daysLabel(r.leadTime.avgDays)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {r.leadTime.shortestDays == null || r.leadTime.longestDays == null
                        ? "—"
                        : `${r.leadTime.shortestDays}–${r.leadTime.longestDays} d`}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatMoney(r.totalFee)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Detalhe: shows de cada contratante (maior folga → menor) */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Shows por contratante</h2>
            {report.rows.map((r) => (
              <div key={r.contact?.id ?? "__none__"} className="card">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium text-gray-900">
                    {r.contact ? r.contact.name : "Sem contratante"}
                  </p>
                  <p className="text-sm font-semibold text-gray-700">
                    <MedianCell
                      sample={r.leadTime.sample}
                      medianDays={r.leadTime.medianDays}
                    />{" "}
                    de mediana
                  </p>
                </div>
                <ul className="divide-y divide-gray-100 text-sm">
                  {r.shows.map((s) => {
                    const info = s.show as LeadTimeShowLike & {
                      id: string;
                      title: string;
                      venue: string | null;
                      city: string | null;
                    };
                    return (
                      <li key={info.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <Link
                            href={`/shows/${info.id}`}
                            className="font-medium text-gray-900 hover:underline"
                          >
                            {info.title}
                          </Link>
                          <p className="text-xs text-gray-400">
                            {formatDate(info.date)}
                            {info.venue
                              ? ` · ${info.venue}`
                              : info.city
                                ? ` · ${info.city}`
                                : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold text-gray-900">{daysLabel(s.leadDays)}</p>
                          <p className="text-xs text-gray-400">{formatMoney(info.fee)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>

          <p className="text-xs text-gray-400">
            Cada show é atribuído ao contato responsável por ele (contratante/promoter antes da
            casa, mesmo critério dos recebíveis). A antecedência de cada contratante é a
            diferença, em dias, entre quando o show entrou na agenda e a data em que acontece —
            maior folga dá runway para prospectar e precificar. A{" "}
            <strong>antecedência mediana</strong> resiste a um show isolado que puxa a média, e só
            aparece a partir de {MIN_LEAD_TIME_SAMPLE} shows mensuráveis — abaixo disso é ruidosa
            demais e fica &quot;—&quot;. Shows sem contato vinculado caem em &quot;Sem
            contratante&quot;. Lançamentos retroativos (registrados depois da data do show) e
            cancelados não entram.
            {rowStatus && (
              <>
                {" "}
                A coluna <strong>vs. {previousYear}</strong> mostra a variação da antecedência
                mediana de cada contratante frente ao ano anterior —{" "}
                <span className="text-emerald-600">verde</span> passou a fechar com mais folga,{" "}
                <span className="text-red-600">vermelho</span> passou a chamar mais em cima da hora,
                &quot;novo&quot; começou a fechar só neste ano.
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}

/** Variação da antecedência em dias com sinal (ex.: 12 → "+12 dias", -1 → "−1 dia"). */
function signedDaysLabel(delta: number): string {
  if (delta === 0) return "0 dias";
  const abs = Math.abs(delta);
  return `${delta > 0 ? "+" : "−"}${abs} ${abs === 1 ? "dia" : "dias"}`;
}

/**
 * Célula da coluna "vs. {ano-1}" na tabela por contratante: a variação da
 * antecedência mediana deste contratante frente ao ano anterior
 * (`indexContactBookingLeadTimeChanges`, D196). Subir a antecedência é melhora
 * (verde, fecha com mais folga); descer é piora (vermelho, mais em cima da hora);
 * dentro do limiar é estável (cinza). Quem só apareceu neste ano vira "novo"; o
 * grupo sem contratante e quem não é comparável ficam em "—".
 */
function LeadTimeRowDelta({
  status,
  year,
}: {
  status: ContactBookingLeadTimeRowStatus<BookerContact>;
  year: number;
}) {
  if (status.kind === "new") {
    return (
      <span className="text-xs text-gray-400" title={`Começou a fechar depois de ${year}`}>
        novo
      </span>
    );
  }
  if (status.kind === "none") {
    return <span className="text-gray-300">—</span>;
  }
  const { medianDaysDelta, trend } = status.change;
  const tone =
    trend === "improved"
      ? "text-emerald-600"
      : trend === "worsened"
        ? "text-red-600"
        : "text-gray-500";
  return <span className={"font-medium " + tone}>{signedDaysLabel(medianDaysDelta)}</span>;
}

/** Um lado do card de "movers": quem ganhou ou quem perdeu folga de agenda. */
function MoverBlock({
  title,
  change,
  tone,
}: {
  title: string;
  change: ContactBookingLeadTimeChange<BookerContact> | null;
  tone: "improved" | "worsened";
}) {
  const valueClass = tone === "improved" ? "text-emerald-600" : "text-red-600";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
      {change ? (
        <>
          <p className="mt-1 truncate font-medium text-gray-900">{change.contact.name}</p>
          <p className={"mt-1 text-lg font-bold " + valueClass}>
            {signedDaysLabel(change.medianDaysDelta)}
          </p>
          <p className="text-xs text-gray-400">
            {daysLabel(change.previous.leadTime.medianDays)} →{" "}
            {daysLabel(change.current.leadTime.medianDays)}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-gray-400">
          Nenhum contratante {tone === "improved" ? "ganhou" : "perdeu"} mais de{" "}
          {LEAD_TIME_TREND_EPSILON} dias de folga
        </p>
      )}
    </div>
  );
}

/**
 * Card "Quem mudou o ritmo de agenda {ano} vs. {ano-1}": destaca o contratante que
 * mais ganhou folga (passou a te fechar com mais antecedência) e o que mais perdeu
 * (passou a chamar em cima da hora) frente ao ano anterior
 * (`compareBookingLeadTimeByContact`, D196). Ao contrário do prazo de recebimento,
 * aqui **subir** a antecedência é a melhora — mais runway para prospectar e
 * precificar. Fecha o rodapé com os contratantes que entraram e sumiram da carteira
 * neste ano. Espelho de `PaymentLagMoversCard` no eixo da antecedência.
 */
function LeadTimeMoversCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: BookingLeadTimeByContactComparison<BookerContact>;
  currentYear: number;
  previousYear: number;
}) {
  const { biggestImprovement, biggestWorsening, changes, newContacts, droppedContacts } =
    comparison;
  const smallSample = [biggestImprovement, biggestWorsening].some(
    (c) =>
      c &&
      (c.current.leadTime.sample < MIN_LEAD_TIME_SAMPLE ||
        c.previous.leadTime.sample < MIN_LEAD_TIME_SAMPLE),
  );
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Quem mudou o ritmo de agenda · {currentYear} vs. {previousYear}
        </p>
        <span className="text-xs text-gray-400">
          {changes.length}{" "}
          {changes.length === 1 ? "contratante comparável" : "contratantes comparáveis"}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MoverBlock title="Passou a fechar com folga" change={biggestImprovement} tone="improved" />
        <MoverBlock title="Passou a chamar em cima da hora" change={biggestWorsening} tone="worsened" />
      </div>
      {(newContacts.length > 0 || droppedContacts.length > 0) && (
        <p className="text-xs text-gray-400">
          {newContacts.length > 0 && (
            <>
              {newContacts.length}{" "}
              {newContacts.length === 1
                ? "contratante começou a fechar"
                : "contratantes começaram a fechar"}{" "}
              em {currentYear}
            </>
          )}
          {newContacts.length > 0 && droppedContacts.length > 0 && " · "}
          {droppedContacts.length > 0 && (
            <>
              {droppedContacts.length}{" "}
              {droppedContacts.length === 1 ? "fechou" : "fecharam"} em {previousYear} mas não em{" "}
              {currentYear}
            </>
          )}
          .
        </p>
      )}
      {smallSample && (
        <p className="text-xs text-gray-400">
          Amostra pequena em ao menos um dos destaques — poucos shows tornam a comparação da
          mediana sensível a casos isolados.
        </p>
      )}
    </section>
  );
}
