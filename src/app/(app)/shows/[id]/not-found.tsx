import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card text-center">
      <p className="font-medium">Show não encontrado.</p>
      <p className="mt-1 text-sm text-slate-500">
        Ele pode ter sido excluído ou não pertence à sua conta.
      </p>
      <Link href="/shows" className="btn-primary mt-4 inline-flex">
        Voltar para a agenda
      </Link>
    </div>
  );
}
