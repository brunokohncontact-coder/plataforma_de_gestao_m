"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeleteButton({
  action,
  label = "Excluir",
  confirmText = "Tem certeza? Esta ação não pode ser desfeita.",
  redirectTo,
  className = "btn-danger",
}: {
  action: () => Promise<void>;
  label?: string;
  confirmText?: string;
  redirectTo?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className={className}
      disabled={pending}
      onClick={() => {
        if (!confirm(confirmText)) return;
        start(async () => {
          await action();
          if (redirectTo) router.push(redirectTo);
          else router.refresh();
        });
      }}
    >
      {pending ? "Excluindo…" : label}
    </button>
  );
}
