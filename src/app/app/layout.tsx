import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/(auth)/actions";
import { NavLink } from "@/components/NavLink";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/app" className="text-lg font-bold text-brand-700">
              Palco
            </Link>
            <nav className="flex items-center gap-1">
              <NavLink href="/app">Painel</NavLink>
              <NavLink href="/app/shows">Shows</NavLink>
              <NavLink href="/app/finances">Finanças</NavLink>
              <NavLink href="/app/contacts">Contatos</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{user.artistName}</span>
            <form action={logoutAction}>
              <button type="submit" className="btn-ghost py-1.5 text-xs">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
