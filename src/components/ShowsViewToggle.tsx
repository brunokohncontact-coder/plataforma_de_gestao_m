import Link from "next/link";

/** Alternador entre as visões de lista, semana e mês (calendário) dos shows. */
export function ShowsViewToggle({
  active,
}: {
  active: "lista" | "semana" | "calendario";
}) {
  const base = "rounded-lg px-3 py-1.5 text-sm font-medium transition";
  const on = "bg-brand-100 text-brand-700";
  const off = "text-gray-600 hover:bg-gray-100";
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1">
      <Link href="/shows" className={`${base} ${active === "lista" ? on : off}`}>
        Lista
      </Link>
      <Link
        href="/shows/semana"
        className={`${base} ${active === "semana" ? on : off}`}
      >
        Semana
      </Link>
      <Link
        href="/shows/calendario"
        className={`${base} ${active === "calendario" ? on : off}`}
      >
        Mês
      </Link>
    </div>
  );
}
