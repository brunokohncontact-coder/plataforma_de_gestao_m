// Rótulos em pt-BR para os enums do domínio (UI).

export const SHOW_STATUS_LABELS: Record<string, string> = {
  PROPOSED: "Proposto",
  CONFIRMED: "Confirmado",
  COMPLETED: "Realizado",
  CANCELED: "Cancelado",
};

export const SHOW_STATUS_COLORS: Record<string, string> = {
  PROPOSED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELED: "bg-gray-200 text-gray-600",
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  SETTLED: "Efetivado",
};

export const CONTACT_ROLE_LABELS: Record<string, string> = {
  VENUE: "Casa de show",
  PROMOTER: "Produtor/Promoter",
  BOOKER: "Contratante",
  PRODUCER: "Produtor musical",
  PRESS: "Imprensa",
  OTHER: "Outro",
};

/** Formata uma data como dd/mm/aaaa (UTC, para casar com inputs date). */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Converte Date -> "YYYY-MM-DD" (UTC) para preencher input[type=date]. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Nome do mês "YYYY-MM" -> "mar/2026". */
export function formatMonthKey(key: string): string {
  const [y, m] = key.split("-");
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
