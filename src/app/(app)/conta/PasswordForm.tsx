"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { changePasswordAction, type FormState } from "./actions";

const initial: FormState = {};

export function PasswordForm() {
  const [state, formAction] = useFormState(changePasswordAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>
      )}

      {/* remonta os campos após sucesso para limpar as senhas digitadas */}
      <div className="space-y-4" key={state.success ? "done" : "editing"}>
        <div>
          <label className="label" htmlFor="currentPassword">
            Senha atual
          </label>
          <input
            className="input"
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="newPassword">
            Nova senha <span className="text-gray-400">(mín. 8 caracteres)</span>
          </label>
          <input
            className="input"
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="confirmPassword">
            Confirmar nova senha
          </label>
          <input
            className="input"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      <div className="pt-2">
        <SubmitButton className="btn-primary">Alterar senha</SubmitButton>
      </div>
    </form>
  );
}
