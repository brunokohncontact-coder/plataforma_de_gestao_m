// Camada de leitura: busca dados do workspace e mapeia para os tipos das
// funções de cálculo puras (src/lib/finance.ts).
import "server-only";
import { prisma } from "./prisma";
import type { TxInput } from "./finance";
import type { TransactionType, TransactionStatus } from "./domain";

export async function getWorkspaceTransactionsForCalc(
  workspaceId: string,
): Promise<TxInput[]> {
  const txs = await prisma.transaction.findMany({
    where: { workspaceId },
    select: { type: true, amount: true, date: true, category: true, status: true, showId: true },
  });
  return txs.map((t) => ({
    type: t.type as TransactionType,
    amount: t.amount,
    date: t.date,
    category: t.category,
    status: t.status as TransactionStatus,
    showId: t.showId,
  }));
}

export async function getWorkspaceShows(workspaceId: string) {
  return prisma.show.findMany({
    where: { workspaceId },
    orderBy: { date: "desc" },
    include: { contact: true, transactions: true },
  });
}

export async function getWorkspaceTransactions(workspaceId: string) {
  return prisma.transaction.findMany({
    where: { workspaceId },
    orderBy: { date: "desc" },
    include: { show: true },
  });
}

export async function getWorkspaceContacts(workspaceId: string) {
  return prisma.contact.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    include: { _count: { select: { shows: true } } },
  });
}
