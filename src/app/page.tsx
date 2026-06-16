const features = [
  {
    title: "Agenda de shows",
    desc: "Cadastre apresentações com local, data, status e cachê. Veja tudo em lista e calendário.",
  },
  {
    title: "Finanças sem planilha",
    desc: "Receitas e despesas com categoria e data. Saiba o que já recebeu e o que ainda está pendente.",
  },
  {
    title: "Rentabilidade por show",
    desc: "Cada show mostra cachê − despesas = resultado real. Pare de descobrir tarde demais que o show deu prejuízo.",
  },
  {
    title: "Contatos da indústria",
    desc: "Casas, produtores e contratantes em um CRM simples, ligados aos seus shows.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="flex items-center gap-2 text-brand-600">
        <span className="text-2xl font-black tracking-tight">Palco</span>
      </header>

      <section className="mt-16">
        <p className="inline-block rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700">
          Em desenvolvimento — MVP
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          O back-office da sua carreira musical, sem precisar de planilha.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          Agenda de shows, finanças e rentabilidade por apresentação em um só lugar. Feito para o
          artista independente que quer saber, de verdade, se a carreira está dando certo.
        </p>
      </section>

      <section className="mt-16 grid gap-6 sm:grid-cols-2">
        {features.map((f) => (
          <article
            key={f.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold">{f.title}</h2>
            <p className="mt-2 text-slate-600">{f.desc}</p>
          </article>
        ))}
      </section>

      <footer className="mt-20 border-t border-slate-200 pt-6 text-sm text-slate-400">
        Palco — plataforma de gestão de carreira para músicos. Documentação de produto em{" "}
        <code className="text-slate-500">docs/</code>.
      </footer>
    </main>
  );
}
