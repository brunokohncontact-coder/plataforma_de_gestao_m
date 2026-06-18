import { describe, it, expect } from "vitest";
import {
  canonicalFilterQuery,
  hasAnyFilterParam,
  decideFinancasFilter,
} from "./financasFilter";

const sp = (s: string) => new URLSearchParams(s);

describe("canonicalFilterQuery", () => {
  it("mantém só chaves conhecidas e não-vazias, em ordem estável", () => {
    // ordem de entrada embaralhada e com chave desconhecida + vazia
    const params = sp("tipo=INCOME&lixo=1&q=cache&mes=&de=2026-01-01");
    expect(canonicalFilterQuery(params)).toBe("q=cache&tipo=INCOME&de=2026-01-01");
  });

  it("descarta valores só com espaços (após trim)", () => {
    expect(canonicalFilterQuery(sp("q=%20%20&mes=2026-06"))).toBe("mes=2026-06");
  });

  it("retorna string vazia quando nada relevante é passado", () => {
    expect(canonicalFilterQuery(sp("reset=1&foo=bar"))).toBe("");
    expect(canonicalFilterQuery(sp(""))).toBe("");
  });

  it("é idempotente (canônico de canônico é igual)", () => {
    const once = canonicalFilterQuery(sp("status=pending&q=bar&mes=2026-06"));
    expect(canonicalFilterQuery(sp(once))).toBe(once);
  });
});

describe("hasAnyFilterParam", () => {
  it("detecta qualquer chave de filtro, mesmo vazia", () => {
    expect(hasAnyFilterParam(sp("mes="))).toBe(true);
    expect(hasAnyFilterParam(sp("q=algo"))).toBe(true);
  });

  it("ignora chaves não-filtro (ex.: reset)", () => {
    expect(hasAnyFilterParam(sp("reset=1"))).toBe(false);
    expect(hasAnyFilterParam(sp(""))).toBe(false);
  });
});

describe("decideFinancasFilter", () => {
  it("reset tem prioridade sobre tudo", () => {
    expect(decideFinancasFilter(sp("reset=1&mes=2026-06"), "q=x")).toEqual({
      kind: "reset",
    });
  });

  it("persiste o recorte canônico ao submeter filtros", () => {
    expect(
      decideFinancasFilter(sp("q=cache&mes=&tipo=EXPENSE"), null),
    ).toEqual({ kind: "persist", cookie: "q=cache&tipo=EXPENSE" });
  });

  it("submeter filtros todos vazios apaga o cookie (persist com cookie null)", () => {
    expect(
      decideFinancasFilter(sp("q=&mes=&tipo=&status="), "mes=2026-06"),
    ).toEqual({ kind: "persist", cookie: null });
  });

  it("restaura o filtro salvo numa visita limpa", () => {
    expect(decideFinancasFilter(sp(""), "mes=2026-06&tipo=INCOME")).toEqual({
      kind: "restore",
      query: "mes=2026-06&tipo=INCOME",
    });
  });

  it("sanitiza o cookie salvo ao restaurar (descarta lixo)", () => {
    expect(decideFinancasFilter(sp(""), "mes=2026-06&lixo=1")).toEqual({
      kind: "restore",
      query: "mes=2026-06",
    });
  });

  it("visita limpa sem cookie (ou cookie inútil) apenas passa", () => {
    expect(decideFinancasFilter(sp(""), null)).toEqual({ kind: "pass" });
    expect(decideFinancasFilter(sp(""), "")).toEqual({ kind: "pass" });
    expect(decideFinancasFilter(sp(""), "lixo=1")).toEqual({ kind: "pass" });
  });

  it("não entra em loop: a URL restaurada já tem chaves → vira persist", () => {
    // primeira visita restaura; o redirect resultante passa a ter chaves
    const restored = decideFinancasFilter(sp(""), "mes=2026-06");
    expect(restored).toEqual({ kind: "restore", query: "mes=2026-06" });
    const next = decideFinancasFilter(sp("mes=2026-06"), "mes=2026-06");
    expect(next).toEqual({ kind: "persist", cookie: "mes=2026-06" });
  });
});
