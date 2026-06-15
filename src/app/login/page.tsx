import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { LoginForm } from "@/components/AuthForm";

export default function LoginPage() {
  if (getSessionUserId()) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-center text-xl font-bold text-brand-700">
          🎸 Palco
        </Link>
        <div className="card">
          <h1 className="mb-4 text-lg font-semibold">Entrar</h1>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
