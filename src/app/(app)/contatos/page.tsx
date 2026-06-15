import { requireUser } from "@/lib/session";

export default async function ContatosPage() {
  await requireUser();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Contatos</h1>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        <p className="font-medium text-slate-700">Em construção (F5).</p>
        <p className="mt-1 text-sm">
          O CRM de contatos da indústria (venues, promoters, imprensa) chega em
          breve, com vínculo aos shows.
        </p>
      </div>
    </div>
  );
}
