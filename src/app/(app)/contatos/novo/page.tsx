import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ContactForm } from "../ContactForm";
import { createContactAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewContactPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/contatos" className="text-sm text-gray-500 hover:underline">
          ← Contatos
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Novo contato</h1>
      </div>
      <div className="card">
        <ContactForm action={createContactAction} cancelHref="/contatos" submitLabel="Criar contato" />
      </div>
    </div>
  );
}
