"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthState } from "./actions";

interface Props {
  mode: "login" | "signup";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
}

export default function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );
  const isSignup = mode === "signup";

  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-brand-700">Palco</h1>
        <p className="mt-1 text-sm text-slate-500">
          O back-office da sua carreira musical
        </p>
      </div>

      <form action={formAction} className="card space-y-4">
        <h2 className="text-lg font-semibold">
          {isSignup ? "Criar conta" : "Entrar"}
        </h2>

        {state?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        {isSignup && (
          <div>
            <label className="label" htmlFor="artistName">
              Nome artístico
            </label>
            <input
              id="artistName"
              name="artistName"
              className="input"
              required
              placeholder="Seu nome ou da banda"
            />
          </div>
        )}

        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            required
            autoComplete="email"
          />
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
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={isSignup ? 8 : undefined}
          />
          {isSignup && (
            <p className="mt-1 text-xs text-slate-400">Mínimo de 8 caracteres.</p>
          )}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Aguarde…" : isSignup ? "Criar conta" : "Entrar"}
        </button>

        <p className="text-center text-sm text-slate-500">
          {isSignup ? (
            <>
              Já tem conta?{" "}
              <Link href="/login" className="text-brand-600 hover:underline">
                Entrar
              </Link>
            </>
          ) : (
            <>
              Ainda não tem conta?{" "}
              <Link href="/signup" className="text-brand-600 hover:underline">
                Criar conta
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
