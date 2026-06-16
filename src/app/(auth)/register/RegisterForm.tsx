"use client";

import { useFormState } from "react-dom";
import { registerAction, type AuthState } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

const initial: AuthState = {};

export function RegisterForm() {
  const [state, formAction] = useFormState(registerAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <div>
        <label className="label" htmlFor="name">
          Seu nome
        </label>
        <input className="input" id="name" name="name" type="text" required autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="artistName">
          Nome artístico / da banda <span className="text-gray-400">(opcional)</span>
        </label>
        <input className="input" id="artistName" name="artistName" type="text" />
      </div>
      <div>
        <label className="label" htmlFor="email">
          E-mail
        </label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Senha <span className="text-gray-400">(mín. 8 caracteres)</span>
        </label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <SubmitButton pendingLabel="Criando...">Criar conta</SubmitButton>
    </form>
  );
}
