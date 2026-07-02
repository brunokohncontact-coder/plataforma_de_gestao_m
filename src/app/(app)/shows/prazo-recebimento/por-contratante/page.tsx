import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  paymentLagByContact,
  comparePaymentLagByContact,
  indexContactPaymentLagChanges,
  paymentLagYears,
  parseProfitYear,
  filterShowsByYear,
  MIN_MEDIAN_LAG_SAMPLE,
  PAYMENT_LAG_TREND_EPSILON,
  type PaymentSpeedBucketKey,
  type PaymentLagByContactComparison,
  type ContactPaymentLagChange,
  type ContactPaymentLagRowStatus,
  type ReceivableShowLike,
  type TxLike,
} from "@/lib/finance";
import { pickPayerContact } from "@/lib/billing";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

/** Contato resolvido como pagador de um show (campos usados na página). */
interface PayerContact {
  id: string;
  name: string;
  role: string;
}

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** Texto pt-BR para um prazo em dias (negativo = adiantado). */
function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} d adiantado`;
  if (days === 0) return "no dia";
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}

function roleLabel(role: string): string {
  return CONTACT_ROLE_LABELS[role as ContactRole] ?? CONTACT_ROLE_LABELS.OTHER;
}

const BUCKET_TONES: Record<PaymentSpeedBucketKey, string> = {
  onTime: "bg-emerald-400",
  d7: "bg-emerald-400",
  d30: "bg-amber-400",
  d60: "bg-orange-400",
  slow: "bg-red-400",
};

const BUCKET_TEXT_TONES: Record<PaymentSpeedBucketKey, string> = {
  onTime: "text-emerald-600",
  d7: "text-emerald-600",
  d30: "text-amber-600",
  d60: "text-orange-600",
  slow: "text-red-600",
};

export default async function PaymentLagByContactPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  // Shows não cancelados (a data deles é a âncora do prazo) com os contatos
  // vinculados, e as receitas já recebidas. Quem paga é escolhido por papel
  // (pickPayerContact); a agregação e o prazo ponderado ficam na lógica pura.
  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id, status: { not: "CANCELLED" } },
      orderBy: { date: "asc" },
      include: { contacts: { include: { contact: true } } },
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

  type ShowRow = (typeof shows)[number];
  const getPayer = (show: ShowRow): PayerContact | null => {
    const picked = pickPayerContact(show.contacts.map((cs) => cs.contact));
    return picked
      ? { id: picked.id, name: picked.name, role: picked.role }
      : null;
  };

  // Recorte por período (ano): o seletor só oferece anos com prazo mensurável
  // (`paymentLagYears` — shows não cancelados que já receberam algo), casando a
  // tela-mãe (D192). Filtra os shows pelo ano da `date` (`filterShowsByYear`,
  // D108) antes de agregar por contratante — os destaques, a tabela e o detalhe
  // saem recortados sem tocar a lógica pura de `paymentLagByContact` (o eixo é
  // quando o show aconteceu, não quando o dinheiro entrou).
  const availableYears = paymentLagYears(shows, txs);
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;

  const lag = paymentLagByContact(
    filterShowsByYear(shows, yearFilter) as (ReceivableShowLike & ShowRow)[],
    txs,
    getPayer as (s: ReceivableShowLike & ShowRow) => PayerContact | null,
  );

  // Comparativo por contratante {ano} × {ano-1}: quem começou a te pagar mais
  // rápido / mais devagar (D194 adiara este "passo maior"). Só com um ano
  // específico e ambos os períodos com recebimento — senão "acelerou/desacelerou"
  // enganaria. Reusa os mesmos shows/txs já carregados (recorte por `date`, D108),
  // sem nova consulta. O veredito por contratante ancora na média (avgDays), o
  // eixo por que a página já ordena e destaca.
  let comparison: PaymentLagByContactComparison<PayerContact> | null = null;
  let previousYear = 0;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousLag = paymentLagByContact(
      filterShowsByYear(shows, previousYear) as (ReceivableShowLike & ShowRow)[],
      txs,
      getPayer as (s: ReceivableShowLike & ShowRow) => PayerContact | null,
    );
    if (lag.paymentCount > 0 && previousLag.paymentCount > 0) {
      const c = comparePaymentLagByContact(lag, previousLag);
      // Só vale exibir se há de fato algum contratante nos dois períodos.
      if (c.changes.length > 0) comparison = c;
    }
  }

  // Lookup por `contact.id` para a coluna "vs. {ano-1}" da tabela: casa cada linha
  // (período atual) com sua variação de prazo, ou marca "novo"/"—" (D195). Reusa o
  // mesmo comparativo já computado — zero lógica pura nova na página.
  const rowStatus = comparison ? indexContactPaymentLagChanges(comparison) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prazo de recebimento por contratante</h1>
          <p className="text-sm text-gray-500">
            Quem te paga rápido e quem te deixa esperando. Quebra o{" "}
            <Link href="/shows/prazo-recebimento" className="text-brand-700 hover:underline">
              prazo de recebimento
            </Link>{" "}
            por quem responde pelo pagamento de cada show.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lag.rows.length > 0 && (
            <a
              href={`/shows/prazo-recebimento/por-contratante/export${
                yearFilter === "all" ? "" : `?ano=${yearFilter}`
              }`}
              className="btn-secondary text-sm"
              download
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/prazo-recebimento" className="btn-secondary">
            ← Prazo de recebimento
          </Link>
        </div>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker
          years={availableYears}
          active={yearFilter}
          basePath="/shows/prazo-recebimento/por-contratante"
        />
      )}

      {lag.contactCount === 0 && lag.rows.length === 0 ? (
        <div className="card text-center text-gray-500">
          {yearFilter === "all" ? (
            <>
              <p>
                Ainda não há cachês recebidos e vinculados a shows para medir o prazo por
                contratante.
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
                Escolha outro período acima para ver o prazo por contratante.
              </p>
              <Link
                href="/shows/prazo-recebimento/por-contratante"
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Prazo médio (ponderado)
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900">{daysLabel(lag.avgDays)}</p>
              <p className="mt-1 text-xs text-gray-400">
                {lag.contactCount}{" "}
                {lag.contactCount === 1 ? "contratante" : "contratantes"} ·{" "}
                {formatMoney(lag.totalReceived)} recebidos
              </p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Paga mais rápido
              </p>
              {lag.fastest?.contact ? (
                <>
                  <p className="mt-1 truncate font-medium text-gray-900">
                    {lag.fastest.contact.name}
                  </p>
                  <p className="mt-1 text-lg font-bold text-emerald-600">
                    {daysLabel(lag.fastest.avgDays)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-400">—</p>
              )}
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Paga mais devagar
              </p>
              {lag.slowest?.contact ? (
                <>
                  <p className="mt-1 truncate font-medium text-gray-900">
                    {lag.slowest.contact.name}
                  </p>
                  <p className="mt-1 text-lg font-bold text-red-600">
                    {daysLabel(lag.slowest.avgDays)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-400">—</p>
              )}
            </div>
          </div>

          {comparison && (
            <PaymentLagMoversCard
              comparison={comparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          {/* Por contratante, do mais lento ao mais rápido */}
          <section className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Contratante</th>
                  <th className="px-4 py-3 text-right font-medium">Recebido</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 text-right font-medium">Prazo médio</th>
                  {rowStatus && (
                    <th className="px-4 py-3 text-right font-medium">vs. {previousYear}</th>
                  )}
                  <th className="px-4 py-3 text-right font-medium">Prazo mediano</th>
                  <th className="px-4 py-3 text-right font-medium">Pior prazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lag.rows.map((r) => (
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
                        {pct(r.share)} do recebido
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {formatMoney(r.received)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{r.showCount}</td>
                    <td
                      className={
                        "px-4 py-3 text-right font-medium " + BUCKET_TEXT_TONES[r.bucket]
                      }
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className={"h-2 w-2 rounded-full " + BUCKET_TONES[r.bucket]} />
                        {daysLabel(r.avgDays)}
                      </span>
                    </td>
                    {rowStatus && (
                      <td className="px-4 py-3 text-right">
                        <PaymentLagRowDelta status={rowStatus(r.contact?.id)} year={previousYear} />
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-gray-500">
                      {r.showCount >= MIN_MEDIAN_LAG_SAMPLE ? (
                        daysLabel(r.medianDays)
                      ) : (
                        <span
                          className="text-gray-300"
                          title={`Mediana exige ao menos ${MIN_MEDIAN_LAG_SAMPLE} shows pagos (este tem ${r.showCount})`}
                        >
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {daysLabel(r.lastDays)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Detalhe: shows de cada contratante (lento → rápido) */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Shows por contratante</h2>
            {lag.rows.map((r) => (
              <div key={r.contact?.id ?? "__none__"} className="card">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium text-gray-900">
                    {r.contact ? r.contact.name : "Sem contratante"}
                  </p>
                  <p className={"text-sm font-semibold " + BUCKET_TEXT_TONES[r.bucket]}>
                    {daysLabel(r.avgDays)} em média
                  </p>
                </div>
                <ul className="divide-y divide-gray-100 text-sm">
                  {r.shows.map((s) => {
                    const info = s.show as ReceivableShowLike & {
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
                          <p className="font-semibold text-emerald-600">
                            {formatMoney(s.received)}
                          </p>
                          <p className="text-xs text-gray-400">{daysLabel(s.avgDays)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>

          <p className="text-xs text-gray-400">
            Cada show é atribuído ao contato responsável pelo pagamento (contratante/promoter
            antes da casa). O prazo de cada contratante pondera os shows pelo valor recebido.
            O <strong>prazo mediano</strong> (dia em que metade do que ele pagou já tinha
            entrado) resiste a um show muito atrasado que infla a média, e só aparece a partir
            de {MIN_MEDIAN_LAG_SAMPLE} shows pagos — abaixo disso é ruidoso demais. Shows sem
            contato vinculado caem em &quot;Sem contratante&quot;. Considera só receitas já
            recebidas e vinculadas a um show.
            {rowStatus && (
              <>
                {" "}
                A coluna <strong>vs. {previousYear}</strong> mostra a variação do prazo médio de
                cada contratante frente ao ano anterior — <span className="text-emerald-600">
                  verde</span> passou a pagar mais cedo, <span className="text-red-600">vermelho
                </span> demorou mais, &quot;novo&quot; começou a pagar só neste ano.
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}

/** Formata uma variação em dias com sinal (ex.: 12 → "+12 dias", -1 → "−1 dia"). */
function daysDelta(delta: number): string {
  if (delta === 0) return "0 dias";
  const abs = Math.abs(delta);
  return `${delta > 0 ? "+" : "−"}${abs} ${abs === 1 ? "dia" : "dias"}`;
}

/**
 * Célula da coluna "vs. {ano-1}" na tabela por contratante: a variação do prazo
 * médio deste contratante frente ao ano anterior (`indexContactPaymentLagChanges`,
 * D195). Descer o prazo é melhora (verde, o cachê entra mais cedo); subir é piora
 * (vermelho); dentro do limiar é estável (cinza). Quem só apareceu neste ano vira
 * "novo"; o grupo sem contratante e quem não é comparável ficam em "—".
 */
function PaymentLagRowDelta({
  status,
  year,
}: {
  status: ContactPaymentLagRowStatus<PayerContact>;
  year: number;
}) {
  if (status.kind === "new") {
    return (
      <span className="text-xs text-gray-400" title={`Começou a pagar depois de ${year}`}>
        novo
      </span>
    );
  }
  if (status.kind === "none") {
    return <span className="text-gray-300">—</span>;
  }
  const { avgDaysDelta, trend } = status.change;
  const tone =
    trend === "improved"
      ? "text-emerald-600"
      : trend === "worsened"
        ? "text-red-600"
        : "text-gray-500";
  return <span className={"font-medium " + tone}>{daysDelta(avgDaysDelta)}</span>;
}

/** Um lado do card de "movers": quem acelerou ou quem desacelerou. */
function MoverBlock({
  title,
  change,
  tone,
}: {
  title: string;
  change: ContactPaymentLagChange<PayerContact> | null;
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
            {daysDelta(change.avgDaysDelta)}
          </p>
          <p className="text-xs text-gray-400">
            {daysLabel(change.previous.avgDays)} → {daysLabel(change.current.avgDays)}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-gray-400">
          Nenhum contratante {tone === "improved" ? "acelerou" : "desacelerou"} além de{" "}
          {PAYMENT_LAG_TREND_EPSILON} dias
        </p>
      )}
    </div>
  );
}

/**
 * Card "Quem mudou de ritmo {ano} vs. {ano-1}": destaca o contratante que mais
 * acelerou e o que mais desacelerou o pagamento em relação ao ano anterior
 * (`comparePaymentLagByContact`, D194). Ao contrário do booking lead time, aqui
 * **descer** o prazo é a melhora — o cachê entra mais cedo. Fecha o rodapé com os
 * contratantes que entraram (começaram a pagar) e sumiram do caixa neste ano.
 */
function PaymentLagMoversCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: PaymentLagByContactComparison<PayerContact>;
  currentYear: number;
  previousYear: number;
}) {
  const { biggestImprovement, biggestWorsening, changes, newContacts, droppedContacts } =
    comparison;
  const smallSample = [biggestImprovement, biggestWorsening].some(
    (c) =>
      c &&
      (c.current.showCount < MIN_MEDIAN_LAG_SAMPLE ||
        c.previous.showCount < MIN_MEDIAN_LAG_SAMPLE),
  );
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Quem mudou de ritmo · {currentYear} vs. {previousYear}
        </p>
        <span className="text-xs text-gray-400">
          {changes.length}{" "}
          {changes.length === 1 ? "contratante comparável" : "contratantes comparáveis"}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MoverBlock title="Acelerou o pagamento" change={biggestImprovement} tone="improved" />
        <MoverBlock title="Desacelerou o pagamento" change={biggestWorsening} tone="worsened" />
      </div>
      {(newContacts.length > 0 || droppedContacts.length > 0) && (
        <p className="text-xs text-gray-400">
          {newContacts.length > 0 && (
            <>
              {newContacts.length}{" "}
              {newContacts.length === 1
                ? "contratante começou a pagar"
                : "contratantes começaram a pagar"}{" "}
              em {currentYear}
            </>
          )}
          {newContacts.length > 0 && droppedContacts.length > 0 && " · "}
          {droppedContacts.length > 0 && (
            <>
              {droppedContacts.length}{" "}
              {droppedContacts.length === 1 ? "pagou" : "pagaram"} em {previousYear} mas não em{" "}
              {currentYear}
            </>
          )}
          .
        </p>
      )}
      {smallSample && (
        <p className="text-xs text-gray-400">
          Amostra pequena em ao menos um dos destaques — poucos shows tornam a comparação
          sensível a casos isolados.
        </p>
      )}
    </section>
  );
}
