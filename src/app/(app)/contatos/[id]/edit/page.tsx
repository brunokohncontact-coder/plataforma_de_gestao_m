import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ContactForm } from "@/components/ContactForm";

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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/contatos" className="text-sm text-slate-500">
          ← Contatos
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Editar contato</h1>
      </div>
      <div className="card">
        <ContactForm
          initial={{
            id: contact.id,
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
