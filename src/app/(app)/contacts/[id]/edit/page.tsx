import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ContactForm } from "@/components/ContactForm";
import { updateContactAction } from "@/app/actions/contacts";

export default async function EditContactPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const contact = await prisma.contact.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!contact) notFound();

  const action = updateContactAction.bind(null, contact.id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Editar contato</h1>
      <div className="card">
        <ContactForm
          action={action}
          submitLabel="Salvar alterações"
          cancelHref="/contacts"
          initial={{
            name: contact.name,
            role: contact.role,
            email: contact.email ?? "",
            phone: contact.phone ?? "",
            notes: contact.notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
