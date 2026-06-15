import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-center">
          <span className="text-2xl font-bold text-brand">Palco</span>
          <p className="mt-1 text-sm text-slate-500">
            O back-office da sua carreira musical.
          </p>
        </Link>
        {children}
      </div>
    </div>
  );
}
