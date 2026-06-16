"use client";

import { useState } from "react";
import { maskMoneyInput } from "@/lib/money";

/**
 * Campo de valor monetário com máscara pt-BR aplicada "ao digitar".
 * Os dígitos são tratados como centavos (ver `maskMoneyInput`), de modo que o
 * usuário digita "12345" e vê "123,45". O valor enviado no form é a string
 * mascarada (ex.: "1.234,56"), já compatível com `parseMoneyToCents`.
 */
export function MoneyInput({
  id,
  name,
  defaultValue,
  required,
  placeholder = "0,00",
  className = "input",
}: {
  id: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(() => maskMoneyInput(defaultValue ?? ""));

  return (
    <input
      className={className}
      id={id}
      name={name}
      type="text"
      inputMode="decimal"
      required={required}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(maskMoneyInput(e.target.value))}
    />
  );
}
