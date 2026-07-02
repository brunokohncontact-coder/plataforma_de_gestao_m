import Link from "next/link";
import type { ProfitYearFilter } from "@/lib/finance";

/**
 * Seletor de período compartilhado: pílula "Todos" + uma por ano com shows
 * (mais recente primeiro, já ordenado por `showProfitYears`). Recorta uma tela
 * de rentabilidade por ano via `?ano=`, reaproveitado por
 * `/shows/locais`, `/shows/cidades`, `/shows/rentabilidade`,
 * `/contatos/rentabilidade` e `/contatos/{id}` — telas que antes repetiam
 * cópias idênticas do mesmo seletor, diferindo só no caminho base (ver D119).
 *
 * `basePath` é o href de "Todos" (ex.: `/shows/locais` ou `/contatos/abc123`);
 * cada ano vira `${basePath}?ano=${y}`. `ariaLabel` permite rotular o `<nav>`
 * quando há mais de um seletor de período na página (ex.: o detalhe do contato
 * recorta só a rentabilidade → "Período da rentabilidade").
 *
 * `params` são parâmetros de query extras a preservar em **todos** os links
 * (ex.: `{ escopo: "firm" }` na antecedência, para o seletor de período não
 * perder o recorte de escopo). Vazio por padrão → comportamento histórico
 * (`?ano=` puro).
 *
 * Server component puro: só renderiza `Link`s, sem estado nem hooks.
 */
export function PeriodPicker({
  years,
  active,
  basePath,
  ariaLabel = "Período",
  params,
}: {
  years: number[];
  active: ProfitYearFilter;
  basePath: string;
  ariaLabel?: string;
  params?: Record<string, string | number>;
}) {
  const base = "rounded-full px-3 py-1 text-sm font-medium transition-colors";
  const on = "bg-brand-600 text-white";
  const off = "bg-gray-100 text-gray-600 hover:bg-gray-200";
  const href = (year?: number) => {
    const q = new URLSearchParams();
    if (year != null) q.set("ano", String(year));
    for (const [k, v] of Object.entries(params ?? {})) q.set(k, String(v));
    const qs = q.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Período
      </span>
      <Link
        href={href()}
        className={base + " " + (active === "all" ? on : off)}
        aria-current={active === "all" ? "page" : undefined}
      >
        Todos
      </Link>
      {years.map((y) => (
        <Link
          key={y}
          href={href(y)}
          className={base + " " + (active === y ? on : off)}
          aria-current={active === y ? "page" : undefined}
        >
          {y}
        </Link>
      ))}
    </nav>
  );
}
