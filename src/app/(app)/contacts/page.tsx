import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { CONTACT_ROLE_LABELS } from "@/lib/labels";
import { deleteContact } from "./actions";

export default async function ContactsPage() {
  const user = await requireUser();
  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { shows: true } } },
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contatos</h1>
        <Link href="/contacts/new" className="btn-primary">+ Novo contato</Link>
      </div>

      {contacts.length === 0 ? (
        <div className="card text-center text-slate-500">
          <p>Nenhum contato ainda.</p>
          <Link href="/contacts/new" className="mt-3 inline-block text-brand-600 hover:underline">
            Adicionar o primeiro
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li key={c.id} className="card flex items-center justify-between py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="badge bg-slate-100 text-slate-600">
                    {CONTACT_ROLE_LABELS[c.role] ?? c.role}
                  </span>
                </div>
                <p className="truncate text-sm text-slate-500">
                  {[c.email, c.phone].filter(Boolean).join(" · ") || "sem contato"}
                  {c._count.shows > 0 ? ` · ${c._count.shows} show(s)` : ""}
                </p>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <Link href={`/contacts/${c.id}/edit`} className="btn-secondary text-xs">Editar</Link>
                <form action={deleteContact.bind(null, c.id)}>
                  <button type="submit" className="btn-danger text-xs">×</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
