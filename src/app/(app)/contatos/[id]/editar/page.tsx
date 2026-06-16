import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ContactForm } from "../../ContactForm";
import { updateContactAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditContactPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const contact = await prisma.contact.findFirst({ where: { id: params.id, userId: user.id } });
  if (!contact) notFound();

  const action = updateContactAction.bind(null, contact.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/contatos" className="text-sm text-gray-500 hover:underline">
          ← Contatos
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Editar contato</h1>
      </div>
      <div className="card">
        <ContactForm
          action={action}
          cancelHref="/contatos"
          submitLabel="Salvar alterações"
          values={{
            name: contact.name,
            role: contact.role,
            email: contact.email,
            phone: contact.phone,
            notes: contact.notes,
          }}
        />
      </div>
    </div>
  );
}
