import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { ShowForm } from "@/components/ShowForm";

export default async function NewShowPage() {
  const userId = await requireUserId();
  const contacts = await prisma.contact.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/app/shows" className="text-sm text-brand-600 hover:underline">
          ← Shows
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Novo show</h1>
      </div>
      <div className="card">
        <ShowForm contacts={contacts} />
      </div>
    </div>
  );
}
