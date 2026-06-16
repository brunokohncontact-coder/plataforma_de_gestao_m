import Link from "next/link";
import { requireUser } from "@/lib/session";
import { dayParamToDateTimeLocal } from "@/lib/calendar";
import { ShowForm } from "../ShowForm";
import { createShowAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewShowPage({
  searchParams,
}: {
  searchParams: { data?: string };
}) {
  await requireUser();

  // Pré-preenche a data quando vindo de um clique num dia do calendário
  // (`?data=YYYY-MM-DD`); parâmetro inválido é simplesmente ignorado.
  const date = dayParamToDateTimeLocal(searchParams.data);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/shows" className="text-sm text-gray-500 hover:underline">
          ← Shows
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Novo show</h1>
      </div>
      <div className="card">
        <ShowForm
          action={createShowAction}
          cancelHref="/shows"
          submitLabel="Criar show"
          values={{ date }}
        />
      </div>
    </div>
  );
}
