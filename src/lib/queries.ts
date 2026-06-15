import { prisma } from "./db";
import { formatDate } from "./format";
import type { ShowOption } from "@/components/TransactionForm";

/** Opções de shows do usuário para selects (rótulo amigável). */
export async function getShowOptions(userId: string): Promise<ShowOption[]> {
  const shows = await prisma.show.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    select: { id: true, title: true, venue: true, date: true },
  });
  return shows.map((s) => ({
    id: s.id,
    label: `${s.title || s.venue} — ${formatDate(s.date)}`,
  }));
}
