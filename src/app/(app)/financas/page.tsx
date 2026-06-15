import { requireUser } from "@/lib/session";

export default async function FinancasPage() {
  await requireUser();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Finanças</h1>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        <p className="font-medium text-slate-700">Em construção (F3).</p>
        <p className="mt-1 text-sm">
          O CRUD de receitas e despesas chega na próxima iteração. Por enquanto, o
          cachê dos shows já aparece no Painel e na rentabilidade de cada show.
        </p>
      </div>
    </div>
  );
}
