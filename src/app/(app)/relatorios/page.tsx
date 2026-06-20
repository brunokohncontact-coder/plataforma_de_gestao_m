import { requireUser } from "@/lib/session";
import { reportCount } from "@/lib/reports";
import ReportsBrowser from "./ReportsBrowser";

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

      <ReportsBrowser />
    </div>
  );
}
