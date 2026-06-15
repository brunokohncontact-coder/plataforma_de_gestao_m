// Mini utilitário para compor classes condicionalmente (evita dependência externa).
export function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
