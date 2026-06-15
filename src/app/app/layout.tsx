import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { NavLink } from "@/components/NavLink";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/app" className="text-lg font-bold text-brand-700">
              Palco
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              <NavLink href="/app">Painel</NavLink>
              <NavLink href="/app/shows">Shows</NavLink>
              <NavLink href="/app/financas">Finanças</NavLink>
              <NavLink href="/app/contatos">Contatos</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{user.name}</span>
            <form action={logoutAction}>
              <button className="btn-secondary py-1.5 text-xs" type="submit">
                Sair
              </button>
            </form>
          </div>
        </div>
        {/* Nav mobile */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 sm:hidden">
          <NavLink href="/app">Painel</NavLink>
          <NavLink href="/app/shows">Shows</NavLink>
          <NavLink href="/app/financas">Finanças</NavLink>
          <NavLink href="/app/contatos">Contatos</NavLink>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
