import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { registerAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/app");
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <AuthForm mode="register" action={registerAction} />
    </main>
  );
}
