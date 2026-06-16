import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDateInputValue } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { ShowForm } from "@/components/ShowForm";
import { updateShow } from "../../actions";

export default async function EditShowPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const [show, contacts] = await Promise.all([
    prisma.show.findFirst({ where: { id: params.id, userId: user.id } }),
    prisma.contact.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!show) notFound();

  const updateWithId = updateShow.bind(null, show.id);

  return (
    <div>
      <PageHeader title="Editar show" />
      <ShowForm
        action={updateWithId}
        contacts={contacts}
        submitLabel="Salvar alterações"
        initial={{
          title: show.title,
          venue: show.venue,
          city: show.city,
          date: toDateInputValue(show.date),
          status: show.status,
          fee: show.fee,
          notes: show.notes,
          contactId: show.contactId,
        }}
      />
      <p className="mt-4 text-sm">
        <Link
          href={`/shows/${show.id}`}
          className="text-slate-500 hover:underline"
        >
          ← Cancelar
        </Link>
      </p>
    </div>
  );
}
