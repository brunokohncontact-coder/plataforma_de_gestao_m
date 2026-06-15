import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { AuthForm } from "../AuthForm";
import { registerAction } from "../actions";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
          Palco
        </p>
        <h1 className="mt-2 text-2xl font-bold">Criar sua conta</h1>
        <p className="mt-1 text-sm text-slate-600">
          Comece a organizar shows, finanças e contatos.
        </p>
      </div>
      <Card>
        <AuthForm mode="register" action={registerAction} />
      </Card>
      <p className="mt-6 text-center text-sm text-slate-600">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
