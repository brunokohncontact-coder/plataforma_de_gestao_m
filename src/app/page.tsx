import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function LandingPage() {
  const user = await getCurrentUser();

  const features = [
    {
      title: "Agenda de shows",
      desc: "Propostas, confirmados, realizados. Cachê, local e notas em um só lugar.",
    },
    {
      title: "Finanças sem planilha",
      desc: "Receitas e despesas com categoria, status de recebimento e visão mensal.",
    },
    {
      title: "Rentabilidade por show",
      desc: "Cachê − despesas vinculadas = resultado. Saiba quais shows valem a pena.",
    },
    {
      title: "Contatos da indústria",
      desc: "Venues, promoters e produtores organizados e ligados aos seus shows.",
    },
  ];

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="text-xl font-bold text-brand-600">Palco</span>
        <nav className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard" className="btn-primary">
              Abrir painel
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">
                Entrar
              </Link>
              <Link href="/signup" className="btn-primary">
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          O back-office da sua carreira na música
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Pare de gerenciar shows, dinheiro e contatos em planilhas espalhadas.
          O Palco reúne sua agenda, finanças e a rentabilidade de cada show em um
          só lugar — simples o bastante para quem odeia planilha.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href={user ? "/dashboard" : "/signup"} className="btn-primary">
            {user ? "Abrir painel" : "Começar grátis"}
          </Link>
          <Link href="/login" className="btn-secondary">
            Já tenho conta
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-20 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="card">
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
