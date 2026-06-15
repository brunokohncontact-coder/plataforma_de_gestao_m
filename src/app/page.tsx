const features = [
  { title: "Agenda de shows", desc: "Propostas, confirmados, realizados — tudo num lugar." },
  { title: "Finanças", desc: "Receitas, despesas, a receber e a pagar." },
  { title: "Rentabilidade por show", desc: "Quanto cada show realmente deu de lucro." },
  { title: "Contatos", desc: "Casas, produtores e imprensa ligados aos seus shows." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Palco</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          O back-office da sua carreira musical
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Saia da planilha. Gerencie shows, dinheiro e contatos — e descubra a
          rentabilidade real de cada apresentação.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900">{f.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{f.desc}</p>
          </div>
        ))}
      </section>

      <div className="mt-12 rounded-md border border-dashed border-gray-300 bg-white p-5">
        <p className="text-sm font-medium text-gray-700">MVP em construção</p>
        <p className="mt-1 text-xs text-gray-500">
          Fundação pronta: modelo de dados e cálculo de rentabilidade por show. As
          próximas iterações entregam autenticação (F1) e as telas de agenda e finanças.
        </p>
      </div>
    </main>
  );
}
