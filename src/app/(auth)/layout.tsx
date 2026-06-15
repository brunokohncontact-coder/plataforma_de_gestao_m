import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-2xl font-bold text-brand-700">
        Palco
      </Link>
      <div className="w-full max-w-sm">
        <div className="card">{children}</div>
      </div>
    </main>
  );
}
