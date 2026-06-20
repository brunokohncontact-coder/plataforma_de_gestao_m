import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CONTACT_ROLES, CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";
import {
  filterContacts,
  hasActiveContactFilter,
  isValidContactRole,
  type ContactFilter,
} from "@/lib/contacts";
import { deleteContactAction } from "./actions";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function readParam(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();
  const params = searchParams ?? {};

  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  // Filtros vindos da query string (validados).
  const qParam = readParam(params, "q");
  const roleParam = readParam(params, "papel");

  const filter: ContactFilter = {
    q: qParam || null,
    role: isValidContactRole(roleParam) ? roleParam : null,
  };
  const active = hasActiveContactFilter(filter);

  const visible = filterContacts(contacts, filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Contatos</h1>
        <div className="flex items-center gap-2">
          {contacts.length > 0 && (
            <>
              <Link href="/contatos/reativar" className="btn-secondary">
                Reativar
              </Link>
              <Link href="/contatos/retencao" className="btn-secondary">
                Fidelização
              </Link>
              <Link href="/contatos/ranking" className="btn-secondary">
                Ranking
              </Link>
            </>
          )}
          <Link href="/contatos/novo" className="btn-primary">
            + Novo contato
          </Link>
        </div>
      </div>

      {contacts.length > 0 && (
        <form
          method="get"
          className="card flex flex-wrap items-end gap-3"
          aria-label="Filtros de contatos"
        >
          <Field label="Buscar" htmlFor="f-q">
            <input
              id="f-q"
              type="search"
              name="q"
              defaultValue={filter.q ?? ""}
              placeholder="Nome, e-mail, telefone ou notas"
              className="input"
            />
          </Field>

          <Field label="Tipo" htmlFor="f-papel">
            <select
              id="f-papel"
              name="papel"
              defaultValue={filter.role ?? ""}
              className="input"
            >
              <option value="">Todos</option>
              {CONTACT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {CONTACT_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex items-center gap-2">
            <button type="submit" className="btn-primary">
              Filtrar
            </button>
            {active && (
              <Link href="/contatos?reset=1" className="text-sm text-gray-500 hover:underline">
                Limpar
              </Link>
            )}
          </div>
        </form>
      )}

      {contacts.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhum contato cadastrado.</p>
          <Link href="/contatos/novo" className="mt-3 inline-block text-brand-700 hover:underline">
            Adicionar o primeiro
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhum contato corresponde aos filtros.</p>
          <Link href="/contatos?reset=1" className="mt-3 inline-block text-brand-700 hover:underline">
            Limpar filtros
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {active
              ? `${visible.length} de ${contacts.length} ${
                  contacts.length === 1 ? "contato" : "contatos"
                }`
              : `${contacts.length} ${contacts.length === 1 ? "contato" : "contatos"}`}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((c) => (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <Link href={`/contatos/${c.id}`} className="block truncate font-semibold hover:underline">
                      {c.name}
                    </Link>
                    <span className="badge mt-1 bg-brand-50 text-brand-700">
                      {CONTACT_ROLE_LABELS[c.role as ContactRole]}
                    </span>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  {c.email && <p className="truncate">✉ {c.email}</p>}
                  {c.phone && <p>☎ {c.phone}</p>}
                  {c.notes && <p className="text-gray-500">{c.notes}</p>}
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={`/contatos/${c.id}`} className="btn-secondary py-1.5 text-xs">
                    Ver
                  </Link>
                  <Link href={`/contatos/${c.id}/editar`} className="btn-secondary py-1.5 text-xs">
                    Editar
                  </Link>
                  <DeleteButton
                    action={deleteContactAction}
                    id={c.id}
                    triggerClassName="btn-danger py-1.5 text-xs"
                    confirmMessage="Excluir contato?"
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}
