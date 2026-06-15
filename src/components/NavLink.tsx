"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={
        "rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
        (active
          ? "bg-brand/10 text-brand"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
      }
    >
      {label}
    </Link>
  );
}
