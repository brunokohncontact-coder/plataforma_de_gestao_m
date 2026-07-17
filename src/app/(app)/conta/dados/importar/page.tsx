import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportarDadosPage() {
  const user = await requireUser();

  // A restauração só é oferecida numa conta VAZIA (a ação recusa o contrário).
  // Contamos as quatro entidades para decidir o affordance e explicar o motivo.
  const [shows, transactions, contacts, revenueGoals] = await Promise.all([
    prisma.show.count({ where: { userId: user.id } }),
    prisma.transaction.count({ where: { userId: user.id } }),
    prisma.contact.count({ where: { userId: user.id } }),
    prisma.revenueGoal.count({ where: { userId: user.id } }),
  ]);
  const existingCounts = { shows, transactions, contacts, revenueGoals };
  const canRestore =
    shows + transactions + contacts + revenueGoals === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conferir e restaurar backup</h1>
        <p className="mt-1 text-sm text-gray-500">
          Envie um arquivo <code>.json</code> exportado do Palco para verificar se
          está íntegro. Se a sua conta estiver vazia, você também pode restaurá-lo —
          para nunca sobrescrever dados, a restauração é bloqueada quando já há
          conteúdo na conta.
        </p>
      </div>

      <section className="card space-y-4">
        <ImportForm canRestore={canRestore} existingCounts={existingCounts} />
      </section>

      <Link href="/conta" className="text-sm text-gray-500 hover:underline">
        ← Voltar para a Conta
      </Link>
    </div>
  );
}
