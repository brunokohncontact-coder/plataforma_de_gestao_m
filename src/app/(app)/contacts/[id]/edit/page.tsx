import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import ContactForm from "../../ContactForm";
import { updateContact } from "../../actions";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const contact = await prisma.contact.findFirst({
    where: { id, userId: user.id },
  });
  if (!contact) notFound();

  const update = updateContact.bind(null, contact.id);

  return (
    <div>
      <Link href="/contacts" className="text-sm text-slate-500 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mb-5 mt-2 text-2xl font-bold">Editar contato</h1>
      <ContactForm
        action={update}
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
  );
}
