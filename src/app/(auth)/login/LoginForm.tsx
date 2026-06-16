"use client";

import { useFormState } from "react-dom";
import { loginAction, type AuthState } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

const initial: AuthState = {};

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <div>
        <label className="label" htmlFor="email">
          E-mail
        </label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Senha
        </label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <SubmitButton pendingLabel="Entrando...">Entrar</SubmitButton>
    </form>
  );
}
