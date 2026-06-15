import Link from "next/link";
import { Card } from "@/components/ui";
import { ContactForm } from "../ContactForm";
import { createContact } from "../actions";

export default function NewContactPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/contatos" className="text-sm text-slate-500 hover:underline">
          ← Voltar para contatos
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Novo contato</h1>
      </div>
      <Card>
        <ContactForm action={createContact} submitLabel="Adicionar" />
      </Card>
    </div>
  );
}
