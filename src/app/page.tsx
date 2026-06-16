import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const features = [
    {
      title: "Agenda de shows",
      desc: "Propostas, confirmados e realizados — com cachê, local e notas, em lista ou calendário.",
    },
    {
      title: "Finanças sem planilha",
      desc: "Receitas e despesas por categoria, contas a receber e saldo de caixa real.",
    },
    {
      title: "Rentabilidade por show",
      desc: "Cada show mostra cachê − despesas = resultado. Saiba quais valem a pena.",
    },
    {
      title: "Contatos da indústria",
      desc: "Venues, produtores e contratantes organizados e ligados aos seus shows.",
    },
  ];

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-xl font-bold text-brand-700">Palco</span>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Entrar
          </Link>
          <Link href="/register" className="btn-primary">
            Criar conta
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-16 pt-10 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          O back-office da sua carreira na música
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
          Shows, dinheiro e contatos em um só lugar. Pare de gerenciar sua carreira
          em planilhas espalhadas e descubra, de verdade, quais shows dão lucro.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register" className="btn-primary px-6 py-3 text-base">
            Começar grátis
          </Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">
            Já tenho conta
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 px-6 pb-20 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="card">
            <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        Palco · MVP em desenvolvimento
      </footer>
    </main>
  );
}
