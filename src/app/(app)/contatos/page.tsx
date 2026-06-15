import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ContactRoleBadge } from "@/components/badges";
import { ConfirmButton } from "@/components/ConfirmButton";
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
        <h1 className="text-2xl font-bold">Contatos</h1>
        <Link href="/contatos/new" className="btn-primary">
          + Novo contato
        </Link>
      </div>

      {contacts.length === 0 ? (
        <div className="card text-center text-slate-500">
          Nenhum contato.{" "}
          <Link href="/contatos/new" className="font-medium text-brand-600">
            Adicione o primeiro
          </Link>{" "}
          (casas, contratantes, imprensa…).
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <div className="mt-1">
                    <ContactRoleBadge role={c.role} />
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <Link
                    href={`/contatos/${c.id}/edit`}
                    className="text-slate-400 hover:text-brand-600"
                  >
                    editar
                  </Link>
                  <form action={deleteContactAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmButton
                      confirmMessage={`Excluir ${c.name}?`}
                      className="text-slate-400 hover:text-red-600"
                    >
                      excluir
                    </ConfirmButton>
                  </form>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {c.email && <p>✉️ {c.email}</p>}
                {c.phone && <p>📞 {c.phone}</p>}
                {c.notes && (
                  <p className="text-slate-400">{c.notes}</p>
                )}
              </div>
              {c._count.shows > 0 && (
                <p className="mt-2 text-xs text-slate-400">
                  Vinculado a {c._count.shows} show
                  {c._count.shows > 1 ? "s" : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
