import { describe, it, expect } from "vitest";
import {
  REPORT_GROUPS,
  allReports,
  reportCount,
  filterReports,
  countFilteredReports,
  subgroupEntries,
  subtopicSlug,
  reportsNavIndex,
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

  it("toda entrada tem título, descrição e subtema preenchidos", () => {
    for (const entry of allReports()) {
      expect(entry.title.trim().length).toBeGreaterThan(0);
      expect(entry.description.trim().length).toBeGreaterThan(0);
      expect(entry.subtopic.trim().length).toBeGreaterThan(0);
    }
  });

  it("as entradas de cada grupo já vêm contíguas por subtema", () => {
    // O hub confia nisso para que as subseções não se fragmentem.
    for (const g of REPORT_GROUPS) {
      const seen = new Set<string>();
      let prev: string | null = null;
      for (const entry of g.entries) {
        if (entry.subtopic !== prev) {
          // toda vez que o subtema muda, ele não pode ter aparecido antes
          expect(seen.has(entry.subtopic)).toBe(false);
          seen.add(entry.subtopic);
          prev = entry.subtopic;
        }
      }
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

describe("subgroupEntries", () => {
  const entry = (title: string, subtopic: string): ReportEntry => ({
    title,
    href: `/x/${title}`,
    description: `desc ${title}`,
    subtopic,
  });

  it("agrupa por subtema preservando a ordem de aparição dos subtemas", () => {
    const subs = subgroupEntries([
      entry("a", "Um"),
      entry("b", "Um"),
      entry("c", "Dois"),
    ]);
    expect(subs.map((s) => s.subtopic)).toEqual(["Um", "Dois"]);
    expect(subs[0].entries.map((e) => e.title)).toEqual(["a", "b"]);
    expect(subs[1].entries.map((e) => e.title)).toEqual(["c"]);
  });

  it("junta subtemas repetidos não-contíguos num único bloco (na 1ª aparição)", () => {
    const subs = subgroupEntries([
      entry("a", "Um"),
      entry("b", "Dois"),
      entry("c", "Um"),
    ]);
    expect(subs.map((s) => s.subtopic)).toEqual(["Um", "Dois"]);
    expect(subs[0].entries.map((e) => e.title)).toEqual(["a", "c"]);
  });

  it("lista vazia devolve nenhum subgrupo", () => {
    expect(subgroupEntries([])).toEqual([]);
  });

  it("preserva todas as entradas de cada grupo real sem perder nem duplicar", () => {
    for (const g of REPORT_GROUPS) {
      const subs = subgroupEntries(g.entries);
      const flat = subs.flatMap((s) => s.entries);
      expect(flat).toEqual([...g.entries]);
    }
  });
});

describe("subtopicSlug", () => {
  it("gera id kebab com prefixo da área, sem acento/caixa", () => {
    expect(subtopicSlug("shows", "Rentabilidade & preço")).toBe(
      "shows-rentabilidade-preco",
    );
    expect(subtopicSlug("financas", "Custos & metas")).toBe("financas-custos-metas");
    expect(subtopicSlug("contatos", "Quem move a carreira")).toBe(
      "contatos-quem-move-a-carreira",
    );
  });

  it("é determinístico para a mesma (área, subtema)", () => {
    expect(subtopicSlug("shows", "Recebíveis")).toBe(subtopicSlug("shows", "Recebíveis"));
  });

  it("prefixa com a área, então o mesmo subtema em áreas distintas não colide", () => {
    expect(subtopicSlug("shows", "Mesmo")).not.toBe(subtopicSlug("financas", "Mesmo"));
  });

  it("não deixa hífen sobrando nas pontas", () => {
    const slug = subtopicSlug("shows", "  & Recebíveis! ");
    expect(slug).toBe("shows-recebiveis");
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("reportsNavIndex", () => {
  it("segue a ordem dos grupos e casa rótulo/âncora da área", () => {
    const index = reportsNavIndex();
    expect(index.map((a) => a.area)).toEqual(REPORT_GROUPS.map((g) => g.area));
    for (const area of index) {
      const group = REPORT_GROUPS.find((g) => g.area === area.area)!;
      expect(area.label).toBe(group.label);
      expect(area.anchor).toBe(group.area);
      expect(area.count).toBe(group.entries.length);
    }
  });

  it("a contagem da área é a soma das contagens dos seus subtemas", () => {
    for (const area of reportsNavIndex()) {
      const sum = area.subtopics.reduce((n, s) => n + s.count, 0);
      expect(sum).toBe(area.count);
    }
  });

  it("os subtemas e contagens batem com subgroupEntries de cada grupo", () => {
    for (const area of reportsNavIndex()) {
      const group = REPORT_GROUPS.find((g) => g.area === area.area)!;
      const subs = subgroupEntries(group.entries);
      expect(area.subtopics.map((s) => s.subtopic)).toEqual(subs.map((s) => s.subtopic));
      expect(area.subtopics.map((s) => s.count)).toEqual(subs.map((s) => s.entries.length));
    }
  });

  it("toda âncora de subtema usa subtopicSlug e é única no acervo", () => {
    const anchors: string[] = [];
    for (const area of reportsNavIndex()) {
      for (const sub of area.subtopics) {
        expect(sub.anchor).toBe(subtopicSlug(area.area, sub.subtopic));
        anchors.push(sub.anchor);
      }
    }
    expect(new Set(anchors).size).toBe(anchors.length);
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
      subtopic: "z",
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

  it("casa pelo subtema — buscar 'recebíveis' traz o subtema inteiro", () => {
    const groups = filterReports("recebiveis");
    expect(groups.map((g) => g.area)).toEqual(["shows"]);
    const hrefs = groups[0].entries.map((e) => e.href);
    expect(hrefs).toEqual([
      "/shows/a-receber",
      "/shows/a-receber/por-contratante",
      "/shows/prazo-recebimento",
      "/shows/prazo-recebimento/por-contratante",
    ]);
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
