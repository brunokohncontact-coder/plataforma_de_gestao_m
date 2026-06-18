"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type DeleteAction = (formData: FormData) => void | Promise<void>;

function ConfirmSubmit({
  className,
  label,
  pendingLabel,
}: {
  className: string;
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Botão de exclusão com confirmação embutida (duas etapas, sem diálogo bloqueante).
 * O primeiro clique troca o gatilho por "Confirmar / Cancelar"; só o "Confirmar"
 * submete o server action. Mantém uma única fonte de verdade do form de exclusão.
 */
export function DeleteButton({
  action,
  id,
  trigger = "Excluir",
  triggerClassName = "btn-danger",
  triggerTitle = "Excluir",
  confirmMessage,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  pendingLabel = "Excluindo...",
  confirmClassName = "btn-danger py-1.5 text-xs",
  cancelClassName = "btn-secondary py-1.5 text-xs",
  groupLabel = "Confirmar exclusão",
}: {
  action: DeleteAction;
  id: string;
  trigger?: React.ReactNode;
  triggerClassName?: string;
  triggerTitle?: string;
  confirmMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  confirmClassName?: string;
  cancelClassName?: string;
  groupLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className={triggerClassName}
        title={triggerTitle}
        aria-label={triggerTitle}
        onClick={() => setConfirming(true)}
      >
        {trigger}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={groupLabel}>
      {confirmMessage && <span className="text-xs text-gray-600">{confirmMessage}</span>}
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <ConfirmSubmit className={confirmClassName} label={confirmLabel} pendingLabel={pendingLabel} />
      </form>
      <button type="button" className={cancelClassName} onClick={() => setConfirming(false)}>
        {cancelLabel}
      </button>
    </div>
  );
}
