"use client";

import { useActionState } from "react";
import Link from "next/link";
import { type AuthState } from "@/app/(auth)/actions";

type Action = (prev: AuthState, formData: FormData) => Promise<AuthState>;

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "signup";
  action: Action;
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="space-y-4">
      {isSignup && (
        <div>
          <label className="label" htmlFor="artistName">
            Nome artístico
          </label>
          <input id="artistName" name="artistName" className="input" required autoComplete="name" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">
          E-mail
        </label>
        <input id="email" name="email" type="email" className="input" required autoComplete="email" />
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
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Aguarde…" : isSignup ? "Criar conta" : "Entrar"}
      </button>

      <p className="text-center text-sm text-slate-600">
        {isSignup ? (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:underline">
              Entrar
            </Link>
          </>
        ) : (
          <>
            Ainda não tem conta?{" "}
            <Link href="/signup" className="font-medium text-brand-600 hover:underline">
              Criar conta
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
