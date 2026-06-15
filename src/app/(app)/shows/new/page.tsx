import Link from "next/link";
import { ShowForm } from "@/components/ShowForm";

export default function NewShowPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/shows" className="text-sm text-slate-500">
          ← Shows
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Novo show</h1>
      </div>
      <div className="card">
        <ShowForm />
      </div>
    </div>
  );
}
