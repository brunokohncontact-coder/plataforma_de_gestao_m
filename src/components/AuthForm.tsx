"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { ActionState } from "@/app/actions/auth";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full py-2.5" disabled={pending}>
      {pending ? "Aguarde…" : label}
    </button>
  );
}

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "register";
  action: Action;
}) {
  const [state, formAction] = useFormState(action, {});
  const isRegister = mode === "register";

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 text-center">
        <Link href="/" className="text-2xl font-bold text-brand-700">
          Palco
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          {isRegister ? "Crie sua conta" : "Bem-vindo de volta"}
        </h1>
      </div>

      <form action={formAction} className="card space-y-4">
        {isRegister && (
          <div>
            <label className="label" htmlFor="name">
              Nome artístico ou seu nome
            </label>
            <input id="name" name="name" className="input" required autoComplete="name" />
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
            minLength={isRegister ? 8 : undefined}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </div>

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <SubmitButton label={isRegister ? "Criar conta" : "Entrar"} />
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        {isRegister ? (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-brand-700 hover:underline">
              Entrar
            </Link>
          </>
        ) : (
          <>
            Ainda não tem conta?{" "}
            <Link href="/register" className="font-medium text-brand-700 hover:underline">
              Criar conta
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
