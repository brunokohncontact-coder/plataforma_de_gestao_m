import { NextResponse, type NextRequest } from "next/server";
import {
  decideListFilter,
  withRestoredFlag,
  LIST_FILTER_CONFIGS,
} from "@/lib/listFilter";

// ~180 dias: o filtro preferido sobrevive entre sessões sem ser eterno.
const FILTER_MAX_AGE = 60 * 60 * 24 * 180;

// Path "/" para `set` e `delete` casarem (o browser distingue cookies por
// nome+path). O `cookies.delete` do Next sempre emite `Path=/`, então o `set`
// também usa "/". O cookie só é lido na própria rota, então o escopo amplo é inócuo.
const FILTER_COOKIE_PATH = "/";

/**
 * Persiste/restaura o último filtro usado nas listas (ver `@/lib/listFilter`).
 * A decisão é pura e testada; aqui só a traduzimos em resposta HTTP. Cada lista
 * registrada em `LIST_FILTER_CONFIGS` tem seu próprio cookie e conjunto de chaves.
 */
export function middleware(req: NextRequest) {
  const config = LIST_FILTER_CONFIGS.find(
    (c) => c.path === req.nextUrl.pathname,
  );
  if (!config) return NextResponse.next();

  const decision = decideListFilter(
    req.nextUrl.searchParams,
    req.cookies.get(config.cookie)?.value,
    config.keys,
  );

  switch (decision.kind) {
    case "reset": {
      const res = NextResponse.redirect(new URL(config.path, req.nextUrl.origin));
      res.cookies.delete(config.cookie);
      return res;
    }
    case "persist": {
      const res = NextResponse.next();
      if (decision.cookie) {
        res.cookies.set(config.cookie, decision.cookie, {
          httpOnly: true,
          sameSite: "lax",
          path: FILTER_COOKIE_PATH,
          maxAge: FILTER_MAX_AGE,
        });
      } else {
        res.cookies.delete(config.cookie);
      }
      return res;
    }
    case "restore": {
      // Marca a URL restaurada (`?...&lembrado=1`) para a página avisar que o
      // recorte veio do cookie, não de uma submissão. O marcador não é chave de
      // filtro, então some na próxima submissão e nunca entra no cookie.
      return NextResponse.redirect(
        new URL(
          `${config.path}?${withRestoredFlag(decision.query)}`,
          req.nextUrl.origin,
        ),
      );
    }
    default:
      return NextResponse.next();
  }
}

// Só as rotas exatas das listas (não os subcaminhos como /financas/nova).
// Manter em sincronia com os `path` de LIST_FILTER_CONFIGS.
export const config = {
  matcher: ["/financas", "/shows", "/contatos"],
};
