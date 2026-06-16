import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold tracking-tight text-brand-700">
            Palco
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Gestão de carreira para músicos
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
