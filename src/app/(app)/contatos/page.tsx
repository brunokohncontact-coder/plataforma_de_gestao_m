import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";
import { deleteContactAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const user = await requireUser();
  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contatos</h1>
        <Link href="/contatos/novo" className="btn-primary">
          + Novo contato
        </Link>
      </div>

      {contacts.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhum contato cadastrado.</p>
          <Link href="/contatos/novo" className="mt-3 inline-block text-brand-700 hover:underline">
            Adicionar o primeiro
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.name}</p>
                  <span className="badge mt-1 bg-brand-50 text-brand-700">
                    {CONTACT_ROLE_LABELS[c.role as ContactRole]}
                  </span>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                {c.email && <p className="truncate">✉ {c.email}</p>}
                {c.phone && <p>☎ {c.phone}</p>}
                {c.notes && <p className="text-gray-500">{c.notes}</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={`/contatos/${c.id}/editar`} className="btn-secondary py-1.5 text-xs">
                  Editar
                </Link>
                <form action={deleteContactAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="btn-danger py-1.5 text-xs">
                    Excluir
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
