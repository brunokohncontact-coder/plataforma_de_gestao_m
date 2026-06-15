import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/app");

  const features = [
    {
      title: "Agenda de shows",
      desc: "Propostas, confirmados e realizados — tudo em um calendário e uma lista limpa.",
    },
    {
      title: "Finanças sem planilha",
      desc: "Receitas e despesas com categorias, contas a receber e resumo mensal.",
    },
    {
      title: "Rentabilidade por show",
      desc: "Cachê menos despesas vinculadas. Saiba quanto cada show realmente rendeu.",
    },
    {
      title: "Contatos da indústria",
      desc: "Venues, produtores e contratantes ligados aos seus shows.",
    },
  ];

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-xl font-bold text-brand-700">Palco</span>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary">
            Entrar
          </Link>
          <Link href="/register" className="btn-primary">
            Criar conta
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-16 pt-10 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          O back-office da sua carreira musical
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Shows, dinheiro e contatos no mesmo lugar. Pare de gerenciar sua carreira em
          planilhas espalhadas e descubra quanto cada show realmente rende.
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

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="card">
            <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        Palco · feito para músicos independentes
      </footer>
    </main>
  );
}
