"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleReceived } from "@/app/(app)/financas/actions";

export function ToggleReceived({
  id,
  received,
  type,
}: {
  id: string;
  received: boolean;
  type: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const labelDone = type === "despesa" ? "Paga" : "Recebida";
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await toggleReceived(id);
          router.refresh();
        })
      }
      title={received ? "Marcar como pendente" : `Marcar como ${labelDone.toLowerCase()}`}
      className={`badge px-2 py-1 text-xs transition ${
        received
          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "bg-amber-50 text-amber-700 hover:bg-amber-100"
      }`}
    >
      {received ? labelDone : "Pendente"}
    </button>
  );
}
