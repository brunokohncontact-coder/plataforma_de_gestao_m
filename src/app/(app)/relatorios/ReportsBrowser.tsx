"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { filterReports, reportCount, subgroupEntries } from "@/lib/reports";

// Hub de relatórios com busca textual ao vivo. A lista é estática (catálogo
// de `reports.ts`); o filtro roda no cliente sobre a lógica pura `filterReports`
// (insensível a acento/caixa, multitermo AND, varrendo título/descrição/área).
export default function ReportsBrowser() {
  const [query, setQuery] = useState("");
  const total = reportCount();

  const groups = useMemo(() => filterReports(query), [query]);
  const matched = useMemo(
    () => groups.reduce((n, g) => n + g.entries.length, 0),
    [groups],
  );

  const filtering = query.trim().length > 0;

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
          <p className="mt-1.5 text-sm text-gray-500" aria-live="polite">
            {matched} de {total} relatórios
          </p>
        )}
      </div>

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
              <div key={sub.subtopic} className="space-y-2">
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
