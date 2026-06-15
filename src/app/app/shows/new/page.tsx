import { requireUser } from "@/lib/auth";
import { ShowForm } from "@/components/ShowForm";
import { createShowAction } from "@/app/actions/shows";
import { toDateInputValue } from "@/lib/format";

export default async function NewShowPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Novo show</h1>
      <ShowForm
        action={createShowAction}
        defaults={{ date: toDateInputValue(new Date()), status: "proposto" }}
      />
    </div>
  );
}
