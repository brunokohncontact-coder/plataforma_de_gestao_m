import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { SignupForm } from "@/components/AuthForm";

export default function SignupPage() {
  if (getSessionUserId()) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-center text-xl font-bold text-brand-700">
          🎸 Palco
        </Link>
        <div className="card">
          <h1 className="mb-4 text-lg font-semibold">Criar conta</h1>
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
