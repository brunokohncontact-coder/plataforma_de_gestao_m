import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  REPORT_GROUPS,
  allReports,
  reportCount,
  filterReports,
  countFilteredReports,
  normalizeReportQuery,
  subgroupEntries,
  subtopicSlug,
  reportsNavIndex,
  activeSectionAnchor,
  type ReportEntry,
  type SectionOffset,
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

describe("normalizeReportQuery", () => {
  it("devolve a string aparada quando recebe uma string", () => {
    expect(normalizeReportQuery("  cachê  ")).toBe("cachê");
    expect(normalizeReportQuery("prazo contratante")).toBe("prazo contratante");
  });

  it("colapsa espaços internos e quebras de linha num único espaço", () => {
    expect(normalizeReportQuery("prazo\n\tcontratante")).toBe("prazo contratante");
    expect(normalizeReportQuery("cachê   médio")).toBe("cachê médio");
  });

  it("trata ausência (undefined) e só-espaços como consulta vazia", () => {
    expect(normalizeReportQuery(undefined)).toBe("");
    expect(normalizeReportQuery("   ")).toBe("");
    expect(normalizeReportQuery("")).toBe("");
  });

  it("pega a primeira ocorrência quando o parâmetro vem repetido (array)", () => {
    expect(normalizeReportQuery(["cachê", "prazo"])).toBe("cachê");
    expect(normalizeReportQuery([])).toBe("");
    expect(normalizeReportQuery(["  prazo  "])).toBe("prazo");
  });

  it("o resultado alimenta filterReports sem interpretação extra", () => {
    const q = normalizeReportQuery(["  recebíveis  "]);
    expect(q).toBe("recebíveis");
    expect(countFilteredReports(q)).toBe(countFilteredReports("recebíveis"));
  });
});

describe("activeSectionAnchor", () => {
  const sections: SectionOffset[] = [
    { anchor: "shows", top: 0 },
    { anchor: "shows-agenda-pipeline", top: 200 },
    { anchor: "financas", top: 800 },
    { anchor: "contatos", top: 1500 },
  ];

  it("devolve a primeira seção antes de qualquer uma cruzar a linha", () => {
    expect(activeSectionAnchor(sections, 0, 120)).toBe("shows");
  });

  it("ativa a última seção cujo topo já passou da linha de ativação", () => {
    // linha = 300 + 120 = 420 → passou de 200 (subtema) mas não de 800.
    expect(activeSectionAnchor(sections, 300, 120)).toBe("shows-agenda-pipeline");
    // linha = 700 + 120 = 820 → passou de 800 (finanças).
    expect(activeSectionAnchor(sections, 700, 120)).toBe("financas");
  });

  it("ativa a seção exatamente na linha (limite inclusivo)", () => {
    // linha = 80 + 120 = 200 == top do subtema.
    expect(activeSectionAnchor(sections, 80, 120)).toBe("shows-agenda-pipeline");
  });

  it("com atBottom devolve sempre a última seção mensurável", () => {
    expect(activeSectionAnchor(sections, 0, 120, true)).toBe("contatos");
  });

  it("é robusto à ordem de entrada (ordena por top)", () => {
    const shuffled = [sections[3], sections[0], sections[2], sections[1]];
    expect(activeSectionAnchor(shuffled, 700, 120)).toBe("financas");
    expect(activeSectionAnchor(shuffled, 0, 120)).toBe("shows");
  });

  it("ignora offsets não finitos (medições pendentes)", () => {
    const partial: SectionOffset[] = [
      { anchor: "shows", top: 0 },
      { anchor: "financas", top: Number.NaN },
      { anchor: "contatos", top: 1500 },
    ];
    // finanças é ignorada; linha = 900+120 passou de shows (0) mas não de contatos.
    expect(activeSectionAnchor(partial, 900, 120)).toBe("shows");
  });

  it("devolve null quando não há nenhuma seção mensurável", () => {
    expect(activeSectionAnchor([], 0, 120)).toBeNull();
    expect(
      activeSectionAnchor([{ anchor: "x", top: Number.POSITIVE_INFINITY }], 0, 120),
    ).toBeNull();
  });

  it("atBottom não regride quando não há seções", () => {
    expect(activeSectionAnchor([], 500, 120, true)).toBeNull();
  });
});

// Guarda contra DRIFT entre o catálogo e o filesystem: o docstring de reports.ts
// promete que toda análise é registrada "aqui (e só aqui)" para aparecer no hub.
// Sem esta trava, uma página de relatório nova entra no app mas some do índice —
// foi exatamente como "Ritmo/Sazonalidade da atividade do funil" ficaram fora do
// acervo por várias sessões. O teste varre `src/app/(app)` e cruza as rotas reais
// com os hrefs cadastrados.
describe("cobertura do catálogo vs. filesystem", () => {
  // Diretório das rotas do app, resolvido a partir deste arquivo (robusto ao cwd).
  const appDir = fileURLToPath(new URL("../app/(app)", import.meta.url));

  // Últimos segmentos que denotam uma rota utilitária, não um relatório.
  const UTILITY_LAST_SEGMENTS = new Set(["export", "editar", "nova", "novo"]);
  // Áreas inteiras que não são o acervo analítico do hub.
  const NON_REPORT_PREFIXES = ["/conta", "/dashboard", "/relatorios"];
  // Rotas que têm página própria mas NÃO são relatórios: as listas primárias
  // (CRUD) e as visões de agenda. Excluí-las é uma decisão explícita — adicionar
  // uma nova visão não-relatório exige registrá-la aqui de propósito.
  const NON_REPORT_ROUTES = new Set([
    "/shows",
    "/financas",
    "/contatos",
    "/shows/calendario",
    "/shows/semana",
  ]);

  // Converte o caminho de um `page.tsx` na rota absoluta que o Next serve,
  // descartando grupos de rota `(...)`. Rotas com segmento dinâmico `[...]`
  // devolvem null (não fazem parte do acervo estático de relatórios).
  function routeForPage(relDir: string): string | null {
    const segments = relDir.split("/").filter((s) => s.length > 0);
    const kept: string[] = [];
    for (const seg of segments) {
      if (seg.startsWith("(") && seg.endsWith(")")) continue; // grupo de rota
      if (seg.startsWith("[") && seg.endsWith("]")) return null; // rota dinâmica
      kept.push(seg);
    }
    return "/" + kept.join("/");
  }

  // Todas as rotas com `page.tsx` sob (app), varrendo recursivamente.
  function collectRoutes(dir: string, rel: string, out: Set<string>): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        collectRoutes(`${dir}/${entry.name}`, `${rel}/${entry.name}`, out);
      } else if (entry.name === "page.tsx") {
        const route = routeForPage(rel);
        if (route) out.add(route);
      }
    }
  }

  const filesystemRoutes = (() => {
    const out = new Set<string>();
    collectRoutes(appDir, "", out);
    return out;
  })();

  function isNonReportRoute(route: string): boolean {
    if (route === "/") return true;
    if (NON_REPORT_ROUTES.has(route)) return true;
    const last = route.slice(route.lastIndexOf("/") + 1);
    if (UTILITY_LAST_SEGMENTS.has(last)) return true;
    return NON_REPORT_PREFIXES.some(
      (p) => route === p || route.startsWith(`${p}/`),
    );
  }

  it("a varredura enxerga o filesystem (sanidade)", () => {
    // Se a varredura vier vazia, o resto do bloco passaria vacuamente.
    expect(filesystemRoutes.size).toBeGreaterThan(20);
    expect(filesystemRoutes.has("/shows/funil")).toBe(true);
  });

  it("toda rota de relatório no filesystem está no catálogo", () => {
    const registered = new Set(allReports().map((e) => e.href));
    const missing = [...filesystemRoutes]
      .filter((r) => !isNonReportRoute(r))
      .filter((r) => !registered.has(r))
      .sort();
    // Mensagem lista os culpados para facilitar o conserto (registrar em reports.ts,
    // ou — se de fato não for relatório — declarar em NON_REPORT_ROUTES).
    expect(missing, `rotas de relatório fora do catálogo: ${missing.join(", ")}`).toEqual([]);
  });

  it("todo href do catálogo aponta para uma página existente (sem link morto)", () => {
    const dead = allReports()
      .map((e) => e.href)
      .filter((href) => !filesystemRoutes.has(href))
      .sort();
    expect(dead, `hrefs sem page.tsx: ${dead.join(", ")}`).toEqual([]);
  });
});
