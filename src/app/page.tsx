import Link from "next/link";

const features = [
  {
    title: "Agenda de shows",
    desc: "Propostas, confirmados, realizados. Cachê, local e notas — em lista ou calendário.",
  },
  {
    title: "Finanças",
    desc: "Receitas e despesas por categoria, com status de recebido e pendente.",
  },
  {
    title: "Rentabilidade por show",
    desc: "Cachê menos as despesas vinculadas. Saiba quanto cada show realmente rendeu.",
  },
  {
    title: "Contatos da indústria",
    desc: "Venues, promoters, produtores e imprensa — ligados aos seus shows.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
          Palco
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          A gestão da sua carreira musical, sem planilha.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Agenda, finanças, rentabilidade por show e contatos — o back-office do
          artista independente em um só lugar.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white transition hover:bg-brand-700"
          >
            Começar
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Entrar
          </Link>
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-2">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-slate-200 p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">{f.title}</h2>
            <p className="mt-2 text-slate-600">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="mt-16 border-t border-slate-200 pt-6 text-sm text-slate-500">
        🚧 MVP em construção — Fase 1. Veja o roadmap em <code>PROGRESS.md</code>.
      </footer>
    </main>
  );
}
