import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, ContactRoleBadge, EmptyState } from "@/components/ui";
import { ContactForm } from "@/components/ContactForm";
import { createContact, deleteContact } from "./actions";

export default async function ContactsPage() {
  const user = await requireUser();
  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { shows: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Contatos"
        subtitle="Sua rede da indústria: casas, produtores, contratantes e imprensa."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {contacts.length === 0 ? (
            <EmptyState
              title="Nenhum contato ainda"
              description="Cadastre contatos da indústria e vincule-os aos seus shows."
            />
          ) : (
            <div className="space-y-3">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="card flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      <ContactRoleBadge role={c.role} />
                    </div>
                    <div className="mt-1 space-y-0.5 text-sm text-slate-500">
                      {c.company && <div>{c.company}</div>}
                      {c.email && <div>{c.email}</div>}
                      {c.phone && <div>{c.phone}</div>}
                      {c._count.shows > 0 && (
                        <div className="text-xs text-slate-400">
                          {c._count.shows} show(s) vinculado(s)
                        </div>
                      )}
                      {c.notes && (
                        <div className="text-xs text-slate-400">{c.notes}</div>
                      )}
                    </div>
                  </div>
                  <form action={deleteContact}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50"
                      title="Excluir"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 font-semibold">Novo contato</h2>
          <ContactForm action={createContact} />
        </div>
      </div>
    </div>
  );
}
