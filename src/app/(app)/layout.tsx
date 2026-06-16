import { requireUser } from "@/lib/auth";
import { logoutAction } from "../(auth)/actions";
import { NavLink } from "@/components/NavLink";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const displayName = user.artistName || user.name;

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4 md:block">
          <div>
            <div className="text-xl font-bold text-brand-700">Palco</div>
            <div className="mt-1 truncate text-xs text-slate-500">
              {displayName}
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:gap-1 md:px-3">
          <NavLink href="/dashboard">Painel</NavLink>
          <NavLink href="/shows">Shows</NavLink>
          <NavLink href="/transactions">Finanças</NavLink>
          <NavLink href="/contacts">Contatos</NavLink>
        </nav>
        <div className="hidden p-3 md:block">
          <form action={logoutAction}>
            <button type="submit" className="btn-secondary w-full">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
