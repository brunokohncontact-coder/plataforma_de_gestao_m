import Link from "next/link";

const features = [
  {
    title: "Agenda de shows",
    desc: "Cadastre apresentações com local, data, status e cachê. Lista e calendário em um só lugar.",
  },
  {
    title: "Finanças sem planilha",
    desc: "Receitas e despesas com categorias, contas a receber e resumo mensal automático.",
  },
  {
    title: "Rentabilidade por show",
    desc: "Cada show mostra cachê − despesas = resultado. Saiba quais shows realmente compensam.",
  },
  {
    title: "CRM de contatos",
    desc: "Venues, produtores, contratantes e imprensa — organizados e vinculados aos seus shows.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="text-center">
        <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
          Em construção · MVP
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          O back-office da sua{" "}
          <span className="text-brand">carreira musical</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Palco reúne agenda, finanças, rentabilidade por show e contatos no mesmo lugar.
          Feito para o artista que odeia planilha mas precisa de controle.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            Ver o painel
          </Link>
          <a
            href="https://github.com/brunokohncontact-coder/plataforma_de_gestao_m"
            className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-white"
          >
            Sobre o projeto
          </a>
        </div>
      </header>

      <section className="mt-20 grid gap-6 sm:grid-cols-2">
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

      <footer className="mt-20 text-center text-sm text-slate-400">
        Palco · construído de forma incremental · {new Date().getFullYear()}
      </footer>
    </main>
  );
}
