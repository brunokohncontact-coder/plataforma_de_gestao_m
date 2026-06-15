"use client";

import { clsx } from "@/lib/clsx";

/**
 * Botão de exclusão que confirma antes de submeter. Espera ser usado dentro de
 * um <form action={serverAction}> (a action recebe o id via bind no servidor).
 */
export function DeleteButton({
  label = "Excluir",
  confirmText,
  compact = false,
}: {
  label?: string;
  confirmText: string;
  compact?: boolean;
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      className={clsx(
        "inline-flex items-center justify-center rounded-lg font-medium transition",
        compact
          ? "px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          : "bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700",
      )}
    >
      {label}
    </button>
  );
}
