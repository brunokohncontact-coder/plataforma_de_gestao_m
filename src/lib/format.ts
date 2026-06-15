// Helpers de formatação para a UI (datas, mês). Dinheiro fica em domain/money.ts.

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

// Valor para <input type="date"> (YYYY-MM-DD), baseado no horário local.
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// "2026-06" -> "jun 2026"
export function formatMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}
