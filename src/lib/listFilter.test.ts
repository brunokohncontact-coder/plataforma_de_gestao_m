import { describe, it, expect } from "vitest";
import {
  canonicalQuery,
  hasAnyFilterParam,
  decideListFilter,
  withRestoredFlag,
  wasFilterRestored,
  FILTER_RESTORED_PARAM,
  LIST_FILTER_CONFIGS,
} from "./listFilter";

const sp = (s: string) => new URLSearchParams(s);

// Chaves usadas pela lista de Shows (subconjunto representativo).
const SHOWS_KEYS = ["q", "status", "de", "ate"] as const;
// Chaves usadas pela lista de Contatos.
const CONTATOS_KEYS = ["q", "papel"] as const;

describe("canonicalQuery (genérico)", () => {
  it("mantém só chaves conhecidas e não-vazias, em ordem estável", () => {
    const params = sp("status=DONE&lixo=1&q=jazz&ate=&de=2026-01-01");
    expect(canonicalQuery(params, SHOWS_KEYS)).toBe(
      "q=jazz&status=DONE&de=2026-01-01",
    );
  });

  it("respeita o conjunto de chaves de cada lista", () => {
    // `status` é chave em Shows, mas não em Contatos → descartada lá.
    const params = sp("q=ze&status=DONE&papel=VENUE");
    expect(canonicalQuery(params, CONTATOS_KEYS)).toBe("q=ze&papel=VENUE");
    expect(canonicalQuery(params, SHOWS_KEYS)).toBe("q=ze&status=DONE");
  });

  it("descarta valores só com espaços (após trim)", () => {
    expect(canonicalQuery(sp("q=%20%20&papel=VENUE"), CONTATOS_KEYS)).toBe(
      "papel=VENUE",
    );
  });

  it("retorna string vazia quando nada relevante é passado", () => {
    expect(canonicalQuery(sp("reset=1&foo=bar"), SHOWS_KEYS)).toBe("");
    expect(canonicalQuery(sp(""), SHOWS_KEYS)).toBe("");
  });
});

describe("hasAnyFilterParam (genérico)", () => {
  it("detecta qualquer chave de filtro, mesmo vazia", () => {
    expect(hasAnyFilterParam(sp("status="), SHOWS_KEYS)).toBe(true);
    expect(hasAnyFilterParam(sp("papel=VENUE"), CONTATOS_KEYS)).toBe(true);
  });

  it("ignora chaves fora do conjunto da lista", () => {
    expect(hasAnyFilterParam(sp("status=DONE"), CONTATOS_KEYS)).toBe(false);
    expect(hasAnyFilterParam(sp("reset=1"), SHOWS_KEYS)).toBe(false);
    expect(hasAnyFilterParam(sp(""), SHOWS_KEYS)).toBe(false);
  });
});

describe("decideListFilter (genérico)", () => {
  it("reset tem prioridade sobre tudo", () => {
    expect(decideListFilter(sp("reset=1&status=DONE"), "q=x", SHOWS_KEYS)).toEqual(
      { kind: "reset" },
    );
  });

  it("persiste o recorte canônico ao submeter filtros", () => {
    expect(
      decideListFilter(sp("q=jazz&de=&status=DONE"), null, SHOWS_KEYS),
    ).toEqual({ kind: "persist", cookie: "q=jazz&status=DONE" });
  });

  it("submeter filtros todos vazios apaga o cookie (persist com cookie null)", () => {
    expect(
      decideListFilter(sp("q=&papel="), "papel=VENUE", CONTATOS_KEYS),
    ).toEqual({ kind: "persist", cookie: null });
  });

  it("restaura o filtro salvo numa visita limpa", () => {
    expect(decideListFilter(sp(""), "q=ze&papel=VENUE", CONTATOS_KEYS)).toEqual({
      kind: "restore",
      query: "q=ze&papel=VENUE",
    });
  });

  it("sanitiza o cookie salvo ao restaurar (descarta chaves fora da lista)", () => {
    // `status` não pertence a Contatos → some na restauração.
    expect(
      decideListFilter(sp(""), "papel=VENUE&status=DONE", CONTATOS_KEYS),
    ).toEqual({ kind: "restore", query: "papel=VENUE" });
  });

  it("visita limpa sem cookie (ou cookie inútil) apenas passa", () => {
    expect(decideListFilter(sp(""), null, SHOWS_KEYS)).toEqual({ kind: "pass" });
    expect(decideListFilter(sp(""), "", SHOWS_KEYS)).toEqual({ kind: "pass" });
    expect(decideListFilter(sp(""), "lixo=1", SHOWS_KEYS)).toEqual({
      kind: "pass",
    });
  });

  it("não entra em loop: a URL restaurada já tem chaves → vira persist", () => {
    const restored = decideListFilter(sp(""), "status=DONE", SHOWS_KEYS);
    expect(restored).toEqual({ kind: "restore", query: "status=DONE" });
    const next = decideListFilter(sp("status=DONE"), "status=DONE", SHOWS_KEYS);
    expect(next).toEqual({ kind: "persist", cookie: "status=DONE" });
  });
});

describe("marcador de filtro restaurado", () => {
  it("withRestoredFlag acrescenta o marcador preservando as chaves", () => {
    expect(withRestoredFlag("q=jazz&status=DONE")).toBe(
      `q=jazz&status=DONE&${FILTER_RESTORED_PARAM}=1`,
    );
  });

  it("withRestoredFlag funciona com query vazia", () => {
    expect(withRestoredFlag("")).toBe(`${FILTER_RESTORED_PARAM}=1`);
  });

  it("wasFilterRestored detecta o marcador, ignorando outros valores", () => {
    expect(wasFilterRestored(sp(`q=jazz&${FILTER_RESTORED_PARAM}=1`))).toBe(true);
    expect(wasFilterRestored(sp("q=jazz"))).toBe(false);
    expect(wasFilterRestored(sp(`${FILTER_RESTORED_PARAM}=0`))).toBe(false);
  });

  it("o marcador não é chave de filtro: some na canonicalização e não persiste", () => {
    const restored = withRestoredFlag("q=jazz&status=DONE");
    // canonicalQuery (o que vai pro cookie) descarta o marcador.
    expect(canonicalQuery(sp(restored), SHOWS_KEYS)).toBe("q=jazz&status=DONE");
    // A URL restaurada já tem chaves de filtro → vira persist, sem o marcador.
    expect(decideListFilter(sp(restored), null, SHOWS_KEYS)).toEqual({
      kind: "persist",
      cookie: "q=jazz&status=DONE",
    });
  });
});

describe("LIST_FILTER_CONFIGS", () => {
  it("cobre as três listas com cookies distintos", () => {
    const paths = LIST_FILTER_CONFIGS.map((c) => c.path);
    expect(paths).toEqual(["/financas", "/shows", "/contatos"]);
    const cookies = LIST_FILTER_CONFIGS.map((c) => c.cookie);
    expect(new Set(cookies).size).toBe(cookies.length);
  });

  it("toda config tem ao menos uma chave de filtro", () => {
    for (const c of LIST_FILTER_CONFIGS) {
      expect(c.keys.length).toBeGreaterThan(0);
    }
  });
});
