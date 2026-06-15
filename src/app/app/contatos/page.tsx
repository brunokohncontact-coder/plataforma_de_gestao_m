import Link from "next/link";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { CONTACT_ROLE_LABELS } from "@/lib/labels";
import { deleteContactAction } from "@/app/actions/contacts";

export default async function ContatosPage() {
  const user = await requireUser();
  const contacts = await db.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { shows: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Contatos"
        subtitle="Casas, produtores, contratantes e imprensa da sua rede."
        action={{ href: "/app/contatos/novo", label: "+ Novo contato" }}
      />

      {contacts.length === 0 ? (
        <EmptyState
          title="Nenhum contato"
          description="Cadastre os contatos da indústria com quem você trabalha e vincule-os aos seus shows."
          action={{ href: "/app/contatos/novo", label: "+ Novo contato" }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => {
            const del = deleteContactAction.bind(null, c.id);
            return (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-gray-900">{c.name}</h3>
                    <p className="text-xs text-gray-500">{CONTACT_ROLE_LABELS[c.role]}</p>
                  </div>
                  <span className="badge bg-gray-100 text-gray-600">
                    {c._count.shows} show{c._count.shows === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  {c.email && <p className="truncate">✉ {c.email}</p>}
                  {c.phone && <p>☎ {c.phone}</p>}
                  {c.notes && <p className="text-xs text-gray-500">{c.notes}</p>}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Link href={`/app/contatos/${c.id}/editar`} className="text-xs font-medium text-brand-600 hover:underline">
                    Editar
                  </Link>
                  <DeleteButton
                    action={del}
                    label="Excluir"
                    className="text-xs text-gray-500 hover:text-red-600"
                    confirmText={`Excluir o contato "${c.name}"?`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
