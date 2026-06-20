import { describe, it, expect } from "vitest";
import {
  REPORT_GROUPS,
  allReports,
  reportCount,
  filterReports,
  countFilteredReports,
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

describe("filterReports / countFilteredReports", () => {
  it("consulta vazia (ou só espaços) devolve todos os grupos e todas as entradas", () => {
    for (const q of ["", "   ", "\t"]) {
      const groups = filterReports(q);
      expect(groups.map((g) => g.area)).toEqual(REPORT_GROUPS.map((g) => g.area));
      expect(countFilteredReports(q)).toBe(reportCount());
    }
  });

  it("não muta REPORT_GROUPS nem as suas listas de entradas", () => {
    const before = reportCount();
    const groups = filterReports("");
    groups[0].entries.push({
      title: "x",
      href: "/x",
      description: "y",
    });
    expect(reportCount()).toBe(before);
  });

  it("casa pelo título, ignorando acento e caixa", () => {
    const groups = filterReports("CACHE");
    const titles = groups.flatMap((g) => g.entries).map((e) => e.title);
    expect(titles).toContain("Evolução do cachê");
    expect(titles).toContain("Faixas de cachê");
  });

  it("casa pela descrição quando o termo não está no título", () => {
    const groups = filterReports("dso");
    const hrefs = groups.flatMap((g) => g.entries).map((e) => e.href);
    expect(hrefs).toContain("/shows/prazo-recebimento");
  });

  it("casa pelo rótulo do grupo — buscar a área traz todos os seus relatórios", () => {
    const groups = filterReports("contatos");
    expect(groups).toHaveLength(1);
    expect(groups[0].area).toBe("contatos");
    const contatos = REPORT_GROUPS.find((g) => g.area === "contatos")!;
    expect(groups[0].entries).toHaveLength(contatos.entries.length);
  });

  it("multitermo é AND: exige todos os termos na mesma entrada", () => {
    const groups = filterReports("prazo contratante");
    const hrefs = groups.flatMap((g) => g.entries).map((e) => e.href);
    expect(hrefs).toEqual(["/shows/prazo-recebimento/por-contratante"]);
  });

  it("omite grupos sem nenhuma entrada casada", () => {
    const groups = filterReports("imposto");
    expect(groups.every((g) => g.entries.length > 0)).toBe(true);
    expect(groups.map((g) => g.area)).toEqual(["financas"]);
  });

  it("consulta sem casamento devolve lista vazia e contagem zero", () => {
    expect(filterReports("zzz-nao-existe")).toEqual([]);
    expect(countFilteredReports("zzz-nao-existe")).toBe(0);
  });

  it("countFilteredReports concorda com filterReports", () => {
    for (const q of ["", "cache", "contatos", "prazo contratante", "xyz"]) {
      const fromGroups = filterReports(q).reduce((n, g) => n + g.entries.length, 0);
      expect(countFilteredReports(q)).toBe(fromGroups);
    }
  });
});
