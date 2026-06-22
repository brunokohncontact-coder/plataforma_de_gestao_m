"use client";

import { useFormState } from "react-dom";
import { MoneyInput } from "@/components/MoneyInput";
import { SubmitButton } from "@/components/SubmitButton";
import { setRevenueGoalAction, type GoalFormState } from "./actions";

const initial: GoalFormState = {};

/**
 * Formulário de definição da meta de faturamento do ano. O ano é fixado pela
 * página (vai num hidden); o valor usa a máscara monetária pt-BR.
 */
export function GoalForm({
  year,
  defaultAmount,
}: {
  year: number;
  /** Valor atual da meta no formato de centsToInputValue (ex.: "12000.00"), se houver. */
  defaultAmount?: string;
}) {
  const [state, formAction] = useFormState(setRevenueGoalAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>
      )}

      <input type="hidden" name="year" value={year} />

      <div>
        <label className="label" htmlFor="amount">
          Meta de faturamento em {year}
        </label>
        <MoneyInput id="amount" name="amount" defaultValue={defaultAmount} required />
        <p className="mt-1 text-xs text-gray-500">
          Quanto você quer receber ao longo do ano (faturamento bruto).
        </p>
      </div>

      <div className="pt-1">
        <SubmitButton className="btn-primary">Salvar meta</SubmitButton>
      </div>
    </form>
  );
}
