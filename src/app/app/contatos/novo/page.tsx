import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ContactForm } from "@/components/ContactForm";
import { createContactAction } from "@/app/actions/contacts";

export default async function NewContactPage() {
  await requireUser();
  return (
    <div>
      <Link href="/app/contatos" className="text-sm text-brand-600 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-gray-900">Novo contato</h1>
      <div className="card">
        <ContactForm action={createContactAction} submitLabel="Salvar contato" />
      </div>
    </div>
  );
}
