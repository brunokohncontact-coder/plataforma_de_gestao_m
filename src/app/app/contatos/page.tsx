import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ContactRoleBadge } from "@/components/badges";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteContactAction } from "@/app/actions/contacts";

export default async function ContatosPage() {
  const user = await requireUser();
  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { shows: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contatos</h1>
          <p className="mt-1 text-sm text-slate-600">Sua rede na indústria.</p>
        </div>
        <Link href="/app/contatos/new" className="btn-primary">
          + Novo contato
        </Link>
      </div>

      {contacts.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-slate-500">Você ainda não cadastrou contatos.</p>
          <Link href="/app/contatos/new" className="btn-primary mt-4">
            Adicionar primeiro contato
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => (
            <div key={c.id} className="card flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  <div className="mt-1">
                    <ContactRoleBadge role={c.role} />
                  </div>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                {c.email && <p className="truncate">{c.email}</p>}
                {c.phone && <p>{c.phone}</p>}
              </div>
              {c.notes && <p className="line-clamp-2 text-xs text-slate-500">{c.notes}</p>}
              <p className="text-xs text-slate-400">
                {c._count.shows} {c._count.shows === 1 ? "show vinculado" : "shows vinculados"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Link
                  href={`/app/contatos/${c.id}/edit`}
                  className="btn-secondary py-1.5 text-xs"
                >
                  Editar
                </Link>
                <DeleteButton
                  action={deleteContactAction}
                  id={c.id}
                  confirmText="Excluir este contato?"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
