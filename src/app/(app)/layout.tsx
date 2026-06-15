import Link from "next/link";
import { requireUser } from "@/lib/session";
import { logoutAction } from "../(auth)/actions";

const nav = [
  { href: "/dashboard", label: "Painel" },
  { href: "/shows", label: "Shows" },
  { href: "/financas", label: "Finanças" },
  { href: "/contatos", label: "Contatos" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-bold text-brand-600">
              Palco
            </Link>
            <nav className="hidden gap-4 sm:flex">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user.artistName || user.name}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm font-medium text-slate-500 hover:text-red-600"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
        <nav className="flex gap-4 border-t border-slate-100 px-4 py-2 sm:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-600"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
