import Link from "next/link";
import { requireUser } from "@/lib/session";
import { REPORT_GROUPS, reportCount } from "@/lib/reports";

export const metadata = {
  title: "Relatórios — Palco",
};

export default async function ReportsHubPage() {
  // Hub puramente navegável: exige apenas sessão, sem consulta ao banco.
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="mt-1 text-sm text-gray-500">
          Todas as análises do Palco em um só lugar — {reportCount()} relatórios sobre seus
          shows, finanças e contatos.
        </p>
      </div>

      {REPORT_GROUPS.map((group) => (
        <section key={group.area} id={group.area} className="scroll-mt-24 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {group.label}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.entries.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                className="card flex h-full flex-col transition hover:border-brand-300 hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  {entry.icon && (
                    <span aria-hidden className="text-lg">
                      {entry.icon}
                    </span>
                  )}
                  <span className="font-semibold text-brand-700">{entry.title}</span>
                </div>
                <p className="mt-1.5 text-sm text-gray-500">{entry.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
