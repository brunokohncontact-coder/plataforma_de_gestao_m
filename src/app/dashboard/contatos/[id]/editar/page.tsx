import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { ContactForm } from "../../ContactForm";
import { updateContact } from "../../actions";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const contact = await prisma.contact.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });
  if (!contact) notFound();

  const action = updateContact.bind(null, contact.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/contatos" className="text-sm text-slate-500 hover:underline">
          ← Voltar para contatos
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Editar contato</h1>
      </div>
      <Card>
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
      </Card>
    </div>
  );
}
