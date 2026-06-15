"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signupAction, loginAction, type FormState } from "@/app/actions/auth";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Aguarde…" : label}
    </button>
  );
}

const initial: FormState = {};

export function LoginForm() {
  const [state, action] = useFormState(loginAction, initial);
  return (
    <form action={action} className="space-y-4">
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
      <SubmitButton label="Entrar" />
      <p className="text-center text-sm text-slate-500">
        Não tem conta?{" "}
        <Link href="/signup" className="font-medium text-brand-600">
          Criar conta
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useFormState(signupAction, initial);
  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div>
        <label className="label" htmlFor="name">
          Seu nome
        </label>
        <input id="name" name="name" type="text" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="artistName">
          Nome artístico / da banda{" "}
          <span className="text-slate-400">(opcional)</span>
        </label>
        <input id="artistName" name="artistName" type="text" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">
          E-mail
        </label>
        <input id="email" name="email" type="email" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Senha <span className="text-slate-400">(mín. 8 caracteres)</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="input"
        />
      </div>
      <SubmitButton label="Criar conta" />
      <p className="text-center text-sm text-slate-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-brand-600">
          Entrar
        </Link>
      </p>
    </form>
  );
}
