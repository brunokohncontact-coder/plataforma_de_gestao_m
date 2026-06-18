import { NextResponse, type NextRequest } from "next/server";
import {
  decideFinancasFilter,
  FINANCAS_FILTER_COOKIE,
} from "@/lib/financasFilter";

// ~180 dias: o filtro preferido sobrevive entre sessões sem ser eterno.
const FILTER_MAX_AGE = 60 * 60 * 24 * 180;

// Path "/" para `set` e `delete` casarem (o browser distingue cookies por
// nome+path). O `cookies.delete` do Next sempre emite `Path=/`, então o `set`
// também usa "/". O cookie só é lido em `/financas`, então o escopo amplo é inócuo.
const FILTER_COOKIE_PATH = "/";

/**
 * Persiste/restaura o último filtro usado nas Finanças (ver `@/lib/financasFilter`).
 * A decisão é pura e testada; aqui só a traduzimos em resposta HTTP.
 */
export function middleware(req: NextRequest) {
  const decision = decideFinancasFilter(
    req.nextUrl.searchParams,
    req.cookies.get(FINANCAS_FILTER_COOKIE)?.value,
  );

  switch (decision.kind) {
    case "reset": {
      const res = NextResponse.redirect(new URL("/financas", req.nextUrl.origin));
      res.cookies.delete(FINANCAS_FILTER_COOKIE);
      return res;
    }
    case "persist": {
      const res = NextResponse.next();
      if (decision.cookie) {
        res.cookies.set(FINANCAS_FILTER_COOKIE, decision.cookie, {
          httpOnly: true,
          sameSite: "lax",
          path: FILTER_COOKIE_PATH,
          maxAge: FILTER_MAX_AGE,
        });
      } else {
        res.cookies.delete(FINANCAS_FILTER_COOKIE);
      }
      return res;
    }
    case "restore": {
      return NextResponse.redirect(
        new URL(`/financas?${decision.query}`, req.nextUrl.origin),
      );
    }
    default:
      return NextResponse.next();
  }
}

// Só a rota exata da lista de Finanças (não os subcaminhos como /financas/nova).
export const config = {
  matcher: ["/financas"],
};
