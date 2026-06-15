import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ContactForm } from "@/components/ContactForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { createContactAction, deleteContactAction } from "@/app/actions/contacts";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain/enums";

export default async function ContactsPage() {
  const user = await requireUser();
  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { shows: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Contatos</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:order-last">
          <h2 className="mb-3 font-semibold">Novo contato</h2>
          <ContactForm action={createContactAction} />
        </div>

        <div className="lg:col-span-2">
          {contacts.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum contato ainda. Cadastre casas de show, contratantes e produtores
              para vinculá-los aos seus shows.
            </p>
          ) : (
            <ul className="space-y-2">
              {contacts.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      <span className="badge bg-slate-100 text-slate-600">
                        {CONTACT_ROLE_LABELS[(c.role as ContactRole) ?? "OTHER"]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {[c.email, c.phone].filter(Boolean).join(" · ") || "Sem contato"}
                      {c._count.shows > 0
                        ? ` · ${c._count.shows} show(s)`
                        : ""}
                    </p>
                    {c.notes && (
                      <p className="mt-1 text-sm text-slate-600">{c.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/contacts/${c.id}/edit`}
                      className="text-xs text-brand hover:underline"
                    >
                      editar
                    </Link>
                    <form action={deleteContactAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmButton
                        message="Excluir este contato?"
                        className="text-xs text-red-500 hover:underline"
                      >
                        excluir
                      </ConfirmButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
