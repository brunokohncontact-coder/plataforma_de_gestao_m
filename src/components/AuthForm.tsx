"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton } from "./SubmitButton";
import type { ActionState } from "@/app/actions/auth";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "signup";
  action: Action;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="space-y-4">
      {isSignup && (
        <div>
          <label className="label" htmlFor="name">
            Nome
          </label>
          <input id="name" name="name" type="text" className="input" required autoComplete="name" />
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
          minLength={isSignup ? 8 : undefined}
          autoComplete={isSignup ? "new-password" : "current-password"}
        />
        {isSignup && (
          <p className="mt-1 text-xs text-gray-500">Mínimo de 8 caracteres.</p>
        )}
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton pendingText={isSignup ? "Criando..." : "Entrando..."}>
        {isSignup ? "Criar conta" : "Entrar"}
      </SubmitButton>

      <p className="text-center text-sm text-gray-600">
        {isSignup ? (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:underline">
              Entrar
            </Link>
          </>
        ) : (
          <>
            Não tem conta?{" "}
            <Link href="/signup" className="font-medium text-brand-600 hover:underline">
              Criar conta
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
