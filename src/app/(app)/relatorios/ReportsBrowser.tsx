"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  activeSectionAnchor,
  filterReports,
  reportCount,
  reportsNavIndex,
  subgroupEntries,
  subtopicSlug,
  type SectionOffset,
} from "@/lib/reports";

// Onde a linha de ativação do scroll-spy fica, em px abaixo do topo da viewport.
// Casa com o `scroll-mt-24` (96px) das seções + uma folga, para a pílula ativa
// acender assim que a seção assenta no ponto de salto da âncora.
const ACTIVATION_MARGIN = 130;

// Hub de relatórios com busca textual ao vivo. A lista é estática (catálogo
// de `reports.ts`); o filtro roda no cliente sobre a lógica pura `filterReports`
// (insensível a acento/caixa, multitermo AND, varrendo título/descrição/área).
// A consulta é deep-linkável: o valor inicial chega da URL (`?q=`) e o campo
// espelha de volta em `?q=` conforme o usuário digita, para que uma visão
// filtrada seja compartilhável/favoritável e sobreviva ao voltar/avançar.
export default function ReportsBrowser({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const total = reportCount();
  const navIndex = reportsNavIndex();

  // Espelha a busca em `?q=` sem recarregar (o hub é estático — nada no servidor
  // depende de `q`). Usa `history.replaceState` para não empilhar uma entrada de
  // histórico por tecla; a busca vazia limpa o parâmetro, deixando a URL crua.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const trimmed = query.trim();
    const url = new URL(window.location.href);
    if (trimmed) url.searchParams.set("q", trimmed);
    else url.searchParams.delete("q");
    const next = url.pathname + url.search;
    if (next !== window.location.pathname + window.location.search) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [query]);

  const groups = useMemo(() => filterReports(query), [query]);
  const matched = useMemo(
    () => groups.reduce((n, g) => n + g.entries.length, 0),
    [groups],
  );

  const filtering = query.trim().length > 0;

  // Âncoras dos subtemas na ordem do documento — fonte das medições do scroll-spy.
  const subtopicAnchors = useMemo(
    () => navIndex.flatMap((area) => area.subtopics.map((sub) => sub.anchor)),
    [navIndex],
  );

  // Scroll-spy: acompanha a rolagem e realça a pílula/área do subtema visível.
  // Só roda quando o sumário está à mostra (sem busca ativa). A decisão de qual
  // seção está ativa é a lógica pura `activeSectionAnchor`; aqui só medimos os
  // offsets no DOM e agendamos com rAF para não custar em cada evento de scroll.
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (filtering) {
      setActiveAnchor(null);
      return;
    }
    if (typeof window === "undefined") return;

    const measure = () => {
      rafRef.current = null;
      const sections: SectionOffset[] = subtopicAnchors.map((anchor) => {
        const el = document.getElementById(anchor);
        return {
          anchor,
          top: el ? el.getBoundingClientRect().top + window.scrollY : NaN,
        };
      });
      const doc = document.documentElement;
      const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
      setActiveAnchor(
        activeSectionAnchor(sections, window.scrollY, ACTIVATION_MARGIN, atBottom),
      );
    };

    const schedule = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [filtering, subtopicAnchors]);

  // Área que contém o subtema ativo — para acender também o rótulo da área.
  const activeArea = activeAnchor
    ? navIndex.find((area) => area.subtopics.some((sub) => sub.anchor === activeAnchor))?.area
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="report-search" className="sr-only">
          Buscar relatório
        </label>
        <input
          id="report-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar relatório (ex.: cachê, prazo, contatos)…"
          autoComplete="off"
          className="input w-full"
        />
        {filtering && (
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <p className="text-sm text-gray-500" aria-live="polite">
              {matched} de {total} relatórios
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-sm text-brand-700 hover:underline"
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {/* Sumário de salto rápido por subtema — atalho para o acervo crescente.
          Some durante a busca, quando a lista já está recortada. A pílula do
          subtema visível fica realçada (scroll-spy) para dar o "onde estou". */}
      {!filtering && (
        <nav aria-label="Ir para um tema" className="card space-y-3">
          {navIndex.map((area) => {
            const areaActive = area.area === activeArea;
            return (
              <div key={area.area} className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
                <a
                  href={`#${area.anchor}`}
                  className={
                    "text-xs font-semibold uppercase tracking-wide transition " +
                    (areaActive ? "text-brand-700" : "text-gray-500 hover:text-brand-700")
                  }
                >
                  {area.label}
                </a>
                {area.subtopics.map((sub) => {
                  const active = sub.anchor === activeAnchor;
                  return (
                    <a
                      key={sub.anchor}
                      href={`#${sub.anchor}`}
                      aria-current={active ? "location" : undefined}
                      className={
                        "rounded-full border px-2.5 py-0.5 text-xs transition " +
                        (active
                          ? "border-brand-400 bg-brand-50 font-medium text-brand-700"
                          : "border-gray-200 text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700")
                      }
                    >
                      {sub.subtopic}
                      <span className={"ml-1 " + (active ? "text-brand-400" : "text-gray-400")}>
                        {sub.count}
                      </span>
                    </a>
                  );
                })}
              </div>
            );
          })}
        </nav>
      )}

      {groups.length === 0 ? (
        <div className="card text-center text-sm text-gray-500">
          Nenhum relatório casa com{" "}
          <span className="font-medium text-gray-700">“{query.trim()}”</span>.
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.area} id={group.area} className="scroll-mt-24 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {group.label}
            </h2>
            {subgroupEntries(group.entries).map((sub) => (
              <div
                key={sub.subtopic}
                id={subtopicSlug(group.area, sub.subtopic)}
                className="scroll-mt-24 space-y-2"
              >
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {sub.subtopic}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sub.entries.map((entry) => (
                    <Link
                      key={entry.href}
                      href={entry.href}
                      className="card flex h-full flex-col transition hover:border-brand-300 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        {entry.icon && (
                          <span aria-hidden className="text-lg">
                            {entry.icon}
                          </span>
                        )}
                        <span className="font-semibold text-brand-700">{entry.title}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-gray-500">{entry.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
