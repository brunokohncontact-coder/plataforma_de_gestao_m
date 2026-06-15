import Link from "next/link";
import { requireUser } from "@/lib/session";
import { logoutAction } from "../(auth)/actions";
import NavLink from "./NavLink";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-xl font-bold text-brand-700">
            Palco
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user.artistName}
            </span>
            <form action={logoutAction}>
              <button type="submit" className="btn-secondary text-xs">
                Sair
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-2">
          <NavLink href="/dashboard">Painel</NavLink>
          <NavLink href="/shows">Shows</NavLink>
          <NavLink href="/finances">Finanças</NavLink>
          <NavLink href="/contacts">Contatos</NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
