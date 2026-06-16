import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ShowForm } from "@/components/ShowForm";
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
      <PageHeader title="Novo show" />
      <ShowForm action={createShow} contacts={contacts} submitLabel="Criar show" />
      <p className="mt-4 text-sm">
        <Link href="/shows" className="text-slate-500 hover:underline">
          ← Voltar para a agenda
        </Link>
      </p>
    </div>
  );
}
