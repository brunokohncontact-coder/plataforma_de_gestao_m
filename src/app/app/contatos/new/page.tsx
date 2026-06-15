import { requireUser } from "@/lib/auth";
import { ContactForm } from "@/components/ContactForm";
import { createContactAction } from "@/app/actions/contacts";

export default async function NewContactPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Novo contato</h1>
      <ContactForm action={createContactAction} />
    </div>
  );
}
