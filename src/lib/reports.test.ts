import { describe, it, expect } from "vitest";
import {
  REPORT_GROUPS,
  allReports,
  reportCount,
  type ReportEntry,
} from "./reports";

describe("REPORT_GROUPS", () => {
  it("tem os três grupos esperados, na ordem shows → finanças → contatos", () => {
    expect(REPORT_GROUPS.map((g) => g.area)).toEqual([
      "shows",
      "financas",
      "contatos",
    ]);
  });

  it("nenhum grupo é vazio e todo grupo tem rótulo", () => {
    for (const g of REPORT_GROUPS) {
      expect(g.entries.length).toBeGreaterThan(0);
      expect(g.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("toda entrada tem título e descrição preenchidos", () => {
    for (const entry of allReports()) {
      expect(entry.title.trim().length).toBeGreaterThan(0);
      expect(entry.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("todo href é absoluto (começa com /)", () => {
    for (const entry of allReports()) {
      expect(entry.href.startsWith("/")).toBe(true);
    }
  });

  it("não há hrefs duplicados", () => {
    const hrefs = allReports().map((e) => e.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("não há títulos duplicados", () => {
    const titles = allReports().map((e) => e.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("cada href aponta para a sua área (prefixo /shows, /financas, /contatos)", () => {
    const prefix: Record<string, string> = {
      shows: "/shows/",
      financas: "/financas/",
      contatos: "/contatos/",
    };
    for (const g of REPORT_GROUPS) {
      for (const entry of g.entries) {
        expect(entry.href.startsWith(prefix[g.area])).toBe(true);
      }
    }
  });
});

describe("allReports / reportCount", () => {
  it("allReports achata todos os grupos preservando a ordem", () => {
    const flat = allReports();
    const expected: ReportEntry[] = REPORT_GROUPS.flatMap((g) => g.entries);
    expect(flat).toEqual(expected);
  });

  it("reportCount casa com o tamanho da lista achatada", () => {
    expect(reportCount()).toBe(allReports().length);
  });
});
