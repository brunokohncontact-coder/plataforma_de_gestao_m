"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SHOW_STATUS_DOT, SHOW_STATUS_LABELS, type ShowStatus } from "@/lib/domain";
import { rescheduleShowAction } from "@/app/(app)/shows/actions";

/** Um show já achatado para o cliente (sem `Date`, tudo serializável). */
export interface WeekShowView {
  id: string;
  title: string;
  status: string;
  timeLabel: string;
  /** "Casa · Cidade" já montado no servidor (pode ser ""). */
  place: string;
  tooltip: string;
}

/** Um dia da semana, pronto para render no cliente. */
export interface WeekDayView {
  /** Chave estável/única do dia (dia local ISO, `toDayParam`). */
  key: string;
  /** "YYYY-MM-DD" — o dia-alvo ao soltar um show aqui e o `?data=` do "+". */
  dayParam: string;
  /** Rótulo curto do dia da semana (Dom–Sáb). */
  weekdayLabel: string;
  /** Número do dia (1–31). */
  dayNumber: number;
  /** Rótulo pt-BR do dia, para os `aria-label`. */
  dayLabel: string;
  isToday: boolean;
  items: WeekShowView[];
}

/**
 * Agenda semanal (lista vertical de 7 dias) com arrastar-e-soltar para remarcar
 * (`/shows/semana`). Irmã de `CalendarGrid` (grade mensal): cada chip de show é
 * `draggable`; cada linha-dia é uma zona de drop que remarca o show para aquele dia
 * via `rescheduleShowAction` (preservando o horário). Os chips continuam sendo links
 * para o detalhe do show — arrastar é um acréscimo, o clique/teclado seguem levando ao
 * show (o arrastar em si é só ponteiro/mouse; a data também pode ser editada pelo
 * formulário do show, o caminho acessível).
 *
 * Componente de cliente porque o drag-and-drop exige handlers no navegador. Os dias e a
 * distribuição dos shows são montados no servidor por `buildWeekGrid` (testada) e chegam
 * aqui já achatados em dados serializáveis — sem `Date` no cliente, então o horário
 * exibido não depende do fuso do navegador.
 */
export function WeekGrid({ days }: { days: WeekDayView[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Dia sob o cursor durante o arraste (realce visual do alvo) e o show em voo.
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function handleDrop(day: WeekDayView, e: React.DragEvent) {
    e.preventDefault();
    setDragOverKey(null);
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    setDraggingId(null);
    if (!id) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("dia", day.dayParam);
    startTransition(async () => {
      await rescheduleShowAction(fd);
      router.refresh();
    });
  }

  return (
    <ul className={"divide-y divide-gray-100" + (isPending ? " opacity-60" : "")}>
      {days.map((day) => {
        const isTarget = dragOverKey === day.key;
        return (
          <li
            key={day.key}
            onDragOver={(e) => {
              // Permitir o drop e realçar o alvo.
              e.preventDefault();
              if (dragOverKey !== day.key) setDragOverKey(day.key);
            }}
            onDragLeave={(e) => {
              // Só limpa se o cursor saiu de fato da linha (não para um filho).
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverKey((k) => (k === day.key ? null : k));
              }
            }}
            onDrop={(e) => handleDrop(day, e)}
            className={
              "group flex flex-col gap-2 px-4 py-3 transition-colors sm:flex-row sm:gap-4 " +
              (isTarget
                ? "bg-brand-50 ring-1 ring-inset ring-brand-300"
                : day.isToday
                  ? "bg-brand-50/50"
                  : "")
            }
          >
            {/* Coluna do dia */}
            <div className="flex w-full items-center justify-between sm:w-28 sm:flex-col sm:items-start sm:justify-start">
              <div className="flex items-baseline gap-2 sm:flex-col sm:gap-0">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {day.weekdayLabel}
                </span>
                <span
                  className={
                    "text-lg font-semibold " +
                    (day.isToday ? "text-brand-700" : "text-gray-800")
                  }
                >
                  {day.dayNumber}
                </span>
              </div>
              <Link
                href={`/shows/novo?data=${day.dayParam}`}
                title="Novo show neste dia"
                aria-label={`Novo show em ${day.dayLabel}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-sm leading-none text-gray-400 opacity-0 transition hover:bg-brand-50 hover:text-brand-700 focus:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
              >
                +
              </Link>
            </div>

            {/* Shows do dia */}
            <div className="flex-1">
              {day.items.length === 0 ? (
                <p className="py-1 text-sm text-gray-300">—</p>
              ) : (
                <ul className="space-y-1.5">
                  {day.items.map((s) => {
                    const status = s.status as ShowStatus;
                    return (
                      <li key={s.id}>
                        <Link
                          href={`/shows/${s.id}`}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", s.id);
                            e.dataTransfer.effectAllowed = "move";
                            setDraggingId(s.id);
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverKey(null);
                          }}
                          title={s.tooltip}
                          className={
                            "flex cursor-grab items-center gap-2 rounded-md bg-gray-50 px-2.5 py-2 text-sm transition hover:bg-gray-100 active:cursor-grabbing " +
                            (draggingId === s.id ? "opacity-40" : "")
                          }
                        >
                          <span
                            className={
                              "h-2.5 w-2.5 shrink-0 rounded-full " + SHOW_STATUS_DOT[status]
                            }
                            aria-hidden
                          />
                          <span className="w-12 shrink-0 tabular-nums text-gray-500">
                            {s.timeLabel}
                          </span>
                          <span className="font-medium">{s.title}</span>
                          {s.place && (
                            <span className="truncate text-gray-500">· {s.place}</span>
                          )}
                          <span className="ml-auto shrink-0 text-xs text-gray-400">
                            {SHOW_STATUS_LABELS[status]}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
