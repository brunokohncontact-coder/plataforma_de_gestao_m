import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";

export default function NewContactPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/contatos" className="text-sm text-slate-500">
          ← Contatos
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Novo contato</h1>
      </div>
      <div className="card">
        <ContactForm />
      </div>
    </div>
  );
}
