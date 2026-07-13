"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SHOW_STATUS_DOT, type ShowStatus } from "@/lib/domain";
import { rescheduleShowAction } from "@/app/(app)/shows/actions";

/** Um show já achatado para o cliente (sem `Date`, tudo serializável). */
export interface CalendarShowView {
  id: string;
  title: string;
  status: string;
  timeLabel: string;
  tooltip: string;
}

/** Uma célula-dia da grade, pronta para render no cliente. */
export interface CalendarCellView {
  /** Chave estável/única da célula (dia local ISO). */
  key: string;
  /** "YYYY-MM-DD" — o dia-alvo ao soltar um show aqui e o `?data=` do "+". */
  dayParam: string;
  /** Número do dia (1–31). */
  dayNumber: number;
  isToday: boolean;
  inMonth: boolean;
  /** Rótulo pt-BR do dia, para o `aria-label` do botão "+". */
  dayLabel: string;
  items: CalendarShowView[];
}

/**
 * Grade mensal do calendário com arrastar-e-soltar para remarcar (`/shows/calendario`).
 * Cada chip de show é `draggable`; cada célula-dia é uma zona de drop que remarca o
 * show para aquele dia via `rescheduleShowAction` (preservando o horário). Os chips
 * continuam sendo links para o detalhe do show — arrastar é um acréscimo, o clique/
 * teclado seguem levando ao show (o arrastar em si é só ponteiro/mouse; a data também
 * pode ser editada pelo formulário do show, o caminho acessível).
 *
 * Componente de cliente porque o drag-and-drop exige handlers no navegador. A grade em
 * si (dias, bordas, distribuição dos shows) é montada no servidor por `buildMonthGrid`
 * (testada) e chega aqui já achatada em dados serializáveis — sem `Date` no cliente,
 * então o horário exibido não depende do fuso do navegador.
 */
export function CalendarGrid({ cells }: { cells: CalendarCellView[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Célula sob o cursor durante o arraste (realce visual do alvo) e o show em voo.
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function handleDrop(cell: CalendarCellView, e: React.DragEvent) {
    e.preventDefault();
    setDragOverKey(null);
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    setDraggingId(null);
    if (!id) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("dia", cell.dayParam);
    startTransition(async () => {
      await rescheduleShowAction(fd);
      router.refresh();
    });
  }

  return (
    <div className={"grid grid-cols-7" + (isPending ? " opacity-60" : "")}>
      {cells.map((cell) => {
        const isTarget = dragOverKey === cell.key;
        return (
          <div
            key={cell.key}
            onDragOver={(e) => {
              // Permitir o drop e realçar o alvo.
              e.preventDefault();
              if (dragOverKey !== cell.key) setDragOverKey(cell.key);
            }}
            onDragLeave={(e) => {
              // Só limpa se o cursor saiu de fato da célula (não para um filho).
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverKey((k) => (k === cell.key ? null : k));
              }
            }}
            onDrop={(e) => handleDrop(cell, e)}
            className={
              "group min-h-[6rem] border-b border-r border-gray-100 p-1.5 align-top transition-colors " +
              (isTarget
                ? "bg-brand-50 ring-1 ring-inset ring-brand-300"
                : cell.inMonth
                  ? "bg-white"
                  : "bg-gray-50/60")
            }
          >
            <div className="mb-1 flex items-center justify-between">
              <span
                className={
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs " +
                  (cell.isToday
                    ? "bg-brand-700 font-semibold text-white"
                    : cell.inMonth
                      ? "text-gray-700"
                      : "text-gray-400")
                }
              >
                {cell.dayNumber}
              </span>
              <Link
                href={`/shows/novo?data=${cell.dayParam}`}
                title="Novo show neste dia"
                aria-label={`Novo show em ${cell.dayLabel}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded text-sm leading-none text-gray-400 opacity-0 transition hover:bg-brand-50 hover:text-brand-700 focus:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
              >
                +
              </Link>
            </div>
            <div className="space-y-1">
              {cell.items.map((s) => {
                const status = s.status as ShowStatus;
                return (
                  <Link
                    key={s.id}
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
                      "flex cursor-grab items-center gap-1 rounded-md bg-gray-50 px-1.5 py-1 text-xs hover:bg-gray-100 active:cursor-grabbing " +
                      (draggingId === s.id ? "opacity-40" : "")
                    }
                  >
                    <span
                      className={"h-2 w-2 shrink-0 rounded-full " + SHOW_STATUS_DOT[status]}
                      aria-hidden
                    />
                    <span className="truncate">{s.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
