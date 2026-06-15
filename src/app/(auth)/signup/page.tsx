import { AuthForm } from "@/components/AuthForm";
import { signupAction } from "@/app/actions/auth";

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Criar conta</h1>
      <p className="mb-5 text-sm text-gray-500">
        Comece a organizar sua carreira em minutos.
      </p>
      <AuthForm mode="signup" action={signupAction} />
    </>
  );
}
