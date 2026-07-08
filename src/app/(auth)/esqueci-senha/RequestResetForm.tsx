"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { requestPasswordResetAction, type AuthState } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

const initial: AuthState = {};

export function RequestResetForm() {
  const [state, formAction] = useFormState(requestPasswordResetAction, initial);

  // Após o sucesso, mostramos a confirmação genérica (não revela se a conta
  // existe). Em desenvolvimento, sem provedor de e-mail, o link vem junto.
  if (state.success) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </p>
        {state.devResetLink && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Ambiente de desenvolvimento (sem e-mail configurado). Use o link:{" "}
            <Link href={state.devResetLink} className="font-medium underline">
              redefinir a senha
            </Link>
            .
          </p>
        )}
        <Link href="/login" className="block text-center text-sm text-brand-700 hover:underline">
          Voltar ao login
        </Link>
      </div>
    );
  }

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
      <SubmitButton pendingLabel="Enviando...">Enviar link de redefinição</SubmitButton>
    </form>
  );
}
