import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/AuthForm";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 block text-center text-2xl font-bold text-brand-600"
        >
          Palco
        </Link>
        <div className="card">
          <h1 className="mb-4 text-lg font-semibold">Entrar</h1>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
