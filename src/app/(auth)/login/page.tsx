"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { loginAction, type AuthState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

const initial: AuthState = {};

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initial);

  return (
    <div className="card">
      <h1 className="mb-4 text-lg font-semibold">Entrar</h1>
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="input"
          />
        </div>
        <SubmitButton pendingLabel="Entrando…">Entrar</SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Não tem conta?{" "}
        <Link href="/register" className="font-medium text-brand hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
