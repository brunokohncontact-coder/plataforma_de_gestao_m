import Link from "next/link";

/**
 * Pílula discreta avisando que o recorte atual da lista foi RESTAURADO da última
 * visita (persistido em cookie e reaplicado pelo middleware — ver
 * `@/lib/listFilter`). Sem isso, um filtro lembrado parece resultado "real" e
 * confunde ("por que só aparecem alguns?"). Só renderiza quando `restored`.
 *
 * Server component puro; `resetHref` aponta para o `?reset=1` da lista (o mesmo
 * "Limpar" já existente), para esquecer o filtro num clique.
 */
export function RememberedFilterNotice({
  restored,
  resetHref,
}: {
  restored: boolean;
  resetHref: string;
}) {
  if (!restored) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-900">
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-brand-600"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.5 2.5a1 1 0 001.414-1.414L11 9.586V6z"
          clipRule="evenodd"
        />
      </svg>
      <span>Filtro restaurado da sua última visita.</span>
      <Link href={resetHref} className="font-medium underline hover:no-underline">
        Limpar
      </Link>
    </div>
  );
}
