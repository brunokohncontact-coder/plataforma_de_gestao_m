import Link from "next/link";
import { requireUser } from "@/lib/session";
import { NavLink } from "@/components/NavLink";
import { logoutAction } from "../(auth)/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-bold text-brand-700">
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
            <Link
              href="/conta"
              className="hidden text-sm text-gray-500 hover:text-brand-700 hover:underline sm:inline"
            >
              {user.artistName || user.name}
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="btn-secondary py-1.5 text-xs">
                Sair
              </button>
            </form>
          </div>
        </div>
        {/* nav mobile */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2 sm:hidden">
          <NavLink href="/dashboard">Painel</NavLink>
          <NavLink href="/shows">Shows</NavLink>
          <NavLink href="/financas">Finanças</NavLink>
          <NavLink href="/contatos">Contatos</NavLink>
          <NavLink href="/conta">Conta</NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
