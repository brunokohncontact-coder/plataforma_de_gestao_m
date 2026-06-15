import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm text-brand hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Painel</h1>
      <p className="mt-2 text-slate-600">
        O painel com agenda, finanças e rentabilidade está sendo construído
        incrementalmente. A lógica de negócio (cálculo de P&L por show, agregações
        financeiras) já está pronta e testada — falta conectar à interface.
      </p>
      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
        Em breve: shows, transações e rentabilidade aqui.
      </div>
    </main>
  );
}
