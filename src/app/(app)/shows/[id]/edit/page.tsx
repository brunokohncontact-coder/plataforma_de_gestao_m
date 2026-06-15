import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ShowForm } from "@/components/ShowForm";
import { updateShow } from "../../actions";

export default async function EditShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [show, contacts] = await Promise.all([
    prisma.show.findFirst({ where: { id, userId: user.id } }),
    prisma.contact.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!show) notFound();

  const action = updateShow.bind(null, show.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/shows/${show.id}`}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← {show.title}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Editar show</h1>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ShowForm
          action={action}
          contacts={contacts}
          submitLabel="Salvar alterações"
          cancelHref={`/shows/${show.id}`}
          defaultValues={{
            title: show.title,
            date: show.date.toISOString().slice(0, 10),
            venue: show.venue,
            city: show.city,
            status: show.status,
            fee: show.fee,
            feeStatus: show.feeStatus,
            notes: show.notes,
            contactId: show.contactId,
          }}
        />
      </div>
    </div>
  );
}
