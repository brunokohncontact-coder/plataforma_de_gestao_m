"use client";

import { useState } from "react";
import {
  REMINDER_OPTIONS,
  DEFAULT_REMINDER_VALUE,
  reminderLabel,
} from "@/lib/ics";

/**
 * Botão "Exportar .ics" com um seletor de lembrete acoplado. O download aponta
 * para o feed `/shows/agenda.ics?lembrete=<valor>`; trocar o seletor só reescreve
 * a URL de download (nenhuma navegação/estado no servidor). Fecha o adiamento da
 * Sessão 301 (D295), que expôs o lembrete apenas por parâmetro de URL.
 *
 * Client component porque o `<select>` altera o `href` do link em tempo real;
 * a lógica de opções/rótulos vive na camada pura testada `@/lib/ics`.
 */
export function IcsExportButton({
  className = "text-sm text-brand-700 hover:underline",
}: {
  className?: string;
}) {
  const [reminder, setReminder] = useState(DEFAULT_REMINDER_VALUE);
  const href = `/shows/agenda.ics?lembrete=${encodeURIComponent(reminder)}`;
  const active = REMINDER_OPTIONS.find((o) => o.value === reminder);
  const title =
    active && active.minutes != null
      ? `Baixar a agenda para Google/Apple Calendar (lembrete ${reminderLabel(
          active.minutes,
        )} de cada show)`
      : "Baixar a agenda para Google/Apple Calendar (sem lembrete)";

  return (
    <span className="inline-flex items-center gap-1">
      <a href={href} className={className} download title={title}>
        Exportar .ics
      </a>
      <label className="sr-only" htmlFor="ics-reminder">
        Antecedência do lembrete
      </label>
      <select
        id="ics-reminder"
        value={reminder}
        onChange={(e) => setReminder(e.target.value)}
        title="Quando o celular avisa antes de cada show"
        className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs text-gray-700"
      >
        {REMINDER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.value === DEFAULT_REMINDER_VALUE ? `🔔 ${o.label}` : o.label}
          </option>
        ))}
      </select>
    </span>
  );
}
