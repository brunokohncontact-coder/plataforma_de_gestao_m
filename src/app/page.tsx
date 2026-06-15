import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";

export default function Home() {
  if (getSessionUserId()) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="text-xl font-bold text-brand-700">🎸 Palco</span>
        <nav className="flex gap-3">
          <Link href="/login" className="btn-secondary">
            Entrar
          </Link>
          <Link href="/signup" className="btn-primary">
            Criar conta
          </Link>
        </nav>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          O back-office da sua carreira musical
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          Agenda de shows, finanças e a única pergunta que importa: quanto cada
          show realmente deu de lucro. Sem planilha, sem complicação.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">
            Começar grátis
          </Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">
            Já tenho conta
          </Link>
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          {[
            {
              t: "Agenda de shows",
              d: "Propostos, confirmados, realizados. Tudo num lugar só.",
            },
            {
              t: "Rentabilidade por show",
              d: "Cachê menos despesas vinculadas. Veja o lucro real.",
            },
            {
              t: "Finanças e contatos",
              d: "Receitas, despesas, contas a receber e seu CRM da indústria.",
            },
          ].map((f) => (
            <div key={f.t} className="card text-left">
              <h3 className="font-semibold text-brand-700">{f.t}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-6 text-center text-sm text-slate-400">
        Palco — MVP em desenvolvimento.
      </footer>
    </main>
  );
}
