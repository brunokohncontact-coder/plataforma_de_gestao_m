"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { loginAction, type AuthState } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

const initial: AuthState = {};

export default function LoginPage() {
  const [state, action] = useFormState(loginAction, initial);

  return (
    <div className="card">
      <h1 className="mb-1 text-xl font-semibold">Entrar</h1>
      <p className="mb-5 text-sm text-slate-500">
        Acesse seu painel de gestão.
      </p>

      {state.message && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <form action={action} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input id="email" name="email" type="email" className="input" required />
          {state.errors?.email && (
            <p className="field-error">{state.errors.email}</p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            required
          />
          {state.errors?.password && (
            <p className="field-error">{state.errors.password}</p>
          )}
        </div>
        <SubmitButton className="btn-primary w-full" pendingLabel="Entrando…">
          Entrar
        </SubmitButton>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Não tem conta?{" "}
        <Link href="/register" className="font-medium text-brand-600">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
