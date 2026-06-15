import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { toDateTimeLocalValue } from "@/lib/dates";
import ShowForm from "../../ShowForm";
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
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!show) notFound();

  const update = updateShow.bind(null, show.id);

  return (
    <div>
      <Link href={`/shows/${show.id}`} className="text-sm text-slate-500 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mb-5 mt-2 text-2xl font-bold">Editar show</h1>
      <ShowForm
        action={update}
        contacts={contacts}
        submitLabel="Salvar alterações"
        initial={{
          title: show.title,
          date: toDateTimeLocalValue(show.date),
          venue: show.venue ?? "",
          city: show.city ?? "",
          status: show.status,
          fee: (show.feeCents / 100).toFixed(2),
          notes: show.notes ?? "",
          contactId: show.contactId ?? "",
        }}
      />
    </div>
  );
}
