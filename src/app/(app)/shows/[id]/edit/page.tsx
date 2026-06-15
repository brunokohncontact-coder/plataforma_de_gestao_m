import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ShowForm } from "@/components/ShowForm";
import { updateShowAction } from "@/app/actions/shows";
import { toDateInputValue } from "@/lib/format";

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

  const action = updateShowAction.bind(null, show.id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Editar show</h1>
      <div className="card">
        <ShowForm
          action={action}
          contacts={contacts}
          cancelHref={`/shows/${show.id}`}
          initial={{
            title: show.title,
            venue: show.venue ?? "",
            city: show.city ?? "",
            date: toDateInputValue(show.date),
            status: show.status,
            fee: show.fee,
            feePaid: show.feePaid,
            notes: show.notes ?? "",
            contactId: show.contactId ?? "",
          }}
        />
      </div>
    </div>
  );
}
