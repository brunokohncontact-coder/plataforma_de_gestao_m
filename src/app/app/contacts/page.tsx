import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { ContactForm } from "@/components/ContactForm";
import { CONTACT_ROLE_LABEL } from "@/lib/labels";
import { deleteContact } from "./actions";

export default async function ContactsPage() {
  const userId = await requireUserId();
  const contacts = await prisma.contact.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { shows: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contatos</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="lg:col-span-1">
          <div className="card">
            <h2 className="mb-4 font-semibold">Novo contato</h2>
            <ContactForm />
          </div>
        </aside>

        <section className="lg:col-span-2">
          {contacts.length === 0 ? (
            <div className="card text-center text-sm text-slate-400">
              Nenhum contato ainda. Cadastre casas, produtores e contratantes.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Papel</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3 text-center">Shows</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contacts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{c.name}</p>
                        {c.notes && <p className="text-xs text-slate-400">{c.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{CONTACT_ROLE_LABEL[c.role]}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {c.email && <p>{c.email}</p>}
                        {c.phone && <p className="text-xs text-slate-500">{c.phone}</p>}
                        {!c.email && !c.phone && "—"}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-slate-600">{c._count.shows}</td>
                      <td className="px-4 py-3 text-right">
                        <form action={deleteContact}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="text-slate-300 hover:text-red-500" title="Excluir">
                            ✕
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
