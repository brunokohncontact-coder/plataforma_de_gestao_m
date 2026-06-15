"use client";

import { useState } from "react";

export function DeleteButton({
  action,
  label = "Excluir",
  confirmText = "Tem certeza? Esta ação não pode ser desfeita.",
  className = "btn-danger",
}: {
  action: () => Promise<void>;
  label?: string;
  confirmText?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) {
          e.preventDefault();
          return;
        }
        setPending(true);
      }}
    >
      <button type="submit" className={className} disabled={pending}>
        {pending ? "Excluindo..." : label}
      </button>
    </form>
  );
}
