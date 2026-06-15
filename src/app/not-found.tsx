import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="mt-2 text-slate-600">Não encontramos o que você procurava.</p>
      <Link href="/app" className="btn-primary mt-6">
        Voltar ao painel
      </Link>
    </main>
  );
}
