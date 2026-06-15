import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";

export default async function Home() {
  if (await getSessionUserId()) redirect("/app");

  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-600">Palco</p>
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        O back-office da sua carreira musical, sem planilha.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-slate-600">
        Organize seus shows, controle receitas e despesas, e veja{" "}
        <strong className="text-slate-900">quanto cada show realmente deu de lucro</strong>. Tudo num só
        lugar, simples o bastante para quem odeia planilha.
      </p>

      <div className="mt-8 flex gap-3">
        <Link href="/signup" className="btn-primary">
          Criar conta grátis
        </Link>
        <Link href="/login" className="btn-ghost">
          Entrar
        </Link>
      </div>

      <ul className="mt-14 grid gap-4 sm:grid-cols-2">
        {[
          ["Agenda de shows", "Datas, locais, status e cachê — em lista ou por mês."],
          ["Finanças", "Receitas e despesas, contas a receber e a pagar."],
          ["Rentabilidade por show", "Cachê menos despesas vinculadas = lucro real."],
          ["Contatos", "Casas, produtores e contratantes ligados aos seus shows."],
        ].map(([title, desc]) => (
          <li key={title} className="card">
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{desc}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
