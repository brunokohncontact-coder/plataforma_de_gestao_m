"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { registerAction, type AuthState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

const initial: AuthState = {};

export default function RegisterPage() {
  const [state, formAction] = useFormState(registerAction, initial);

  return (
    <div className="card">
      <h1 className="mb-4 text-lg font-semibold">Criar conta</h1>
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <div>
          <label className="label" htmlFor="name">
            Nome (ou nome artístico)
          </label>
          <input id="name" name="name" type="text" className="input" />
        </div>
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
            minLength={8}
            className="input"
          />
          <p className="mt-1 text-xs text-slate-400">Mínimo de 8 caracteres.</p>
        </div>
        <SubmitButton pendingLabel="Criando…">Criar conta</SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
