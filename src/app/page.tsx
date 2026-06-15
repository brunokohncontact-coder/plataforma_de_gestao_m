import Link from "next/link";

const features = [
  {
    title: "Agenda de shows",
    desc: "Propostas, confirmados, realizados e cancelados — tudo em lista e calendário.",
  },
  {
    title: "Finanças sem planilha",
    desc: "Receitas e despesas por categoria, com contas a receber e a pagar.",
  },
  {
    title: "Rentabilidade por show",
    desc: "Cachê menos despesas vinculadas: saiba quais shows realmente valem a pena.",
  },
  {
    title: "Contatos da indústria",
    desc: "Casas, produtores, contratantes e imprensa, ligados aos seus shows.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
          Palco
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          O back-office da sua carreira na música.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          Agenda, finanças, rentabilidade por show e contatos — sem planilha,
          sem caos. Feito para músicos independentes e bandas em ascensão.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-brand-600 px-5 py-3 font-medium text-white transition hover:bg-brand-700"
          >
            Entrar no app
          </Link>
          <a
            href="https://github.com/brunokohncontact-coder/plataforma_de_gestao_m"
            className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-white"
          >
            Sobre o projeto
          </a>
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-2">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold">{f.title}</h2>
            <p className="mt-2 text-slate-600">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="mt-16 border-t border-slate-200 pt-6 text-sm text-slate-500">
        MVP em construção — veja o roadmap em <code>PROGRESS.md</code>.
      </footer>
    </main>
  );
}
