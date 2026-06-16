"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { registerAction, type AuthState } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

const initial: AuthState = {};

export default function RegisterPage() {
  const [state, action] = useFormState(registerAction, initial);

  return (
    <div className="card">
      <h1 className="mb-1 text-xl font-semibold">Criar conta</h1>
      <p className="mb-5 text-sm text-slate-500">
        Comece a organizar shows e finanças em minutos.
      </p>

      {state.message && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <form action={action} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">
            Seu nome
          </label>
          <input id="name" name="name" type="text" className="input" required />
          {state.errors?.name && (
            <p className="field-error">{state.errors.name}</p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="artistName">
            Nome artístico / banda{" "}
            <span className="text-slate-400">(opcional)</span>
          </label>
          <input
            id="artistName"
            name="artistName"
            type="text"
            className="input"
          />
        </div>
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
            minLength={8}
          />
          {state.errors?.password && (
            <p className="field-error">{state.errors.password}</p>
          )}
        </div>
        <SubmitButton className="btn-primary w-full" pendingLabel="Criando…">
          Criar conta
        </SubmitButton>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-brand-600">
          Entrar
        </Link>
      </p>
    </div>
  );
}
