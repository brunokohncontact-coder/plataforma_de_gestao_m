import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ShowForm } from "../../ShowForm";
import { updateShowAction } from "../../actions";
import { toDateTimeLocalValue, centsToInputValue } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditShowPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const show = await prisma.show.findFirst({ where: { id: params.id, userId: user.id } });
  if (!show) notFound();

  const action = updateShowAction.bind(null, show.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/shows/${show.id}`} className="text-sm text-gray-500 hover:underline">
          ← {show.title}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Editar show</h1>
      </div>
      <div className="card">
        <ShowForm
          action={action}
          cancelHref={`/shows/${show.id}`}
          submitLabel="Salvar alterações"
          values={{
            title: show.title,
            date: toDateTimeLocalValue(show.date),
            venue: show.venue,
            city: show.city,
            status: show.status,
            fee: show.fee > 0 ? centsToInputValue(show.fee) : "",
            notes: show.notes,
          }}
        />
      </div>
    </div>
  );
}
