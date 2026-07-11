import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { showsToIcs, parseReminderMinutes, type IcsShow } from "@/lib/ics";
import type { ShowStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";

// Exporta a agenda de shows do usuário em iCalendar (.ics), para importar ou
// assinar em Google/Apple Calendar. Por padrão exclui shows cancelados; passe
// `?cancelados=1` para incluí-los (eles saem com STATUS:CANCELLED). Cada show
// ainda por cumprir (proposto/confirmado) sai com um lembrete 3h antes por
// padrão; ajuste com `?lembrete=` (30m|1h|2h|3h|6h|12h|1d|2d, ou `off` para
// desligar). A camada pura está em `@/lib/ics` (testada).
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const includeCancelled = req.nextUrl.searchParams.get("cancelados") === "1";
  const reminderMinutes = parseReminderMinutes(req.nextUrl.searchParams.get("lembrete"));

  const shows = await prisma.show.findMany({
    where: {
      userId: user.id,
      ...(includeCancelled ? {} : { status: { not: "CANCELLED" } }),
    },
    orderBy: { date: "asc" },
    select: {
      id: true,
      title: true,
      date: true,
      venue: true,
      city: true,
      status: true,
      fee: true,
      notes: true,
    },
  });

  const events: IcsShow[] = shows.map((s) => ({
    id: s.id,
    title: s.title,
    date: s.date,
    venue: s.venue,
    city: s.city,
    status: s.status as ShowStatus,
    fee: s.fee,
    notes: s.notes,
  }));

  const body = showsToIcs(
    events,
    reminderMinutes ? { reminderMinutesBefore: reminderMinutes } : {},
  );

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="agenda-shows.ics"',
      "Cache-Control": "no-store",
    },
  });
}
