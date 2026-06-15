import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { ShowForm } from "@/components/ShowForm";
import { updateShowAction } from "@/app/actions/shows";
import { centsToReais } from "@/lib/money";
import { toDateInputValue } from "@/lib/labels";

export default async function EditShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [show, contacts] = await Promise.all([
    db.show.findFirst({
      where: { id, userId: user.id },
      include: { contacts: { select: { contactId: true } } },
    }),
    db.contact.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);
  if (!show) notFound();

  const action = updateShowAction.bind(null, show.id);

  return (
    <div>
      <Link href={`/app/shows/${show.id}`} className="text-sm text-brand-600 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-gray-900">Editar show</h1>
      <div className="card">
        <ShowForm
          action={action}
          contacts={contacts}
          submitLabel="Salvar alterações"
          initial={{
            title: show.title,
            date: toDateInputValue(show.date),
            venue: show.venue ?? "",
            city: show.city ?? "",
            status: show.status,
            fee: show.feeCents ? String(centsToReais(show.feeCents)) : "",
            notes: show.notes ?? "",
            contactIds: show.contacts.map((c) => c.contactId),
          }}
        />
      </div>
    </div>
  );
}
