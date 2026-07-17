import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ImportPreviewForm } from "./ImportPreviewForm";

export const dynamic = "force-dynamic";

export default async function ImportarDadosPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conferir backup</h1>
        <p className="mt-1 text-sm text-gray-500">
          Envie um arquivo <code>.json</code> exportado do Palco para verificar se
          está íntegro e é restaurável. Nada é gravado nesta etapa.
        </p>
      </div>

      <section className="card space-y-4">
        <ImportPreviewForm />
      </section>

      <Link href="/conta" className="text-sm text-gray-500 hover:underline">
        ← Voltar para a Conta
      </Link>
    </div>
  );
}
