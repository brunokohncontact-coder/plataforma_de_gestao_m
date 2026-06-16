import Link from "next/link";

const features = [
  {
    title: "Agenda de shows",
    desc: "Datas, locais e status (proposto, confirmado, realizado) num só lugar.",
  },
  {
    title: "Finanças sem planilha",
    desc: "Receitas e despesas por categoria, contas a receber e resumo mensal.",
  },
  {
    title: "Rentabilidade por show",
    desc: "Cachê menos despesas vinculadas: saiba quanto cada show realmente rende.",
  },
  {
    title: "Contatos da indústria",
    desc: "Venues, promoters e contratantes ligados aos seus shows.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-12 px-6 py-20">
      <header className="flex flex-col gap-4">
        <span className="text-sm font-semibold uppercase tracking-widest text-brand-light">
          Palco
        </span>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          O back-office da sua carreira na música.
        </h1>
        <p className="max-w-2xl text-lg text-violet-200/80">
          Agenda, finanças, rentabilidade por show e contatos — tudo conectado,
          feito para quem odeia planilha. Em construção (MVP).
        </p>
        <div className="mt-2 flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-brand px-5 py-2.5 font-medium text-white transition hover:bg-brand-dark"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-brand-light/40 px-5 py-2.5 font-medium text-brand-light transition hover:bg-brand/10"
          >
            Criar conta
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-violet-300/10 bg-violet-500/5 p-5"
          >
            <h2 className="text-lg font-semibold text-violet-100">{f.title}</h2>
            <p className="mt-1 text-sm text-violet-200/70">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="text-sm text-violet-300/40">
        MVP em desenvolvimento contínuo. Veja o roadmap em{" "}
        <code className="text-violet-200/60">docs/mvp-scope.md</code>.
      </footer>
    </main>
  );
}
