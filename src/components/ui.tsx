// Primitivos de UI reutilizáveis (Tailwind). Server-safe (sem hooks).
import { clsx } from "@/lib/clsx";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm",
        "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm",
        "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm",
        "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
        props.className,
      )}
    />
  );
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
      {children}
    </label>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-slate-600 hover:bg-slate-100",
  };
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50",
        variants[variant],
        className,
      )}
    />
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

const badgeColors: Record<string, string> = {
  proposed: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  done: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-600",
  received: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
};

export function Badge({ value, label }: { value: string; label: string }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeColors[value] ?? "bg-slate-100 text-slate-700",
      )}
    >
      {label}
    </span>
  );
}
