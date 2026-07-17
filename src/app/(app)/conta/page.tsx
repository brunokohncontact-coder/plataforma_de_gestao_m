import { requireUser } from "@/lib/session";
import { ProfileForm } from "./ProfileForm";
import { EmailForm } from "./EmailForm";
import { PasswordForm } from "./PasswordForm";
import { TaxRateForm } from "./TaxRateForm";

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

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Reserva para impostos</h2>
        <TaxRateForm value={user.taxRatePercent ?? null} />
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Seus dados</h2>
        <p className="text-sm text-gray-500">
          Baixe uma cópia completa da sua carteira — shows, finanças, contatos e
          metas — num único arquivo <code>.json</code>. São seus dados: guarde um
          backup ou leve-os para onde quiser.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/conta/dados/export"
            className="btn-secondary inline-flex w-fit items-center gap-2"
            download
          >
            ⬇ Baixar todos os meus dados (JSON)
          </a>
          <a
            href="/conta/dados/importar"
            className="btn-secondary inline-flex w-fit items-center gap-2"
          >
            🔍 Conferir ou restaurar um backup
          </a>
          <a
            href="/conta/dados/apagar"
            className="btn-danger inline-flex w-fit items-center gap-2"
          >
            🗑 Apagar todos os meus dados
          </a>
        </div>
        <p className="text-xs text-gray-500">
          Já tem um arquivo de backup? Confira se ele está íntegro e, numa conta
          vazia, restaure toda a carteira a partir dele. Apagar seus dados
          esvazia a carteira (a conta continua ativa) — útil para recomeçar do
          zero ou destravar a restauração.
        </p>
      </section>
    </div>
  );
}
