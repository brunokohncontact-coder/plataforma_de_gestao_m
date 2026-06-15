// Tipos de domínio puros (independentes do Prisma) para a lógica de negócio.
// Espelham o schema do Prisma, mas permitem testar cálculos sem banco de dados.

export type ShowStatus = "PROPOSED" | "CONFIRMED" | "PLAYED" | "CANCELLED";
export type SettlementStatus = "PENDING" | "SETTLED";
export type TransactionType = "INCOME" | "EXPENSE";
export type ContactRole =
  | "VENUE"
  | "PROMOTER"
  | "BOOKER"
  | "PRODUCER"
  | "PRESS"
  | "OTHER";

export interface Show {
  id: string;
  title: string;
  date: Date;
  venue?: string | null;
  city?: string | null;
  status: ShowStatus;
  /** Cachê acordado — número-âncora da rentabilidade. */
  fee: number;
  feeStatus: SettlementStatus;
  notes?: string | null;
  contactId?: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description?: string | null;
  date: Date;
  status: SettlementStatus;
  /** Vínculo opcional a um show. */
  showId?: string | null;
}
