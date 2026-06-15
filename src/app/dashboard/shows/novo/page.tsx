import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getWorkspaceContacts } from "@/lib/queries";
import { Card } from "@/components/ui";
import { ShowForm } from "../ShowForm";
import { createShow } from "../actions";

export default async function NewShowPage() {
  const user = await requireUser();
  const contacts = await getWorkspaceContacts(user.workspaceId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/shows" className="text-sm text-slate-500 hover:underline">
          ← Voltar para shows
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Novo show</h1>
      </div>
      <Card>
        <ShowForm
          action={createShow}
          contacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
          submitLabel="Criar show"
        />
      </Card>
    </div>
  );
}
