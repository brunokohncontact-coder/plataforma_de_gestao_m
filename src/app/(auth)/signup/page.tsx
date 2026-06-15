import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { signupAction } from "../actions";

export default async function SignupPage() {
  if (await getSessionUserId()) redirect("/app");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-sm font-semibold uppercase tracking-wider text-brand-600">
        Palco
      </Link>
      <h1 className="mb-1 text-2xl font-bold">Criar conta</h1>
      <p className="mb-6 text-sm text-slate-600">Comece a organizar sua carreira em minutos.</p>
      <AuthForm mode="signup" action={signupAction} />
    </main>
  );
}
