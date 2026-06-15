import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ShowForm } from "@/components/ShowForm";
import { createShowAction } from "@/app/actions/shows";
import { toDateInputValue } from "@/lib/format";

export default async function NewShowPage() {
  const user = await requireUser();
  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Novo show</h1>
      <div className="card">
        <ShowForm
          action={createShowAction}
          contacts={contacts}
          cancelHref="/shows"
          initial={{ date: toDateInputValue(new Date()) }}
        />
      </div>
    </div>
  );
}
