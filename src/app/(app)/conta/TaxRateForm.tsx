"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { updateTaxRateAction, type FormState } from "./actions";

const initial: FormState = {};

export function TaxRateForm({ value }: { value: number | null }) {
  const [state, formAction] = useFormState(updateTaxRateAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>
      )}

      <div>
        <label className="label" htmlFor="taxRatePercent">
          Alíquota (%) <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          className="input"
          id="taxRatePercent"
          name="taxRatePercent"
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="0.1"
          placeholder="6"
          defaultValue={value ?? ""}
        />
        <p className="mt-1 text-xs text-gray-500">
          A alíquota que a tela{" "}
          <Link href="/financas/reserva-impostos" className="text-brand-700 hover:underline">
            Reserva para impostos
          </Link>{" "}
          usa para sugerir quanto guardar do que entra. Deixe em branco para usar o padrão de 6%
          (estimativa do Simples). Confirme o seu regime real — MEI, Simples ou carnê-leão — com um
          contador.
        </p>
      </div>

      <div className="pt-2">
        <SubmitButton className="btn-primary">Salvar alíquota</SubmitButton>
      </div>
    </form>
  );
}
