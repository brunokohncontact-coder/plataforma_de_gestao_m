import Link from "next/link";
import { requireUser } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";
import { NavLink } from "@/components/NavLink";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-gray-200 bg-white md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/app" className="text-xl font-bold text-brand-700">
            Palco
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:gap-1 md:overflow-visible">
          <NavLink href="/app" exact>
            Painel
          </NavLink>
          <NavLink href="/app/shows">Shows</NavLink>
          <NavLink href="/app/financas">Finanças</NavLink>
          <NavLink href="/app/contatos">Contatos</NavLink>
        </nav>
        <div className="hidden border-t border-gray-200 px-5 py-4 md:block">
          <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
          <p className="truncate text-xs text-gray-500">{user.email}</p>
          <form action={logoutAction} className="mt-3">
            <button type="submit" className="text-xs font-medium text-gray-500 hover:text-red-600">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
