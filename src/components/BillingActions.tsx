"use client";

import { useState } from "react";
import type { ShowBilling } from "@/lib/billing";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";

/**
 * Atalhos de cobrança (✉ E-mail / WhatsApp) de um show com seletor de QUAL contato
 * cobrar. Recebe a cobrança já montada para cada contato alcançável do show (em
 * ordem de prioridade — ver `buildShowBillings`); tudo (assunto/corpo/links) vem
 * pronto do servidor, o cliente só alterna entre os contatos. Quando há um só
 * contato, mostra direto os botões; com vários, antepõe um `<select>` para escolher
 * quem cobrar (a escolha automática vem pré-selecionada).
 */
export function BillingActions({ billings }: { billings: ShowBilling[] }) {
  const [index, setIndex] = useState(0);

  if (billings.length === 0) return null;

  const selected = billings[index] ?? billings[0];

  return (
    <div className="flex items-center justify-end gap-1.5">
      {billings.length > 1 && (
        <>
          <label htmlFor={`billing-${selected.contact.id}`} className="sr-only">
            Quem cobrar
          </label>
          <select
            id={`billing-${selected.contact.id}`}
            className="input w-auto py-1.5 text-xs"
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            title="Escolher qual contato cobrar"
          >
            {billings.map((b, i) => (
              <option key={b.contact.id} value={i}>
                {b.contact.name}
                {roleSuffix(b.contact.role)}
              </option>
            ))}
          </select>
        </>
      )}
      {selected.mailtoUrl && (
        <a
          href={selected.mailtoUrl}
          className="btn border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 py-1.5 text-xs"
          title={`Cobrar ${selected.contact.name} por e-mail`}
          aria-label={`Cobrar ${selected.contact.name} por e-mail`}
        >
          ✉ E-mail
        </a>
      )}
      {selected.whatsappUrl && (
        <a
          href={selected.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 py-1.5 text-xs"
          title={`Cobrar ${selected.contact.name} pelo WhatsApp`}
          aria-label={`Cobrar ${selected.contact.name} pelo WhatsApp`}
        >
          WhatsApp
        </a>
      )}
    </div>
  );
}

// Sufixo " (Papel)" para diferenciar contatos no seletor, quando o papel é conhecido.
function roleSuffix(role?: string | null): string {
  if (!role) return "";
  const label = CONTACT_ROLE_LABELS[role as ContactRole];
  return label ? ` (${label})` : "";
}
