import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/app/auth-actions";
import { NavLink } from "@/components/NavLink";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const display = user.artistName || user.name;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-bold text-brand-600">
              Palco
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              <NavLink href="/dashboard">Painel</NavLink>
              <NavLink href="/shows">Shows</NavLink>
              <NavLink href="/financas">Finanças</NavLink>
              <NavLink href="/contatos">Contatos</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              {display}
            </span>
            <form action={logoutAction}>
              <button className="btn-secondary px-3 py-1.5 text-xs">Sair</button>
            </form>
          </div>
        </div>
        {/* nav mobile */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-1 sm:hidden">
          <NavLink href="/dashboard">Painel</NavLink>
          <NavLink href="/shows">Shows</NavLink>
          <NavLink href="/financas">Finanças</NavLink>
          <NavLink href="/contatos">Contatos</NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
