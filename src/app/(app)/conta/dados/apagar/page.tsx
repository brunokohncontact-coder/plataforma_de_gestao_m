import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ResetForm } from "./ResetForm";

export const dynamic = "force-dynamic";

export default async function ApagarDadosPage() {
  const user = await requireUser();

  // Conta a carteira para explicar exatamente o que será apagado (mesmas quatro
  // entidades que a restauração exige zeradas).
  const [shows, transactions, contacts, revenueGoals] = await Promise.all([
    prisma.show.count({ where: { userId: user.id } }),
    prisma.transaction.count({ where: { userId: user.id } }),
    prisma.contact.count({ where: { userId: user.id } }),
    prisma.revenueGoal.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Apagar todos os meus dados</h1>
        <p className="mt-1 text-sm text-gray-500">
          Remove toda a sua carteira — shows, finanças, contatos e metas — desta
          conta. Sua identidade (nome, e-mail e senha) e as configurações de
          perfil continuam. É útil para recomeçar do zero ou para esvaziar a
          conta antes de restaurar um backup.
        </p>
      </div>

      <section className="card space-y-4">
        <ResetForm
          existingCounts={{ shows, transactions, contacts, revenueGoals }}
        />
      </section>

      <div className="flex flex-wrap gap-4">
        <Link href="/conta" className="text-sm text-gray-500 hover:underline">
          ← Voltar para a Conta
        </Link>
        <Link
          href="/conta/dados/export"
          className="text-sm text-gray-500 hover:underline"
        >
          ⬇ Baixar um backup antes
        </Link>
      </div>
    </div>
  );
}
