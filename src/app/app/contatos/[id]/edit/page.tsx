import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ContactForm } from "@/components/ContactForm";
import { updateContactAction } from "@/app/actions/contacts";

export default async function EditContactPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const contact = await prisma.contact.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!contact) notFound();

  const action = updateContactAction.bind(null, contact.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Editar contato</h1>
      <ContactForm
        action={action}
        submitLabel="Salvar alterações"
        defaults={{
          name: contact.name,
          role: contact.role,
          email: contact.email,
          phone: contact.phone,
          notes: contact.notes,
        }}
      />
    </div>
  );
}
