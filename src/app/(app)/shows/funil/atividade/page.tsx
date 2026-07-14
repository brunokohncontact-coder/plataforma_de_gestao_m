import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  buildFunnelActivityFeed,
  countFunnelActivityByKind,
  filterFunnelActivityByKind,
  groupFunnelActivityByDay,
  parseFunnelActivityKind,
  parseFeedPage,
  sliceFeedPage,
  parseFeedYear,
  feedYearRangeUtc,
  feedActivityYears,
  relativeDayLabel,
  FUNNEL_ACTIVITY_KINDS,
  type FunnelActivityEntry,
  type FunnelActivityKind,
} from "@/lib/shows";
import { dayKey } from "@/lib/finance";
import { PeriodPicker } from "@/components/PeriodPicker";
import { formatDateTime, formatDate } from "@/lib/format";
import {
  SHOW_STATUS_LABELS,
  SHOW_STATUS_COLORS,
  type ShowStatus,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

/** Quantas transições cada página do feed carrega/exibe. */
const PAGE_SIZE = 100;

const statusLabel = (s: string): string =>
  SHOW_STATUS_LABELS[s as ShowStatus] ?? s;

/**
 * Rótulo pt-BR de uma chave de dia "YYYY-MM-DD" — sempre em UTC (a mesma
 * convenção de `groupFunnelActivityByDay`/`dayKey`), para o cabeçalho do dia
 * bater exatamente com a chave que agrupou as entradas, sem deriva de fuso.
 */
const formatDayHeader = (day: string): string => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

/** Aparência de cada natureza de transição — seta, tom e rótulo curto. */
const KIND_META: Record<
  FunnelActivityKind,
  { arrow: string; dot: string; label: string }
> = {
  create: { arrow: "✚", dot: "bg-amber-500", label: "Cadastro" },
  advance: { arrow: "↗", dot: "bg-emerald-500", label: "Avançou" },
  regress: { arrow: "↘", dot: "bg-orange-500", label: "Recuou" },
  cancel: { arrow: "✕", dot: "bg-gray-400", label: "Cancelou" },
  reopen: { arrow: "↺", dot: "bg-blue-500", label: "Reabriu" },
};

export default async function FunnelActivityPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  // Filtro por natureza da transição (`?natureza=`); `null` = todas.
  const activeKind = parseFunnelActivityKind(searchParams?.natureza);

  // Modo de visualização: lista plana (padrão) ou agrupado por dia (`?agrupar=dia`).
  const rawAgrupar = Array.isArray(searchParams?.agrupar)
    ? searchParams?.agrupar[0]
    : searchParams?.agrupar;
  const groupByDay = rawAgrupar === "dia";

  // Recorte por ano da atividade (`?ano=`, pelo `createdAt` do evento em UTC);
  // `null` = todos os anos. Filtra no banco, então a paginação passa a correr
  // dentro do ano escolhido.
  const activeYear = parseFeedYear(searchParams?.ano);

  // Página do feed (`?pagina=`, 1 = a mais recente). Paginamos o stream cru de
  // eventos: cada página é uma janela de `PAGE_SIZE` transições.
  const page = parseFeedPage(searchParams?.pagina);

  // Cláusula de recorte reusada pela consulta da página; o ano vira uma faixa
  // meia-aberta `[gte, lt)` sobre `createdAt` (UTC), consistente com a chave de
  // dia do feed.
  const yearRange = activeYear !== null ? feedYearRangeUtc(activeYear) : null;
  const where = {
    userId: user.id,
    ...(yearRange ? { createdAt: { gte: yearRange.gte, lt: yearRange.lt } } : {}),
  };

  // Anos oferecidos no seletor de período — derivados do evento mais antigo e do
  // mais novo da carteira (dois pontos indexados, INDEPENDENTES do recorte atual,
  // para o seletor ficar estável mesmo dentro de um ano vazio).
  const [oldestEvent, newestEvent] = await Promise.all([
    prisma.showStatusEvent.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.showStatusEvent.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);
  const years = feedActivityYears(
    oldestEvent?.createdAt ?? null,
    newestEvent?.createdAt ?? null,
  );

  // O feed vem direto dos eventos de status (índice `[userId]` em
  // `ShowStatusEvent`), já ordenados no banco; juntamos só o título e a data do
  // show para cada linha. Buscamos UM item além da página (`PAGE_SIZE + 1`) para
  // saber, sem uma contagem extra, se há uma página mais antiga adiante.
  const fetched = await prisma.showStatusEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    select: {
      showId: true,
      fromStatus: true,
      toStatus: true,
      createdAt: true,
      show: { select: { title: true, date: true } },
    },
  });

  // Recorta o sentinela extra: `hasNext` indica se há transições mais antigas.
  const { items: pageEvents, hasNext } = sliceFeedPage(fetched, PAGE_SIZE);
  const hasPrev = page > 1;

  const feed = buildFunnelActivityFeed(
    pageEvents.map((e) => ({
      showId: e.showId,
      showTitle: e.show?.title ?? "Show removido",
      showDate: e.show?.date ?? null,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      at: e.createdAt,
    })),
  );

  // Contagens por natureza (dentro da janela carregada) para os chips, e o
  // recorte exibido conforme o filtro ativo.
  const counts = countFunnelActivityByKind(feed);
  const visible = filterFunnelActivityByKind(feed, activeKind);
  // No modo "por dia", rebaldeamos o recorte visível em dias (recente→antigo).
  const dayGroups = groupByDay ? groupFunnelActivityByDay(visible) : [];
  // Chave do dia de hoje (UTC, mesma convenção de `dayKey`) para rotular os
  // cabeçalhos como "Hoje"/"Ontem" sem varrer o relógio dentro do helper puro.
  const todayKey = dayKey(new Date());

  // Monta uma query string preservando `ano`, `natureza`, `agrupar` e `pagina`
  // com sobrescritas. `pagina` só entra na URL a partir da 2ª página (1 é o
  // padrão); `ano` só quando há recorte.
  const buildHref = (over: {
    ano?: number | null;
    natureza?: FunnelActivityKind | null;
    agrupar?: boolean;
    pagina?: number;
  }): string => {
    const year = over.ano !== undefined ? over.ano : activeYear;
    const kind = over.natureza !== undefined ? over.natureza : activeKind;
    const grouped = over.agrupar !== undefined ? over.agrupar : groupByDay;
    const pg = over.pagina !== undefined ? over.pagina : page;
    const params = new URLSearchParams();
    if (year !== null) params.set("ano", String(year));
    if (kind !== null) params.set("natureza", kind);
    if (grouped) params.set("agrupar", "dia");
    if (pg > 1) params.set("pagina", String(pg));
    const qs = params.toString();
    return qs ? `/shows/funil/atividade?${qs}` : "/shows/funil/atividade";
  };

  // Chip de natureza: troca o filtro, volta à 1ª página (as contagens dos chips
  // valem para a página exibida, então recomeçar do topo evita leitura enganosa).
  const chipHref = (kind: FunnelActivityKind | null): string =>
    buildHref({ natureza: kind, pagina: 1 });

  // O link de export espelha o recorte por ano, o filtro ativo E a página atual
  // para baixar exatamente o recorte visível.
  const exportHref = (() => {
    const params = new URLSearchParams();
    if (activeYear !== null) params.set("ano", String(activeYear));
    if (activeKind !== null) params.set("natureza", activeKind);
    if (page > 1) params.set("pagina", String(page));
    const qs = params.toString();
    return qs
      ? `/shows/funil/atividade/export?${qs}`
      : "/shows/funil/atividade/export";
  })();

  // Uma linha do feed — reusada na lista plana e dentro de cada dia agrupado.
  const renderEntry = (entry: FunnelActivityEntry, key: string | number) => {
    const meta = KIND_META[entry.kind];
    return (
      <li key={key} className="flex items-start gap-3">
        <span
          className={
            "mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full " + meta.dot
          }
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <Link
              href={`/shows/${entry.showId}`}
              className="font-medium text-gray-900 hover:underline"
            >
              {entry.showTitle}
            </Link>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-gray-700">
            {entry.fromStatus === null ? (
              <>
                <span aria-hidden="true">{meta.arrow}</span>
                Cadastrado como
                <span
                  className={"badge " + SHOW_STATUS_COLORS[entry.toStatus as ShowStatus]}
                >
                  {statusLabel(entry.toStatus)}
                </span>
              </>
            ) : (
              <>
                <span
                  className={"badge " + SHOW_STATUS_COLORS[entry.fromStatus as ShowStatus]}
                >
                  {statusLabel(entry.fromStatus)}
                </span>
                <span aria-hidden="true">{meta.arrow}</span>
                <span
                  className={"badge " + SHOW_STATUS_COLORS[entry.toStatus as ShowStatus]}
                >
                  {statusLabel(entry.toStatus)}
                </span>
              </>
            )}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {formatDateTime(entry.at)}
            {entry.showDate && <> · show em {formatDate(entry.showDate)}</>}
          </p>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Atividade do funil</h1>
          <p className="text-sm text-gray-500">
            As últimas mudanças de status na sua carteira — cadastros, avanços,
            recuos, cancelamentos e reaberturas — mais recentes primeiro. É o log
            do funil inteiro, a mesma linha do tempo que a página de cada show mostra
            por show.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {visible.length > 0 && (
            <a href={exportHref} className="btn-secondary">
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/funil/atividade/ritmo" className="btn-secondary">
            📊 Ritmo mensal
          </Link>
          <Link href="/shows/funil" className="btn-secondary">
            ← Funil
          </Link>
        </div>
      </div>

      {/* Seletor de período (ano da atividade, pelo `createdAt` do evento).
          Fica visível sempre que a carteira tem algum evento — inclusive dentro
          de um ano vazio — para o usuário poder trocar de ano ou voltar a
          "Todos". Trocar de ano/período volta à 1ª página e preserva
          natureza + modo de visualização (`params`). */}
      {years.length > 0 && (
        <PeriodPicker
          years={years}
          active={activeYear ?? "all"}
          basePath="/shows/funil/atividade"
          ariaLabel="Período da atividade"
          params={{
            ...(activeKind !== null ? { natureza: activeKind } : {}),
            ...(groupByDay ? { agrupar: "dia" } : {}),
          }}
        />
      )}

      {feed.length === 0 ? (
        hasPrev ? (
          <div className="card text-sm text-gray-500">
            Nada nesta página — você passou do fim do histórico.{" "}
            <Link
              href={buildHref({ pagina: 1 })}
              className="text-brand-600 hover:underline"
            >
              Voltar ao início
            </Link>
            .
          </div>
        ) : activeYear !== null ? (
          <div className="card text-sm text-gray-500">
            Nenhuma atividade registrada em {activeYear}.{" "}
            <Link
              href={buildHref({ ano: null, pagina: 1 })}
              className="text-brand-600 hover:underline"
            >
              Ver todos os anos
            </Link>
            .
          </div>
        ) : (
          <div className="card text-sm text-gray-500">
            Nenhuma movimentação registrada ainda. Cadastre um show e mova-o pelo
            funil (proposto → confirmado → realizado) para ver a atividade aqui.
          </div>
        )
      ) : (
        <>
          {/* Chips de filtro por natureza — "Todas" + as cinco naturezas, com
              a contagem dentro da página exibida; o ativo fica destacado. */}
          <nav
            className="flex flex-wrap gap-2"
            aria-label="Filtrar por natureza da transição"
          >
            <Link
              href={chipHref(null)}
              aria-current={activeKind === null ? "page" : undefined}
              className={
                "rounded-full border px-3 py-1 text-sm transition-colors " +
                (activeKind === null
                  ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50")
              }
            >
              Todas ({feed.length})
            </Link>
            {FUNNEL_ACTIVITY_KINDS.map((kind) => {
              const active = activeKind === kind;
              return (
                <Link
                  key={kind}
                  href={chipHref(kind)}
                  aria-current={active ? "page" : undefined}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors " +
                    (active
                      ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50")
                  }
                >
                  <span
                    className={
                      "inline-block h-2 w-2 rounded-full " + KIND_META[kind].dot
                    }
                    aria-hidden="true"
                  />
                  {KIND_META[kind].label} ({counts[kind]})
                </Link>
              );
            })}
          </nav>

          {/* Alternador de visualização: lista plana × agrupado por dia. */}
          <div
            className="inline-flex overflow-hidden rounded-lg border border-gray-200 text-sm"
            role="group"
            aria-label="Modo de visualização"
          >
            <Link
              href={buildHref({ agrupar: false })}
              aria-current={!groupByDay ? "true" : undefined}
              className={
                "px-3 py-1 transition-colors " +
                (!groupByDay
                  ? "bg-brand-50 font-medium text-brand-700"
                  : "text-gray-600 hover:bg-gray-50")
              }
            >
              Lista
            </Link>
            <Link
              href={buildHref({ agrupar: true })}
              aria-current={groupByDay ? "true" : undefined}
              className={
                "border-l border-gray-200 px-3 py-1 transition-colors " +
                (groupByDay
                  ? "bg-brand-50 font-medium text-brand-700"
                  : "text-gray-600 hover:bg-gray-50")
              }
            >
              Por dia
            </Link>
          </div>

          {visible.length === 0 ? (
            <div className="card text-sm text-gray-500">
              Nenhuma transição do tipo “{KIND_META[activeKind!].label}” entre as{" "}
              {feed.length} mais recentes.{" "}
              <Link href={chipHref(null)} className="text-brand-600 hover:underline">
                Ver todas
              </Link>
              .
            </div>
          ) : (
        <>
          {groupByDay ? (
            <div className="space-y-4">
              {dayGroups.map((group) => {
                const relLabel = relativeDayLabel(group.day, todayKey);
                return (
                <section key={group.day} className="card">
                  <h2 className="mb-3 flex items-baseline justify-between gap-2 border-b pb-2 text-sm font-semibold capitalize text-gray-900">
                    <span>
                      {relLabel && (
                        <span className="mr-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium normal-case text-brand-700">
                          {relLabel}
                        </span>
                      )}
                      {formatDayHeader(group.day)}
                    </span>
                    <span className="text-xs font-normal text-gray-400">
                      {group.entries.length}{" "}
                      {group.entries.length === 1 ? "transição" : "transições"}
                    </span>
                  </h2>
                  <ol className="space-y-4">
                    {group.entries.map((entry, i) =>
                      renderEntry(entry, `${group.day}-${i}`),
                    )}
                  </ol>
                </section>
                );
              })}
            </div>
          ) : (
            <section className="card">
              <ol className="space-y-4">
                {visible.map((entry, i) => renderEntry(entry, i))}
              </ol>
            </section>
          )}
        </>
          )}

          {/* Paginação do stream cru: "mais recentes" (página anterior) e "mais
              antigas" (próxima). Preservam natureza e modo de visualização. */}
          {(hasPrev || hasNext) && (
            <nav
              className="flex items-center justify-between gap-3 pt-1 text-sm"
              aria-label="Paginação da atividade"
            >
              {hasPrev ? (
                <Link
                  href={buildHref({ pagina: page - 1 })}
                  className="btn-secondary"
                  rel="prev"
                >
                  ← Mais recentes
                </Link>
              ) : (
                <span />
              )}
              <span className="text-xs text-gray-400">Página {page}</span>
              {hasNext ? (
                <Link
                  href={buildHref({ pagina: page + 1 })}
                  className="btn-secondary"
                  rel="next"
                >
                  Mais antigas →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
