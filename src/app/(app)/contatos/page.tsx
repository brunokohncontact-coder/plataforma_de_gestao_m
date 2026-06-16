import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CONTACT_ROLE_LABELS } from "@/lib/domain/constants";
import { EmptyState } from "@/components/ui";
import { Dialog } from "@/components/Dialog";
import { ContactForm } from "@/components/ContactForm";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteContact } from "./actions";

export default async function ContatosPage() {
  const user = await requireUser();
  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contatos</h1>
          <p className="text-sm text-slate-500">
            Sua rede da indústria: venues, promoters, produtores e imprensa.
          </p>
        </div>
        <Dialog title="Novo contato" triggerLabel="+ Novo contato">
          <ContactForm />
        </Dialog>
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          title="Nenhum contato ainda"
          hint="Cadastre os contatos com quem você fecha shows para tê-los sempre à mão."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <span className="badge bg-slate-100 text-slate-600">
                    {CONTACT_ROLE_LABELS[
                      c.role as keyof typeof CONTACT_ROLE_LABELS
                    ] ?? c.role}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Dialog
                    title="Editar contato"
                    triggerLabel="Editar"
                    triggerClassName="btn-secondary px-2 py-1 text-xs"
                  >
                    <ContactForm
                      initial={{
                        id: c.id,
                        name: c.name,
                        role: c.role,
                        email: c.email,
                        phone: c.phone,
                        notes: c.notes,
                      }}
                    />
                  </Dialog>
                  <DeleteButton
                    action={deleteContact.bind(null, c.id)}
                    label="✕"
                    className="btn-danger px-2 py-1 text-xs"
                  />
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {c.email && <p>✉️ {c.email}</p>}
                {c.phone && <p>📞 {c.phone}</p>}
                {c.notes && <p className="text-slate-500">{c.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
