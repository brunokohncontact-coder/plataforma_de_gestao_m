import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { NavLink } from "@/components/NavLink";

const NAV = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/shows", label: "Shows" },
  { href: "/finances", label: "Finanças" },
  { href: "/contacts", label: "Contatos" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="text-lg font-bold text-brand">
            Palco
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user.name || user.email}
            </span>
            <form action={logoutAction}>
              <button type="submit" className="btn-secondary px-3 py-1.5 text-xs">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
