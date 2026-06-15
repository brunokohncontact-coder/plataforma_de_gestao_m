import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { AuthForm } from "../AuthForm";
import { loginAction } from "../actions";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
          Palco
        </p>
        <h1 className="mt-2 text-2xl font-bold">Entrar na sua conta</h1>
      </div>
      <Card>
        <AuthForm mode="login" action={loginAction} />
      </Card>
      <p className="mt-6 text-center text-sm text-slate-600">
        Ainda não tem conta?{" "}
        <Link href="/register" className="font-medium text-brand-600 hover:underline">
          Criar conta
        </Link>
      </p>
    </main>
  );
}
