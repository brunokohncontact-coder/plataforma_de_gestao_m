import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  buildFunnelActivityFeed,
  countFunnelActivityByKind,
  filterFunnelActivityByKind,
  parseFunnelActivityKind,
  FUNNEL_ACTIVITY_KINDS,
  type FunnelActivityKind,
} from "@/lib/shows";
import { formatDateTime, formatDate } from "@/lib/format";
import {
  SHOW_STATUS_LABELS,
  SHOW_STATUS_COLORS,
  type ShowStatus,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

/** Quantas transições recentes o feed carrega/exibe. */
const ACTIVITY_LIMIT = 100;

const statusLabel = (s: string): string =>
  SHOW_STATUS_LABELS[s as ShowStatus] ?? s;

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

  // O feed vem direto dos eventos de status (índice `[userId]` em
  // `ShowStatusEvent`), já ordenados e limitados no banco; juntamos só o título e
  // a data do show para cada linha. O helper puro reordena/classifica.
  const events = await prisma.showStatusEvent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: ACTIVITY_LIMIT,
    select: {
      showId: true,
      fromStatus: true,
      toStatus: true,
      createdAt: true,
      show: { select: { title: true, date: true } },
    },
  });

  const feed = buildFunnelActivityFeed(
    events.map((e) => ({
      showId: e.showId,
      showTitle: e.show?.title ?? "Show removido",
      showDate: e.show?.date ?? null,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      at: e.createdAt,
    })),
    { limit: ACTIVITY_LIMIT },
  );

  // Contagens por natureza (dentro da janela carregada) para os chips, e o
  // recorte exibido conforme o filtro ativo.
  const counts = countFunnelActivityByKind(feed);
  const visible = filterFunnelActivityByKind(feed, activeKind);

  // Constrói o href de um chip preservando as demais query strings não seria
  // necessário (a página só tem `natureza`), então basta o próprio parâmetro.
  const chipHref = (kind: FunnelActivityKind | null): string =>
    kind === null
      ? "/shows/funil/atividade"
      : `/shows/funil/atividade?natureza=${kind}`;

  // O link de export espelha o filtro ativo para baixar exatamente o recorte
  // visível.
  const exportHref =
    activeKind === null
      ? "/shows/funil/atividade/export"
      : `/shows/funil/atividade/export?natureza=${activeKind}`;

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
          <Link href="/shows/funil" className="btn-secondary">
            ← Funil
          </Link>
        </div>
      </div>

      {feed.length === 0 ? (
        <div className="card text-sm text-gray-500">
          Nenhuma movimentação registrada ainda. Cadastre um show e mova-o pelo
          funil (proposto → confirmado → realizado) para ver a atividade aqui.
        </div>
      ) : (
        <>
          {/* Chips de filtro por natureza — "Todas" + as cinco naturezas, com
              a contagem dentro da janela carregada; o ativo fica destacado. */}
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
        <section className="card">
          <ol className="space-y-4">
            {visible.map((entry, i) => {
              const meta = KIND_META[entry.kind];
              return (
                <li key={i} className="flex items-start gap-3">
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
            })}
          </ol>
          {feed.length >= ACTIVITY_LIMIT && (
            <p className="mt-4 border-t pt-3 text-xs text-gray-400">
              {activeKind === null
                ? `Mostrando as ${ACTIVITY_LIMIT} mudanças mais recentes.`
                : `Filtrando entre as ${ACTIVITY_LIMIT} mudanças mais recentes.`}
            </p>
          )}
        </section>
          )}
        </>
      )}
    </div>
  );
}
