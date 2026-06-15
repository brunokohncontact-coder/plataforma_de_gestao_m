import Link from "next/link";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { ShowForm } from "@/components/ShowForm";
import { createShowAction } from "@/app/actions/shows";

export default async function NewShowPage() {
  const user = await requireUser();
  const contacts = await db.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });

  return (
    <div>
      <Link href="/app/shows" className="text-sm text-brand-600 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-gray-900">Novo show</h1>
      <div className="card">
        <ShowForm action={createShowAction} contacts={contacts} submitLabel="Criar show" />
      </div>
    </div>
  );
}
