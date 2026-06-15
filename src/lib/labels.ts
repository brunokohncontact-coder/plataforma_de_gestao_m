/** Rótulos em pt-BR e estilos de badge — seguro para client e server. */

export const SHOW_STATUS_LABELS: Record<string, string> = {
  proposed: "Proposto",
  confirmed: "Confirmado",
  done: "Realizado",
  cancelled: "Cancelado",
};

export const SHOW_STATUS_BADGE: Record<string, string> = {
  proposed: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  cancelled: "bg-slate-200 text-slate-600",
};

export const CONTACT_ROLE_LABELS: Record<string, string> = {
  venue: "Casa de show",
  promoter: "Produtor(a) / Promoter",
  booker: "Contratante / Booker",
  producer: "Produtor(a) musical",
  press: "Imprensa",
  other: "Outro",
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  income: "Receita",
  expense: "Despesa",
};
