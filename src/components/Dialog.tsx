"use client";

import { createContext, useContext, useState } from "react";

const DialogCloseContext = createContext<() => void>(() => {});

/** Hook usado por formulários dentro de um Dialog para fechá-lo (ex.: após sucesso). */
export function useCloseDialog() {
  return useContext(DialogCloseContext);
}

/**
 * Modal acionado por um botão. `children` é um elemento (serializável de Server→Client),
 * e o fechamento é exposto via contexto (useCloseDialog) — evitando passar funções
 * como props de Server Components.
 */
export function Dialog({
  triggerLabel,
  triggerClassName = "btn-primary",
  title,
  children,
}: {
  triggerLabel: string;
  triggerClassName?: string;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <button className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 sm:items-center"
          onClick={close}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                onClick={close}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <DialogCloseContext.Provider value={close}>
              {children}
            </DialogCloseContext.Provider>
          </div>
        </div>
      )}
    </>
  );
}
