import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  if (await getCurrentUser()) redirect("/dashboard");

  const token = typeof searchParams.token === "string" ? searchParams.token : "";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-2xl font-bold text-brand-700">
          Palco
        </Link>
        <div className="card">
          <h1 className="mb-1 text-xl font-semibold">Redefinir senha</h1>
          {token ? (
            <>
              <p className="mb-5 text-sm text-gray-500">Escolha uma nova senha para a sua conta.</p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Link de redefinição inválido. Solicite um novo em{" "}
              <Link href="/esqueci-senha" className="font-medium underline">
                Esqueci a senha
              </Link>
              .
            </p>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </main>
  );
}
