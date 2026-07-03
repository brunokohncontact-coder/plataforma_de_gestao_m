"use client";

import { useRef, useState } from "react";
import type { ShowBilling } from "@/lib/billing";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";

type BillingContactAction = (formData: FormData) => void | Promise<void>;

/**
 * Atalhos de cobrança (✉ E-mail / WhatsApp) de um show com seletor de QUAL contato
 * cobrar. Recebe a cobrança já montada para cada contato alcançável do show (em
 * ordem de prioridade — ver `buildShowBillings`); tudo (assunto/corpo/links) vem
 * pronto do servidor, o cliente só alterna entre os contatos. Quando há um só
 * contato, mostra direto os botões; com vários, antepõe um `<select>` para escolher
 * quem cobrar.
 *
 * `initialIndex` abre o seletor já na última escolha lembrada do usuário para o show
 * (via `preferredBillingIndex`); quando `showId` e `action` são informados, trocar o
 * contato no seletor PERSISTE a escolha (submete `setBillingContactAction` num form
 * escondido) para a próxima abertura da lista já vir nela. Sem `action` o seletor
 * segue puramente local (comportamento histórico).
 */
export function BillingActions({
  billings,
  showId,
  initialIndex = 0,
  action,
}: {
  billings: ShowBilling[];
  showId?: string;
  initialIndex?: number;
  action?: BillingContactAction;
}) {
  const [index, setIndex] = useState(initialIndex);
  const formRef = useRef<HTMLFormElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);

  if (billings.length === 0) return null;

  const selected = billings[index] ?? billings[0];
  // Só persiste quando há de fato uma escolha a fazer (>1 contato) e o servidor
  // ofereceu como gravar (showId + action).
  const canPersist = Boolean(showId && action && billings.length > 1);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const i = Number(e.target.value);
    setIndex(i);
    if (canPersist && contactRef.current) {
      // Grava o contato escolhido (a lista não reordena — só a seleção inicial da
      // próxima abertura muda), submetendo o form escondido para a server action.
      contactRef.current.value = billings[i]?.contact.id ?? "";
      formRef.current?.requestSubmit();
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {billings.length > 1 && (
        <>
          {canPersist && (
            <form ref={formRef} action={action} className="hidden">
              <input type="hidden" name="id" value={showId} />
              <input ref={contactRef} type="hidden" name="contactId" defaultValue="" />
            </form>
          )}
          <label htmlFor={`billing-${selected.contact.id}`} className="sr-only">
            Quem cobrar
          </label>
          <select
            id={`billing-${selected.contact.id}`}
            className="input w-auto py-1.5 text-xs"
            value={index}
            onChange={handleChange}
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
