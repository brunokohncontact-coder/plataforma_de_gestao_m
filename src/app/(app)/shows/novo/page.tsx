import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ShowForm } from "../ShowForm";
import { createShowAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewShowPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/shows" className="text-sm text-gray-500 hover:underline">
          ← Shows
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Novo show</h1>
      </div>
      <div className="card">
        <ShowForm action={createShowAction} cancelHref="/shows" submitLabel="Criar show" />
      </div>
    </div>
  );
}
