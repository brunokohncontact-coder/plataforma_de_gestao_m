import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ShowForm } from "@/components/ShowForm";

export default async function EditShowPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const show = await prisma.show.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!show) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/shows/${show.id}`} className="text-sm text-slate-500">
          ← {show.title}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Editar show</h1>
      </div>
      <div className="card">
        <ShowForm
          initial={{
            id: show.id,
            title: show.title,
            date: show.date,
            venue: show.venue,
            city: show.city,
            status: show.status,
            feeCents: show.feeCents,
            notes: show.notes,
          }}
        />
      </div>
    </div>
  );
}
