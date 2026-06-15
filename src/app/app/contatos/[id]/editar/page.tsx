import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { ContactForm } from "@/components/ContactForm";
import { updateContactAction } from "@/app/actions/contacts";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const contact = await db.contact.findFirst({
    where: { id, userId: user.id },
  });
  if (!contact) notFound();

  const action = updateContactAction.bind(null, contact.id);

  return (
    <div>
      <Link href="/app/contatos" className="text-sm text-brand-600 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-gray-900">Editar contato</h1>
      <div className="card">
        <ContactForm
          action={action}
          submitLabel="Salvar alterações"
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
