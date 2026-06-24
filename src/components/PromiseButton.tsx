"use client";

import { useRef, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";

type PromiseAction = (formData: FormData) => void | Promise<void>;

type PromiseStatus = "none" | "pending" | "broken";

/**
 * Controle inline de "data prometida de pagamento" de um cachê em aberto (duas
 * etapas, sem diálogo bloqueante). Fechado, mostra o estado atual da promessa:
 *  - sem promessa  → botão discreto "+ promessa";
 *  - no prazo      → selo âmbar "📅 {label}" (clicável para editar);
 *  - furada        → selo vermelho "⚠ {label}" (data já passou).
 * Aberto, mostra um <input type="date"> para registrar/alterar a data e, quando já
 * existe uma promessa, um botão "Limpar" que esvazia o campo e submete (o servidor
 * resolve data vazia para null). O servidor (`setPaymentPromiseAction` /
 * `resolvePromiseDate`) revalida e nunca confia no valor do cliente. `today`
 * ("YYYY-MM-DD", calculado no servidor) é a sugestão inicial sem promessa.
 */
export function PromiseButton({
  action,
  id,
  promisedAt,
  status,
  label,
  today,
}: {
  action: PromiseAction;
  id: string;
  promisedAt: string;
  status: PromiseStatus;
  label: string;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) {
    if (status === "none") {
      return (
        <button
          type="button"
          className="btn border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 py-1.5 text-xs"
          title="Registrar data prometida de pagamento"
          aria-label="Registrar data prometida de pagamento"
          onClick={() => setOpen(true)}
        >
          + promessa
        </button>
      );
    }
    const broken = status === "broken";
    return (
      <button
        type="button"
        className={
          "btn py-1.5 text-xs border " +
          (broken
            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100")
        }
        title={
          broken
            ? `Promessa vencida (prometido p/ ${label}) — clique para alterar`
            : `Prometido p/ ${label} — clique para alterar`
        }
        aria-label={
          broken ? `Promessa vencida em ${label}` : `Pagamento prometido para ${label}`
        }
        onClick={() => setOpen(true)}
      >
        {broken ? "⚠ " : "📅 "}
        {label}
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="inline-flex items-center gap-2"
      role="group"
      aria-label="Data prometida de pagamento"
    >
      <input type="hidden" name="id" value={id} />
      <label htmlFor={`promise-${id}`} className="sr-only">
        Data prometida de pagamento
      </label>
      <input
        ref={inputRef}
        type="date"
        id={`promise-${id}`}
        name="promisedAt"
        defaultValue={promisedAt || today}
        className="input w-36 py-1.5 text-xs"
        title="Data em que o contratante prometeu pagar"
      />
      <SubmitButton
        className="btn bg-amber-600 text-white hover:bg-amber-500 py-1.5 text-xs"
        pendingLabel="Salvando..."
      >
        Salvar
      </SubmitButton>
      {status !== "none" && (
        <button
          type="button"
          className="btn-secondary py-1.5 text-xs"
          title="Remover a data prometida"
          onClick={() => {
            // Esvazia o campo no DOM e submete: o FormData leva promisedAt="",
            // que o servidor resolve para null (limpa a promessa).
            if (inputRef.current) inputRef.current.value = "";
            formRef.current?.requestSubmit();
          }}
        >
          Limpar
        </button>
      )}
      <button
        type="button"
        className="btn-secondary py-1.5 text-xs"
        onClick={() => setOpen(false)}
      >
        Cancelar
      </button>
    </form>
  );
}
