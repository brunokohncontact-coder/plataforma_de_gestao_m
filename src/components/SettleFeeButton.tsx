"use client";

import { useState } from "react";
import { MoneyInput } from "@/components/MoneyInput";
import { SubmitButton } from "@/components/SubmitButton";

type SettleAction = (formData: FormData) => void | Promise<void>;

/**
 * Botão "Quitar" com lançamento de valor PARCIAL embutido (duas etapas, sem
 * diálogo bloqueante). O primeiro clique abre um campo de valor já preenchido com
 * o saldo em aberto (editável): confirmar lança uma receita recebida nesse valor.
 * O valor é re-validado e limitado ao saldo no servidor (ver `settleShowFeeAction`
 * / `resolveSettlementAmount`), então o campo é só uma conveniência da UI.
 *
 * `outstanding` é o saldo em centavos; vira a sugestão padrão do campo. Lançar o
 * valor inteiro quita o cachê; lançar menos deixa o restante na lista.
 *
 * `today` é o dia atual ("YYYY-MM-DD", calculado no servidor para evitar mismatch
 * de hidratação): preenche e limita (`max`) o campo de data do recebimento, que
 * permite registrar a data REAL em que o cachê entrou — não necessariamente hoje
 * (ver D29). O servidor revalida e nunca aceita data futura.
 */
export function SettleFeeButton({
  action,
  id,
  outstanding,
  today,
}: {
  action: SettleAction;
  id: string;
  outstanding: number;
  today: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="btn border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 py-1.5 text-xs"
        title="Lançar cachê recebido (total ou parcial)"
        aria-label="Lançar cachê recebido (total ou parcial)"
        onClick={() => setOpen(true)}
      >
        Quitar
      </button>
    );
  }

  return (
    <form
      action={action}
      className="inline-flex items-center gap-2"
      role="group"
      aria-label="Lançar cachê recebido"
    >
      <input type="hidden" name="id" value={id} />
      <label htmlFor={`settle-${id}`} className="sr-only">
        Valor recebido
      </label>
      <span className="text-xs text-gray-500">R$</span>
      <MoneyInput
        id={`settle-${id}`}
        name="amount"
        defaultValue={String(outstanding)}
        className="input w-24 py-1.5 text-right text-xs"
        required
      />
      <label htmlFor={`settle-date-${id}`} className="sr-only">
        Data do recebimento
      </label>
      <input
        type="date"
        id={`settle-date-${id}`}
        name="receivedAt"
        defaultValue={today}
        max={today}
        className="input w-36 py-1.5 text-xs"
        title="Data em que o cachê foi recebido"
      />
      <SubmitButton
        className="btn bg-emerald-600 text-white hover:bg-emerald-500 py-1.5 text-xs"
        pendingLabel="Lançando..."
      >
        Lançar
      </SubmitButton>
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
