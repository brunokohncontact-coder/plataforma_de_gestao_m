import Link from "next/link";
import { requireUser } from "@/lib/session";
import ContactForm from "../ContactForm";
import { createContact } from "../actions";

export default async function NewContactPage() {
  await requireUser();
  return (
    <div>
      <Link href="/contacts" className="text-sm text-slate-500 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mb-5 mt-2 text-2xl font-bold">Novo contato</h1>
      <ContactForm action={createContact} submitLabel="Criar contato" />
    </div>
  );
}
