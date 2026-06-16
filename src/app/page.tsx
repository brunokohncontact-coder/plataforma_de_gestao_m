import Link from "next/link";

const features = [
  {
    title: "Agenda de shows",
    desc: "Propostas, confirmados, realizados e cancelados — com cachê e local.",
  },
  {
    title: "Finanças",
    desc: "Receitas e despesas por categoria, com contas a receber controladas.",
  },
  {
    title: "Rentabilidade por show",
    desc: "Cachê menos despesas do show: saiba o que realmente sobrou.",
  },
  {
    title: "Contatos da indústria",
    desc: "Casas, produtores e contratantes — vinculados aos seus shows.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-widest text-indigo-400">
          Palco
        </p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          A gestão da sua carreira musical, sem planilha.
        </h1>
        <p className="max-w-xl text-lg text-zinc-400">
          Centralize agenda, finanças e contatos — e descubra a rentabilidade
          real de cada show.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <li
            key={f.title}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
          >
            <h2 className="font-semibold text-zinc-100">{f.title}</h2>
            <p className="mt-1 text-sm text-zinc-400">{f.desc}</p>
          </li>
        ))}
      </ul>

      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-lg bg-indigo-500 px-5 py-3 font-medium text-white transition hover:bg-indigo-400"
        >
          Ver demonstração →
        </Link>
        <p className="mt-3 text-xs text-zinc-500">
          MVP em construção · veja o roadmap em PROGRESS.md
        </p>
      </div>
    </main>
  );
}
