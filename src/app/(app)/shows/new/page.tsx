import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import ShowForm from "../ShowForm";
import { createShow } from "../actions";

export default async function NewShowPage() {
  const user = await requireUser();
  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <Link href="/shows" className="text-sm text-slate-500 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mb-5 mt-2 text-2xl font-bold">Novo show</h1>
      <ShowForm action={createShow} contacts={contacts} submitLabel="Criar show" />
    </div>
  );
}
