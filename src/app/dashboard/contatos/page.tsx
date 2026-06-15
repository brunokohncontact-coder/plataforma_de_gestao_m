import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getWorkspaceContacts } from "@/lib/queries";
import { Button, Card } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";
import { deleteContact } from "./actions";

export default async function ContatosPage() {
  const user = await requireUser();
  const contacts = await getWorkspaceContacts(user.workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contatos</h1>
        <Link href="/dashboard/contatos/novo">
          <Button>+ Novo contato</Button>
        </Link>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <p className="text-slate-600">
            Nenhum contato ainda. Cadastre casas de show, produtores e contratantes.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">{c.name}</h2>
                  <p className="text-sm text-slate-500">
                    {CONTACT_ROLE_LABELS[c.role as ContactRole]}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Link
                    href={`/dashboard/contatos/${c.id}/editar`}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    Editar
                  </Link>
                  <form action={deleteContact.bind(null, c.id)}>
                    <DeleteButton label="Excluir" compact confirmText={`Excluir o contato "${c.name}"?`} />
                  </form>
                </div>
              </div>
              <div className="mt-2 space-y-0.5 text-sm text-slate-600">
                {c.email && <p>{c.email}</p>}
                {c.phone && <p>{c.phone}</p>}
                {c.notes && <p className="text-slate-500">{c.notes}</p>}
                <p className="text-xs text-slate-400">
                  {c._count.shows} show{c._count.shows === 1 ? "" : "s"} vinculado
                  {c._count.shows === 1 ? "" : "s"}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
