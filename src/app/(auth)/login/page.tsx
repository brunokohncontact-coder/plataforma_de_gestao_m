"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type FormState } from "../actions";
import { Field, inputClass, SubmitButton } from "@/components/ui";

const initial: FormState = {};

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, initial);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Entrar</h1>
      <p className="mt-1 text-sm text-slate-500">Acesse seu painel.</p>

      <form action={formAction} className="mt-6 space-y-4">
        <Field label="E-mail">
          <input type="email" name="email" required className={inputClass} />
        </Field>
        <Field label="Senha">
          <input type="password" name="password" required className={inputClass} />
        </Field>

        {state.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}

        <SubmitButton className="w-full">Entrar</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Não tem conta?{" "}
        <Link href="/signup" className="font-semibold text-brand-600">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
