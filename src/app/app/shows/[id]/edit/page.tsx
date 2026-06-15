import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ShowForm } from "@/components/ShowForm";
import { updateShowAction } from "@/app/actions/shows";
import { toDateInputValue } from "@/lib/format";

export default async function EditShowPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const show = await prisma.show.findFirst({ where: { id: params.id, userId: user.id } });
  if (!show) notFound();

  const action = updateShowAction.bind(null, show.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Editar show</h1>
      <ShowForm
        action={action}
        submitLabel="Salvar alterações"
        defaults={{
          title: show.title,
          date: toDateInputValue(show.date),
          venue: show.venue,
          city: show.city,
          status: show.status,
          fee: show.fee,
          notes: show.notes,
        }}
      />
    </div>
  );
}
