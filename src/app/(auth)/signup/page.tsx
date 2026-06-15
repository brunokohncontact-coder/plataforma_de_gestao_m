"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction, type FormState } from "../actions";
import { Field, inputClass, SubmitButton } from "@/components/ui";

const initial: FormState = {};

export default function SignupPage() {
  const [state, formAction] = useActionState(signupAction, initial);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Criar conta</h1>
      <p className="mt-1 text-sm text-slate-500">Comece a organizar sua carreira.</p>

      <form action={formAction} className="mt-6 space-y-4">
        <Field label="Seu nome">
          <input type="text" name="name" required className={inputClass} />
        </Field>
        <Field label="Nome artístico (opcional)">
          <input type="text" name="artistName" className={inputClass} />
        </Field>
        <Field label="E-mail">
          <input type="email" name="email" required className={inputClass} />
        </Field>
        <Field label="Senha">
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className={inputClass}
          />
        </Field>

        {state.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}

        <SubmitButton className="w-full">Criar conta</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-brand-600">
          Entrar
        </Link>
      </p>
    </div>
  );
}
