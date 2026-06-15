import { AuthForm } from "@/components/AuthForm";
import { loginAction } from "@/app/actions/auth";

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Entrar</h1>
      <p className="mb-5 text-sm text-gray-500">Acesse o seu workspace.</p>
      <AuthForm mode="login" action={loginAction} />
    </>
  );
}
