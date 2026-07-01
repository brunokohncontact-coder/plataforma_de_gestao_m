"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { changeEmailAction, type FormState } from "./actions";

const initial: FormState = {};

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction] = useFormState(changeEmailAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>
      )}

      {/* remonta os campos após sucesso para limpar a senha digitada */}
      <div className="space-y-4" key={state.success ? "done" : "editing"}>
        <div>
          <label className="label" htmlFor="email">
            Novo e-mail
          </label>
          <input
            className="input"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={currentEmail}
          />
        </div>

        <div>
          <label className="label" htmlFor="emailCurrentPassword">
            Senha atual <span className="text-gray-400">(para confirmar)</span>
          </label>
          <input
            className="input"
            id="emailCurrentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
      </div>

      <div className="pt-2">
        <SubmitButton className="btn-primary">Trocar e-mail</SubmitButton>
      </div>
    </form>
  );
}
