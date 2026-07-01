import { requireUser } from "@/lib/session";
import { ProfileForm } from "./ProfileForm";
import { EmailForm } from "./EmailForm";
import { PasswordForm } from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function ContaPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conta</h1>
        <p className="mt-1 text-sm text-gray-500">{user.email}</p>
      </div>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Perfil</h2>
        <ProfileForm values={{ name: user.name, artistName: user.artistName }} />
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Trocar e-mail de acesso</h2>
        <EmailForm currentEmail={user.email} />
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Trocar senha</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
