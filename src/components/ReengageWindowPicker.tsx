import Link from "next/link";
import { REENGAGE_WINDOW_PRESETS } from "@/lib/finance";

/**
 * Seletor da janela de dormência (`?dias=`) das telas de reengajamento —
 * "há quantos dias sem tocar um lugar entra na lista?". Pílula por preset
 * (`REENGAGE_WINDOW_PRESETS`), destacando a janela ativa. Espelha o seletor de
 * `?semanas=` dos fins de semana livres, mas compartilhado pelas duas telas de
 * reengajamento (praças e casas), que diferem só no caminho base.
 *
 * `basePath` é a rota da tela (ex.: `/shows/cidades/revisitar`); cada preset
 * vira `${basePath}?dias=${preset}`. Server component puro: só `Link`s.
 */
export function ReengageWindowPicker({
  active,
  basePath,
  ariaLabel = "Janela de dormência",
}: {
  active: number;
  basePath: string;
  ariaLabel?: string;
}) {
  const base = "rounded-full px-3 py-1 text-sm font-medium transition-colors";
  const on = "bg-gray-900 text-white";
  const off = "bg-gray-100 text-gray-700 hover:bg-gray-200";
  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Sem tocar há
      </span>
      {REENGAGE_WINDOW_PRESETS.map((preset) => {
        const isActive = preset === active;
        return (
          <Link
            key={preset}
            href={`${basePath}?dias=${preset}`}
            aria-current={isActive ? "page" : undefined}
            className={base + " " + (isActive ? on : off)}
          >
            {preset} dias
          </Link>
        );
      })}
    </nav>
  );
}
