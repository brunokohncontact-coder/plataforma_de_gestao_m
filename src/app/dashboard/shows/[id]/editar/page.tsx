import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContacts } from "@/lib/queries";
import { Card } from "@/components/ui";
import { ShowForm } from "../../ShowForm";
import { updateShow } from "../../actions";

export default async function EditShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [show, contacts] = await Promise.all([
    prisma.show.findFirst({ where: { id, workspaceId: user.workspaceId } }),
    getWorkspaceContacts(user.workspaceId),
  ]);
  if (!show) notFound();

  const action = updateShow.bind(null, show.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/dashboard/shows/${show.id}`} className="text-sm text-slate-500 hover:underline">
          ← Voltar para o show
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Editar show</h1>
      </div>
      <Card>
        <ShowForm
          action={action}
          contacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
          submitLabel="Salvar alterações"
          defaults={{
            title: show.title,
            date: show.date,
            venue: show.venue,
            city: show.city,
            status: show.status,
            feeAgreed: show.feeAgreed,
            contactId: show.contactId,
            notes: show.notes,
          }}
        />
      </Card>
    </div>
  );
}
