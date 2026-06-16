import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-2xl font-bold text-brand-700">
          Palco
        </Link>
        <div className="card">
          <h1 className="mb-1 text-xl font-semibold">Criar conta</h1>
          <p className="mb-5 text-sm text-gray-500">Seu back-office em minutos.</p>
          <RegisterForm />
        </div>
        <p className="mt-4 text-center text-sm text-gray-600">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
