"use client";

import { useFormState } from "react-dom";
import { resetPasswordAction, type AuthState } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

const initial: AuthState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useFormState(resetPasswordAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="newPassword">
          Nova senha
        </label>
        <input
          className="input"
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <SubmitButton pendingLabel="Redefinindo...">Redefinir senha</SubmitButton>
    </form>
  );
}
