import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ShowForm } from "@/components/ShowForm";
import { createShow } from "../actions";

export default async function NewShowPage() {
  const user = await requireUser();
  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/shows" className="text-sm text-slate-500 hover:text-slate-700">
          ← Shows
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Novo show</h1>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ShowForm
          action={createShow}
          contacts={contacts}
          submitLabel="Criar show"
          cancelHref="/shows"
        />
      </div>
    </div>
  );
}
